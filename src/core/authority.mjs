import { signJws } from "../crypto/jws.mjs";
import { PROTOCOL_VERSION } from "../protocol/constants.mjs";
import { createEvaluator } from "./evaluator.mjs";
import { verifyCapabilityToken } from "../verifier/index.mjs";
import { buildDeniedDecision } from "./decision-record.mjs";
import { createBudgetEffects } from "./budget-policy.mjs";

function asEpochSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateAuthorityConfig(config) {
  const missing = [];
  if (!config?.clock || typeof config.clock.now !== "function") missing.push("clock.now()");
  if (!config?.issuer || typeof config.issuer !== "string") missing.push("issuer");
  if (!config?.signingKey?.kid || !config?.signingKey?.privateJwk || !config?.signingKey?.publicJwk) missing.push("signingKey");
  if (!config?.publishedJwks || !Array.isArray(config.publishedJwks.keys)) missing.push("publishedJwks");
  if (!config?.packStore) missing.push("packStore");
  if (!Number.isInteger(config?.tokenTtlSeconds) || config.tokenTtlSeconds <= 0) missing.push("tokenTtlSeconds");
  if (!config?.protocolVersion || typeof config.protocolVersion !== "string") missing.push("protocolVersion");

  if (missing.length > 0) {
    throw new Error(`createAuthority requires ${missing.join(", ")}`);
  }

  if (!config.publishedJwks.keys.some((key) => key.kid === config.signingKey.kid)) {
    throw new Error("createAuthority requires publishedJwks to include the signing key kid");
  }
}

function issueSignedToken(payload, signingKey, type) {
  return signJws(payload, signingKey.privateJwk, {
    kid: signingKey.kid,
    typ: type
  });
}

function buildDecisionTokenClaims({ issuer, protocolVersion, decision, now, ttlSeconds }) {
  const iat = asEpochSeconds(now);
  return {
    iss: issuer,
    typ: "decision",
    pver: protocolVersion,
    outcome: decision.outcome,
    policy_version: decision.policy_version,
    policy_packs: decision.policy_packs,
    reason_codes: decision.reason_codes,
    action_hash: decision.action_hash,
    approval_requirements: decision.approval_requirements,
    iat,
    exp: iat + ttlSeconds
  };
}

function buildCapabilityTokenClaims({ issuer, protocolVersion, signingKey, request, budgetResult, now, ttlSeconds }) {
  const iat = asEpochSeconds(now);
  return {
    iss: issuer,
    sub: request.subject.workload_id,
    tid: request.subject.tenant_id,
    mid: request.subject.mission_id,
    env: request.subject.environment,
    iat,
    exp: iat + ttlSeconds,
    kid: signingKey.kid,
    pver: protocolVersion,
    packs: budgetResult.selection.ids,
    cap: ["read", "network"],
    bud: budgetResult.budgets,
    ctx: request.context || {}
  };
}

function createPublishedKeysView(publishedJwks, policyPacks) {
  return {
    ...clone(publishedJwks),
    policy_packs: [...policyPacks]
  };
}

export function createAuthority(config) {
  validateAuthorityConfig(config);
  const evaluator = config.evaluator || createEvaluator({
    packStore: config.packStore,
    protocolVersion: config.protocolVersion
  });

  function issueCapability(request, issueOptions = {}) {
    const now = issueOptions.now ?? config.clock.now();
    const budgetResult = evaluator.issueBudgetMap({
      requestedPacks: request.requested_packs,
      environment: request.subject.environment
    });

    const tokenPayload = buildCapabilityTokenClaims({
      issuer: config.issuer,
      protocolVersion: config.protocolVersion,
      signingKey: config.signingKey,
      request,
      budgetResult,
      now,
      ttlSeconds: config.tokenTtlSeconds
    });
    const exp = tokenPayload.exp;

    return {
      token_format: "jws",
      authority_mode: config.mode || "runtime",
      capability_token: issueSignedToken(tokenPayload, config.signingKey, "capability"),
      expires_at: new Date(exp * 1000).toISOString(),
      effective_packs: budgetResult.selection.ids,
      issuance_warnings: budgetResult.selection.warnings
    };
  }

  function evaluateAction({ capabilityToken, action, now, verifier = { verifyCapabilityToken } }) {
    const evaluationTime = now ?? config.clock.now();
    const publishedKeys = getPublishedKeys();
    const verification = verifier.verifyCapabilityToken(capabilityToken, publishedKeys, evaluationTime);
    if (verification.status === "error") {
      const result = buildDeniedDecision({
        code: verification.code,
        policyVersion: config.protocolVersion,
        policyPacks: verification.details?.payload?.packs || ["baseline"],
        budgetEffects: createBudgetEffects(null, 0, null)
      });
      return {
        ...result,
        decision_token: issueSignedToken(
          buildDecisionTokenClaims({
            issuer: config.issuer,
            protocolVersion: config.protocolVersion,
            decision: result,
            now: evaluationTime,
            ttlSeconds: config.tokenTtlSeconds
          }),
          config.signingKey,
          "decision"
        )
      };
    }

    const parsed = evaluator.parseAction(action);
    const tokenPayload = verification.value.payload;
    if (parsed.status === "error") {
      const result = buildDeniedDecision({
        code: parsed.code,
        policyVersion: tokenPayload.pver || config.protocolVersion,
        policyPacks: tokenPayload.packs || ["baseline"],
        budgetEffects: createBudgetEffects(null, 0, null)
      });
      return {
        ...result,
        decision_token: issueSignedToken(
          buildDecisionTokenClaims({
            issuer: config.issuer,
            protocolVersion: config.protocolVersion,
            decision: result,
            now: evaluationTime,
            ttlSeconds: config.tokenTtlSeconds
          }),
          config.signingKey,
          "decision"
        )
      };
    }

    const evaluated = evaluator.evaluateTokenAction({
      tokenPayload,
      normalizedAction: parsed.value
    });

    return {
      outcome: evaluated.outcome,
      reason_codes: evaluated.reason_codes,
      message: evaluated.message,
      policy_version: evaluated.policy_version,
      policy_packs: evaluated.policy_packs,
      budget_effects: evaluated.budget_effects,
      approval_requirements: evaluated.approval_requirements,
      action_hash: evaluated.action_hash,
      decision_token: issueSignedToken(
        buildDecisionTokenClaims({
          issuer: config.issuer,
          protocolVersion: config.protocolVersion,
          decision: evaluated,
          now: evaluationTime,
          ttlSeconds: config.tokenTtlSeconds
        }),
        config.signingKey,
        "decision"
      )
    };
  }

  function getPublishedKeys() {
    return createPublishedKeysView(config.publishedJwks, evaluator.packStore.packs.map((pack) => pack.id));
  }

  return {
    config: Object.freeze({
      mode: config.mode || "runtime",
      issuer: config.issuer,
      tokenTtlSeconds: config.tokenTtlSeconds,
      protocolVersion: config.protocolVersion
    }),
    evaluator,
    issueCapability,
    evaluateAction,
    getPublishedKeys
  };
}
