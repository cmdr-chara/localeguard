# LocaleGuard demo script

**Estimated duration: 2 minutes 35 seconds.**

This script demonstrates the local app with its built-in fixtures. It makes no deployment claim and uses no external or copyrighted localization data.

| Time | On-screen action | Voiceover |
| --- | --- | --- |
| 0:00-0:15 | Show the LocaleGuard landing state and the local-processing notice. | "LocaleGuard is a local-first preflight tool for JSON translations. It catches broken technical contracts before a localization release, while keeping the files in this browser." |
| 0:15-0:35 | Point to the source and target editors. Keep the default Broken demo visible. | "The default fixture has a source locale and a deliberately broken translation. In a real review, problems like a missing key or changed placeholder can hide inside otherwise good copy." |
| 0:35-0:55 | Click **Analyze translation**. Let the brief loading state finish. | "I run the same deterministic comparison engine used by the report. It checks JSON structure alongside ICU, Mustache, printf, markup, escapes, and game-style control markers." |
| 0:55-1:20 | Scroll to the QA report. Point out the score and severity totals. Expand one missing-key or type finding. | "The score is a quick release signal, but the useful part is the explanation. Every finding has a JSON path, expected and actual contract, severity, and a specific next step." |
| 1:20-1:40 | Use the severity filter, then search for a visible term such as `welcome` or `placeholder`. | "Reviewers can narrow a noisy result by severity or search directly for a path, category, or remediation message." |
| 1:40-1:57 | Click **Export Markdown**. Show the downloaded report if the browser makes it visible. | "When the review is ready to share, LocaleGuard exports a Markdown report locally. There is no account, API key, or upload step." |
| 1:57-2:17 | Select **Valid fixture**, wait for the result, and show the success state. | "Now I switch to the valid fixture. The Italian prose changes, but the JSON structure and checked contracts remain intact, so preflight passes." |
| 2:17-2:35 | Select **Control-code demo** and show the marker-related finding. | "Finally, this synthetic control-code fixture shows why order and repetition matter. LocaleGuard reports a changed GameMaker-style marker as release-blocking without using any real game dialogue or data." |

## Recording notes

- Record at a readable desktop resolution and keep browser zoom at 100%.
- Start from the default fixture so the result is immediately visible.
- Pause briefly after each fixture selection for the 180 ms local loading state to resolve.
- If the download shelf is hidden, say the export is browser-side and show the report button rather than improvising a filesystem claim.
- Keep the final cut under three minutes. The voiceover is about 200 words; the timed actions, pauses, and fixture transitions fit the 2:35 estimate.
