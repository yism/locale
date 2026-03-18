import { JSONRPC_VERSION } from "../protocol/constants.mjs";
import { errorResult, okResult } from "../result.mjs";

export function ok(id, result) {
  return { jsonrpc: JSONRPC_VERSION, id, result };
}

export function error(id, code, message, data) {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: id ?? null,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
}

export function parseJson(input) {
  try {
    return okResult(JSON.parse(input));
  } catch (error) {
    return errorResult("invalid_request_shape", "Request body is not valid JSON.", { cause: error instanceof Error ? error.message : String(error) });
  }
}
