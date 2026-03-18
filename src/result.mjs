export function okResult(value) {
  return {
    status: "ok",
    code: "ok",
    value
  };
}

export function errorResult(code, message, details) {
  return {
    status: "error",
    code,
    message,
    ...(details ? { details } : {})
  };
}

