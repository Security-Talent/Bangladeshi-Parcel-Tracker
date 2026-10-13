# Bangladeshi Parcel Tracker

**A zero-dependency Node.js library for tracking parcels across major courier services in Bangladesh.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/bangladeshi-parcel-tracker)](https://www.npmjs.com/package/bangladeshi-parcel-tracker)
[![npm downloads](https://img.shields.io/npm/dm/bangladeshi-parcel-tracker)](https://www.npmjs.com/package/bangladeshi-parcel-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Bangladeshi Parcel Tracker provides a unified JavaScript API for requesting parcel tracking information from supported courier services. It normalizes recognized tracking statuses and provides configurable request handling and consistent errors, with no runtime dependencies.

> **Note:** Courier endpoints and response formats are controlled by their providers. Availability and tracking results are not guaranteed.

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
- **Tracking events** — include event details when they are available in provider responses.
- **Configurable requests** — set timeouts, retries, cancellation, and optional in-memory caching.
- **Consistent errors** — handle failures with stable error codes.
- **TypeScript declarations** — included with the package.
- **Zero runtime dependencies** — uses the built-in Node.js `fetch` API.

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

Install the package in an existing Node.js project:

```bash
npm install bangladeshi-parcel-tracker
```

To create a project and install the package:

```bash
mkdir parcel-app
cd parcel-app
npm init -y
npm install bangladeshi-parcel-tracker
```

## Quick Start

Create a file named `track.cjs`:

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

Run it from your project directory:

```bash
node track.cjs
```

Replace the placeholder with a tracking number you are authorized to look up. Results depend on the selected provider and its response.

## Unified API

Use `track(input, options)` for new integrations. It accepts a courier ID, tracking number, and—when required—a recipient phone number.

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

The `phone` field is required for Pathao and Rokomari. The library sends it only to the selected courier adapter.

### List supported couriers

```js
const tracker = require("bangladeshi-parcel-tracker");

console.log(tracker.getSupportedCouriers());
// ["redx", "steadfast", "pathao", "rokomari", "sundarban"]
```

Courier IDs are case-insensitive. Spaces, hyphens, and underscores are ignored when resolving a courier name.

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

This is an example shape, not a live tracking result. `raw` is always `null`; provider responses may contain personal information.

### Status codes

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

Event fields and estimated delivery are included only when recognized in the provider response. Missing information may remain `null` or an empty array. Rokomari currently returns HTML, so its normalized status and event data may be unavailable.

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
| `timeoutMs` | `10000` | Timeout for each request attempt, in milliseconds |
| `retries` | `0` | Retry count from 0 to 5 for eligible failures |
| `retryDelayMs` | `100` | Base delay between retries, in milliseconds |
| `signal` | — | `AbortSignal` used to cancel a request |
| `cacheTtlMs` | `0` | In-memory cache lifetime; zero disables caching |
| `bypassCache` | `false` | Skip a cached result and request the provider |

Retries apply to eligible GET lookups from RedX, Steadfast, and Rokomari. Pathao and Sundarban use POST and are not retried. The cache is process-local, limited to 500 entries, and disabled by default. A timeout applies to each attempt, so retries can increase total request time.

## Error Handling

Requests reject with `TrackingError`, which provides a stable `code`, a safe `message`, and a `retryable` flag.

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
| `INVALID_INPUT` | A required value or option is invalid |
| `UNSUPPORTED_COURIER` | The courier is not supported |
| `AUTHENTICATION_FAILED` | The provider returned HTTP 401 |
| `COURIER_API_ERROR` | An upstream HTTP, network, or response error occurred |
| `TIMEOUT` | A request exceeded its configured deadline |
| `RATE_LIMITED` | The provider returned HTTP 429 |
| `ABORTED` | The request was cancelled |

Error messages do not include upstream response bodies, request URLs, phone numbers, or credentials. HTTP 403 is reported as `COURIER_API_ERROR` because it may indicate access restrictions or anti-bot controls.

## Legacy API

Courier-specific methods remain available if your application needs provider-specific response data:

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

Legacy methods return different shapes for each courier. Their responses may contain provider data, so handle them carefully. Use `track()` for new integrations unless you specifically need a provider-specific response.

## TypeScript Support

TypeScript declarations are included:

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

This package uses Node.js `fetch`; run it on your server rather than directly in browser code. Send requests from your React app to your own backend:

```text
React frontend → Your backend API → Parcel Tracker → Courier endpoint
```

Validate inputs and authorize access on your backend before returning parcel details. Do not expose recipient phone numbers or private parcel information to unauthorized users. See the [React demo setup](../../examples/react-demo/README.md) for a working example.

## Development and Testing

Clone the repository and install its dependencies:

```bash
git clone https://github.com/SecurityTalent/Bangladeshi-Parcel-Tracker.git
cd Bangladeshi-Parcel-Tracker
npm ci
```

Run the library tests and package check:

```bash
npm run validate
```

Tests use mocked `fetch` responses and do not contact courier services. An optional live smoke request can be made from the package directory with `COURIER` and `TRACKING_NUMBER`; Pathao and Rokomari also require `PHONE`.

## Limitations and Security

- This is an independent project and is not officially affiliated with the courier companies.
- The integrations use observed tracking endpoints, not authenticated merchant APIs.
- Providers may change endpoints, request requirements, response formats, or access policies.
- A successful HTTP response does not guarantee that a tracking status can be recognized.
- Tracking numbers are not proof of identity. Add authorization to your application before returning parcel details.
- Use only tracking and phone information you are authorized to access. Do not commit real customer data or credentials to source control.

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes, submit focused pull requests, and update documentation when behavior changes. Include tests for code changes and describe any integration limitations.

## License

MIT. See [LICENSE](LICENSE) for details.

## Links

- [npm package](https://www.npmjs.com/package/bangladeshi-parcel-tracker)
- [GitHub repository](https://github.com/SecurityTalent/Bangladeshi-Parcel-Tracker)
- [Issue tracker](https://github.com/SecurityTalent/Bangladeshi-Parcel-Tracker/issues)
