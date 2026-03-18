export const OUTCOME_MESSAGES = Object.freeze({
  allow: "Action is allowed under effective policy.",
  allow_with_warning: "Action is allowed with warning under effective policy.",
  allow_with_approval: "Action requires approval under effective policy.",
  deny: "Action is denied under effective policy."
});

export const CODE_MESSAGES = Object.freeze({
  "authority.invalid_config": "Authority configuration is incomplete.",
  "authority.invalid_request": "Authority request is missing required fields.",
  "policy.unknown_action": "Unknown action class.",
  "policy.context_missing": "Required evaluation context is missing.",
  "policy.class_denied": "Action is denied under effective policy.",
  "policy.pack_denied": "Action is denied by an effective policy pack.",
  "policy.approval_required": "Action requires approval under effective policy.",
  "token.expired": "Capability token has expired.",
  "token.invalid_signature": "Capability token could not be verified.",
  "token.unknown_kid": "Capability token could not be verified.",
  "token.malformed": "Capability token could not be verified.",
  "token.type_mismatch": "Token type does not match the requested verification flow.",
  "token.scope_missing": "Capability token does not cover this action.",
  "token.budget_exhausted": "Budget has been exhausted."
});

export function messageForCode(code, fallback = "Request could not be processed.") {
  return CODE_MESSAGES[code] || fallback;
}

export function messageForOutcome(outcome) {
  return OUTCOME_MESSAGES[outcome] || OUTCOME_MESSAGES.deny;
}

