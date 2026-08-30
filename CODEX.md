# Codex instructions — Mother Editor

## Project baseline
The approved baseline is Mother Editor Mobile V2.2.2. Treat the existing `index.html` on `main` as the baseline and preserve existing functionality unless a task explicitly requires a change.

## Safe-change rules
- Work on `codex-work` (or a dedicated feature branch) first; do not directly rewrite `main` for experimental changes.
- Keep changes focused and reversible.
- Do not remove or rewrite unrelated editor features.
- Preserve mobile responsiveness, especially layouts at 390px and below.
- Before changing deployment/publishing code, inspect the current implementation and document the reason for the change.
- Never add secrets, API keys, account credentials, or payment credentials to source control.

## Validation
- Check HTML/JavaScript syntax after edits.
- Test the changed behavior on desktop and mobile-sized viewports where possible.
- Verify existing editable text, font controls, color controls, links, payment section, FAQ, language switching, and responsive layout remain functional after UI changes.

## Deployment
Cloudflare deployment is separate from source control. Do not assume that a GitHub commit is deployed to Cloudflare unless the repository's deployment workflow explicitly confirms it.

## Change discipline
For each task: inspect -> make the smallest safe change -> validate -> summarize files changed and any remaining risk.
