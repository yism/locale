import fs from "node:fs";
import path from "node:path";
import { parseYaml, stringifyYaml } from "./yaml-lite.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyDocument() {
  return {
    version: 1,
    packs: []
  };
}

function normalizePack(pack) {
  return {
    id: pack.id,
    version: pack.version,
    priority: typeof pack.priority === "number" ? pack.priority : 1000,
    default_outcomes: pack.default_outcomes || {},
    budget_overrides: pack.budget_overrides || {},
    environment_overrides: pack.environment_overrides || {},
    scope_overrides: pack.scope_overrides || []
  };
}

function readPolicyDocument(filePath) {
  try {
    const source = fs.readFileSync(filePath, "utf8");
    if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      return parseYaml(source);
    }
    return JSON.parse(source);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return emptyDocument();
    }
    throw error;
  }
}

function writePolicyDocument(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    fs.writeFileSync(filePath, stringifyYaml(value));
    return;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function createFilePolicyStore({ filePath } = {}) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("createFilePolicyStore requires filePath");
  }

  return {
    filePath,
    listPacks() {
      const document = readPolicyDocument(filePath);
      return (document.packs || []).map(normalizePack);
    },
    applyPatch(patch) {
      const document = readPolicyDocument(filePath);
      const nextPacks = new Map((document.packs || []).map((pack) => [pack.id, normalizePack(pack)]));
      for (const pack of patch?.packs || []) {
        nextPacks.set(pack.id, normalizePack(pack));
      }
      const updated = {
        version: document.version || 1,
        packs: [...nextPacks.values()]
      };
      writePolicyDocument(filePath, updated);
      return clone(updated.packs);
    }
  };
}
