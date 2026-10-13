"use strict";

const { createHash, randomBytes } = require("node:crypto");
const redx = require("./src/redx");
const steadfast = require("./src/steadfast");
const pathao = require("./src/pathao");
const rokomari = require("./src/rokomari");
const sundarban = require("./src/sundarban");
const { ERROR_CODES, TrackingError, invalidInput } = require("./src/errors");
const { requireText, validateOptions } = require("./src/validation");
const { normalizeResponse } = require("./src/normalize");

const courierFunctions = Object.freeze({ redx, steadfast, pathao, rokomari, sundarban });
const supportedCouriers = Object.freeze(Object.keys(courierFunctions));
const cache = new Map();
const cacheSalt = randomBytes(32);

function normalizeCourier(value) {
  if (typeof value !== "string") throw invalidInput("courier must be a supported courier name.");
  const normalized = value.toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "redx") return "redx";
  if (Object.prototype.hasOwnProperty.call(courierFunctions, normalized)) return normalized;
  throw new TrackingError("UNSUPPORTED_COURIER", `Unsupported courier. Choose one of: ${supportedCouriers.join(", ")}.`);
}

/** Return the supported lowercase courier identifiers. */
function getSupportedCouriers() {
  return [...supportedCouriers];
}

function cacheKey(courier, trackingNumber, phone) {
  const digest = createHash("sha256").update(cacheSalt).update(JSON.stringify([courier, trackingNumber, phone || null])).digest("hex");
  return digest;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Track a parcel using the normalized API. Raw provider payloads are never returned. */
async function track(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput("track() expects an object with courier and trackingNumber.");
  }
  const courier = normalizeCourier(input.courier);
  const trackingNumber = requireText(input.trackingNumber, "trackingNumber");
  const needsPhone = courier === "pathao" || courier === "rokomari";
  const phone = needsPhone ? requireText(input.phone, "phone") : undefined;
  validateOptions(options);
  if (options.signal && options.signal.aborted) {
    throw new TrackingError("ABORTED", "Tracking request was cancelled.");
  }

  const ttl = options.cacheTtlMs || 0;
  const key = ttl > 0 ? cacheKey(courier, trackingNumber, phone) : null;
  if (key && !options.bypassCache) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return clone(cached.value);
    if (cached) cache.delete(key);
  }

  const value = needsPhone
    ? await courierFunctions[courier](trackingNumber, phone, options)
    : await courierFunctions[courier](trackingNumber, options);
  const normalized = normalizeResponse(courier, trackingNumber, value);
  if (key) {
    if (cache.size >= 500) cache.delete(cache.keys().next().value);
    cache.set(key, { value: normalized, expiresAt: Date.now() + ttl });
  }
  return normalized;
}

exports.redx = redx;
exports.steadfast = steadfast;
exports.pathao = pathao;
exports.rokomari = rokomari;
exports.sundarban = sundarban;
exports.track = track;
exports.getSupportedCouriers = getSupportedCouriers;
exports.TrackingError = TrackingError;
exports.ERROR_CODES = ERROR_CODES;
