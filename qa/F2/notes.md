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
