import { createAuthority } from "./core/authority.mjs";
import { loadPackDirectory } from "./core/packs.mjs";
import { REFERENCE_JWKS, REFERENCE_KEY_PAIR } from "./crypto/keys.mjs";
import { PROTOCOL_VERSION } from "./protocol/constants.mjs";

const REFERENCE_TIME_ISO = "2026-03-18T18:00:00Z";
const REFERENCE_ISSUER = "cpa.reference";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createReferenceKeys() {
  return {
    signingKey: clone(REFERENCE_KEY_PAIR),
    publishedJwks: clone(REFERENCE_JWKS)
  };
}

export function createReferenceAuthority(overrides = {}) {
  const referenceKeys = createReferenceKeys();

  return createAuthority({
    mode: "reference",
    clock: overrides.clock || { now: () => new Date(REFERENCE_TIME_ISO) },
    issuer: overrides.issuer || REFERENCE_ISSUER,
    signingKey: overrides.signingKey || referenceKeys.signingKey,
    publishedJwks: overrides.publishedJwks || referenceKeys.publishedJwks,
    packStore: overrides.packStore || loadPackDirectory(),
    tokenTtlSeconds: overrides.tokenTtlSeconds || 3600,
    protocolVersion: overrides.protocolVersion || PROTOCOL_VERSION
  });
}
