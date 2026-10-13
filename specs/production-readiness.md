# Production readiness

The npm library is the primary deliverable. A passing mocked test suite verifies package behavior against fixtures; it does not prove a courier's live API is available or that credentials are valid.

## Package release checks

| Area | Current evidence | Remaining work |
| --- | --- | --- |
| Input validation, normalized results, safe errors, timeouts | Implemented and covered by mocked tests | Review changes with each release |
| Retry, cancellation, and opt-in cache | Implemented and covered by mocked tests | Confirm deployment-specific timeout and retry settings |
| Legacy API compatibility and module exports | Automated tests pass | Validate against real downstream projects if practical |
| Package contents and TypeScript declarations | `npm pack --dry-run` and declaration check pass | Inspect the exact tarball before each publish |
| Courier integrations | Existing adapter behavior is represented by mocked tests | Verify endpoints, auth, and payloads with authorized provider accounts |
| Public npm release | Not published by this work | Confirm npm ownership, release version, and artifact before publishing |

## Optional React example

`examples/react-demo/` demonstrates an application consuming the local package through a server-side API. A successful local build verifies bundling only. It does not establish production hosting, credential configuration, browser behavior across deployment origins, or live courier tracking.

## Verification record (2026-10-13)

- Root `npm ci`: **passed**; root tooling has no third-party dependencies.
- Root `npm run validate`: **passed**; 18 package tests passed and the `npm pack --dry-run` check listed 15 intended package files.
- TypeScript declaration check: **passed**.
- Package source syntax checks: **passed**.
- React demo `npm run build`: **passed**.
- Live courier requests, current provider endpoint behavior, npm registry parity, and production deployment: **not verified**.

Package tests, pack inspection, syntax checks, and the React demo build were rerun against this organized workspace. The `apps/` directory is absent. The package is locally release-checked, but live courier behavior and deployment remain unverified.

## Release gate

Before publishing, run tests and package inspection on the final source, review the exact artifact, verify npm ownership and version, and record the source revision. Test live integrations only with authorized courier access and non-customer test data. Mocked tests cannot establish upstream service health. Publishing is a separate manual release action.
