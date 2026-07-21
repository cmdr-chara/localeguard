# LocaleGuard submission checklist

Use this as the final gate. Checked items are present in the local project; unchecked items require a deliberate final action.

## Product and documentation

- [x] Local React/TypeScript/Vite application is present.
- [x] README includes judge quickstart, rule coverage, privacy model, limits, architecture, and local commands.
- [x] MIT license is included.
- [x] Built-in fixtures are synthetic and do not contain copyrighted dialogue.
- [x] Devpost description and timed demo script are included in `docs/`.
- [x] README references `docs/localeguard-preview.png`.

## Required verification

- [x] Run `npm run typecheck` in the final working tree.
- [x] Run `npm run lint` in the final working tree.
- [x] Run `npm test` in the final working tree: 11 tests passed.
- [x] Run `npm run build` in the final working tree.
- [x] Perform a final browser smoke test: broken fixture, valid fixture, control-code fixture, invalid JSON, filters, search, and the Markdown export action.

The in-app browser completed the export click without a console error, but its automation layer did not expose the Blob download event. Confirm the downloaded `.md` file once in the normal recording browser before submission.

## Submission assets and links

- [x] Capture `docs/localeguard-preview.png` from the finished UI.
- [ ] Record and upload the under-three-minute demo video.
- [ ] Host the repository and add its URL to `docs/DEVPOST.md`.
- [ ] Deploy the app and add the live URL to `README.md` and `docs/DEVPOST.md`.
- [ ] Confirm the deployed app still runs entirely in the browser and does not send locale contents over the network.

## Before submitting

- [ ] Replace only the clearly marked pending submission fields with real URLs.
- [ ] Confirm the screenshot, video, and repository describe the same final revision.
- [ ] Re-read the limitations: ICU branch semantics and HTML/XML attributes are not currently validated.
- [ ] Do not claim a deployment or end-to-end result until it has actually been verified.
