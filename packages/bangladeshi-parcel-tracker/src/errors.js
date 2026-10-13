"use strict";

const ERROR_CODES = Object.freeze([
  "INVALID_INPUT",
  "UNSUPPORTED_COURIER",
  "AUTHENTICATION_FAILED",
  "COURIER_API_ERROR",
  "TIMEOUT",
  "RATE_LIMITED",
  "ABORTED"
]);

class TrackingError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "TrackingError";
    this.code = code;
    this.retryable = Boolean(options.retryable);
    if (options.cause) {
      this.cause = Object.freeze({
        name: String(options.cause.name || "Error"),
        code: safeCauseCode(options.cause.code)
      });
    }
  }
}

function safeCauseCode(code) {
  return typeof code === "string" && /^[A-Z0-9_]{1,40}$/.test(code) ? code : undefined;
}

function invalidInput(message) {
  return new TrackingError("INVALID_INPUT", message);
}

module.exports = { ERROR_CODES, TrackingError, invalidInput };
