import { errorResult, okResult } from "../result.mjs";

const TOOLS = Object.freeze([
  {
    name: "capabilities.get",
    description: "Issue a short-lived capability token for an orchestrator mission context.",
    inputSchema: {
      type: "object",
      required: ["subject"],
      properties: {
        subject: { type: "object" },
        context: { type: "object" },
        requested_packs: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  },
  {
    name: "policy.evaluate",
    description: "Evaluate a normalized action descriptor against effective policy.",
    inputSchema: {
      type: "object",
      required: ["capability_token", "action"],
      properties: {
        capability_token: { type: "string" },
        action: { type: "object" }
      }
    }
  },
  {
    name: "keys.get",
    description: "Return verification keys and current protocol metadata.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
]);

function validateCapabilitiesGetArgs(args) {
  if (!args?.subject?.workload_id || !args?.subject?.tenant_id || !args?.subject?.mission_id || !args?.subject?.environment) {
    return errorResult("invalid_params", "subject.workload_id, tenant_id, mission_id, and environment are required");
  }
  return okResult(args);
}

function validatePolicyEvaluateArgs(args) {
  if (!args?.capability_token || !args?.action) {
    return errorResult("invalid_params", "capability_token and action are required");
  }

  const tokenParts = String(args.capability_token).split(".");
  if (tokenParts.length !== 3) {
    return errorResult("malformed_token", "Expected compact JWS with three segments");
  }

  return okResult(args);
}

function validateKeysGetArgs(args) {
  return okResult(args || {});
}

const VALIDATORS = Object.freeze({
  "capabilities.get": validateCapabilitiesGetArgs,
  "policy.evaluate": validatePolicyEvaluateArgs,
  "keys.get": validateKeysGetArgs
});

export function getToolDefinitions() {
  return { tools: TOOLS.map((tool) => ({ ...tool })) };
}

export function invokeTool(authority, name, args, verifier) {
  const validate = VALIDATORS[name];
  if (!validate) {
    return errorResult("invalid_params", `Unknown tool '${name}'`);
  }

  const validated = validate(args || {});
  if (validated.status === "error") {
    return validated;
  }

  if (name === "capabilities.get") {
    return okResult({
      content: [],
      structuredContent: authority.issueCapability(validated.value)
    });
  }

  if (name === "policy.evaluate") {
    return okResult({
      content: [],
      structuredContent: authority.evaluateAction({
        capabilityToken: validated.value.capability_token,
        action: validated.value.action,
        verifier
      })
    });
  }

  return okResult({
    content: [],
    structuredContent: authority.getPublishedKeys()
  });
}

