# Bangladeshi Parcel Tracker

The main deliverable in this repository is the reusable npm library at [`packages/bangladeshi-parcel-tracker`](packages/bangladeshi-parcel-tracker/). It provides legacy courier functions and a unified tracking API for RedX, Steadfast, Pathao, Rokomari, and Sundarban.

## Repository layout

- `packages/bangladeshi-parcel-tracker/` — npm library source, documentation, declarations, and deterministic tests.
- `examples/react-demo/` — optional React/Vite example that uses the package through a local API server.
- `specs/` — library requirements and release-readiness notes.

The library is the source of truth for tracking behavior. The React demo is an example consumer, not a separate product or release branch.

## Develop and verify the project

Use Node.js 18 or later. The root npm scripts run the package's deterministic tests and inspect the package artifact:

```sh
npm ci
npm run validate
```

Build the React example after installing its own dependencies:

```sh
cd examples/react-demo
npm ci
npm run build
```

See the [package README](packages/bangladeshi-parcel-tracker/README.md) for installation, complete API documentation, courier requirements, options, examples, and limitations. Package-only development also works by running `npm ci`, `npm test`, and `npm pack --dry-run` inside `packages/bangladeshi-parcel-tracker`.

## Run the React example

See [examples/react-demo/README.md](examples/react-demo/README.md). Install its dependencies, then run its API server and Vite development server as documented there. It imports this workspace's package through a local `file:` dependency; courier lookup still requires valid provider access and should not be treated as successful based on the UI alone.

## Project workflow

Keep the library and its documentation together under `packages/bangladeshi-parcel-tracker`. Use [specs/README.md](specs/README.md) and [specs/production-readiness.md](specs/production-readiness.md) to track behavior and checks. This repository is intended to use one `main` branch; the npm package is a directory within that project, not a separate branch.
