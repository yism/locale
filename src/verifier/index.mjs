import { verifyJws } from "../crypto/jws.mjs";
import { createEvaluator } from "../core/evaluator.mjs";
import { errorResult, okResult } from "../result.mjs";

function evaluateTemporalClaims(payload, now) {
  const currentEpoch = Math.floor(new Date(now).getTime() / 1000);
  if (typeof payload?.exp !== "number" || payload.exp <= currentEpoch) {
    return errorResult("token.expired", "Token has expired.", { payload });
  }
  return okResult(payload);
}

function verifyTypedToken(token, jwks, expectedType, now = new Date()) {
  const verification = verifyJws(token, jwks);
  if (!verification.ok) {
    return errorResult(verification.error, "Token could not be verified.", {
      ...(verification.header ? { header: verification.header } : {}),
      ...(verification.payload ? { payload: verification.payload } : {})
    });
  }

  if (verification.header?.typ !== expectedType) {
    return errorResult("token.type_mismatch", "Token type does not match the requested verification flow.", {
      header: verification.header,
      payload: verification.payload,
      expected_type: expectedType
    });
  }

  const temporal = evaluateTemporalClaims(verification.payload, now);
  if (temporal.status === "error") {
    return temporal;
  }

  return okResult({
    header: verification.header,
    payload: verification.payload
  });
}

export function verifyCapabilityToken(token, jwks, now = new Date()) {
  return verifyTypedToken(token, jwks, "capability", now);
}

export function verifyDecisionToken(token, jwks, now = new Date()) {
  return verifyTypedToken(token, jwks, "decision", now);
}

export function preflightLocally(tokenPayload, normalizedAction, options = {}) {
  const evaluator = options.evaluator || createEvaluator(options);
  return evaluator.preflightLocally(tokenPayload, normalizedAction);
}
