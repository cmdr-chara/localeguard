# LocaleGuard agent instructions

## Product contracts

- Keep translation files in browser memory. Preserve the no-backend, no-telemetry, no-upload, and no-account design.
- Validate structural and token contracts, not literary quality, native fluency, or translation correctness. A clean report is not linguistic certification.
- Preserve deterministic findings, JSON paths, ordering, severity, and scoring. Changes to a supported rule must update its tests and documented limits together.
- Placeholder identity, multiplicity, and order rules differ by syntax. Do not sort every token list or normalize away meaningful control markers to make translations pass.
- Treat imported strings as untrusted data, including rendered markup and exported Markdown. Keep the documented file-size boundary and explicit parse errors.

## Guidance and verification

[README.md](README.md) defines supported checks and limitations. Keep reusable validation in `src/engine/` and presentation in the React interface; do not introduce UI state into the deterministic engine.

For behavior changes, use the scripts in [package.json](package.json): `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Cover affected rules with valid and adversarial fixtures. Use synthetic dialogue/control-marker examples rather than copying game dialogue into tests.

Finish with relevant checks passing, privacy and determinism preserved, and README claims matching implementation. UI changes also need the affected import, analysis, filtering, and export flows checked; a production build alone does not prove them.
