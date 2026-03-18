import { createMcpServer } from "./mcp-server.mjs";
import { parseJson } from "./jsonrpc.mjs";

function encodeFrame(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  return Buffer.concat([header, body]);
}

export function extractFrames(buffer) {
  const messages = [];
  let remainder = buffer;

  while (true) {
    const separator = remainder.indexOf("\r\n\r\n");
    if (separator === -1) {
      break;
    }
    const header = remainder.subarray(0, separator).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      throw new Error("Missing Content-Length header");
    }
    const length = Number(match[1]);
    const start = separator + 4;
    const end = start + length;
    if (remainder.length < end) {
      break;
    }
    const body = remainder.subarray(start, end).toString("utf8");
    messages.push(body);
    remainder = remainder.subarray(end);
  }

  return { messages, remainder };
}

export function startStdioServer(options = {}) {
  const server = createMcpServer(options);
  let buffer = Buffer.alloc(0);

  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const extracted = extractFrames(buffer);
    buffer = extracted.remainder;

    for (const rawMessage of extracted.messages) {
      const parsed = parseJson(rawMessage);
      if (parsed.status === "error") {
        continue;
      }
      const response = server.handleRequest(parsed.value);
      if (response) {
        process.stdout.write(encodeFrame(response));
      }
    }
  });
}

export function encodeResponseFrame(message) {
  return encodeFrame(message).toString("utf8");
}
