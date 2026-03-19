import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { extractFrames } from "../src/transport/stdio-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const transcriptDir = path.join(repoRoot, "docs/transcripts");
const hostProfileDir = path.join(repoRoot, "docs/host-profiles");

async function readTranscript(name) {
  return JSON.parse(await fs.readFile(path.join(transcriptDir, name), "utf8"));
}

async function readHostProfile(name) {
  return JSON.parse(await fs.readFile(path.join(hostProfileDir, name), "utf8"));
}

function transcriptResponseForRequestId(transcript, id) {
  const exchange = transcript.find((entry) => entry.request.id === id);
  if (!exchange) {
    throw new Error(`Missing transcript exchange ${id}`);
  }
  return exchange.response;
}

function encodeFrame(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"),
    body
  ]);
}

async function withStdioServer(callback) {
  const child = spawn(process.execPath, ["src/cli.mjs", "serve-stdio"], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "inherit"]
  });

  try {
    return await callback(child);
  } finally {
    child.kill("SIGTERM");
  }
}

async function sendFramedRequest(child, request, { expectResponse = true } = {}) {
  if (!expectResponse) {
    child.stdin.write(encodeFrame(request));
    await new Promise((resolve) => setTimeout(resolve, 25));
    return null;
  }

  return await new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);

    function cleanup() {
      child.stdout.off("data", onData);
      child.off("error", onError);
      child.off("exit", onExit);
    }

    function onError(error) {
      cleanup();
      reject(error);
    }

    function onExit(code) {
      cleanup();
      reject(new Error(`stdio server exited before responding: ${code}`));
    }

    function onData(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = extractFrames(buffer);
      buffer = parsed.remainder;
      if (parsed.messages.length > 0) {
        cleanup();
        resolve(JSON.parse(parsed.messages[0]));
      }
    }

    child.stdout.on("data", onData);
    child.on("error", onError);
    child.on("exit", onExit);
    child.stdin.write(encodeFrame(request));
  });
}

async function runCli(command, payload) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpa-compat-"));
  const requestPath = path.join(tempDir, "request.json");
  await fs.writeFile(requestPath, `${JSON.stringify(payload, null, 2)}\n`);

  try {
    const child = spawn(process.execPath, ["src/cli.mjs", command, requestPath], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "inherit"]
    });

    const stdout = await new Promise((resolve, reject) => {
      let output = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`cli exited with code ${code}`));
          return;
        }
        resolve(output);
      });
    });

    return JSON.parse(stdout);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("black-box stdio replay matches golden MCP transcripts", async () => {
  const transcriptFiles = [
    "capabilities.get.json",
    "policy.evaluate.json",
    "policy.evolve.json",
    "keys.get.json"
  ];

  for (const transcriptFile of transcriptFiles) {
    await withStdioServer(async (child) => {
      const transcript = await readTranscript(transcriptFile);
      for (const exchange of transcript) {
        const response = await sendFramedRequest(child, exchange.request);
        assert.deepEqual(response, exchange.response);
      }
    });
  }
});

test("external verifier process accepts transcript-issued capability and decision tokens", async () => {
  const capabilitiesTranscript = await readTranscript("capabilities.get.json");
  const policyTranscript = await readTranscript("policy.evaluate.json");

  const capabilityToken = transcriptResponseForRequestId(capabilitiesTranscript, "capabilities-call").result.structuredContent.capability_token;
  const decisionToken = transcriptResponseForRequestId(policyTranscript, "policy-call").result.structuredContent.decision_token;

  const capabilityVerification = await runCli("verify-capability", {
    token: capabilityToken,
    now: "2026-03-18T18:15:00Z"
  });
  const decisionVerification = await runCli("verify-decision", {
    token: decisionToken,
    now: "2026-03-18T18:20:00Z"
  });

  assert.equal(capabilityVerification.status, "ok");
  assert.equal(capabilityVerification.value.payload.mid, "mission_checkout_preview");
  assert.equal(decisionVerification.status, "ok");
  assert.equal(decisionVerification.value.payload.outcome, "allow");
});

test("external verifier process rejects expired capability tokens from transcript payloads", async () => {
  const capabilitiesTranscript = await readTranscript("capabilities.get.json");
  const capabilityToken = transcriptResponseForRequestId(capabilitiesTranscript, "capabilities-call").result.structuredContent.capability_token;

  const expiredVerification = await runCli("verify-capability", {
    token: capabilityToken,
    now: "2026-03-18T20:00:01Z"
  });

  assert.equal(expiredVerification.status, "error");
  assert.equal(expiredVerification.code, "token.expired");
});

test("codex host profile handshakes cleanly over stdio", async () => {
  const profile = await readHostProfile("codex-mcp.json");

  await withStdioServer(async (child) => {
    for (const exchange of profile.sequence) {
      const maybeResponse = await sendFramedRequest(child, exchange.request, {
        expectResponse: exchange.response !== null
      });
      if (exchange.response === null) {
        assert.equal(maybeResponse, null);
        continue;
      }
      assert.deepEqual(maybeResponse, exchange.response);
    }
  });
});
