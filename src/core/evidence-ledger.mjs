import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readEntries(filePath) {
  try {
    const source = fs.readFileSync(filePath, "utf8");
    return source
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function appendEntry(filePath, entry) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`);
}

function buildEntryHash(entry) {
  const payload = {
    ...entry
  };
  delete payload.entry_hash;
  return sha256(JSON.stringify(payload));
}

function hashText(value) {
  return `sha256:${sha256(String(value || ""))}`;
}

export function createEvidenceLedger({ filePath, clock }) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("createEvidenceLedger requires filePath");
  }

  function appendTypedEntry(type, payload) {
    const entries = readEntries(filePath);
    const previous = entries[entries.length - 1];
    const entry = {
      entry_id: `${type}_${entries.length + 1}`,
      type,
      timestamp: (clock?.now?.() || new Date()).toISOString(),
      prev_hash: previous?.entry_hash || null,
      ...payload
    };
    entry.entry_hash = buildEntryHash(entry);
    appendEntry(filePath, entry);
    return clone(entry);
  }

  return {
    filePath,
    appendEvaluation({ tokenPayload, normalizedAction, decision, suggestion, decisionToken }) {
      return appendTypedEntry("policy.evaluate", {
        session_id: tokenPayload?.mid || null,
        trace_id: normalizedAction?.trace_id || null,
        intent_summary: {
          action_class: normalizedAction?.action_class || null,
          target: normalizedAction?.target || null,
          resource_refs: normalizedAction?.resource_refs || []
        },
        verdict: {
          outcome: decision?.outcome || null,
          reason_codes: decision?.reason_codes || [],
          policy_packs: decision?.policy_packs || []
        },
        suggestion: suggestion || null,
        decision_token_hash: hashText(decisionToken)
      });
    },
    recordResult({ sessionId, traceId, result, artifacts = [], compensationPlan = [] }) {
      return appendTypedEntry("recordResult", {
        session_id: sessionId || null,
        trace_id: traceId || null,
        result: result || {},
        artifacts,
        compensation_plan: compensationPlan
      });
    },
    buildRollbackPlan({ sessionId, traceId } = {}) {
      const entries = readEntries(filePath);
      const matching = entries.filter((entry) => {
        if (traceId) {
          return entry.trace_id === traceId;
        }
        if (sessionId) {
          return entry.session_id === sessionId;
        }
        return false;
      });

      const compensationPlans = matching.flatMap((entry) => entry.compensation_plan || []);
      const artifacts = matching.flatMap((entry) => entry.artifacts || []);

      return {
        session_id: sessionId || null,
        trace_id: traceId || null,
        instructions: compensationPlans,
        artifacts
      };
    },
    verifyIntegrity() {
      const entries = readEntries(filePath);
      let previousHash = null;
      for (const entry of entries) {
        if (entry.prev_hash !== previousHash) {
          return {
            ok: false,
            failed_entry_id: entry.entry_id,
            expected_prev_hash: previousHash,
            actual_prev_hash: entry.prev_hash
          };
        }
        const expectedHash = buildEntryHash(entry);
        if (entry.entry_hash !== expectedHash) {
          return {
            ok: false,
            failed_entry_id: entry.entry_id,
            expected_entry_hash: expectedHash,
            actual_entry_hash: entry.entry_hash
          };
        }
        previousHash = entry.entry_hash;
      }

      return {
        ok: true,
        entries: entries.length
      };
    }
  };
}
