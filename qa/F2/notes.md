# F2 - Create an invoice (editor, preview, validation, draft restore)

Date: 2026-10-29. Commit: 524f5ab. Surface: http://127.0.0.1:8080/ in headless Chromium via Playwright
(scripts/browser.py), fresh context per scenario, 375x812 and 1440x900. Each scenario first saved
business details in Settings (name, email, tax rate 10) like a real user, then opened #/new.

Verdict: NOT verified. One real defect (D1, duplicate invoice number on double-click Save) and one minor one (D2).
Console errors, page errors and failed requests: none in any scenario at either width.

## 1. Blank editor (s1-blank-375.png; desktop layout visible in s2-empty-submit-1440.png)
- Subtitle "Will be numbered INV-0001 when you save."; document.title "New invoice - Invoicer".
- Preview: Number INV-0001, Issued Oct 29 2026, Due Nov 12 2026, "Client name" placeholder, one line "- / 1 / $0.00 / $0.00",
  Subtotal $0.00, Tax (10%) $0.00, Total due $0.00. Business name and email from Settings show in the preview.
- One line row (desc empty, qty 1, price empty); its X button is disabled with title "An invoice needs at least one line".
- 375: sticky bottom bar "Total $0.00 / Preview / Save" at the viewport bottom; no horizontal overflow at either width.
- Observation: the "Settings saved." toast (7 s) stays on screen after navigating to #/new and sits over the Notes label at 375.

## 2. Submit empty (s2-empty-submit-375.png, s2-empty-submit-1440.png)
- Clicking Save (form button at both widths, and the bar Save at 375): errors "Enter the client name.", "Describe this line.",
  "Enter a price of 0 or more.", summary "Fix the 3 highlighted fields to save this invoice."; aria-invalid on the three fields;
  focus moves to the client name; URL stays #/new. Storage has 0 invoices; #/invoices shows "No invoices yet".
- Observation (375): the page scrolls smoothly to the focused field (200 ms after the click it was still off-screen, in view after 1 s).

## 3. Fill the form, totals, discount, due date, remove line (s3-totals-375.png, s3-totals-1440.png, s3-errors-1440.png)
- Preview updates per keystroke: typing "Acme" showed "Acme" in Bill to before the name was finished.
- Acme Studio / billing@acme.com / 2-line address; Logo design 1 x 500 ($500.00), Add line (focus moves to the new description),
  Hours 2.5 x 80 ($200.00); Percent 10; tax 10; notes. Preview: Subtotal $700.00, Discount (10%) -$70.00, Tax (10%) $63.00,
  Total due $693.00; notes shown. 375 bar total $693.00. Exactly as specified at both widths.
- Fixed amount 50: Discount -$50.00, Tax (10%) $65.00, Total due $715.00; bar $715.00.
- Fixed 5000: while typing, the preview clamps to Discount -$700.00, Tax $0.00, Total $0.00 with no error; on Save:
  "The discount is more than the subtotal." + summary, focus on the Discount field, nothing saved.
- Due date 2026-10-01 (before issue 2026-10-29): error appears live (errors mode) and on Save:
  "The due date cannot be before the issue date."; focus on Due date; nothing saved.
- Observation (375): after a failed Save the focused field lands at the very top edge of the viewport; its label is just above
  the fold (the header is not sticky, the error text under the field is visible).
- Fixing both clears the errors. Removing line 2 with X: one row left, totals $500.00 / -$50.00 / $45.00 / $495.00, focus on the
  remaining description, its X disabled. Re-adding Hours and removing line 1 instead keeps Hours 2.5 x 80 (subtotal $200.00).
  Force-clicking the disabled X does nothing.

## 4. Refresh mid-edit (s4-restored-375.png)
- Filled everything (incl. due date 2026-11-20, currency EUR, fixed 50), waited 0.7 s, page.reload(): notice
  "Restored the changes you had not saved. Discard them"; every field and both lines came back; totals EUR 715.00; bar EUR 715.00.
- Navigating to Invoices (list still empty) and back to New invoice without a reload also restores the draft.
- "Discard them": blank form (name/email/address/notes empty, one empty line, USD, percent 0, tax 10), toast
  "Discarded the unsaved changes.", draft gone from storage; a reload afterwards stays blank.
- D2 (minor): the draft is written 400 ms after the last keystroke. Reloading right after typing (fill name, description and price
  then reload at once): at 1440 the notice appeared with name "Quick Co" and description "Fast line" restored but the price field
  empty; at 375 (all three typed within 0.4 s) there was no notice and the form was blank.

## 5. Save, re-save, second invoice, list (s5-saved-1440.png, s5-list-375.png, s5-dblclick-1440.png)
- Save: toast "Saved INV-0001.", URL #/edit/<id>, h1 INV-0001, subtitle "Draft - last saved Oct 29, 2026, 12:51 PM",
  document.title "INV-0001 - Invoicer", "Back to invoices" appears, storage: 1 invoice, nextNumber 2, draft null.
- Reload on the edit page: no restore notice, data intact. Change the client name to "Acme Studio Ltd", Save:
  toast "Saved INV-0001.", still INV-0001, still one stored invoice, nextNumber still 2.
- New invoice: "Will be numbered INV-0002 when you save.", blank form; Beta Corp, Consulting 3 x 100, no discount -> "Saved INV-0002.",
  totals $300.00 / $30.00 / $330.00. List: INV-0002 Beta Corp $330.00 and INV-0001 Acme Studio Ltd $693.00, "2 invoices, 2 not paid yet".
- D1: double-clicking Save on a new invoice (form button at 1440, bar Save at 375) stores the same record twice: the list shows two
  rows "INV-0001 Acme Studio $550.00", storage holds two entries with the same id and number, nextNumber is 2, and the next new
  invoice is offered INV-0002. Same at both widths.

## 6. Keyboard (s6-focus-1440.png)
- Enter in the client name: validation runs (line errors + summary), URL stays #/new, the typed name is kept, nothing saved.
  Enter on a valid form saves (one invoice). Escape closes the toast.
- Tab from client name: client email > client address > issue date (4 presses: 3 segments + picker, Chromium behaviour) > due date (4) >
  currency > description > qty > unit price > (disabled X skipped) > Add line > discount type > discount > tax rate > notes >
  Save invoice > Download PDF > Copy summary > Email invoice > (1440: footer Privacy link; 375: bar Preview button). Reading order.
- Focus ring: 3px solid green outline (rgb(31,95,74)), offset 2px, :focus-visible true on the email field and on Save; see screenshot.

## 7. Unhappy inputs (s7-unhappy-375.png)
- Qty 0: "Quantity must be more than 0.", focus on qty, not saved. Price -5: amount shows -$5.00 and totals go negative in the
  preview until Save; Save: "Enter a price of 0 or more.", not saved.
- Qty "abc" typed: the browser's number field drops the letters (value empty, no badInput); amount $0.00, preview qty 0;
  Save: "Quantity must be more than 0.", not saved. Qty "1e3" is accepted as 1000. Price 10.005 x 2 shows $20.01.
- Due date cleared: live "Enter a valid due date.", preview "Due -"; Save blocks. Issue date cleared too: both errors, preview
  "Issued - / Due -", focus on issue date. Typing 31/02/2026 into the due date: the browser leaves the value empty (badInput),
  the same error shows, Save blocks.
- 1000-character description: saves, preview wraps, no horizontal overflow at 375 or 1440. 120-character unbroken word: wraps inside
  the preview card and the list row; no overflow.

## 8. Console / network
- Errors list from open_page (console error/warning, pageerror, requestfailed) was empty in every run at both widths.

## Defect rows
| D1 | F2: I double-clicked Save on a new invoice and got two invoices in the list, both numbered INV-0001 (same record stored twice). Repro: Settings saved, New invoice, client "Acme Studio", line "Logo design" 1 x 500, double-click Save (form button, or the bar Save at 375), open Invoices. | web 375 + desktop | todo | qa/F2/2026-10-29-s5-dblclick-1440.png | |
| D2 | F2: if I refresh within about half a second of my last keystroke, what I just typed is missing from the restored draft (price empty at desktop; whole draft gone when everything was typed inside 0.4 s at 375) while the notice says my changes were restored. Repro: New invoice, type a unit price, reload immediately. | web 375 + desktop | todo | qa/F2/notes.md (section 4) | |

## Round 2 (2026-10-29, commit d7c91f9)

Same surface and method as round 1: headless Chromium through scripts/browser.py, a fresh context per scenario, 375x812 and 1440x900,
business details saved in Settings first, then #/new. One replay script per width ran scenarios 1-7 plus the two defect repros; three
probe runs isolated the new findings. Console errors, page errors and failed requests: none in any scenario at either width when the
runs were serial (two browsers on the shared dev server at once produced ERR_CONNECTION_RESET on app.js / print.css; the affected
scenarios were re-run one at a time and were clean, so that was the test setup, not the app).

Verdict: still NOT verified. D7 and D8 are fixed. Three new defects: D12 (keystrokes lost when leaving the editor by in-app navigation
within 250 ms), D13 ("Restored the changes you had not saved" shown after a successful Save plus reload), D14 (a long unbroken client
name makes the editor and the print layout scroll sideways).

### Replay of scenarios 1-7 (all as in round 1 unless noted)
1. Blank editor: subtitle "Will be numbered INV-0001 when you save.", title "New invoice - Invoicer", preview INV-0001 with the business
   name and email, totals $0.00, one line with its X disabled ("An invoice needs at least one line"), no horizontal overflow; at 375 the
   bar sits at y 751-812 with Total $0.00; at 1440 the bar is hidden. The "Settings saved." toast still shows after navigating to #/new
   (observation kept from round 1; visible in r2-totals-375.png over the Currency field).
2. Empty submit (bar Save at 375, form Save at 1440): "Enter the client name.", "Describe this line.", "Enter a price of 0 or more.",
   summary "Fix the 3 highlighted fields to save this invoice.", 3 aria-invalid fields, focus on the client name (in view at 375),
   URL #/new, 0 invoices stored, list "No invoices yet".
3. Totals (r2-totals-375.png, r2-errors-1440.png): "Acme" appeared in Bill to while typing; Logo design 1 x 500 = $500.00; Add line
   focused the new description; Hours 2.5 x 80; percent 10; tax 10 -> $700.00 / -$70.00 / $63.00 / $693.00, bar $693.00. Fixed 50 ->
   -$50.00 / $65.00 / $715.00, bar $715.00. Fixed 5000: preview clamps to -$700.00 / $0.00 / $0.00; Save: "The discount is more than
   the subtotal.", focus on Discount, nothing saved. Due 2026-10-01: live error, Save: "The due date cannot be before the issue date.",
   focus on Due date, nothing saved. Fixing both clears the errors. Remove line 2: $500.00 / -$50.00 / $45.00 / $495.00, focus on the
   remaining description, its X disabled; re-add Hours and remove line 1 keeps Hours ($200.00); force-clicking the disabled X does nothing.
4. Refresh mid-edit: after 0.7 s a reload restored every field (EUR, due 2026-11-20, fixed 50, both lines, notes), totals EUR 715.00,
   bar EUR 715.00; Invoices and back without reload restores too; Discard them -> blank form, toast "Discarded the unsaved changes.",
   draft null, reload stays blank.
5. Save / re-save / second invoice: toast "Saved INV-0001.", URL #/edit/<id>, h1 INV-0001, subtitle "Draft - last saved ...", title
   "INV-0001 - Invoicer", Back to invoices link, storage 1 invoice, nextNumber 2, draft null. Rename to "Acme Studio Ltd" and Save:
   still INV-0001, one invoice, nextNumber 2. New invoice offered INV-0002 with a blank form; Beta Corp, Consulting 3 x 100 ->
   "Saved INV-0002.", $300.00 / $30.00 / $330.00; list INV-0002 Beta Corp $330.00 then INV-0001 Acme Studio Ltd $693.00,
   "2 invoices, 2 not paid yet". Reloading on the edit page straight after Save showed the restore notice: see D13.
6. Keyboard: Enter in the client name on an invalid form runs validation, keeps the name, saves nothing; Enter on a valid form saves
   one invoice; Enter pressed twice fast saves exactly one; Escape closes the toast. Tab order from the client name: email > address >
   issue date (4 presses) > due date (4) > currency > description > qty > unit price > Add line > discount type > discount > tax rate >
   notes > Save invoice > Download PDF > Copy summary > Email invoice > Privacy > Source > (wrap) skip link > Invoicer > Invoices >
   Settings. Focus ring on Save via keyboard: 3px solid rgb(31,95,74), offset 2px, :focus-visible true.
7. Unhappy inputs: qty 0 -> "Quantity must be more than 0.", focus on qty, not saved. Price -5 -> preview -$5.00 / -$0.50 / -$5.50,
   Save: "Enter a price of 0 or more.", not saved. "abc" typed into qty leaves it empty, Save blocked with the quantity error.
   1e3 -> $1,000.00. 10.005 x 2 -> $20.01. Due cleared -> live "Enter a valid due date." and "Due -" in the preview; issue cleared too
   -> both errors, focus on issue date, Save blocked. 31/02/2026 typed into Due date -> value empty (badInput), Save blocked.
   1000-character description saves, no overflow. 120-character unbroken description wraps at both widths. 120-character unbroken
   client name does not: see D14. The list row truncates it with an ellipsis and stays 375 / 1440 wide.

### D7 (double-click Save) - fixed (r2-dblclick-1440.png)
Settings saved, New invoice, Acme Studio, Logo design 1 x 500, double-click Save (form button at 1440, bar Save at 375): URL #/edit/<id>,
toast "Saved INV-0001.", storage holds exactly one invoice, nextNumber 2, the list shows one row "INV-0001 Acme Studio $550.00",
"1 invoice, 1 not paid yet", the next new invoice is offered INV-0002. A triple-click on a second new invoice also saved once
(INV-0001, INV-0002; nextNumber 3). Enter pressed twice fast (scenario 6) saved once. Same at both widths.

### D8 (reload right after typing) - fixed (r2-restored-375.png)
Client name and description filled, "77" typed into the unit price as keystrokes, page.reload() 11-19 ms after the last keystroke:
the notice appeared and the restored draft had Quick Co / Fast line / 77. Name "Zed", description "Qx" and price "9" all typed as
keystrokes inside 0.4 s then location.reload(): all three restored (the screenshot shows this draft after the price became 951).
Same at both widths. The draft is now written 250 ms after the last keystroke and flushed on pagehide.

### D12 (new): leaving the editor by in-app navigation within 250 ms of typing loses the keystrokes
Name and description filled, 0.4 s pause, then "77" typed into the unit price and the Invoices link in the header tapped 42 ms (375)
/ 58 ms (1440) after the last keystroke. Back on New invoice the notice says "Restored the changes you had not saved." but the unit
price is empty; the name and description (older than 250 ms) are there. Browser Back 6-8 ms after typing "8" into a price of 77:
the price came back as 77, not 778. With a 300 ms pause before tapping Invoices the price was kept (779). The pagehide flush added for
D8 does not run on a hash change, and the pending 250 ms write is dropped when the editor is left. Same at both widths.
Repro: New invoice, fill name and description, wait a second, type a unit price and immediately tap Invoices (or press Back), then
open New invoice again.

### D13 (new): "Restored the changes you had not saved" after a successful Save plus reload (r2-stale-notice-375.png)
Client name and description filled, "500" typed into the unit price, Save tapped 25-27 ms later (bar Save at 375, form Save at 1440):
toast "Saved INV-0001.", URL #/edit/<id>, storage draft null, 1 invoice. Reload on that page: h1 INV-0001, subtitle "Draft - last
saved ...", and above the form the notice "Restored the changes you had not saved. Discard them"; storage now holds a draft for that
id. The fields match the saved invoice, so nothing is lost; Discard them just removes the notice (toast "Discarded the unsaved
changes.", data unchanged, still 1 invoice). The same notice appeared on a different invoice (INV-0001) opened from the list after
saving INV-0003 fast, then reloading. With a 300 ms pause between the last keystroke and Save there was no notice after reload.
Same at both widths. Repro: New invoice, type the price and tap Save right away, then reload.

### D14 (new): a 120-character unbroken client name makes the editor scroll sideways (r2-longname-375.png)
Client name of 120 "N" characters, Logo design 1 x 500: the page is 1305 px wide at 375 (preview Bill to name 1272 px wide, runs
off the card) and 2139 px wide at 1440; still so after Save. In print media at 375 the page is 1437 px wide (the name would run off
the printed page). A 76-character URL-like name (with dots and slashes) and the 120-character description wrap fine; the list row
truncates the long name with an ellipsis. Repro: New invoice, paste a long word with no spaces as the client name, look at the preview.

### Evidence files (round 2)
2026-10-29-r2-totals-375.png, 2026-10-29-r2-errors-1440.png, 2026-10-29-r2-restored-375.png, 2026-10-29-r2-dblclick-1440.png,
2026-10-29-r2-stale-notice-375.png, 2026-10-29-r2-longname-375.png. The replay and probe scripts lived in the session scratchpad and
were not added to the repo.

### Defect rows (round 2)
| D12 | F2: I typed the unit price and tapped Invoices (or pressed Back) right away; when I came back the price was empty although the notice said my changes were restored. Repro: New invoice, fill name and description, wait a second, type a price and tap Invoices within a quarter second, open New invoice. | web 375 + desktop | todo | qa/F2/notes.md (Round 2, D12) | |
| D13 | F2: I typed the price, tapped Save at once and got "Saved INV-0001."; after a refresh the page told me it restored changes I had not saved, with a Discard them button, although nothing was unsaved. Repro: New invoice, type the price and tap Save right away, then reload. | web 375 + desktop | todo | qa/F2/2026-10-29-r2-stale-notice-375.png | |
| D14 | F2: a client name that is one long word with no spaces (120 characters) runs off the preview card and makes the whole editor scroll sideways on a phone and on desktop, and would run off the printed page. Repro: New invoice, paste a 120-character word as the client name. | web 375 + desktop + print | todo | qa/F2/2026-10-29-r2-longname-375.png | |
