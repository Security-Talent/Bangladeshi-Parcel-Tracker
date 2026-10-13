"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const tracker = require("../index.js");

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    text: async () => typeof body === "string" ? body : JSON.stringify(body)
  };
}

async function withFetch(implementation, callback) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  try { return await callback(); } finally { globalThis.fetch = original; }
}

test("exports legacy functions, unified methods, and courier list", () => {
  assert.deepEqual(tracker.getSupportedCouriers(), ["redx", "steadfast", "pathao", "rokomari", "sundarban"]);
  for (const courier of tracker.getSupportedCouriers()) assert.equal(typeof tracker[courier], "function");
  assert.equal(typeof tracker.track, "function");
  assert.equal(tracker.getSupportedCouriers().includes("../redx"), false);
});

test("supports the default and named Node ESM imports from CommonJS", async () => {
  const url = pathToFileURL(path.resolve(__dirname, "../index.js")).href;
  const imported = await import(url);
  assert.equal(imported.default.track, tracker.track);
  assert.equal(imported.track, tracker.track);
});

test("each legacy adapter keeps its method, endpoint, and phone requirements", async () => {
  const calls = [];
  await withFetch(async (url, init) => {
    calls.push({ url: String(url), ...init });
    return response(200, { status: "In Transit" });
  }, async () => {
    await tracker.redx("A /?#");
    await tracker.steadfast("SF-1");
    await tracker.pathao("PA-1", "+880 1712");
    await tracker.rokomari("RO-1", "+880 1712");
    await tracker.sundarban("SU-1");
  });

  assert.equal(calls.length, 5);
  assert.match(calls[0].url, /A%20%2F%3F%23$/);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].url, "https://steadfast.com.bd/track/consignment/SF-1");
  assert.equal(calls[2].method, "POST");
  assert.deepEqual(JSON.parse(calls[2].body), { consignment_id: "PA-1", phone_no: "+880 1712" });
  const rokomariUrl = new URL(calls[3].url);
  assert.equal(rokomariUrl.searchParams.get("orderId"), "RO-1");
  assert.equal(rokomariUrl.searchParams.get("phn"), "+880 1712");
  assert.equal(calls[4].method, "POST");
  assert.deepEqual(JSON.parse(calls[4].body), { selectedtypes: "cnno", selectedtimes: "7", inputvalue: "SU-1" });
});

test("validates inputs before making upstream calls", async () => {
  let calls = 0;
  await withFetch(async () => { calls += 1; return response(200, {}); }, async () => {
    await assert.rejects(tracker.track(null), { code: "INVALID_INPUT" });
    await assert.rejects(tracker.track({ courier: "redx", trackingNumber: "  " }), { code: "INVALID_INPUT" });
    await assert.rejects(tracker.track({ courier: "pathao", trackingNumber: "PA-1" }), { code: "INVALID_INPUT" });
    await assert.rejects(tracker.track({ courier: "madeup", trackingNumber: "X" }), { code: "UNSUPPORTED_COURIER" });
    await assert.rejects(tracker.track({ courier: "redx", trackingNumber: "X" }, { retries: 6 }), { code: "INVALID_INPUT" });
  });
  assert.equal(calls, 0);
});

test("dispatches normalized courier names and passes phone only where required", async () => {
  let call;
  await withFetch(async (url, init) => {
    call = { url: String(url), ...init };
    return response(200, { status: "Pending" });
  }, async () => {
    const result = await tracker.track({ courier: " Red-X ", trackingNumber: "RDX-1", phone: "unused" });
    assert.equal(result.courier, "redx");
  });
  assert.equal(call.method || "GET", "GET");
  assert.equal(call.body, undefined);

  await withFetch(async (url, init) => {
    call = { url: String(url), ...init };
    return response(200, { status: "Pending" });
  }, async () => tracker.track({ courier: "PATHAO", trackingNumber: "PA-2", phone: "+880 1712" }));
  assert.deepEqual(JSON.parse(call.body), { consignment_id: "PA-2", phone_no: "+880 1712" });
});

test("normalizes known Pathao fields and leaves unavailable fields empty", async () => {
  const payload = {
    type: "success",
    data: {
      order: { transfer_status: "In-Transit", estimated_date: "2026-08-18" },
      log: [{ desc: "Parcel dispatched", created_at: "2026-08-10 12:30", location: "Dhaka" }]
    }
  };
  const result = await withFetch(async () => response(200, payload), () => tracker.track({ courier: "pathao", trackingNumber: "PA-3", phone: "+880 1700" }));
  assert.deepEqual(result, {
    success: true,
    courier: "pathao",
    trackingNumber: "PA-3",
    status: { code: "IN_TRANSIT", label: "In transit", sourceStatus: "In-Transit" },
    estimatedDelivery: "2026-08-18",
    events: [{ status: null, description: "Parcel dispatched", timestamp: "2026-08-10 12:30", location: "Dhaka" }],
    raw: null
  });
});

test("normalizes status vocabulary and does not fabricate unknown fields", async () => {
  const cases = [
    ["Delivered", "DELIVERED"], ["Out for Delivery", "OUT_FOR_DELIVERY"],
    ["Cancelled", "CANCELLED"], ["Returned to sender", "RETURNED"], ["Undelivered", "FAILED"],
    ["Pickup requested", "PICKED_UP"], ["Something new", "UNKNOWN"]
  ];
  for (const [source, code] of cases) {
    const result = await withFetch(async () => response(200, { status: source }), () => tracker.track({ courier: "redx", trackingNumber: "X" }));
    assert.equal(result.status.code, code);
    assert.equal(result.estimatedDelivery, null);
    assert.deepEqual(result.events, []);
    assert.equal(result.raw, null);
  }
  const empty = await withFetch(async () => ({ ok: true, status: 204, text: async () => "" }), () => tracker.track({ courier: "steadfast", trackingNumber: "X" }));
  assert.equal(empty.status.code, "UNKNOWN");
});

test("does not report explicit upstream failure payloads as successful", async () => {
  await withFetch(async () => response(200, { success: false, message: "sensitive upstream body" }), async () => {
    await assert.rejects(tracker.track({ courier: "redx", trackingNumber: "X" }), {
      code: "COURIER_API_ERROR", retryable: false
    });
  });
});

test("normalizes HTTP errors without disclosing response bodies", async () => {
  await withFetch(async () => response(401, { token: "secret", phone: "+8801712345678" }), async () => {
    await assert.rejects(tracker.redx("X"), (error) => {
      assert.equal(error.code, "AUTHENTICATION_FAILED");
      assert.equal(error.retryable, false);
      assert.equal(error.message.includes("secret"), false);
      assert.equal(error.message.includes("8801712345678"), false);
      return true;
    });
  });
  await withFetch(async () => response(429, {}), async () => {
    await assert.rejects(tracker.redx("X"), { code: "RATE_LIMITED", retryable: true });
  });
  await withFetch(async () => response(403, {}), async () => {
    await assert.rejects(tracker.redx("X"), { code: "COURIER_API_ERROR", retryable: false });
  });
  await withFetch(async () => response(503, {}), async () => {
    await assert.rejects(tracker.redx("X"), { code: "COURIER_API_ERROR", retryable: true });
  });
  let forbiddenCalls = 0;
  await withFetch(async () => { forbiddenCalls += 1; return response(403, {}); }, async () => {
    await assert.rejects(tracker.redx("X", { retries: 3 }), { code: "COURIER_API_ERROR", retryable: false });
  });
  assert.equal(forbiddenCalls, 1);
});

test("preserves only sanitized error cause metadata", async () => {
  await withFetch(async () => { throw Object.assign(new Error("request failed with phone +8801712345678"), { code: "ECONNRESET" }); }, async () => {
    await assert.rejects(tracker.redx("X"), (error) => {
      assert.equal(error.code, "COURIER_API_ERROR");
      assert.equal(error.retryable, true);
      assert.deepEqual(error.cause, { name: "Error", code: "ECONNRESET" });
      assert.equal(error.message.includes("8801712345678"), false);
      return true;
    });
  });
});

test("returns a timeout error when the request exceeds timeoutMs", async () => {
  await withFetch((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
  }), async () => {
    await assert.rejects(tracker.redx("X", { timeoutMs: 5 }), { code: "TIMEOUT", retryable: true });
  });
});

test("retries transient GET failures when enabled", async () => {
  let calls = 0;
  const result = await withFetch(async () => ++calls === 1 ? response(503, {}) : response(200, { status: "Delivered" }), () =>
    tracker.track({ courier: "redx", trackingNumber: "X" }, { retries: 1, retryDelayMs: 0 }));
  assert.equal(calls, 2);
  assert.equal(result.status.code, "DELIVERED");
});

test("does not retry POST tracking calls", async () => {
  let calls = 0;
  await withFetch(async () => { calls += 1; return response(503, {}); }, async () => {
    await assert.rejects(tracker.track({ courier: "sundarban", trackingNumber: "X" }, { retries: 3 }), { code: "COURIER_API_ERROR" });
  });
  assert.equal(calls, 1);
});

test("supports AbortSignal cancellation", async () => {
  const controller = new AbortController();
  let calls = 0;
  const pending = withFetch((_url, { signal }) => {
    calls += 1;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("cancelled"), { name: "AbortError" })), { once: true }));
  }, () => tracker.track({ courier: "redx", trackingNumber: "X" }, { signal: controller.signal }));
  setTimeout(() => controller.abort(), 1);
  await assert.rejects(pending, { code: "ABORTED", retryable: false });
  assert.equal(calls, 1);
});

test("caches only when explicitly enabled and supports bypass", async () => {
  let calls = 0;
  await withFetch(async () => response(200, { status: `call-${++calls}` }), async () => {
    const input = { courier: "redx", trackingNumber: `cache-${Date.now()}` };
    const options = { cacheTtlMs: 10000 };
    const first = await tracker.track(input, options);
    const second = await tracker.track(input, options);
    assert.deepEqual(second, first);
    assert.equal(calls, 1);
    const bypassed = await tracker.track(input, { ...options, bypassCache: true });
    assert.equal(calls, 2);
    assert.notDeepEqual(bypassed, first);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(tracker.track(input, { ...options, signal: controller.signal }), { code: "ABORTED" });
  });
});

test("does not cache by default", async () => {
  let calls = 0;
  await withFetch(async () => { calls += 1; return response(200, {}); }, async () => {
    const input = { courier: "redx", trackingNumber: `no-cache-${Date.now()}` };
    await tracker.track(input);
    await tracker.track(input);
  });
  assert.equal(calls, 2);
});

test("malformed JSON fails safely while an HTML page yields unknown data", async () => {
  const html = await withFetch(async () => response(200, "<html>challenge</html>"), () => tracker.track({ courier: "rokomari", trackingNumber: "X", phone: "0123" }));
  assert.equal(html.status.code, "UNKNOWN");
  assert.equal(html.raw, null);
  assert.deepEqual(html.events, []);

  await withFetch(async () => response(200, "{"), async () => {
    await assert.rejects(tracker.track({ courier: "steadfast", trackingNumber: "X" }), {
      code: "COURIER_API_ERROR", retryable: false
    });
  });
});

test("rejects oversized responses before parsing them", async () => {
  await withFetch(async () => ({
    ok: true,
    status: 200,
    headers: { get: (name) => name === "content-length" ? "1048577" : "application/json" },
    text: async () => { throw new Error("should not read oversized body"); }
  }), async () => {
    await assert.rejects(tracker.redx("X"), { code: "COURIER_API_ERROR", retryable: false });
  });
});
