import crypto from "node:crypto";
import { signJws } from "../crypto/jws.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asEpochSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function stableTokenId(prefix, payload) {
  return `${prefix}:${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 24)}`;
}

function buildAgentCard({ federationProfile, publishedKeys, evidenceSummary }) {
  const baseCard = {
    id: federationProfile.agentCard?.id || `${federationProfile.issuerDid}#agent-card`,
    issuer_did: federationProfile.issuerDid,
    verification: {
      jwks: publishedKeys,
      did_document: federationProfile.didDocument || null
    },
    trust_score: evidenceSummary?.trust_score ?? federationProfile.agentCard?.trust_score ?? null,
    sla_constraints: federationProfile.agentCard?.sla_constraints || null
  };
  return {
    ...baseCard,
    ...(federationProfile.agentCardMetadataBuilder
      ? federationProfile.agentCardMetadataBuilder(baseCard)
      : {})
  };
}

function subjectDidForRequest(federationProfile, request) {
  if (typeof federationProfile.subjectDidBuilder === "function") {
    return federationProfile.subjectDidBuilder(request.subject);
  }
  return `did:example:${String(request.subject.workload_id || "workload").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function subjectDidForToken(federationProfile, tokenPayload) {
  if (typeof federationProfile.subjectDidBuilder === "function") {
    return federationProfile.subjectDidBuilder({
      workload_id: tokenPayload.sub,
      tenant_id: tokenPayload.tid,
      mission_id: tokenPayload.mid,
      environment: tokenPayload.env
    });
  }
  return `did:example:${String(tokenPayload.sub || "workload").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function buildVcJwt(payload, signingKey) {
  return signJws(payload, signingKey.privateJwk, {
    kid: signingKey.kid,
    typ: "vc+jwt"
  });
}

export function createFederationBridge({ federationProfile, publishedKeys, signingKey, clock }) {
  if (!federationProfile) {
    return null;
  }

  function keysView(evidenceSummary = null) {
    return {
      issuer_did: federationProfile.issuerDid,
      did_document: federationProfile.didDocument || null,
      supported_attestation_formats: ["jws", "vc+jwt"],
      verification_key: {
        jwks: clone(publishedKeys),
        did_document: federationProfile.didDocument || null
      },
      agent_card: buildAgentCard({
        federationProfile,
        publishedKeys,
        evidenceSummary
      })
    };
  }

  function issueCapabilityAttestation(request, tokenPayload) {
    const now = clock?.now?.() || new Date();
    const iat = asEpochSeconds(now);
    const subjectDid = subjectDidForRequest(federationProfile, request);
    const vcPayload = {
      iss: federationProfile.issuerDid,
      sub: subjectDid,
      iat,
      nbf: iat,
      exp: tokenPayload.exp,
      jti: stableTokenId("capability", tokenPayload),
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "CapabilityCredential"],
        credentialSubject: {
          id: subjectDid,
          capabilities: tokenPayload.cap,
          policy_packs: tokenPayload.packs,
          budgets: tokenPayload.bud
        }
      }
    };

    return {
      subject_did: subjectDid,
      vc_jwt: buildVcJwt(vcPayload, federationProfile.vcSigningKey || signingKey),
      agent_card: keysView().agent_card
    };
  }

  function issueDecisionAttestation(tokenPayload, decision) {
    const now = clock?.now?.() || new Date();
    const iat = asEpochSeconds(now);
    const subjectDid = subjectDidForToken(federationProfile, tokenPayload);
    const vcPayload = {
      iss: federationProfile.issuerDid,
      sub: subjectDid,
      iat,
      nbf: iat,
      exp: iat + federationProfile.decisionCredentialTtlSeconds,
      jti: stableTokenId("decision", {
        subjectDid,
        action_hash: decision.action_hash,
        outcome: decision.outcome
      }),
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "PolicyDecisionCredential"],
        credentialSubject: {
          id: subjectDid,
          action_hash: decision.action_hash,
          outcome: decision.outcome,
          reason_codes: decision.reason_codes
        }
      }
    };

    return {
      subject_did: subjectDid,
      vc_jwt: buildVcJwt(vcPayload, federationProfile.vcSigningKey || signingKey),
      agent_card: keysView().agent_card
    };
  }

  return {
    keysView,
    issueCapabilityAttestation,
    issueDecisionAttestation
  };
}
