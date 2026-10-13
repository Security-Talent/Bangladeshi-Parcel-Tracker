"use strict";

const { invalidInput } = require("./errors");

function requireText(value, name) {
  if (typeof value !== "string" || value.length === 0 || value.trim().length === 0) {
    throw invalidInput(`${name} must be a non-empty string.`);
  }
  return value;
}

function validateOptions(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw invalidInput("Options must be an object.");
  }
  if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
    throw invalidInput("timeoutMs must be a positive number.");
  }
  if (options.retries !== undefined && (!Number.isInteger(options.retries) || options.retries < 0 || options.retries > 5)) {
    throw invalidInput("retries must be an integer from 0 to 5.");
  }
  if (options.retryDelayMs !== undefined && (!Number.isFinite(options.retryDelayMs) || options.retryDelayMs < 0)) {
    throw invalidInput("retryDelayMs must be a non-negative number.");
  }
  if (options.cacheTtlMs !== undefined && (!Number.isFinite(options.cacheTtlMs) || options.cacheTtlMs < 0)) {
    throw invalidInput("cacheTtlMs must be a non-negative number.");
  }
  if (options.bypassCache !== undefined && typeof options.bypassCache !== "boolean") {
    throw invalidInput("bypassCache must be a boolean.");
  }
  if (options.signal !== undefined && (!options.signal || typeof options.signal.addEventListener !== "function")) {
    throw invalidInput("signal must be an AbortSignal.");
  }
  return options;
}

module.exports = { requireText, validateOptions };
