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

const authority = createReferenceAuthority();
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

const scopeDenyRequest = await readJson("policy-evaluate-scope-deny.request.json");
const scopeDenyResponse = authority.evaluateAction({
  capabilityToken: capabilityResponse.capability_token,
  action: scopeDenyRequest.action,
  verifier: verifierModule
});
await writeJson("policy-evaluate-scope-deny.response.json", scopeDenyResponse);

const expiredResponse = authority.evaluateAction({
  capabilityToken: capabilityResponse.capability_token,
  action: readAllowRequest.action,
  now: new Date("2026-03-18T20:00:01Z"),
  verifier: verifierModule
});
await writeJson("policy-evaluate-expired-token.response.json", expiredResponse);

await writeJson("keys-get.response.json", authority.getPublishedKeys());

const evolveRequest = {
  suggestion_id: deployApprovalResponse.policy_suggestion.suggestion_id,
  decision: "approve",
  persist: "session"
};
await writeJson("policy-evolve-approve.request.json", evolveRequest);
const evolveResponse = authority.evolvePolicy({
  suggestionId: evolveRequest.suggestion_id,
  decision: evolveRequest.decision,
  persist: evolveRequest.persist
});
await writeJson("policy-evolve-approve.response.json", evolveResponse.value);

function createTranscriptServer() {
  return createMcpServer({ authority: createReferenceAuthority() });
}

function buildTranscript(id, exchangesBuilder) {
  const mcpServer = createTranscriptServer();
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
  mcpServer.handleRequest({
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {}
  });

  const listTools = {
    request: { jsonrpc: "2.0", id: `${id}-list`, method: "tools/list", params: {} }
  };
  listTools.response = mcpServer.handleRequest(listTools.request);
  return [initialize, listTools, ...exchangesBuilder(mcpServer)];
}

await writeTranscript("capabilities.get.json", buildTranscript("capabilities", (mcpServer) => {
  const call = {
    request: {
      jsonrpc: "2.0",
      id: "capabilities-call",
      method: "tools/call",
      params: { name: "capabilities.get", arguments: capabilityRequest }
    }
  };
  call.response = mcpServer.handleRequest(call.request);
  return [call];
}));

await writeTranscript("policy.evaluate.json", buildTranscript("policy", (mcpServer) => {
  const issued = mcpServer.handleRequest({
    jsonrpc: "2.0",
    id: "policy-capability",
    method: "tools/call",
    params: {
      name: "capabilities.get",
      arguments: capabilityRequest
    }
  });
  const token = issued.result.structuredContent.capability_token;
  const call = {
    request: {
      jsonrpc: "2.0",
      id: "policy-call",
      method: "tools/call",
      params: {
        name: "policy.evaluate",
        arguments: {
          capability_token: token,
          action: readAllowRequest.action
        }
      }
    }
  };
  call.response = mcpServer.handleRequest(call.request);
  return [{
    request: {
      jsonrpc: "2.0",
      id: "policy-capability",
      method: "tools/call",
      params: {
        name: "capabilities.get",
        arguments: capabilityRequest
      }
    },
    response: issued
  }, call];
}));

await writeTranscript("policy.evolve.json", buildTranscript("evolve", (mcpServer) => {
  const issueRequest = {
    jsonrpc: "2.0",
    id: "evolve-capability",
    method: "tools/call",
    params: {
      name: "capabilities.get",
      arguments: capabilityRequest
    }
  };
  const issued = mcpServer.handleRequest(issueRequest);
  const token = issued.result.structuredContent.capability_token;
  const evaluateRequest = {
    jsonrpc: "2.0",
    id: "evolve-evaluate",
    method: "tools/call",
    params: {
      name: "policy.evaluate",
      arguments: {
        capability_token: token,
        action: deployApprovalRequest.action
      }
    }
  };
  const evaluated = mcpServer.handleRequest(evaluateRequest);
  const evolveToolRequest = {
    jsonrpc: "2.0",
    id: "evolve-call",
    method: "tools/call",
    params: {
      name: "policy.evolve",
      arguments: {
        suggestion_id: evaluated.result.structuredContent.policy_suggestion.suggestion_id,
        decision: "approve",
        persist: "session"
      }
    }
  };
  const evolved = mcpServer.handleRequest(evolveToolRequest);
  return [
    { request: issueRequest, response: issued },
    { request: evaluateRequest, response: evaluated },
    { request: evolveToolRequest, response: evolved }
  ];
}));

await writeTranscript("keys.get.json", buildTranscript("keys", (mcpServer) => {
  const call = {
    request: {
      jsonrpc: "2.0",
      id: "keys-call",
      method: "tools/call",
      params: { name: "keys.get", arguments: {} }
    }
  };
  call.response = mcpServer.handleRequest(call.request);
  return [call];
}));

await writeChronologyManifest();
await refreshChangelog();
