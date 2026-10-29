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
| F1 | First run: I set up my business once (name, address, email, optional logo, default currency and tax rate) and the app remembers it. Missing name or bad email shows an error next to the field; a logo over 300 KB or a non-image is refused with a clear message | web 375 + desktop | verified | qa/F1/notes.md (rounds 1-2), qa/regression-2026-10-29.md | 2026-10-29 |
| F2 | I create an invoice: client, line items with quantity and unit price, tax, discount, due date, notes; the number is assigned automatically and the preview updates as I type. Empty client or no valid line shows errors and nothing is saved; a refresh mid-edit restores what I typed | web 375 + desktop | verified | qa/F2/notes.md (rounds 1-2), scripts/qa-defects.py 35/35, qa/regression-2026-10-29.md | 2026-10-29 |
| F3 | I export the invoice as a PDF through the browser print flow; the printed page shows only the invoice, cleanly laid out, and the suggested filename is the invoice number | web desktop (print) | verified | qa/F3/notes.md (55 checks), qa/F3/2026-10-29-invoice.pdf, qa/regression-2026-10-29.md | 2026-10-29 |
| F4 | I see my saved invoices with status draft/sent/paid, change a status, duplicate one, delete one and undo the delete, and search by number or client; an empty list and an empty search both tell me what to do next | web 375 + desktop | verified | qa/F4/notes.md (84 checks round 2), qa/regression-2026-10-29.md | 2026-10-29 |
| F5 | I share an invoice: copy a plain-text summary to the clipboard, or open an email draft addressed to the client with the summary in the body | web 375 + desktop | verified | qa/F5/notes.md (62 checks round 2), qa/regression-2026-10-29.md | 2026-10-29 |
| F6 | I download a JSON backup of everything, restore it on a fresh browser, and delete all data after a confirmation; a broken backup file is refused with a clear message | web desktop | verified | qa/F6/notes.md (rounds 1-2), qa/F6/invoicer-backup-2026-10-29.json, qa/regression-2026-10-29.md | 2026-10-29 |
| F7 | Edge states: no business set up yet points me to Settings; storage blocked or full shows a plain-words banner and the app keeps working for the session; keyboard-only use reaches every control with a visible focus ring | web 375 + desktop | verified | qa/F7/notes.md (rounds 1-2), qa/defects/D9-banner-in-view-375.png, qa/regression-2026-10-29.md | 2026-10-29 |

## Defects (QA rounds 1 and 2, 2026-10-29; all fixed and re-tested, see qa/regression-2026-10-29.md)

| ID | Defect (user words) | Surface | Status | Evidence |
|---|---|---|---|---|
| D1 | F1: the "next invoice will be" hint did not follow the prefix and number I typed until Save | web 375 + desktop | fixed | qa/F1/2026-10-29-05-hint-stale-375.png, re-check scripts/qa-defects.py |
| D2 | F1: after a refused logo the form said "Fix the highlighted field" although Save worked | web 375 + desktop | fixed | qa/F1/2026-10-29-06-saved-after-refusal-1440.png |
| D3 | F3: printing with Cmd+P instead of the button suggested "INV-0001 - Invoicer.pdf" as the filename | web desktop (print) | fixed | qa/F3/notes.md |
| D4 | F6: restoring a backup silently replaced newer invoices with no warning or undo | web desktop | fixed | qa/F6/notes.md, qa/defects/D4-restore-dialog-1440.png |
| D5 | F6: a stale "Restored" toast stayed on screen while a later bad file was refused | web desktop | fixed | qa/F6/2026-10-29-broken-1440.png |
| D6 | F5: the toast covered the Copy summary and Email invoice buttons | web 375 + desktop | fixed | qa/F5/2026-10-29-02-copy-toast-1440.png, qa/defects/D6-toast-top-1440.png |
| D7 | F2: double-clicking Save stored the same new invoice twice as INV-0001 | web 375 + desktop | fixed | qa/F2/2026-10-29-s5-dblclick-1440.png |
| D8 | F2: a refresh within half a second of typing lost the last keystrokes of the draft | web 375 + desktop | fixed | qa/F2/notes.md |
| D9 | F7: with storage full, Save gave no visible reaction; the banner sat out of view at the top | web 375 + desktop | fixed | qa/F7/2026-10-29-03-full-375.png, qa/defects/D9-banner-in-view-375.png |
| D10 | F7: with storage full, a second Save added a duplicate INV-0001 | web 375 + desktop | fixed | qa/F7/2026-10-29-03-full-twice.png |
| D11 | F7: a $1,250,000.00 total made the editor and the list scroll sideways on a phone | web 375 | fixed | qa/F7/2026-10-29-07-reduced-motion-overflow-375.png, qa/defects/D11-big-total-375.png |
| D12 | F1/F5/F7: on a phone the toast sat over the Invoices / Settings / New invoice links for 7 seconds | web 375 | fixed | qa/F1/2026-10-29-r2-toast-over-nav-375.png, qa/defects/D12-toast-under-header-375.png |
| D13 | F6: restoring a backup silently dropped an invoice I was still writing | web desktop | fixed | qa/F6/notes.md (round 2) |
| D14 | F6: the restore dialog wording made no sense when the browser had settings but no invoices | web desktop | fixed | qa/F6/notes.md (round 2) |
| D15 | F7: after a failed save with storage full, Save and Remove logo did nothing until I left the page (console error) | web 375 + desktop | fixed | qa/F7/2026-10-29-r2-03-full-retry-375.png |
| D16 | F7: same toast-over-header issue as D12 seen from the list | web 375 | fixed | qa/F7/2026-10-29-r2-05-toast-header-375.png |
| D17 | F2: tapping Invoices within a quarter second of typing lost the last keystrokes of the draft | web 375 + desktop | fixed | qa/F2/notes.md (round 2) |
| D18 | F2: saving right after typing left a stale "restored your changes" notice after a refresh | web 375 + desktop | fixed | qa/F2/2026-10-29-r2-stale-notice-375.png |
| D19 | F2: a 120-character one-word client name ran off the preview and widened the page | web 375 + desktop + print | fixed | qa/F2/2026-10-29-r2-longname-375.png |

## Gates

| Gate | Status | Evidence |
|---|---|---|
| Security: no secrets in repo, no third-party scripts, input validated, no network calls at runtime | verified | qa/gates/security.md (history scan 0 hits, runtime requests = own 6 files only, 16 unit tests on validation) |
| Data: backup export + one tested restore, delete all data works, privacy note accurate | verified | qa/F6/notes.md: backup downloaded, restored on a fresh browser and after delete-all, broken files refused, replace asks first; privacy.html |
| Reliability: app loads from a cold cache, storage failures handled, no console errors on any flow | verified | qa/F7/notes.md: blocked storage, full storage and corrupt data handled; zero console or page errors across 11 QA runs (qa/regression-2026-10-29.md) |
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
- 2026-10-29 - QA round 1 (7 agents): F4 verified, F1/F3/F5/F6 verified with minor defects, F2/F7 not verified; 11 defects D1-D11 fixed, re-check 21/21 (scripts/qa-defects.py)
- 2026-10-29 - QA round 2 (4 agents): D1-D11 confirmed fixed, 8 more defects D12-D19 found and fixed, re-check 35/35; final regression fcbea22: all 7 flows verified, data and reliability gates verified
- 2026-10-29 - done except the owner's click: make the repo public and enable Pages
