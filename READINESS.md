# Invoicer - Readiness

Definition of done: every row below is `verified`, `cut`, `owner` or `waiting`, and every gate passes.
Statuses: todo | building (who) | verified | owner | waiting | cut (reason)

## Scope

| Surface | Production URL / store / channel | Run | Test | Deploy |
|---|---|---|---|---|
| Web (static, localStorage) | https://fainir.github.io/invoicer-demo/ (after the owner enables Pages) | `python3 -m http.server 8080` | `node --test tests/*.test.js` | push to `main`; Pages serves the repo root |

## Flows

| ID | Flow (user words) | Surfaces | Status | Evidence | Verified on |
|---|---|---|---|---|---|
| F1 | First run: I set up my business once (name, address, email, optional logo, default currency and tax rate) and the app remembers it. Missing name or bad email shows an error next to the field; a logo over 300 KB or a non-image is refused with a clear message | web 375 + desktop | todo | | |
| F2 | I create an invoice: client, line items with quantity and unit price, tax, discount, due date, notes; the number is assigned automatically and the preview updates as I type. Empty client or no valid line shows errors and nothing is saved; a refresh mid-edit restores what I typed | web 375 + desktop | todo | | |
| F3 | I export the invoice as a PDF through the browser print flow; the printed page shows only the invoice, cleanly laid out, and the suggested filename is the invoice number | web desktop (print) | todo | | |
| F4 | I see my saved invoices with status draft/sent/paid, change a status, duplicate one, delete one and undo the delete, and search by number or client; an empty list and an empty search both tell me what to do next | web 375 + desktop | todo | | |
| F5 | I share an invoice: copy a plain-text summary to the clipboard, or open an email draft addressed to the client with the summary in the body | web 375 + desktop | todo | | |
| F6 | I download a JSON backup of everything, restore it on a fresh browser, and delete all data after a confirmation; a broken backup file is refused with a clear message | web desktop | todo | | |
| F7 | Edge states: no business set up yet points me to Settings; storage blocked or full shows a plain-words banner and the app keeps working for the session; keyboard-only use reaches every control with a visible focus ring | web 375 + desktop | todo | | |

## Gates

| Gate | Status | Evidence |
|---|---|---|
| Security: no secrets in repo, no third-party scripts, input validated, no network calls at runtime | verified | qa/gates/security.md (history scan 0 hits, runtime requests = own 6 files only, 16 unit tests on validation) |
| Data: backup export + one tested restore, delete all data works, privacy note accurate | todo | |
| Reliability: app loads from a cold cache, storage failures handled, no console errors on any flow | todo | |
| Performance: Lighthouse on mobile, performance and accessibility at least 90 | verified | qa/perf/lighthouse.md: list 99/100, editor 99/100, settings 100/100, CLS 0 (2026-10-29) |
| UX/UI: every screen at 375px and desktop, states, contrast, keyboard | verified | qa/ux/ (21 screenshots, 21 fixes applied, U1 fixed in 524f5ab), Lighthouse accessibility 100 |
| Legal/store: privacy note in the app and README accurate | verified | privacy.html (reviewed at 375 and 1440: qa/ux/privacy-375.png), README 'Privacy', footer line on every screen |
| Ops: CI green on main, one documented deploy path, rollback (revert + push), README runs in 10 minutes | owner | qa/gates/ops.md: rollback tried (3240730 reverted by 15f7254), deploy path in README; CI steps pass locally (qa/gates/ci-local.md) but GitHub Actions is blocked on the private repo by the Actions budget - owner action 1 unblocks it |

## Owner actions

1. GitHub -> https://github.com/fainir/invoicer-demo/settings -> Danger zone: Change visibility to Public, then Pages: Source 'Deploy from a branch', branch main, folder / (root) (or run `bash scripts/enable-pages.sh`) -> unblocks the production URL, the Ops gate (CI runs free on public repos) and the production smoke test

## Waiting on third parties

| What | Since | Next check | Notes |
|---|---|---|---|

## Log (last 10)

- 2026-10-29 - created ledger
- 2026-10-29 - wrote PRODUCT.md and the flow rows F1-F7
- 2026-10-29 - built all seven flows (48e85da), 16 unit tests, smoke pass at 375 and 1440 with no console errors
- 2026-10-29 - UX review: 21 fixes, 1 open row U1 fixed (524f5ab); Lighthouse 99-100 / a11y 100
- 2026-10-29 - gates: security, performance, UX/UI, legal verified; ops needs the owner's public-repo click
