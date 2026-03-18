import crypto from "node:crypto";
import { decodeBase64Url, encodeBase64Url } from "../base64url.mjs";

function importPrivateKey(jwk) {
  return crypto.createPrivateKey({ key: jwk, format: "jwk" });
}

function importPublicKey(jwk) {
  const { kty, crv, x } = jwk;
  return crypto.createPublicKey({ key: { kty, crv, x }, format: "jwk" });
}

export function signJws(payload, privateJwk, { kid, typ } = {}) {
  const header = {
    alg: "EdDSA",
    ...(kid ? { kid } : {}),
    ...(typ ? { typ } : {})
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign(null, Buffer.from(signingInput), importPrivateKey(privateJwk));
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

export function verifyJws(token, jwks) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) {
      return { ok: false, error: "token.malformed" };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8"));
    const payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8"));
    const key = jwks.keys.find((candidate) => candidate.kid === header.kid);

    if (!key) {
      return { ok: false, error: "token.unknown_kid", header, payload };
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const verified = crypto.verify(
      null,
      Buffer.from(signingInput),
      importPublicKey(key),
      decodeBase64Url(encodedSignature)
    );

    if (!verified) {
      return { ok: false, error: "token.invalid_signature", header, payload };
    }

    return { ok: true, header, payload };
  } catch {
    return { ok: false, error: "token.malformed" };
  }
}
