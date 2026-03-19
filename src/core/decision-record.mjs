import { messageForCode, messageForOutcome } from "./messages.mjs";
import { hashNormalizedAction } from "./normalize.mjs";
import { createBudgetEffects } from "./budget-policy.mjs";

export function buildDecisionRecord({
  normalizedAction,
  outcome,
  reasonCodes = [],
  policyVersion,
  policyPacks,
  budgetEffects,
  approvalRequirements = [],
  policySuggestion = null
}) {
  return {
    action_hash: normalizedAction ? hashNormalizedAction(normalizedAction) : "sha256:unbound",
    outcome,
    reason_codes: reasonCodes,
    message: reasonCodes.length > 0 ? messageForCode(reasonCodes[0], messageForOutcome(outcome)) : messageForOutcome(outcome),
    policy_version: policyVersion,
    policy_packs: policyPacks,
    budget_effects: budgetEffects || createBudgetEffects(null, 0, null),
    approval_requirements: approvalRequirements,
    ...(policySuggestion ? { policy_suggestion: policySuggestion } : {})
  };
}

export function buildDeniedDecision({
  code,
  policyVersion,
  policyPacks,
  budgetEffects,
  actionHash = "sha256:unbound",
  policySuggestion = null
}) {
  return {
    action_hash: actionHash,
    outcome: "deny",
    reason_codes: [code],
    message: messageForCode(code),
    policy_version: policyVersion,
    policy_packs: policyPacks,
    budget_effects: budgetEffects || createBudgetEffects(null, 0, null),
    approval_requirements: [],
    ...(policySuggestion ? { policy_suggestion: policySuggestion } : {})
  };
}
