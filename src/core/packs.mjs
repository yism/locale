import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OUTCOME_RANK } from "./taxonomy.mjs";

const PACK_SCHEMA_KEYS = new Set([
  "id",
  "version",
  "priority",
  "default_outcomes",
  "budget_overrides",
  "environment_overrides",
  "scope_overrides"
]);

function defaultPackDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packs");
}

function validatePack(pack, filename) {
  for (const key of Object.keys(pack)) {
    if (!PACK_SCHEMA_KEYS.has(key)) {
      throw new Error(`Invalid pack key '${key}' in ${filename}`);
    }
  }

  if (!pack.id || !pack.version || typeof pack.priority !== "number") {
    throw new Error(`Pack ${filename} is missing required metadata`);
  }

  if (!pack.default_outcomes || !pack.budget_overrides || !pack.environment_overrides) {
    throw new Error(`Pack ${filename} is missing required maps`);
  }

  return Object.freeze({
    ...pack,
    scope_overrides: pack.scope_overrides || []
  });
}

export function loadPackDirectory(packDir = defaultPackDir()) {
  const files = fs.readdirSync(packDir).filter((entry) => entry.endsWith(".json")).sort();
  const packs = files.map((file) => {
    const absolutePath = path.join(packDir, file);
    const pack = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    return validatePack(pack, absolutePath);
  });

  const map = new Map(packs.map((pack) => [pack.id, pack]));
  if (!map.has("baseline")) {
    throw new Error("Missing required baseline pack");
  }

  return Object.freeze({
    packDir,
    packs,
    packMap: map
  });
}

export function resolvePackSelection(packStore, requestedPackIds = []) {
  const warnings = [];
  const selectedIds = new Set(["baseline", ...(requestedPackIds || [])]);
  const selectedPacks = [];

  for (const packId of selectedIds) {
    const pack = packStore.packMap.get(packId);
    if (!pack) {
      warnings.push(`unknown_pack:${packId}`);
      continue;
    }
    selectedPacks.push(pack);
  }

  selectedPacks.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  return {
    warnings,
    packs: selectedPacks,
    ids: selectedPacks.map((pack) => pack.id)
  };
}

export function composeBudgetOverrides(packs, environment) {
  const budgets = {};
  for (const pack of packs) {
    Object.assign(budgets, pack.budget_overrides || {});
    const envOverride = pack.environment_overrides?.[environment];
    if (envOverride?.budget_overrides) {
      Object.assign(budgets, envOverride.budget_overrides);
    }
  }
  return budgets;
}

export function resolvePolicyOutcome({ packs, actionClass, environment }) {
  let winner = null;
  let winnerPack = null;

  for (const pack of packs) {
    const candidates = [];
    const envOverride = pack.environment_overrides?.[environment];
    if (pack.default_outcomes?.[actionClass]) {
      candidates.push(pack.default_outcomes[actionClass]);
    }
    if (envOverride?.default_outcomes?.[actionClass]) {
      candidates.push(envOverride.default_outcomes[actionClass]);
    }

    for (const candidate of candidates) {
      if (winner === null || OUTCOME_RANK[candidate] > OUTCOME_RANK[winner]) {
        winner = candidate;
        winnerPack = pack.id;
      }
    }
  }

  return {
    outcome: winnerPack ? winner : "deny",
    winningPack: winnerPack
  };
}
