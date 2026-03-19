import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchScopeRule } from "./resource-refs.mjs";
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

function normalizeOverlayPack(pack) {
  return validatePack({
    ...pack,
    default_outcomes: pack.default_outcomes || {},
    budget_overrides: pack.budget_overrides || {},
    environment_overrides: pack.environment_overrides || {},
    scope_overrides: pack.scope_overrides || []
  }, pack.id || "overlay-pack");
}

export function resolvePackSelection(packStore, requestedPackIds = [], overlayPacks = []) {
  const warnings = [];
  const overlayMap = new Map((overlayPacks || []).map((pack) => {
    const normalized = normalizeOverlayPack(pack);
    return [normalized.id, normalized];
  }));
  const selectedIds = new Set([
    "baseline",
    ...(requestedPackIds || []),
    ...overlayMap.keys()
  ]);
  const selectedPacks = [];

  for (const packId of selectedIds) {
    const pack = overlayMap.get(packId) || packStore.packMap.get(packId);
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

export function applyBudgetOverrides(baseBudgets = {}, overrides = {}) {
  const next = {
    ...baseBudgets
  };

  for (const [bucket, value] of Object.entries(overrides)) {
    if (typeof value === "number" && (typeof next[bucket] !== "number" || value > next[bucket])) {
      next[bucket] = value;
    }
  }

  return next;
}

function scopeSpecificity(match) {
  switch (match?.match_kind) {
    case "exact":
      return 3;
    case "prefix":
      return 2;
    case "glob":
      return 1;
    default:
      return 0;
  }
}

function pushCandidate(candidates, candidate) {
  if (!candidate.outcome) {
    return;
  }
  candidates.push(candidate);
}

function collectScopeCandidates(pack, envOverride, normalizedAction) {
  const candidates = [];
  for (const rule of pack.scope_overrides || []) {
    const match = matchScopeRule(rule, normalizedAction);
    if (match) {
      pushCandidate(candidates, {
        outcome: rule.outcome,
        packId: pack.id,
        source: "scope_override",
        rule,
        match
      });
    }
  }
  for (const rule of envOverride?.scope_overrides || []) {
    const match = matchScopeRule(rule, normalizedAction);
    if (match) {
      pushCandidate(candidates, {
        outcome: rule.outcome,
        packId: pack.id,
        source: "environment_scope_override",
        rule,
        match
      });
    }
  }
  return candidates;
}

export function resolvePolicyOutcome({ packs, actionClass, environment, normalizedAction = null }) {
  let winner = null;
  let winnerPack = null;
  let winnerSource = null;
  let winningRule = null;
  let winningMatch = null;
  let winnerSpecificity = -1;

  for (const pack of packs) {
    const candidates = [];
    const envOverride = pack.environment_overrides?.[environment];
    if (pack.default_outcomes?.[actionClass]) {
      pushCandidate(candidates, {
        outcome: pack.default_outcomes[actionClass],
        packId: pack.id,
        source: "default_outcome",
        rule: null,
        match: null
      });
    }
    if (envOverride?.default_outcomes?.[actionClass]) {
      pushCandidate(candidates, {
        outcome: envOverride.default_outcomes[actionClass],
        packId: pack.id,
        source: "environment_default_outcome",
        rule: null,
        match: null
      });
    }
    if (normalizedAction) {
      candidates.push(...collectScopeCandidates(pack, envOverride, normalizedAction));
    }

    for (const candidate of candidates) {
      const candidateSpecificity = scopeSpecificity(candidate.match);
      const shouldReplace = winner === null
        || candidateSpecificity > winnerSpecificity
        || (candidateSpecificity === winnerSpecificity && OUTCOME_RANK[candidate.outcome] > OUTCOME_RANK[winner]);
      if (shouldReplace) {
        winner = candidate.outcome;
        winnerPack = candidate.packId;
        winnerSource = candidate.source;
        winningRule = candidate.rule;
        winningMatch = candidate.match;
        winnerSpecificity = candidateSpecificity;
      }
    }
  }

  return {
    outcome: winnerPack ? winner : "deny",
    winningPack: winnerPack,
    winningSource: winnerSource,
    winningRule,
    winningMatch
  };
}
