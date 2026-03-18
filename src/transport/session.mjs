import { errorResult, okResult } from "../result.mjs";

export function createSession() {
  let phase = "new";

  function initialize() {
    if (phase !== "new") {
      return errorResult("already_initialized", "Session has already been initialized.");
    }
    phase = "initializing";
    return okResult({ phase });
  }

  function markReady() {
    if (phase !== "initializing") {
      return errorResult("not_initialized", "Session has not completed initialization.");
    }
    phase = "ready";
    return okResult({ phase });
  }

  function ensureCanServeTools() {
    if (phase === "initializing" || phase === "ready") {
      return okResult({ phase });
    }
    return errorResult("not_initialized", "Session is not ready for tool calls.");
  }

  return {
    get phase() {
      return phase;
    },
    initialize,
    markReady,
    ensureCanServeTools
  };
}
