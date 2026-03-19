import { PROTOCOL_VERSION } from "../protocol/constants.mjs";
import { createBudgetEffects, createDefaultBudgets, evaluateBudget } from "./budget-policy.mjs";
import { buildDecisionRecord, buildDeniedDecision } from "./decision-record.mjs";
import { buildPolicySuggestion } from "./suggestion-engine.mjs";
import { applyBudgetOverrides, composeBudgetOverrides, resolvePackSelection, resolvePolicyOutcome } from "./packs.mjs";
import { hashNormalizedAction, parseActionDescriptor } from "./normalize.mjs";

export function createEvaluator({
  packStore,
  protocolVersion = PROTOCOL_VERSION,
  evolutionStore = null,
  clock = { now: () => new Date() },
  suggestionTtlSeconds = 900
} = {}) {
  if (!packStore) {
    throw new Error("createEvaluator requires a packStore");
  }

  function currentOverlayPacks() {
    return evolutionStore?.getEffectivePacks?.() || [];
  }

  function maybeRegisterSuggestion({ normalizedAction, decision, policy, budget }) {
    if (!evolutionStore) {
      return null;
    }
    const built = buildPolicySuggestion({
      protocolVersion,
      now: clock.now(),
      ttlSeconds: suggestionTtlSeconds,
      normalizedAction,
      decision,
      policy,
      budget,
      evolutionStore
    });
    if (!built) {
      return null;
    }
    return evolutionStore.registerSuggestion(built.suggestionRecord);
  }

  function issueBudgetMap({ requestedPacks, environment }) {
    const selection = resolvePackSelection(packStore, requestedPacks, currentOverlayPacks());
    const budgetOverrides = composeBudgetOverrides(selection.packs, environment);
    return {
      selection,
      budgets: createDefaultBudgets(budgetOverrides)
    };
  }

  function evaluateTokenAction({ tokenPayload, normalizedAction }) {
    const overlayPacks = currentOverlayPacks();
    const selection = resolvePackSelection(packStore, tokenPayload.packs || [], overlayPacks);
    const budgetOverrides = composeBudgetOverrides(overlayPacks, tokenPayload.env);
    const effectiveBudgets = applyBudgetOverrides(createDefaultBudgets(tokenPayload.bud || {}), budgetOverrides);
    const policy = resolvePolicyOutcome({
      packs: selection.packs,
      actionClass: normalizedAction.action_class,
      environment: tokenPayload.env,
      normalizedAction
    });
    const bucket = evaluateBudget(normalizedAction.action_class, effectiveBudgets);

    if (bucket.denied) {
      const denied = buildDeniedDecision({
        code: "token.budget_exhausted",
        policyVersion: tokenPayload.pver || protocolVersion,
        policyPacks: selection.ids,
        budgetEffects: createBudgetEffects(bucket.bucket, 0, bucket.remaining),
        actionHash: hashNormalizedAction(normalizedAction)
      });
      const suggestion = maybeRegisterSuggestion({
        normalizedAction,
        decision: denied,
        policy,
        budget: bucket
      });
      return suggestion ? {
        ...denied,
        policy_suggestion: suggestion
      } : denied;
    }

    if ((normalizedAction.action_class === "read" || normalizedAction.action_class === "network")
      && !tokenPayload.cap?.includes(normalizedAction.action_class)) {
      const denied = buildDeniedDecision({
        code: "token.scope_missing",
        policyVersion: tokenPayload.pver || protocolVersion,
        policyPacks: selection.ids,
        budgetEffects: createBudgetEffects(bucket.bucket, 0, bucket.remaining),
        actionHash: hashNormalizedAction(normalizedAction)
      });
      const suggestion = maybeRegisterSuggestion({
        normalizedAction,
        decision: denied,
        policy,
        budget: bucket
      });
      return suggestion ? {
        ...denied,
        policy_suggestion: suggestion
      } : denied;
    }

    const reasonCodes = [];
    const approvalRequirements = [];
    if (policy.outcome === "deny") {
      reasonCodes.push(policy.winningPack ? "policy.pack_denied" : "policy.class_denied");
    } else if (policy.outcome === "allow_with_approval") {
      reasonCodes.push("policy.approval_required");
      approvalRequirements.push(normalizedAction.action_class);
    }

    const decision = buildDecisionRecord({
      normalizedAction,
      outcome: policy.outcome,
      reasonCodes,
      policyPacks: selection.ids,
      policyVersion: tokenPayload.pver || protocolVersion,
      approvalRequirements,
      budgetEffects: createBudgetEffects(
        bucket.bucket,
        policy.outcome === "allow" || policy.outcome === "allow_with_warning" ? bucket.units : 0,
        bucket.remaining
      )
    });
    const suggestion = (decision.outcome === "deny" || decision.outcome === "allow_with_approval")
      ? maybeRegisterSuggestion({
        normalizedAction,
        decision,
        policy,
        budget: bucket
      })
      : null;
    return suggestion ? {
      ...decision,
      policy_suggestion: suggestion
    } : decision;
  }

  function preflightLocally(tokenPayload, normalizedAction) {
    const evaluation = evaluateTokenAction({ tokenPayload, normalizedAction });
    return {
      outcome: evaluation.outcome,
      should_call_remote: evaluation.outcome === "allow_with_approval",
      reason_codes: evaluation.reason_codes,
      budget_effects: evaluation.budget_effects
    };
  }

  function parseAction(action) {
    return parseActionDescriptor(action);
  }

  return {
    packStore,
    parseAction,
    normalize: parseAction,
    issueBudgetMap,
    evaluateTokenAction,
    evaluateNormalizedAction: evaluateTokenAction,
    preflightLocally
  };
}
