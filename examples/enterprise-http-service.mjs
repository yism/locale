import http from "node:http";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import {
  createAuthority,
  createEvidenceLedger,
  createFilePolicyStore,
  createHttpHandler,
  createPublishedJwks,
  loadPackDirectory,
  PROTOCOL_VERSION
} from "../src/index.mjs";

function readJsonFile(filePath, label) {
  if (!filePath) {
    throw new Error(`${label} path is required`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function requireEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parsePositiveInteger(value, fallback, label) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function loadSigningKey(env) {
  const signingKey = readJsonFile(requireEnv(env, "CPA_SIGNING_KEY_PATH"), "Signing key");
  if (!signingKey?.kid || !signingKey?.publicJwk || !signingKey?.privateJwk) {
    throw new Error("CPA_SIGNING_KEY_PATH must point to a JSON document with kid, publicJwk, and privateJwk");
  }
  return signingKey;
}

function loadPublishedJwks(env, signingKey, protocolVersion) {
  if (env.CPA_PUBLISHED_JWKS_PATH) {
    return readJsonFile(env.CPA_PUBLISHED_JWKS_PATH, "Published JWKS");
  }

  return createPublishedJwks({
    protocolVersion,
    signingKeys: [signingKey]
  });
}

export function createEnterpriseAuthorityFromEnv(env = process.env) {
  const protocolVersion = env.CPA_PROTOCOL_VERSION || PROTOCOL_VERSION;
  const signingKey = loadSigningKey(env);

  return createAuthority({
    issuer: requireEnv(env, "CPA_ISSUER"),
    clock: { now: () => new Date() },
    signingKey,
    publishedJwks: loadPublishedJwks(env, signingKey, protocolVersion),
    packStore: env.CPA_PACK_DIR ? loadPackDirectory(env.CPA_PACK_DIR) : loadPackDirectory(),
    tokenTtlSeconds: parsePositiveInteger(env.CPA_TOKEN_TTL_SECONDS, 3600, "CPA_TOKEN_TTL_SECONDS"),
    suggestionTtlSeconds: parsePositiveInteger(env.CPA_SUGGESTION_TTL_SECONDS, 900, "CPA_SUGGESTION_TTL_SECONDS"),
    protocolVersion,
    ...(env.CPA_POLICY_STORE_PATH
      ? {
          policyStore: createFilePolicyStore({
            filePath: env.CPA_POLICY_STORE_PATH
          })
        }
      : {}),
    ...(env.CPA_EVIDENCE_LEDGER_PATH
      ? {
          evidenceLedger: createEvidenceLedger({
            filePath: env.CPA_EVIDENCE_LEDGER_PATH,
            clock: { now: () => new Date() }
          })
        }
      : {})
  });
}

export function startEnterpriseHttpService({ env = process.env, authority = createEnterpriseAuthorityFromEnv(env) } = {}) {
  const handler = createHttpHandler({ authority });
  const httpServer = http.createServer((req, res) => {
    let rawBody = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      rawBody += chunk;
    });
    req.on("end", async () => {
      try {
        const response = await handler({
          method: req.method,
          url: req.url,
          body: rawBody
        });
        res.writeHead(response.status, response.headers);
        res.end(JSON.stringify(response.body));
      } catch (error) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({
          error: "internal_server_error",
          message: error instanceof Error ? error.message : String(error)
        }));
      }
    });
  });

  return {
    authority,
    handleRequest: handler,
    listen(
      port = parsePositiveInteger(env.CPA_PORT, 8080, "CPA_PORT"),
      host = env.CPA_BIND_HOST || "127.0.0.1"
    ) {
      return new Promise((resolve) => {
        httpServer.listen(port, host, () => resolve(httpServer.address()));
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

async function main() {
  const service = startEnterpriseHttpService();
  const address = await service.listen();
  console.log(JSON.stringify({
    mode: "runtime",
    issuer: service.authority.config.issuer,
    protocolVersion: service.authority.config.protocolVersion,
    address
  }, null, 2));
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await main();
}
