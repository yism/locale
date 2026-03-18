export const CANONICAL_ACTIONS = Object.freeze([
  "read",
  "write",
  "network",
  "deploy",
  "commerce",
  "identity",
  "secrets",
  "admin"
]);

export const ACTION_SET = new Set(CANONICAL_ACTIONS);

export const OUTCOME_RANK = Object.freeze({
  allow: 0,
  allow_with_warning: 1,
  allow_with_approval: 2,
  deny: 3
});

export function budgetBucketFor(actionClass) {
  switch (actionClass) {
    case "read":
      return "read_per_minute";
    case "network":
      return "network_per_minute";
    case "deploy":
      return "deploy_per_run";
    case "commerce":
      return "commerce_per_run";
    case "write":
      return "write_per_run";
    case "identity":
      return "identity_per_run";
    case "secrets":
      return "secrets_per_run";
    case "admin":
      return "admin_per_run";
    default:
      return null;
  }
}
