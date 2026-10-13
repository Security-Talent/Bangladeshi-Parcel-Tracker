# bangladeshi-parcel-tracker

Zero-dependency CommonJS tracking clients for RedX, Steadfast, Pathao, Rokomari, and Sundarban. The package calls courier website/API endpoints directly; endpoint availability and response formats are controlled by those providers and are not guaranteed by this package.

## Requirements

Node.js 18 or later (uses the built-in `fetch` API).

## Install

In an existing Node.js project, run:

```sh
npm install bangladeshi-parcel-tracker
```

To create a new project and install the package:

```sh
mkdir parcel-app
cd parcel-app
npm init -y
npm install bangladeshi-parcel-tracker
```

The package has no runtime dependencies. Use only tracking numbers and phone numbers you are authorized to use. No courier credentials are embedded in the library.

### Quick start

Create a file named `track.cjs` in your project, paste this example, and replace the sample tracking number:

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  try {
    const result = await tracker.track({
      courier: "redx",
      trackingNumber: "YOUR_TRACKING_NUMBER"
    });
    console.log(result.status.label, result.events);
  } catch (error) {
    console.error(error.code, error.message);
  }
}

main();
```

Run the example from your project folder:

```sh
node track.cjs
```

For **Pathao** and **Rokomari**, add the recipient phone number to the input. The other couriers need only a tracking number. See [supported couriers](#supported-couriers-and-legacy-api).

## Unified API

`track(input, options)` is the recommended API for new projects. It dispatches to the selected courier and returns the same normalized result shape for all supported couriers.

```js
import tracker from "bangladeshi-parcel-tracker";

async function main() {
  const result = await tracker.track({
    courier: "pathao",
    trackingNumber: "YOUR_TRACKING_NUMBER",
    phone: "+8801XXXXXXXXX"
  }, { timeoutMs: 8000 });

  console.log(result.status.label);
}

main();
```

CommonJS and named ESM imports are also supported:

```js
const { track, getSupportedCouriers } = require("bangladeshi-parcel-tracker");
// ESM: import { track, getSupportedCouriers } from "bangladeshi-parcel-tracker";
```

Courier names are case-insensitive; spaces, hyphens, and underscores are ignored (`"Red-X"` resolves to `redx`). Tracking IDs and required phone values must be non-empty strings. Tracking IDs are encoded for URL use without being rewritten. The supported names are returned by `getSupportedCouriers()`.

```js
console.log(tracker.getSupportedCouriers());
// ["redx", "steadfast", "pathao", "rokomari", "sundarban"]
```

### Result format

```js
{
  success: true,
  courier: "pathao",
  trackingNumber: "YOUR_TRACKING_NUMBER",
  status: {
    code: "IN_TRANSIT",
    label: "In transit",
    sourceStatus: "In-Transit"
  },
  estimatedDelivery: null,
  events: [],
  raw: null
}
```

Common status codes: `PENDING`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, `CANCELLED`, `RETURNED`, and `UNKNOWN`. `sourceStatus` preserves the provider status string where one is available. Event fields (`status`, `description`, `timestamp`, `location`) and `estimatedDelivery` are populated only when recognized in the provider response; unknown or missing values remain `null` or `[]`. A courier can succeed at the HTTP request level while returning `UNKNOWN` if its response does not expose a recognized status. Rokomari currently returns HTML from its tracking endpoint, so normalized status/events may remain unknown/empty. No raw provider response is returned by `track()` because it may include personal data.

### Options

```js
const controller = new AbortController();

async function main() {
  const result = await tracker.track({
    courier: "redx",
    trackingNumber: "YOUR_TRACKING_NUMBER"
  }, {
    timeoutMs: 10000,
    retries: 1,
    retryDelayMs: 100,
    signal: controller.signal,
    cacheTtlMs: 30000,
    bypassCache: false
  });

  console.log(result.status.label);
}

main();
```

Options reference:

| Option | Default | Behavior |
| --- | --- | --- |
| `timeoutMs` | `10000` | Per-request timeout in milliseconds. Must be positive. |
| `retries` | `0` | Retry count from 0 to 5 for retryable failures on GET requests only. |
| `retryDelayMs` | `100` | Base delay in milliseconds. Exponential backoff uses `delay × 2^attempt` with jitter (about 0.5–1.5×). |
| `signal` | none | An `AbortSignal`; cancellation rejects with code `ABORTED`. |
| `cacheTtlMs` | `0` | `track()` only: opt-in in-memory cache lifetime. Zero disables caching. |
| `bypassCache` | `false` | `track()` only: when true, skip a cached value and call the courier. |

Legacy methods accept `timeoutMs`, `retries`, `retryDelayMs`, and `signal` in their final options parameter; caching options apply only to `track()`. Retries are limited to GET-based RedX, Steadfast, and Rokomari lookups. POST-based Pathao and Sundarban requests are never retried. Cache is process-local, bounded to 500 entries, and keyed with a process-random salted digest; cached result contents may still include event text, so enable it only where appropriate. `bypassCache: true` forces a request. There is no persistent or distributed cache. A timeout applies to each attempt, so retries can extend total elapsed time.

## Supported couriers and legacy API

Legacy functions remain available and continue to resolve to provider-specific response data:

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  const redxData = await tracker.redx("YOUR_TRACKING_NUMBER");
  const steadfastData = await tracker.steadfast("YOUR_TRACKING_NUMBER");
  const pathaoData = await tracker.pathao("YOUR_TRACKING_NUMBER", "+8801XXXXXXXXX");
  const rokomariData = await tracker.rokomari("YOUR_TRACKING_NUMBER", "+8801XXXXXXXXX");
  const sundarbanData = await tracker.sundarban("YOUR_TRACKING_NUMBER");
}

main();
```

| Courier | ID | Required arguments | Request type |
| --- | --- | --- | --- |
| RedX | `redx` | tracking number | GET |
| Steadfast | `steadfast` | tracking number | GET |
| Pathao | `pathao` | tracking number, recipient phone | POST |
| Rokomari | `rokomari` | tracking number, recipient phone | GET |
| Sundarban | `sundarban` | tracking number | POST |

These implementations use the unauthenticated tracking endpoints in the source snapshot. They are not official authenticated integrations; upstream changes, access controls, rate limits, or anti-bot checks may make them unavailable.

Courier integration notes:

- **RedX:** `redx(trackingNumber, options?)`; GET lookup. No phone argument.
- **Steadfast:** `steadfast(trackingNumber, options?)`; GET lookup. No phone argument.
- **Pathao:** `pathao(trackingNumber, phone, options?)`; POST lookup. Phone is sent in the request body. Requests are not retried.
- **Rokomari:** `rokomari(trackingNumber, phone, options?)`; GET tracking page. Tracking number and phone are query parameters. Phone is required by the current endpoint flow. Its response is HTML rather than a normalized JSON tracking history.
- **Sundarban:** `sundarban(trackingNumber, options?)`; POST lookup. Requests are not retried.

`track()` accepts phone only for Pathao and Rokomari and sends it only to those adapters. The library does not authenticate as a merchant, create shipments, modify orders, provide webhooks, or guarantee live tracking availability. Do not treat a tracking number as proof of identity; apply your own authorization before returning parcel details from an application backend.

### Choose between the APIs

- Use `track()` in new integrations when you want a consistent result and normalized status fields.
- Use a named legacy method if your existing code depends on the provider-specific response. Its return shape varies by courier and may include provider data; handle it carefully.
- `getSupportedCouriers()` returns a fresh array of supported lowercase IDs. `ERROR_CODES` returns the documented error-code list, and `TrackingError` is the common error class.

## Errors

All failures reject with `TrackingError`, which exposes a stable `code`, safe `message`, `retryable` boolean, and (where available) a sanitized `cause` containing only an error name/code.

| Code | Meaning |
| --- | --- |
| `INVALID_INPUT` | Required argument or option is invalid |
| `UNSUPPORTED_COURIER` | Courier name is not supported |
| `AUTHENTICATION_FAILED` | Provider returned HTTP 401 |
| `COURIER_API_ERROR` | Other upstream HTTP (including 403), network, payload, or provider-declared failure |
| `TIMEOUT` | Local request deadline or upstream timeout |
| `RATE_LIMITED` | Provider returned HTTP 429 |
| `ABORTED` | Caller cancelled using `AbortSignal` |

```js
async function main() {
try {
  const result = await tracker.track({
    courier: "pathao",
    trackingNumber: "YOUR_TRACKING_NUMBER",
    phone: "+8801XXXXXXXXX"
  });
  console.log(result.status.label);
} catch (error) {
  if (error instanceof tracker.TrackingError) {
    console.error(error.code, error.retryable, error.message);
  }
}
}

main();
```

Error messages do not include response bodies, request URLs, phone numbers, or credentials. The library does not log request/response data.

Input/courier errors happen before a courier request. `AUTHENTICATION_FAILED` is used only for HTTP 401; HTTP 403 is reported as `COURIER_API_ERROR` because it may represent access policy or anti-bot blocking. `retryable` indicates whether the library may retry the failure when retries are configured; it does not guarantee a later request will succeed. `cause` is sanitized and contains only a safe error name/code, not the upstream response.

## TypeScript

Declarations are included:

```ts
import tracker, { type TrackResult } from "bangladeshi-parcel-tracker";

const result: TrackResult = await tracker.track({
  courier: "redx",
  trackingNumber: process.env.TRACKING_NUMBER!
});
```

The package ships `index.d.ts` with `Courier`, `StatusCode`, `TrackingOptions`, `TrackOptions`, `TrackInput`, `TrackResult`, `TrackingEvent`, `TrackingErrorCode`, and function declarations. It ships CommonJS (`main` and `require` export); the default import form works in Node ESM interoperability. This package does not ship a separately built native ESM bundle.

## Use in a web application

This package uses Node.js etch and should run on your server, not in browser code. In a React or other browser application, send tracking requests to your own backend. The [React demo](../../examples/react-demo/README.md) shows a working local setup.

## Development and tests

```sh
npm ci
npm test
```

Tests use mocked `fetch` responses and do not contact courier services. An optional live smoke request is available only when explicitly run with `COURIER`, `TRACKING_NUMBER`, and (for Pathao/Rokomari) `PHONE` environment variables:

```sh
COURIER=redx TRACKING_NUMBER=your-number npm run smoke
```

## Limitations and migration

- `track()` provides best-effort normalization over observed response field patterns; it cannot guarantee consistent courier schemas or status meanings.
- Provider endpoints have not been live-verified in this workspace because network access is unavailable. Unit tests prove request construction and local handling, not courier availability.
- HTTP redirects are rejected to prevent tracking values/phone numbers from being forwarded to an unexpected host; a provider that requires redirects may therefore be unavailable.
- Responses larger than 1 MiB are rejected to bound memory use.
- Existing methods still return provider-specific data, but now reject with `TrackingError` rather than a plain `Error` on failure. Catch by `error.code` instead of parsing message text.
- New unified results have `raw: null` by design. Use legacy methods only if you explicitly need the raw provider response and can handle personal data securely.
- The full-stack React/Vite walkthrough from the source branch described an example application, not files shipped by this library; it is omitted here to keep this package README focused and accurate.

## License

MIT. See [LICENSE](LICENSE).
