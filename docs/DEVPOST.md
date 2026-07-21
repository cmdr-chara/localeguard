# LocaleGuard: Devpost submission copy

## Elevator pitch

> LocaleGuard preflights JSON translations locally, catching broken keys, placeholders, markup, and game control markers before they reach players.

**Character count: 145** (including spaces and final punctuation; excluding the quotation marker).

## Project description

LocaleGuard is a local-first preflight tool for JSON translations. It compares a source locale against a target locale and finds the technical regressions that ordinary review can miss: missing or extra nested keys, type drift, shortened arrays, renamed placeholders, broken tag sequences, lost escapes, and altered GameMaker-style control markers.

Load or drop two JSON files, run the comparison, and get a deterministic QA report with the affected JSON path, expected versus actual contract signatures, severity, remediation guidance, and a score. Findings can be filtered, searched, and exported as Markdown. Everything happens in the browser: no files are uploaded, and no account or API key is needed.

### Inspiration

Localization work is full of text that is not really just text. Variables, formatting tags, escape sequences, and game control codes can be small enough to overlook and important enough to break a release. The goal was a focused release gate that catches those contracts while staying out of the translator's prose.

### What it does

LocaleGuard validates nested JSON keys, value types, `null`, array length, ICU placeholder names and formatter kinds, Mustache tokens, printf specifiers, HTML/XML tag sequence, escaped and control sequences, and compact or bracket GameMaker-style markers. It keeps token order and repetition intact during comparison, which matters for control strings.

Three synthetic in-app fixtures make the behavior inspectable without importing data: a broken generic translation, a valid translation, and a GameMaker-style marker regression. The game-oriented fixture contains no dialogue or source material from any game.

### How it was built

The app is React, TypeScript, and Vite. A reusable pure comparison engine walks the JSON tree and delegates string checks to focused token extractors. The UI wraps that engine with file selection, drag and drop, in-place JSON editors, invalid-JSON states, severity filters, search, deterministic scoring, and browser-side Markdown export.

Codex and GPT-5.6 accelerated implementation by helping decompose the engine, draft focused tests, and iterate on the interface. Human judgment set the product boundaries: local-only processing, explainable JSON-path findings, synthetic examples, and explicit limits instead of a vague claim that every localization issue can be detected.

### Challenges

The tricky part was avoiding a simplistic token set comparison. Tokens can be repeated, order can matter, and brace-based syntaxes can overlap. The engine therefore preserves source order and multiplicity, separates extractor responsibilities, and ignores literal `%%` when parsing printf. The UI challenge was making a technical report readable enough to serve translators and release reviewers, not only engineers.

### Accomplishments

- A local-only JSON QA workflow with no upload or account requirement.
- One engine for structural validation and several interpolation/control-code failure modes.
- A report designed to point directly to a path, a contract difference, and a next action.
- Synthetic, copyright-safe fixtures that demonstrate ordinary and game-oriented regressions.

### What we learned

Useful validation is as much about restraint as coverage. A tool that says it can validate all ICU semantics or all HTML would mislead users if it only recognizes a limited syntax. LocaleGuard names its current boundary: it checks ICU placeholder signatures and tag sequence, not ICU branch behavior or HTML/XML attributes.

### What is next

Potential next steps are richer ICU parsing, attribute-level markup validation, configurable marker dialects, non-JSON adapters, CI integration, and baseline approval workflows. They are future work, not current product claims.

## Submission fields

- Repository URL: **[PENDING: repository has not been hosted]**
- Live demo URL: **[PENDING: deployment has not been created]**
- Demo video URL: **[PENDING: record and upload the demo]**
- Screenshot: `docs/localeguard-preview.png` **[READY: captured from the final local UI]**
