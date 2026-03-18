import crypto from "node:crypto";
import { errorResult, okResult } from "../result.mjs";
import { ACTION_SET } from "./taxonomy.mjs";

export function parseActionDescriptor(action) {
  const normalized = {
    protocol: String(action?.protocol || "").toLowerCase(),
    action_class: String(action?.action_class || "").toLowerCase(),
    target: String(action?.target || "").trim(),
    input_hash: String(action?.input_hash || "").trim(),
    resource_refs: [...(action?.resource_refs || [])].map(String).sort(),
    idempotency_key: String(action?.idempotency_key || "").trim(),
    trace_id: String(action?.trace_id || "").trim()
  };

  if (!ACTION_SET.has(normalized.action_class)) {
    return errorResult("policy.unknown_action", "Unknown action class.", { normalized });
  }

  if (!normalized.protocol || !normalized.target || !normalized.input_hash) {
    return errorResult("policy.context_missing", "Required evaluation context is missing.", { normalized });
  }

  return okResult(normalized);
}

export function hashNormalizedAction(normalizedAction) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizedAction))
    .digest("hex")}`;
}

export const normalizeActionDescriptor = parseActionDescriptor;
