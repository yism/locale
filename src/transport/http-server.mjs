import http from "node:http";
import { MCP_PROTOCOL_VERSION } from "../protocol/constants.mjs";
import { createMcpServer } from "./mcp-server.mjs";
import { parseJson } from "./jsonrpc.mjs";

export function createHttpHandler(options = {}) {
  const server = options.server || createMcpServer(options);

  return async function handleHttpRequest({ method, url, body }) {
    if (method === "GET" && url === "/health") {
      return {
        status: 200,
        headers: { "content-type": "application/json" },
        body: { ok: true }
      };
    }

    if (method !== "POST" || url !== "/mcp") {
      return {
        status: 404,
        headers: { "content-type": "application/json" },
        body: { error: "not_found" }
      };
    }

    const parsed = parseJson(body);
    const response = parsed.status === "ok"
      ? server.handleRequest(parsed.value)
      : {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
            data: { code: "invalid_request_shape" }
          }
        };

    return {
      status: 200,
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": MCP_PROTOCOL_VERSION
      },
      body: response
    };
  };
}

export function startHttpServer(options = {}) {
  const handler = createHttpHandler(options);
  const httpServer = http.createServer((req, res) => {
    let rawBody = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      rawBody += chunk;
    });
    req.on("end", async () => {
      const response = await handler({
        method: req.method,
        url: req.url,
        body: rawBody
      });
      res.writeHead(response.status, response.headers);
      res.end(JSON.stringify(response.body));
    });
  });

  return {
    listen(port = 0, host = "127.0.0.1") {
      return new Promise((resolve) => {
        httpServer.listen(port, host, () => resolve(httpServer.address()));
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}
