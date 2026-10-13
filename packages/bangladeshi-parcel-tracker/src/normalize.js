"use strict";

const { TrackingError } = require("./errors");

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) || null;
}

function extractStatus(raw) {
  if (!raw || typeof raw !== "object") return null;
  const data = raw.data && typeof raw.data === "object" ? raw.data : {};
  const order = data.order && typeof data.order === "object" ? data.order : {};
  const state = data.state && typeof data.state === "object" ? data.state : {};
  return firstString(order.transfer_status, state.name, data.status, raw.status, raw.state);
}

function mapStatus(sourceStatus) {
  if (!sourceStatus) return { code: "UNKNOWN", label: "Unknown", sourceStatus: null };
  const value = sourceStatus.toLowerCase().replace(/[_-]+/g, " ");
  const rules = [
    [/cancel/, "CANCELLED", "Cancelled"],
    [/return|rto/, "RETURNED", "Returned"],
    [/out for delivery|out for dispatch/, "OUT_FOR_DELIVERY", "Out for delivery"],
    [/fail|undeliver|exception/, "FAILED", "Failed"],
    [/deliver/, "DELIVERED", "Delivered"],
    [/transit|on the way|shipped|dispatched/, "IN_TRANSIT", "In transit"],
    [/pick.?up|collected/, "PICKED_UP", "Picked up"],
    [/pending|created|placed|requested|booked|processing/, "PENDING", "Pending"]
  ];
  const match = rules.find(([pattern]) => pattern.test(value));
  return match
    ? { code: match[1], label: match[2], sourceStatus }
    : { code: "UNKNOWN", label: "Unknown", sourceStatus };
}

function findEvents(raw) {
  if (!raw || typeof raw !== "object") return [];
  const data = raw.data && typeof raw.data === "object" ? raw.data : {};
  const candidates = [data.log, data.events, data.tracking_events, data.trackingEvents, raw.events];
  const source = candidates.find(Array.isArray);
  if (!source) return [];
  return source.map((event) => {
    if (!event || typeof event !== "object") return null;
    return {
      status: firstString(event.status, event.name, event.state) || null,
      description: firstString(event.desc, event.description, event.message) || null,
      timestamp: firstString(event.created_at, event.timestamp, event.date, event.time) || null,
      location: firstString(event.location, event.branch, event.hub) || null
    };
  }).filter(Boolean);
}

function normalizeResponse(courier, trackingNumber, raw) {
  if (raw && typeof raw === "object" && (raw.success === false || raw.type === "error" || raw.status === "error")) {
    throw new TrackingError("COURIER_API_ERROR", `${courier} reported that tracking failed.`, { retryable: false });
  }
  const data = raw && raw.data && typeof raw.data === "object" ? raw.data : {};
  const order = data.order && typeof data.order === "object" ? data.order : {};
  return {
    success: true,
    courier,
    trackingNumber,
    status: mapStatus(extractStatus(raw)),
    estimatedDelivery: firstString(order.estimated_date, order.estimated_delivery, data.estimatedDelivery, raw && raw.estimatedDelivery),
    events: findEvents(raw),
    raw: null
  };
}

module.exports = { normalizeResponse, mapStatus };
