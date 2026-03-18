#!/usr/bin/env node
import fs from "node:fs/promises";
import { createReferenceAuthority } from "./reference-runtime.mjs";
import { startHttpServer } from "./transport/http-server.mjs";
import { startStdioServer } from "./transport/stdio-server.mjs";
import { verifyCapabilityToken, verifyDecisionToken } from "./verifier/index.mjs";

const authority = createReferenceAuthority();

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

async function main() {
  const [command, path, maybePort] = process.argv.slice(2);

  if (command === "issue" && path) {
    const request = await readJson(path);
    console.log(JSON.stringify(authority.issueCapability(request), null, 2));
    return;
  }

  if (command === "evaluate" && path) {
    const request = await readJson(path);
    console.log(JSON.stringify(authority.evaluateAction({
      capabilityToken: request.capability_token,
      action: request.action,
      verifier: { verifyCapabilityToken }
    }), null, 2));
    return;
  }

  if (command === "keys") {
    console.log(JSON.stringify(authority.getPublishedKeys(), null, 2));
    return;
  }

  if (command === "verify-capability" && path) {
    const request = await readJson(path);
    console.log(JSON.stringify(verifyCapabilityToken(request.token, authority.getPublishedKeys(), request.now), null, 2));
    return;
  }

  if (command === "verify-decision" && path) {
    const request = await readJson(path);
    console.log(JSON.stringify(verifyDecisionToken(request.token, authority.getPublishedKeys(), request.now), null, 2));
    return;
  }

  if (command === "serve-stdio") {
    startStdioServer({ authority });
    return;
  }

  if (command === "serve-http") {
    const server = startHttpServer({ authority });
    const address = await server.listen(maybePort ? Number(maybePort) : 0);
    console.log(JSON.stringify(address, null, 2));
    return;
  }

  console.error("Usage: node src/cli.mjs <issue|evaluate|keys|verify-capability|verify-decision|serve-stdio|serve-http> [json-file|port]");
  process.exitCode = 1;
}

await main();
