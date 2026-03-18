import { PROTOCOL_VERSION } from "../protocol/constants.mjs";
import { createBudgetEffects, createDefaultBudgets, evaluateBudget } from "./budget-policy.mjs";
import { buildDecisionRecord, buildDeniedDecision } from "./decision-record.mjs";
import { composeBudgetOverrides, resolvePackSelection, resolvePolicyOutcome } from "./packs.mjs";
import { parseActionDescriptor } from "./normalize.mjs";

export function createEvaluator({ packStore, protocolVersion = PROTOCOL_VERSION } = {}) {
  if (!packStore) {
    throw new Error("createEvaluator requires a packStore");
  }

  function issueBudgetMap({ requestedPacks, environment }) {
    const selection = resolvePackSelection(packStore, requestedPacks);
    const budgetOverrides = composeBudgetOverrides(selection.packs, environment);
    return {
      selection,
      budgets: createDefaultBudgets(budgetOverrides)
    };
  }

  function evaluateTokenAction({ tokenPayload, normalizedAction }) {
    const selection = resolvePackSelection(packStore, tokenPayload.packs || []);
    const policy = resolvePolicyOutcome({
      packs: selection.packs,
      actionClass: normalizedAction.action_class,
      environment: tokenPayload.env
    });
    const bucket = evaluateBudget(normalizedAction.action_class, tokenPayload.bud || {});

    if (bucket.denied) {
      return buildDeniedDecision({
        code: "token.budget_exhausted",
        policyVersion: tokenPayload.pver || protocolVersion,
        policyPacks: selection.ids,
        budgetEffects: createBudgetEffects(bucket.bucket, 0, bucket.remaining)
      });
    }

    if ((normalizedAction.action_class === "read" || normalizedAction.action_class === "network")
      && !tokenPayload.cap?.includes(normalizedAction.action_class)) {
      return buildDeniedDecision({
        code: "token.scope_missing",
        policyVersion: tokenPayload.pver || protocolVersion,
        policyPacks: selection.ids,
        budgetEffects: createBudgetEffects(bucket.bucket, 0, bucket.remaining)
      });
    }

    const reasonCodes = [];
    const approvalRequirements = [];
    if (policy.outcome === "deny") {
      reasonCodes.push(policy.winningPack ? "policy.pack_denied" : "policy.class_denied");
    } else if (policy.outcome === "allow_with_approval") {
      reasonCodes.push("policy.approval_required");
      approvalRequirements.push(normalizedAction.action_class);
    }

    return buildDecisionRecord({
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
