# Spec-driven development

These specs describe the npm library, its optional React example, and release readiness. Update the relevant spec when intended behavior changes; implementation and docs should then agree with it.

## Before implementation

1. Name the affected deliverable: `packages/bangladeshi-parcel-tracker` or `examples/react-demo`.
2. Read its spec and the production readiness tracker.
3. Write down the behavior, validation, failure behavior, security/privacy impact, and acceptance criteria for the change.
4. Keep the change scoped to that deliverable unless an explicit cross-project change is required.

## Completion record

For each change, record in the relevant spec or pull request:

- requirement/acceptance criteria addressed;
- files or public behavior changed;
- checks run and their outcomes (including live-network dependencies);
- remaining risks or release blockers.

Do not mark a criterion complete based on documentation alone. If behavior is not implemented or verified, label it `Planned` or `Unverified`.

## Specs

- [NPM tracking library](npm-library.md)
- [Production readiness](production-readiness.md)
