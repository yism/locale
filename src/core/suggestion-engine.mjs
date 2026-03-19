import crypto from "node:crypto";
import { messageForCode } from "./messages.mjs";
import { getPrimaryCanonicalResourceRef } from "./resource-refs.mjs";

function asEpochSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableId(payload) {
  return `suggestion_${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 24)}`;
}

function createEmptyPack(id, protocolVersion) {
  return {
    id,
    version: protocolVersion,
    priority: 1000,
    default_outcomes: {},
    budget_overrides: {},
    environment_overrides: {},
    scope_overrides: []
  };
}

function createSessionScopePatch({ suggestionId, protocolVersion, normalizedAction, outcome, resource }) {
  const pack = createEmptyPack(`session_${suggestionId}`, protocolVersion);
  pack.scope_overrides.push({
    action_class: normalizedAction.action_class,
    resource,
    outcome
  });
  return { packs: [pack] };
}

function createPersistentScopePatch({ suggestionId, protocolVersion, normalizedAction, outcome, resource }) {
  const pack = createEmptyPack(`policy_${suggestionId}`, protocolVersion);
  pack.scope_overrides.push({
    action_class: normalizedAction.action_class,
    resource,
    outcome
  });
  return { packs: [pack] };
}

function createPersistentClassPatch({ suggestionId, protocolVersion, normalizedAction, outcome }) {
  const pack = createEmptyPack(`policy_${suggestionId}`, protocolVersion);
  pack.default_outcomes[normalizedAction.action_class] = outcome;
  return { packs: [pack] };
}

function createBudgetPatch({ suggestionId, protocolVersion, budgetBucket, nextBudget, packPrefix = "policy" }) {
  const pack = createEmptyPack(`${packPrefix}_${suggestionId}`, protocolVersion);
  pack.budget_overrides[budgetBucket] = nextBudget;
  return { packs: [pack] };
}

function createSuggestion({
  protocolVersion,
  now,
  ttlSeconds,
  suggestionId,
  kind,
  reasonCode,
  humanReadableReason,
  actionHash,
  minimalDelta,
  persistOptions
}) {
  const iat = asEpochSeconds(now);
  const payload = {
    protocolVersion,
    kind,
    reasonCode,
    actionHash,
    minimalDelta
  };
  const stableSuggestionId = suggestionId || stableId(payload);
  return {
    suggestion_id: stableSuggestionId,
    kind,
    reason_code: reasonCode,
    human_readable_reason: humanReadableReason,
    minimal_delta: clone(minimalDelta),
    action_hash: actionHash,
    expires_at: new Date((iat + ttlSeconds) * 1000).toISOString(),
    persist_options: persistOptions
  };
}

function finalizeSuggestion({
  protocolVersion,
  now,
  ttlSeconds,
  kind,
  reasonCode,
  humanReadableReason,
  actionHash,
  persistOptions,
  template,
  buildPatches
}) {
  const suggestionId = stableId({
    protocolVersion,
    kind,
    reasonCode,
    actionHash,
    template
  });
  const { sessionPatch, policyStorePatch } = buildPatches(suggestionId);
  const minimalDelta = {
    session_patch: sessionPatch,
    policy_store_patch: policyStorePatch
  };
  const suggestion = createSuggestion({
    protocolVersion,
    now,
    ttlSeconds,
    suggestionId,
    kind,
    reasonCode,
    humanReadableReason,
    actionHash,
    minimalDelta,
    persistOptions
  });
  return {
    suggestion,
    suggestionRecord: {
      suggestion,
      sessionPatch,
      policyStorePatch
    }
  };
}

export function buildPolicySuggestion({
  protocolVersion,
  now,
  ttlSeconds,
  normalizedAction,
  decision,
  policy,
  budget,
  evolutionStore
}) {
  const reasonCode = decision.reason_codes?.[0] || null;
  const actionHash = decision.action_hash;
  const persistOptions = ["session", ...(evolutionStore?.supportsPersistence() ? ["policy_store"] : [])];
  const primaryCanonicalRef = getPrimaryCanonicalResourceRef(normalizedAction);

  if (reasonCode === "token.budget_exhausted" && budget?.bucket) {
    const nextBudget = Math.max((budget.remaining ?? 0) + 1, 1);
    return finalizeSuggestion({
      protocolVersion,
      now,
      ttlSeconds,
      kind: "budget_adjustment",
      reasonCode,
      humanReadableReason: `Increase ${budget.bucket} budget to allow this action.`,
      actionHash,
      persistOptions,
      template: {
        bucket: budget.bucket,
        nextBudget
      },
      buildPatches(suggestionId) {
        return {
          sessionPatch: createBudgetPatch({
            suggestionId,
            protocolVersion,
            budgetBucket: budget.bucket,
            nextBudget,
            packPrefix: "session"
          }),
          policyStorePatch: evolutionStore?.supportsPersistence()
            ? createBudgetPatch({
              suggestionId,
              protocolVersion,
              budgetBucket: budget.bucket,
              nextBudget,
              packPrefix: "policy"
            })
            : null
        };
      }
    });
  }

  if ((reasonCode === "policy.pack_denied" || reasonCode === "policy.class_denied") && primaryCanonicalRef) {
    return finalizeSuggestion({
      protocolVersion,
      now,
      ttlSeconds,
      kind: "scope_grant",
      reasonCode,
      humanReadableReason: `Allow ${normalizedAction.action_class} access to ${primaryCanonicalRef.raw}.`,
      actionHash,
      persistOptions,
      template: {
        action_class: normalizedAction.action_class,
        resource: primaryCanonicalRef.raw,
        outcome: "allow"
      },
      buildPatches(suggestionId) {
        return {
          sessionPatch: createSessionScopePatch({
            suggestionId: suggestionId,
            protocolVersion,
            normalizedAction,
            outcome: "allow",
            resource: primaryCanonicalRef.raw
          }),
          policyStorePatch: evolutionStore?.supportsPersistence()
            ? createPersistentScopePatch({
              suggestionId: suggestionId,
              protocolVersion,
              normalizedAction,
              outcome: "allow",
              resource: primaryCanonicalRef.raw
            })
            : null
        };
      }
    });
  }

  if (decision.outcome === "allow_with_approval") {
    return finalizeSuggestion({
      protocolVersion,
      now,
      ttlSeconds,
      kind: "approval_grant",
      reasonCode: reasonCode || "policy.approval_required",
      humanReadableReason: `Allow ${normalizedAction.action_class} for target ${normalizedAction.target} in this session or widen policy for future runs.`,
      actionHash,
      persistOptions,
      template: {
        action_class: normalizedAction.action_class,
        target: normalizedAction.target,
        session_outcome: "allow",
        policy_outcome: "allow"
      },
      buildPatches(suggestionId) {
        return {
          sessionPatch: createSessionScopePatch({
            suggestionId,
            protocolVersion,
            normalizedAction,
            outcome: "allow",
            resource: `target:${normalizedAction.target}`
          }),
          policyStorePatch: evolutionStore?.supportsPersistence()
            ? createPersistentScopePatch({
              suggestionId,
              protocolVersion,
              normalizedAction,
              outcome: "allow",
              resource: `target:${normalizedAction.target}`
            })
            : null
        };
      }
    });
  }

  if ((reasonCode === "policy.pack_denied" || reasonCode === "policy.class_denied") && !primaryCanonicalRef) {
    return finalizeSuggestion({
      protocolVersion,
      now,
      ttlSeconds,
      kind: "pack_overlay",
      reasonCode,
      humanReadableReason: messageForCode(reasonCode),
      actionHash,
      persistOptions,
      template: {
        action_class: normalizedAction.action_class,
        target: normalizedAction.target
      },
      buildPatches(suggestionId) {
        return {
          sessionPatch: createSessionScopePatch({
            suggestionId,
            protocolVersion,
            normalizedAction,
            outcome: "allow",
            resource: `target:${normalizedAction.target}`
          }),
          policyStorePatch: evolutionStore?.supportsPersistence()
            ? createPersistentScopePatch({
              suggestionId,
              protocolVersion,
              normalizedAction,
              outcome: "allow",
              resource: `target:${normalizedAction.target}`
            })
            : null
        };
      }
    });
  }

  return null;
}
