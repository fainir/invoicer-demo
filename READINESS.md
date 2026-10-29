# Invoicer - Readiness

Definition of done: every row below is `verified`, `cut`, `owner` or `waiting`, and every gate passes.
Statuses: todo | building (who) | verified | owner | waiting | cut (reason)

## Scope

| Surface | Production URL / store / channel | Run | Test | Deploy |
|---|---|---|---|---|
| Web (static, localStorage) | https://fainir.github.io/invoicer-demo/ (after the owner enables Pages) | `python3 -m http.server 8080` | `node --test tests/` | push to `main`; Pages serves the repo root |

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
| Security: no secrets in repo, no third-party scripts, input validated, no network calls at runtime | todo | |
| Data: backup export + one tested restore, delete all data works, privacy note accurate | todo | |
| Reliability: app loads from a cold cache, storage failures handled, no console errors on any flow | todo | |
| Performance: Lighthouse on mobile, performance and accessibility at least 90 | todo | |
| UX/UI: every screen at 375px and desktop, states, contrast, keyboard | todo | |
| Legal/store: privacy note in the app and README accurate | todo | |
| Ops: CI green on main, one documented deploy path, rollback (revert + push), README runs in 10 minutes | todo | |

## Owner actions

1. (none yet) - format: exact place, exact action, what it unblocks.

## Waiting on third parties

| What | Since | Next check | Notes |
|---|---|---|---|

## Log (last 10)

- 2026-10-29 - created ledger
- 2026-10-29 - wrote PRODUCT.md and the flow rows F1-F7
