import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createMcpServer } from "../src/transport/mcp-server.mjs";
import { createHttpHandler } from "../src/transport/http-server.mjs";
import { extractFrames } from "../src/transport/stdio-server.mjs";
import { createReferenceAuthority } from "../src/reference-runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, "../docs/fixtures");

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(fixtureDir, name), "utf8"));
}

function encodeFrame(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"),
    body
  ]);
}

test("stdio transport handles initialize and tool calls with framed envelopes", async () => {
  const child = spawn(process.execPath, ["src/cli.mjs", "serve-stdio"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: ["pipe", "pipe", "inherit"]
  });

  const request = {
    jsonrpc: "2.0",
    id: "init-1",
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "test", version: "0.1.0" },
      capabilities: {}
    }
  };

  const responsePromise = new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    child.stdout.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = extractFrames(buffer);
      buffer = parsed.remainder;
      if (parsed.messages.length > 0) {
        resolve(JSON.parse(parsed.messages[0]));
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`stdio server exited with code ${code}`));
      }
    });
  });

  child.stdin.write(encodeFrame(request));
  const response = await responsePromise;
  child.kill("SIGTERM");

  assert.equal(response.result.protocolVersion, "2025-06-18");
});

test("http transport matches direct handler results for tool calls", async () => {
  const authority = createReferenceAuthority();
  const server = createMcpServer({ authority });
  const httpHandler = createHttpHandler({ authority, server });
  const capabilityRequest = await readJson("capabilities-get.request.json");

  server.handleRequest({
    jsonrpc: "2.0",
    id: "init-http",
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "test", version: "0.1.0" },
      capabilities: {}
    }
  });
  server.handleRequest({
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {}
  });

  const directResponse = server.handleRequest({
    jsonrpc: "2.0",
    id: "tool-1",
    method: "tools/call",
    params: {
      name: "capabilities.get",
      arguments: capabilityRequest
    }
  });

  const httpResponse = await httpHandler({
    method: "POST",
    url: "/mcp",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "tool-1",
      method: "tools/call",
      params: {
        name: "capabilities.get",
        arguments: capabilityRequest
      }
    })
  });

  assert.deepEqual(httpResponse.body.result.structuredContent, directResponse.result.structuredContent);
});

test("transport separates malformed token errors from policy denials", () => {
  const authority = createReferenceAuthority();
  const server = createMcpServer({ authority });
  server.handleRequest({
    jsonrpc: "2.0",
    id: "init-tool",
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "test", version: "0.1.0" },
      capabilities: {}
    }
  });
  server.handleRequest({
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {}
  });
  const response = server.handleRequest({
    jsonrpc: "2.0",
    id: "tool-2",
    method: "tools/call",
    params: {
      name: "policy.evaluate",
      arguments: {
        capability_token: "not-a-token",
        action: {
          protocol: "mcp",
          action_class: "read",
          target: "repo.read_file",
          input_hash: "sha256:read",
          resource_refs: [],
          idempotency_key: "idem",
          trace_id: "trace"
        }
      }
    }
  });

  assert.equal(response.error.data.code, "malformed_token");
});

test("methods before initialize are rejected deterministically", () => {
  const server = createMcpServer({ authority: createReferenceAuthority() });
  const response = server.handleRequest({
    jsonrpc: "2.0",
    id: "pre-init",
    method: "tools/list",
    params: {}
  });

  assert.equal(response.error.data.code, "not_initialized");
});

test("initialize rejects unsupported protocol versions", () => {
  const server = createMcpServer({ authority: createReferenceAuthority() });
  const response = server.handleRequest({
    jsonrpc: "2.0",
    id: "init-bad",
    method: "initialize",
    params: {
      protocolVersion: "2099-01-01",
      clientInfo: { name: "test", version: "0.1.0" },
      capabilities: {}
    }
  });

  assert.equal(response.error.data.code, "unsupported_protocol_version");
});

test("repeated initialize requests are rejected", () => {
  const server = createMcpServer({ authority: createReferenceAuthority() });
  server.handleRequest({
    jsonrpc: "2.0",
    id: "init-1",
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "test", version: "0.1.0" },
      capabilities: {}
    }
  });
  const response = server.handleRequest({
    jsonrpc: "2.0",
    id: "init-2",
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "test", version: "0.1.0" },
      capabilities: {}
    }
  });

  assert.equal(response.error.data.code, "already_initialized");
});

test("initialized notification before initialize is rejected", () => {
  const server = createMcpServer({ authority: createReferenceAuthority() });
  const response = server.handleRequest({
    jsonrpc: "2.0",
    id: "pre-init-notification",
    method: "notifications/initialized",
    params: {}
  });

  assert.equal(response.error.data.code, "not_initialized");
});

test("stdio framing extracts multiple concatenated messages in order", () => {
  const first = encodeFrame({ jsonrpc: "2.0", id: "one", method: "tools/list", params: {} });
  const second = encodeFrame({ jsonrpc: "2.0", id: "two", method: "tools/list", params: {} });
  const parsed = extractFrames(Buffer.concat([first, second]));

  assert.equal(parsed.messages.length, 2);
  assert.equal(JSON.parse(parsed.messages[0]).id, "one");
  assert.equal(JSON.parse(parsed.messages[1]).id, "two");
});
