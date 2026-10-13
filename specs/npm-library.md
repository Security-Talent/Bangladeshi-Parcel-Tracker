# NPM tracking library spec

**Status:** Unified API implemented; automated/local integration checks pass; courier behavior not live-verified  
**Working source:** `packages/bangladeshi-parcel-tracker/` (primary project source; version 1.3.0)

## Purpose

Provide a CommonJS library and ESM interop for tracking parcels through RedX, Steadfast, Pathao, Rokomari, and Sundarban.

## Public behavior

- Preserve legacy functions `redx`, `steadfast`, `pathao`, `rokomari`, and `sundarban`, returning provider data.
- Provide `track({ courier, trackingNumber, phone? }, options?)`, returning normalized status/events with `raw: null`.
- Require `phone` for Pathao and Rokomari only; do not rewrite tracking identifiers.
- Classify failures using `TrackingError.code`, `.message`, and `.retryable`; exclude response bodies and personal values.
- Default to 10 second timeout, no retries, no cache. Optional retries are limited to transient GET-based providers. POST tracking requests are not retried.
- Keep cache opt-in and process-local; allow cancellation through `AbortSignal`.

## Release acceptance

- Mocked tests verify each adapter's endpoint/method/body, validation, normalization, error mapping, retries, cancellation, caching, and module exports.
- `npm test` is deterministic and does not call courier services.
- `npm pack --dry-run` includes runtime source, declarations, README, and license but not tests.
- Metadata and lockfile agree; documented Node engine/module behavior matches tested behavior.

## Limitations

Provider endpoints/responses have not been live-verified. Rokomari returns HTML in the observed source and normalized fields may remain unknown. Normalization only maps recognized field/status patterns; it does not guarantee courier-specific event extraction. The optional smoke command makes a live request and requires explicit environment variables.

## Verification record (2026-10-13)

- `npm test` in the package: **18 passed, 0 failed**.
- `npm pack --dry-run --json`: **passed** with 15 expected runtime, declaration, documentation, and license files; no test folder or `node_modules` included.
- TypeScript declaration check (`tsc.cmd --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext type-tests/types.ts`): **passed**.
- `node --check index.js` and the React demo `server.cjs`: **passed**.
- React demo `npm run build`: **passed** with Vite 6.4.3.
- React demo local API smoke check: `/api/health` returned the five courier identifiers and `/api/track` rejected an unsupported courier with HTTP 400 and `UNSUPPORTED_COURIER`.
- Courier live lookup, npm registry install/published-version parity, deployed browser behavior, and production hosting configuration: **not verified**.
