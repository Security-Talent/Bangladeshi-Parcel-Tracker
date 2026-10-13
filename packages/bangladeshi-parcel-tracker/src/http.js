"use strict";

const { TrackingError } = require("./errors");
const { validateOptions } = require("./validation");
const MAX_RESPONSE_BYTES = 1024 * 1024;

async function readResponse(response) {
  const declaredLength = response.headers && response.headers.get
    ? Number(response.headers.get("content-length"))
    : NaN;
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new TrackingError("COURIER_API_ERROR", "Courier response exceeded the 1 MiB safety limit.");
  }

  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch { /* Ignore stream cancellation errors. */ }
        throw new TrackingError("COURIER_API_ERROR", "Courier response exceeded the 1 MiB safety limit.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new TrackingError("COURIER_API_ERROR", "Courier response exceeded the 1 MiB safety limit.");
  }
  return text;
}

function retryableFailure(error) {
  if (error instanceof TrackingError) return error.retryable;
  return ["ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND", "ETIMEDOUT"].includes(error && error.code);
}

function normalizeFailure(error, courier, timedOut, externallyAborted) {
  if (error instanceof TrackingError) return error;
  if (externallyAborted) return new TrackingError("ABORTED", "Tracking request was cancelled.", { cause: error });
  if (timedOut || (error && error.name === "TimeoutError")) {
    return new TrackingError("TIMEOUT", `${courier} request timed out.`, { retryable: true, cause: error });
  }
  if (error && error.name === "AbortError") {
    return new TrackingError("TIMEOUT", `${courier} request timed out.`, { retryable: true, cause: error });
  }
  return new TrackingError("COURIER_API_ERROR", `${courier} tracking failed.`, {
    retryable: retryableFailure(error) || Boolean(error && error.name === "TypeError"), cause: error
  });
}

function statusError(status, courier) {
  if (status === 401) {
    return new TrackingError("AUTHENTICATION_FAILED", `${courier} rejected the tracking request.`, { retryable: false });
  }
  if (status === 429) {
    return new TrackingError("RATE_LIMITED", `${courier} rate limited the tracking request.`, { retryable: true });
  }
  if (status === 408 || status === 504) {
    return new TrackingError("TIMEOUT", `${courier} request timed out.`, { retryable: true });
  }
  return new TrackingError("COURIER_API_ERROR", `${courier} returned HTTP ${status}.`, {
    retryable: status >= 500
  });
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(new TrackingError("ABORTED", "Tracking request was cancelled."));
      return;
    }
    const timer = setTimeout(done, ms);
    function done() {
      if (signal) signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new TrackingError("ABORTED", "Tracking request was cancelled."));
    }
    if (signal) signal.addEventListener("abort", abort, { once: true });
  });
}

async function request({ courier, url, method = "GET", body, headers = {}, options = {}, canRetry = method === "GET" }) {
  validateOptions(options);
  const retries = canRetry ? (options.retries || 0) : 0;
  const timeoutMs = options.timeoutMs === undefined ? 10000 : options.timeoutMs;
  const delayMs = options.retryDelayMs === undefined ? 100 : options.retryDelayMs;

  for (let attempt = 0; ; attempt += 1) {
    if (options.signal && options.signal.aborted) {
      throw new TrackingError("ABORTED", "Tracking request was cancelled.");
    }
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    if (options.signal) options.signal.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: controller.signal
      });
      const text = await readResponse(response);
      if (!response.ok) throw statusError(response.status, courier);
      if (!text) return null;
      try { return JSON.parse(text); } catch (error) {
        if ((headers.Accept || "").toLowerCase().includes("json")) {
          throw new TrackingError("COURIER_API_ERROR", `${courier} returned malformed JSON.`, { cause: error });
        }
      }
      return text;
    } catch (error) {
      const failure = normalizeFailure(error, courier, timedOut, Boolean(options.signal && options.signal.aborted));
      clearTimeout(timeout);
      if (options.signal) options.signal.removeEventListener("abort", onAbort);
      if (attempt >= retries || !failure.retryable) throw failure;
      const base = delayMs * (2 ** attempt);
      const jittered = base === 0 ? 0 : Math.floor(base * (0.5 + Math.random()));
      await wait(jittered, options.signal);
    } finally {
      clearTimeout(timeout);
      if (options.signal) options.signal.removeEventListener("abort", onAbort);
    }
  }
}

module.exports = { request };
