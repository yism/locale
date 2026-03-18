import { createAuthority } from "../core/authority.mjs";
import { createReferenceAuthority } from "../reference-runtime.mjs";
import { MCP_PROTOCOL_VERSION, PROTOCOL_VERSION } from "../protocol/constants.mjs";
import { verifyCapabilityToken } from "../verifier/index.mjs";
import { transportError } from "./errors.mjs";
import { ok } from "./jsonrpc.mjs";
import { getToolDefinitions, invokeTool } from "./contracts.mjs";
import { createSession } from "./session.mjs";

export function createMcpServer(options = {}) {
  const authority = options.authority || (options.authorityConfig ? createAuthority(options.authorityConfig) : createReferenceAuthority());
  const session = options.session || createSession();

  function handleRequest(request) {
    try {
      if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
        return transportError(request?.id ?? null, "invalid_request_shape");
      }

      if (request.method === "notifications/initialized") {
        const ready = session.markReady();
        if (ready.status === "error") {
          return transportError(request.id ?? null, ready.code);
        }
        return null;
      }

      if (request.method === "initialize") {
        const requestedVersion = request.params?.protocolVersion;
        if (requestedVersion && requestedVersion !== MCP_PROTOCOL_VERSION) {
          return transportError(request.id, "unsupported_protocol_version", `Expected ${MCP_PROTOCOL_VERSION}`);
        }
        const initializing = session.initialize();
        if (initializing.status === "error") {
          return transportError(request.id, initializing.code);
        }
        return ok(request.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          serverInfo: {
            name: "capability-policy-authority",
            version: PROTOCOL_VERSION
          },
          capabilities: {
            tools: {
              listChanged: false
            }
          }
        });
      }

      if (request.method === "tools/list") {
        const ready = session.ensureCanServeTools();
        if (ready.status === "error") {
          return transportError(request.id, ready.code);
        }
        return ok(request.id, getToolDefinitions());
      }

      if (request.method === "tools/call") {
        const ready = session.ensureCanServeTools();
        if (ready.status === "error") {
          return transportError(request.id, ready.code);
        }
        const toolName = request.params?.name;
        if (!toolName) {
          return transportError(request.id, "invalid_params", "name is required");
        }

        const result = invokeTool(authority, toolName, request.params?.arguments || {}, { verifyCapabilityToken });
        if (result.status === "error") {
          return transportError(request.id, result.code, result.message);
        }
        return ok(request.id, result.value);
      }

      return transportError(request.id, "method_not_found");
    } catch (cause) {
      return transportError(request?.id ?? null, "internal_evaluator_error", cause instanceof Error ? cause.message : String(cause));
    }
  }

  return {
    authority,
    state: session,
    handleRequest,
    toolsListResult: getToolDefinitions
  };
}
