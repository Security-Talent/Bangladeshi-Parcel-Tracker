# Bangladeshi Parcel Tracker

A lightweight Node.js library for retrieving parcel tracking information from five courier services in Bangladesh: RedX, Pathao, Rokomari, Steadfast, and Sundarban.

The library offers a unified API with normalized status fields, plus courier-specific methods for applications that need provider responses. It has no runtime dependencies and requires Node.js 18 or later.

> Courier endpoints and response formats are controlled by their providers and may change. This package does not guarantee service availability.

## Supported couriers

| Courier | Tracking number | Recipient phone |
| --- | --- | --- |
| RedX | Required | Not required |
| Pathao | Required | Required |
| Rokomari | Required | Required |
| Steadfast | Required | Not required |
| Sundarban | Required | Not required |

## Installation

Install the published package in a Node.js project:

```sh
npm install bangladeshi-parcel-tracker
```

## Quick start

Use `track()` for a consistent result format across couriers:

```js
const tracker = require("bangladeshi-parcel-tracker");

async function main() {
  try {
    const result = await tracker.track({
      courier: "redx",
      trackingNumber: "YOUR_TRACKING_NUMBER"
    });

    console.log(result.status.label);
    console.log(result.events);
  } catch (error) {
    console.error(error.code, error.message);
  }
}

main();
```

Pathao and Rokomari require the recipient phone number:

```js
const result = await tracker.track({
  courier: "pathao",
  trackingNumber: "YOUR_TRACKING_NUMBER",
  phone: "+8801XXXXXXXXX"
});
```

`track()` returns a normalized result containing the courier, tracking number, status, estimated delivery (when available), and tracking events. Some providers may not return enough information to populate every field.

## Development

### Requirements

- Node.js 18 or later
- npm

### Run checks

From the repository root, install dependencies and run the library tests and package content check:

```sh
npm ci
npm run validate
```

The library itself has no runtime dependencies. Its tests use mocked responses and do not contact courier services.

### Build the optional React demo

The demo is a separate example application. It calls the library from a local Node.js server; the browser does not call courier endpoints directly.

```sh
cd examples/react-demo
npm ci
npm run build
```

For local development, open two terminals in `examples/react-demo` and run:

```sh
npm run server
```

```sh
npm run dev
```

Open the local address printed by Vite. See the [demo README](examples/react-demo/README.md) for details.

## Repository structure

- [`packages/bangladeshi-parcel-tracker/`](packages/bangladeshi-parcel-tracker/) — library source, API declarations, documentation, and tests.
- [`examples/react-demo/`](examples/react-demo/) — optional React and Vite example.
- [`scripts/`](scripts/) — repository validation utilities.

See the [package README](packages/bangladeshi-parcel-tracker/README.md) for the complete API reference, options, errors, TypeScript declarations, and integration guidance.

## License

MIT. See the package [LICENSE](packages/bangladeshi-parcel-tracker/LICENSE).
