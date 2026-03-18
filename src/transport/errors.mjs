import { error as jsonrpcError } from "./jsonrpc.mjs";

const ERROR_DEFINITIONS = Object.freeze({
  invalid_request_shape: { jsonrpcCode: -32600, message: "Invalid Request" },
  invalid_params: { jsonrpcCode: -32602, message: "Invalid params" },
  unsupported_protocol_version: { jsonrpcCode: -32001, message: "Unsupported protocol version" },
  malformed_token: { jsonrpcCode: -32002, message: "Malformed token" },
  not_initialized: { jsonrpcCode: -32003, message: "Not initialized" },
  already_initialized: { jsonrpcCode: -32004, message: "Already initialized" },
  internal_evaluator_error: { jsonrpcCode: -32603, message: "Internal evaluator error" },
  method_not_found: { jsonrpcCode: -32601, message: "Method not found" }
});

export function transportError(id, code, detail) {
  const definition = ERROR_DEFINITIONS[code];
  if (!definition) {
    throw new Error(`Unknown transport error code '${code}'`);
  }

  return jsonrpcError(id, definition.jsonrpcCode, definition.message, {
    code,
    ...(detail ? { detail } : {})
  });
}

