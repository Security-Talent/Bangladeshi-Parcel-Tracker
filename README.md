# Bangladeshi Parcel Tracker

**A zero-dependency Node.js library for tracking parcels across major courier services in Bangladesh.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/bangladeshi-parcel-tracker)](https://www.npmjs.com/package/bangladeshi-parcel-tracker)
[![npm downloads](https://img.shields.io/npm/dm/bangladeshi-parcel-tracker)](https://www.npmjs.com/package/bangladeshi-parcel-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](packages/bangladeshi-parcel-tracker/LICENSE)

This repository contains the `bangladeshi-parcel-tracker` npm package and an optional React demo. The package provides one JavaScript API for requesting parcel tracking information from supported couriers, with normalized statuses, configurable request handling, and consistent errors.

> **Important:** Courier endpoints and response formats are controlled by their providers. Availability and tracking results are not guaranteed.

## Table of Contents

- [Features](#features)
- [Supported Couriers](#supported-couriers)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Unified API](#unified-api)
- [Response Format](#response-format)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Legacy API](#legacy-api)
- [TypeScript Support](#typescript-support)
- [Using with React](#using-with-react)
- [Development and Testing](#development-and-testing)
- [Limitations and Security](#limitations-and-security)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Five courier integrations** — RedX, Steadfast, Pathao, Rokomari, and Sundarban.
- **Unified tracking API** — use one interface for supported couriers.
- **Normalized statuses** — map recognized provider statuses to common status codes.
- **Tracking events** — include event details when recognized in provider responses.
- **Configurable requests** — set timeouts, retries, cancellation, and optional in-memory caching.
- **Consistent errors** — handle failures using stable error codes.
- **TypeScript declarations** — included with the package.
- **Zero runtime dependencies** — the library uses the built-in Node.js `fetch` API.

## Supported Couriers

| Courier | ID | Tracking number | Phone required | Request |
|---|---|---|---|---|
| RedX | `redx` | Yes | No | GET |
| Steadfast | `steadfast` | Yes | No | GET |
| Pathao | `pathao` | Yes | Yes | POST |
| Rokomari | `rokomari` | Yes | Yes | GET |
| Sundarban | `sundarban` | Yes | No | POST |

Phone requirements describe the endpoint flows currently implemented in this package. Providers may change them.

## Requirements

- Node.js 18 or later
- Internet access to the selected courier endpoint
- Tracking details you are authorized to use
- Recipient phone number for Pathao and Rokomari

## Installation

Install the published package in your Node.js application:

```bash
npm install bangladeshi-parcel-tracker
```

To try the package in a new project:

```bash
mkdir parcel-app
cd parcel-app
npm init -y
npm install bangladeshi-parcel-tracker
```

## Quick Start

Create a file named `track.cjs` in your application:

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  try {
    const result = await tracker.track({
      courier: "redx",
      trackingNumber: "YOUR_TRACKING_NUMBER"
    });

    console.log("Courier:", result.courier);
    console.log("Tracking number:", result.trackingNumber);
    console.log("Status:", result.status.label);
    console.log("Events:", result.events);
  } catch (error) {
    console.error("Tracking failed:", error.code, error.message);
  }
}

main();
```

Run the example:

```bash
node track.cjs
```

Replace the placeholder with a tracking number you are authorized to look up. Results depend on the courier endpoint and its response.

## Unified API

Use `track(input, options)` for new integrations.

### Example: Pathao

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  const result = await tracker.track(
    {
      courier: "pathao",
      trackingNumber: "YOUR_TRACKING_NUMBER",
      phone: "+8801XXXXXXXXX"
    },
    { timeoutMs: 8000 }
  );

  console.log(result.status);
}

main().catch((error) => {
  console.error(error.code, error.message);
});
```

The `phone` property is required for Pathao and Rokomari in the current implementation. It is sent only to the relevant courier adapter.

### List supported couriers

```js
const tracker = require("bangladeshi-parcel-tracker");

console.log(tracker.getSupportedCouriers());
// ["redx", "steadfast", "pathao", "rokomari", "sundarban"]
```

Courier names are case-insensitive. Spaces, hyphens, and underscores are ignored when resolving supported names.

## Response Format

The unified API returns a normalized object similar to this:

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

This is an example response shape, not a live tracking result. `raw` is always `null`; provider responses may contain personal information.

### Common status codes

| Status | Meaning |
|---|---|
| `PENDING` | Shipment pending or processing |
| `PICKED_UP` | Parcel picked up |
| `IN_TRANSIT` | Parcel in transit |
| `OUT_FOR_DELIVERY` | Parcel out for delivery |
| `DELIVERED` | Parcel delivered |
| `FAILED` | Delivery or shipment failure |
| `CANCELLED` | Shipment cancelled |
| `RETURNED` | Parcel returned |
| `UNKNOWN` | Status could not be recognized |

Event fields and estimated delivery are populated only when recognized in the provider response. Missing information may remain `null` or an empty array. Rokomari currently returns HTML, so its normalized status and event data may be unavailable.

## Configuration

Pass options as the second argument to `track()`:

```js
const tracker = require("bangladeshi-parcel-tracker");
const controller = new AbortController();

async function main() {
  const result = await tracker.track(
    {
      courier: "redx",
      trackingNumber: "YOUR_TRACKING_NUMBER"
    },
    {
      timeoutMs: 10000,
      retries: 1,
      retryDelayMs: 100,
      signal: controller.signal,
      cacheTtlMs: 30000,
      bypassCache: false
    }
  );

  console.log(result.status.label);
}

main().catch((error) => {
  console.error(error.code, error.message);
});
```

| Option | Default | Description |
|---|---:|---|
| `timeoutMs` | `10000` | Timeout per request attempt, in milliseconds |
| `retries` | `0` | Retry count from 0 to 5 for eligible failures |
| `retryDelayMs` | `100` | Base retry delay in milliseconds |
| `signal` | — | `AbortSignal` used to cancel a request |
| `cacheTtlMs` | `0` | In-memory cache lifetime; zero disables caching |
| `bypassCache` | `false` | Skip a cached value and request the provider |

Retries apply to eligible GET-based RedX, Steadfast, and Rokomari lookups. POST-based Pathao and Sundarban requests are not retried. Caching is process-local, limited to 500 entries, and disabled by default. A timeout applies to each attempt, so retries can increase total elapsed time.

## Error Handling

Failures reject with `TrackingError`, which provides a stable `code`, safe `message`, and `retryable` flag.

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  try {
    const result = await tracker.track({
      courier: "redx",
      trackingNumber: "YOUR_TRACKING_NUMBER"
    });

    console.log(result.status.label);
  } catch (error) {
    if (error instanceof tracker.TrackingError) {
      console.error("Code:", error.code);
      console.error("Retryable:", error.retryable);
      console.error("Message:", error.message);
      return;
    }

    throw error;
  }
}

main();
```

| Error code | Meaning |
|---|---|
| `INVALID_INPUT` | A required argument or option is invalid |
| `UNSUPPORTED_COURIER` | The courier is not supported |
| `AUTHENTICATION_FAILED` | The provider returned HTTP 401 |
| `COURIER_API_ERROR` | An upstream HTTP, network, or response error occurred |
| `TIMEOUT` | A request exceeded its configured deadline |
| `RATE_LIMITED` | The provider returned HTTP 429 |
| `ABORTED` | The request was cancelled |

Error messages do not include upstream response bodies, request URLs, phone numbers, or credentials. HTTP 403 responses are reported as `COURIER_API_ERROR` because they can indicate access restrictions or anti-bot controls.

## Legacy API

Provider-specific methods are available when you need a courier's original response format:

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  const redx = await tracker.redx("YOUR_TRACKING_NUMBER");
  const steadfast = await tracker.steadfast("YOUR_TRACKING_NUMBER");
  const pathao = await tracker.pathao("YOUR_TRACKING_NUMBER", "+8801XXXXXXXXX");
  const rokomari = await tracker.rokomari("YOUR_TRACKING_NUMBER", "+8801XXXXXXXXX");
  const sundarban = await tracker.sundarban("YOUR_TRACKING_NUMBER");

  console.log({ redx, steadfast, pathao, rokomari, sundarban });
}

main().catch(console.error);
```

Legacy methods return provider-specific data rather than the normalized response shape. Handle that data carefully because it may contain personal information. Use `track()` for new projects unless you specifically need a legacy method's response format.

## TypeScript Support

The package includes TypeScript declarations:

```ts
import tracker, { type TrackResult } from "bangladeshi-parcel-tracker";

const result: TrackResult = await tracker.track({
  courier: "redx",
  trackingNumber: process.env.TRACKING_NUMBER!
});

console.log(result.status.label);
```

The package supports CommonJS and Node.js ESM interoperability. It does not ship a separate native ESM bundle.

## Using with React

The library uses Node.js `fetch`, so run it on your server rather than directly in browser code.

```text
React frontend → Your backend API → Parcel Tracker → Courier endpoint
```

Validate inputs and authorize access on your backend before returning parcel details. Do not expose recipient phone numbers or private parcel information to unauthorized users. The [React demo](examples/react-demo/README.md) shows a local example.

## Development and Testing

Clone the repository and install dependencies:

```bash
git clone https://github.com/SecurityTalent/Bangladeshi-Parcel-Tracker.git
cd Bangladeshi-Parcel-Tracker
npm ci
```

Run the library tests and check the npm package contents:

```bash
npm run validate
```

Tests use mocked `fetch` responses and do not contact courier services. An optional live smoke request can be run from the package directory with `COURIER` and `TRACKING_NUMBER`; Pathao and Rokomari also require `PHONE`.

To build the optional React demo:

```bash
cd examples/react-demo
npm ci
npm run build
```

See the [demo README](examples/react-demo/README.md) for running it locally.

## Limitations and Security

- This is an independent project and is not officially affiliated with the courier companies.
- Integrations use observed tracking endpoints, not official authenticated merchant APIs.
- Providers may change endpoints, request requirements, response schemas, or access policies.
- A successful HTTP response does not guarantee that a tracking status can be recognized.
- Tracking numbers are not proof of identity. Add authorization to your application before exposing parcel details.
- Use only tracking and phone information you are authorized to access. Do not commit credentials or real customer data to source control.

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes, submit focused pull requests, and update documentation when behavior changes. Include tests for code changes and describe any integration limitations.

## License

This project is licensed under the MIT License. See [LICENSE](packages/bangladeshi-parcel-tracker/LICENSE) for details.

## Links

- [npm package](https://www.npmjs.com/package/bangladeshi-parcel-tracker)
- [GitHub repository](https://github.com/SecurityTalent/Bangladeshi-Parcel-Tracker)
- [Issues and bug reports](https://github.com/SecurityTalent/Bangladeshi-Parcel-Tracker/issues)
