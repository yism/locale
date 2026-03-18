import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReferenceAuthority } from "../src/reference-runtime.mjs";
import { createMcpServer } from "../src/transport/mcp-server.mjs";
import { writeChronologyManifest } from "./chronology-lib.mjs";
import { refreshChangelog } from "./refresh-changelog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, "../docs/fixtures");
const transcriptDir = path.resolve(__dirname, "../docs/transcripts");
const authority = createReferenceAuthority();
const mcpServer = createMcpServer({ authority });

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(fixtureDir, name), "utf8"));
}

async function writeJson(name, value) {
  await fs.writeFile(path.join(fixtureDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTranscript(name, value) {
  await fs.mkdir(transcriptDir, { recursive: true });
  await fs.writeFile(path.join(transcriptDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

const capabilityRequest = await readJson("capabilities-get.request.json");
const capabilityResponse = authority.issueCapability(capabilityRequest);
await writeJson("capabilities-get.response.json", capabilityResponse);

const verifierModule = await import("../src/verifier/index.mjs");
const readAllowRequest = await readJson("policy-evaluate-read-allow.request.json");
const readAllowResponse = authority.evaluateAction({
  capabilityToken: capabilityResponse.capability_token,
  action: readAllowRequest.action,
  verifier: verifierModule
});
await writeJson("policy-evaluate-read-allow.response.json", readAllowResponse);

const deployApprovalRequest = await readJson("policy-evaluate-deploy-approval.request.json");
const deployApprovalResponse = authority.evaluateAction({
  capabilityToken: capabilityResponse.capability_token,
  action: deployApprovalRequest.action,
  verifier: verifierModule
});
await writeJson("policy-evaluate-deploy-approval.response.json", deployApprovalResponse);

const expiredResponse = authority.evaluateAction({
  capabilityToken: capabilityResponse.capability_token,
  action: readAllowRequest.action,
  now: new Date("2026-03-18T20:00:01Z"),
  verifier: verifierModule
});
await writeJson("policy-evaluate-expired-token.response.json", expiredResponse);

await writeJson("keys-get.response.json", authority.getPublishedKeys());

function buildTranscript(id, toolName, args) {
  const initialize = {
    request: {
      jsonrpc: "2.0",
      id: `${id}-init`,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        clientInfo: { name: "fixture-client", version: "0.1.0" },
        capabilities: {}
      }
    }
  };
  initialize.response = mcpServer.handleRequest(initialize.request);

  const listTools = {
    request: { jsonrpc: "2.0", id: `${id}-list`, method: "tools/list", params: {} }
  };
  listTools.response = mcpServer.handleRequest(listTools.request);

  const call = {
    request: {
      jsonrpc: "2.0",
      id: `${id}-call`,
      method: "tools/call",
      params: { name: toolName, arguments: args }
    }
  };
  call.response = mcpServer.handleRequest(call.request);

  return [initialize, listTools, call];
}

await writeTranscript("capabilities.get.json", buildTranscript("capabilities", "capabilities.get", capabilityRequest));
await writeTranscript("policy.evaluate.json", buildTranscript("policy", "policy.evaluate", {
  capability_token: capabilityResponse.capability_token,
  action: readAllowRequest.action
}));
await writeTranscript("keys.get.json", buildTranscript("keys", "keys.get", {}));

await writeChronologyManifest();
await refreshChangelog();
