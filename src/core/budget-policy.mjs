import { budgetBucketFor } from "./taxonomy.mjs";

export function createBudgetEffects(rateBucket, unitsConsumed, remainingEstimate) {
  return {
    rate_bucket: rateBucket,
    units_consumed: unitsConsumed,
    remaining_estimate: remainingEstimate
  };
}

export function createDefaultBudgets(overrides = {}) {
  return {
    read_per_minute: 200,
    network_per_minute: 60,
    deploy_per_run: 0,
    commerce_per_run: 0,
    write_per_run: 0,
    identity_per_run: 0,
    secrets_per_run: 0,
    admin_per_run: 0,
    ...overrides
  };
}

export function evaluateBudget(actionClass, budgets) {
  const bucket = budgetBucketFor(actionClass);
  if (!bucket) {
    return { denied: true, bucket: null, remaining: null, units: 0 };
  }

  const current = budgets?.[bucket];
  if (typeof current !== "number") {
    return { denied: false, bucket, remaining: null, units: 0 };
  }

  if (current <= 0 && (actionClass === "read" || actionClass === "network")) {
    return { denied: true, bucket, remaining: current, units: 0 };
  }

  if (current <= 0) {
    return { denied: false, bucket, remaining: current, units: 0 };
  }

  return { denied: false, bucket, remaining: current - 1, units: 1 };
}

