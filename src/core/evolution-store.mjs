import { errorResult, okResult } from "../result.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asEpochMillis(value) {
  return new Date(value).getTime();
}

function normalizePacks(patch) {
  return (patch?.packs || []).map((pack) => ({
    ...pack,
    default_outcomes: pack.default_outcomes || {},
    budget_overrides: pack.budget_overrides || {},
    environment_overrides: pack.environment_overrides || {},
    scope_overrides: pack.scope_overrides || []
  }));
}

export function createEvolutionStore({ clock, policyStore } = {}) {
  const suggestions = new Map();
  const sessionPatches = new Map();

  function supportsPersistence() {
    return !!policyStore;
  }

  function pruneExpired(now = clock?.now?.() || new Date()) {
    const threshold = asEpochMillis(now);
    for (const [id, record] of suggestions.entries()) {
      if (asEpochMillis(record.suggestion.expires_at) <= threshold) {
        suggestions.delete(id);
      }
    }
  }

  function registerSuggestion(record) {
    suggestions.set(record.suggestion.suggestion_id, clone(record));
    return clone(record.suggestion);
  }

  function getSuggestion(id, now = clock?.now?.() || new Date()) {
    pruneExpired(now);
    const record = suggestions.get(id);
    return record ? clone(record) : null;
  }

  function listPersistentPacks() {
    if (!policyStore) {
      return [];
    }
    return policyStore.listPacks();
  }

  function getEffectivePacks() {
    const persistentPacks = listPersistentPacks();
    const sessionPacks = [...sessionPatches.values()].flatMap((patch) => normalizePacks(patch));
    return [
      ...persistentPacks,
      ...sessionPacks
    ];
  }

  function applySuggestion({ suggestionId, decision, persist = "session", now = clock?.now?.() || new Date() }) {
    const record = getSuggestion(suggestionId, now);
    if (!record) {
      return errorResult("suggestion.not_found", "Suggestion could not be found or has expired.");
    }

    if (decision === "reject") {
      suggestions.delete(suggestionId);
      return okResult({
        status: "rejected",
        suggestion_id: suggestionId,
        persist
      });
    }

    if (persist === "policy_store") {
      if (!policyStore) {
        return errorResult("suggestion.persistence_unavailable", "No durable policy store is configured.");
      }
      if (!record.policyStorePatch) {
        return errorResult("suggestion.persistence_unsupported", "Suggestion does not support durable persistence.");
      }
      policyStore.applyPatch(record.policyStorePatch);
      suggestions.delete(suggestionId);
      return okResult({
        status: "applied",
        suggestion_id: suggestionId,
        persist,
        applied_patch: clone(record.policyStorePatch)
      });
    }

    sessionPatches.set(suggestionId, clone(record.sessionPatch));
    suggestions.delete(suggestionId);
    return okResult({
      status: "applied",
      suggestion_id: suggestionId,
      persist: "session",
      applied_patch: clone(record.sessionPatch)
    });
  }

  return {
    supportsPersistence,
    registerSuggestion,
    getSuggestion,
    getEffectivePacks,
    applySuggestion
  };
}
