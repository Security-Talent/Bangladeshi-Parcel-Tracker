"use strict";

const http = require("node:http");
const tracker = require("../../packages/bangladeshi-parcel-tracker");

const port = Number(process.env.PORT || 3001);
const bodyLimitBytes = 16 * 1024;

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

function statusFor(error) {
  if (error.code === "INVALID_INPUT" || error.code === "UNSUPPORTED_COURIER") return 400;
  if (error.code === "RATE_LIMITED") return 429;
  if (error.code === "TIMEOUT") return 504;
  return 502;
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ready: true, couriers: tracker.getSupportedCouriers() });
    return;
  }
  if (request.method !== "POST" || pathname !== "/api/track") {
    sendJson(response, 404, { code: "NOT_FOUND", message: "Endpoint not found." });
    return;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > bodyLimitBytes) {
      sendJson(response, 413, { code: "INVALID_INPUT", message: "Request body exceeds the 16 KiB limit." });
      request.resume();
      return;
    }
    chunks.push(chunk);
  }

  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    sendJson(response, 400, { code: "INVALID_INPUT", message: "Request body must be valid JSON." });
    return;
  }

  try {
    const result = await tracker.track(input, { timeoutMs: 10000 });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, statusFor(error), {
      code: error.code || "TRACKING_ERROR",
      message: error.message || "Tracking request failed.",
      retryable: Boolean(error.retryable)
    });
  }
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535.");
}

server.listen(port, "127.0.0.1", () => {
  console.log(`React demo API listening on http://127.0.0.1:${port}`);
});
