import { PROTOCOL_VERSION, SUPPORTED_TOKEN_FORMATS } from "../protocol/constants.mjs";

export const REFERENCE_KEY_PAIR = {
  kid: "kid_2026_03",
  publicJwk: {
    kty: "OKP",
    crv: "Ed25519",
    x: "a55L8irICcrjR4AHzlLuJdKh7V8dFHGE7PlqXCmzjP0"
  },
  privateJwk: {
    kty: "OKP",
    crv: "Ed25519",
    x: "a55L8irICcrjR4AHzlLuJdKh7V8dFHGE7PlqXCmzjP0",
    d: "DUjmfOXaliXk14T7Ay26JScMrYip6F3WMQLVOJCe1Q0"
  }
};

export const REFERENCE_JWKS = {
  protocol_version: PROTOCOL_VERSION,
  supported_token_formats: SUPPORTED_TOKEN_FORMATS,
  keys: [
    {
      kid: REFERENCE_KEY_PAIR.kid,
      kty: REFERENCE_KEY_PAIR.publicJwk.kty,
      crv: REFERENCE_KEY_PAIR.publicJwk.crv,
      alg: "EdDSA",
      use: "sig",
      x: REFERENCE_KEY_PAIR.publicJwk.x
    }
  ]
};

export function createPublishedJwks({ protocolVersion = PROTOCOL_VERSION, signingKeys, supportedTokenFormats = SUPPORTED_TOKEN_FORMATS } = {}) {
  if (!Array.isArray(signingKeys) || signingKeys.length === 0) {
    throw new Error("createPublishedJwks requires at least one signing key");
  }

  return {
    protocol_version: protocolVersion,
    supported_token_formats: [...supportedTokenFormats],
    keys: signingKeys.map((key) => ({
      kid: key.kid,
      kty: key.publicJwk.kty,
      crv: key.publicJwk.crv,
      alg: "EdDSA",
      use: "sig",
      x: key.publicJwk.x
    }))
  };
}
