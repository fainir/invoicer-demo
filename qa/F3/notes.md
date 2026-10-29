# F3 - Export the invoice as a PDF through the browser print flow

Date: 2026-10-29. Commit: 524f5ab. Surface: http://127.0.0.1:8080/ in headless Chromium (Playwright via scripts/browser.py), 1440x900 and 375x812. Every run was a fresh browser context (empty localStorage).

## Result: verified, with one minor defect (D-row below) for printing with Ctrl+P instead of the button

## What I did and what I saw

1. Settings (1440): typed business name "Harbor Lane Studio", a two-line address, email, tax rate 10, added a 120x48 PNG logo through the file input, clicked Save settings. Saw "Settings saved." and the logo in the preview box; localStorage holds the data URL. `2026-10-29-settings-1440.png`.
2. New invoice through the editor: client name, email, two-line address, 3 line items (Add line twice), discount Percent 10, tax 10 (default from settings), two-line notes, Save invoice. URL became `#/edit/<id>`, title "INV-0001 - Invoicer", toast "Saved INV-0001.". `2026-10-29-editor-saved-1440.png`.
3. Clicked Download PDF. Hooked `window.print`, `beforeprint` and `afterprint`: at the moment `print()` is called and when `beforeprint` fires the title is exactly `INV-0001` (this is the name the browser's print dialog suggests), after the print returns it is `INV-0001 - Invoicer` again, and it is still that 3 s later. Headless Chromium fires afterprint synchronously, so the restore happens at once; the 2 s fallback timer restores the same title again (no change). Same result at 375, with a keyboard user (Tab to the button, Enter), and when the button is clicked twice fast.
4. Print media emulation, full-page screenshots `2026-10-29-print-1440.png` and `2026-10-29-print-375.png`: only the invoice document is on the page. Checked by computed style: header, nav, editor form, footer, mobile bar, toast ("Saved INV-0001." was still showing on screen at that moment), "Preview" heading, banner, skip link and dialog are all display:none; body innerText equals the invoice text exactly. Logo (120x48, loaded), business block, INVOICE title, number, issued/due dates, bill-to, 3-row items table, subtotal/discount/tax/total, notes and footer line all visible and readable; scrollWidth equals viewport width at both sizes (nothing clipped). Emulating screen again restores the normal UI (`2026-10-29-after-print-1440.png`, `2026-10-29-after-print-375.png`).
5. `page.pdf(format=A4, print_background=True)` -> `2026-10-29-invoice.pdf`: 1 page (595x842 pt), 134 KB, text extractable (business, number, dates, bill-to, the 3 rows, totals, notes), 1 embedded image (the logo). Rendered page 1: `2026-10-29-pdf-page1.png`, 16 mm margins, clean layout. A PDF made while the viewport was 375 wide is also one page with identical text.
6. Long invoice: 40 line items typed through the editor (one with a very long description), discount 10%, 3-line notes, saved. PDF `2026-10-29-invoice-40-items.pdf`: 3 pages, 142 KB. Page 1 ends after row 15 with the row intact; pages 2 and 3 start with the table header repeated; the long description wraps inside its row; page 3 has rows 38-40, the totals block kept together, notes and footer. No row is cut across a page boundary (`2026-10-29-pdf40-page1.png`, `-page2.png`, `-page3.png`; print media screenshot `2026-10-29-print-40-1440.png`).
7. Unsaved new invoice (same user, after INV-0001): on `#/new`, with an empty form and after typing a client name, Download PDF puts `INV-0002` (the number it will get) in the title at print time, the print page shows INV-0002 (`2026-10-29-print-unsaved-1440.png`), and the title returns to "New invoice - Invoicer"; the page stays on `#/new`.
8. Brand-new user with no settings at all, straight to New invoice, Download PDF (1440 and 375): prints without errors, title `INV-0001` at print time; the page shows the placeholders "Your business name", "Client name" and a "-" row with $0.00 (`2026-10-29-print-fresh-1440.png`, `-375.png`). Noted as an observation only: a user who prints before filling anything gets the placeholder text printed as if it were data.
9. Console errors/warnings, page errors and failed requests: none in any run (errors list empty every time).

## Defects

- D (minor): pressing Ctrl+P / Cmd+P (or File > Print) instead of the Download PDF button prints the same clean invoice, but the title the dialog sees is "INV-0001 - Invoicer", so the suggested file name is "INV-0001 - Invoicer.pdf" rather than "INV-0001.pdf". Repro: open a saved invoice, press Cmd+P, look at the suggested name. Evidence: beforeprint hook log in this run (title "INV-0001 - Invoicer" at beforeprint when print was not started by the button).

## Files

settings-1440, editor-saved-1440, after-print-1440, after-print-375, print-1440, print-375, print-unsaved-1440, print-fresh-1440, print-fresh-375, invoice.pdf, pdf-page1, editor-40-1440, print-40-1440, invoice-40-items.pdf, pdf40-page1..3 (all prefixed 2026-10-29-).

## Round 2 (2026-10-29, commit d7c91f9)

Re-test after the fix "the invoice number is the document title on any print, including Cmd+P". Same surface and driver as round 1 (Playwright through scripts/browser.py, headless Chromium, fresh context per run, 1440x900 and 375x812). 55 checks, 0 failed.

Result: verified at both widths. The round-1 defect (Cmd+P suggested "INV-0001 - Invoicer.pdf") is fixed.

What I did and what I saw:

1. Fresh user, Settings with name, two-line address, email, tax 10 and a 120x48 PNG logo (stored as a data: URL), then a 3-line invoice with 10% discount and two-line notes, saved as INV-0001 (title "INV-0001 - Invoicer"). Both widths.
2. Download PDF button: window.print(), beforeprint and afterprint hooks logged the title as exactly "INV-0001" at print() and at beforeprint, "INV-0001 - Invoicer" at afterprint and 2.3 s later. Both widths.
3. Fix check, Cmd+P path (window.print() NOT started by the button, 2 s after the previous print so Chromium does not throttle it): beforeprint title "INV-0001", afterprint and final title "INV-0001 - Invoicer". Dispatching the bare events gives the same: after beforeprint the title is "INV-0001", after afterprint it is back. Two beforeprints followed by one afterprint still end restored; a stray afterprint with no beforeprint leaves the title alone. Both widths.
4. Unsaved invoice on #/new (client "Beta Co" typed): the button and Cmd+P both print with the title "INV-0002" and restore "New invoice - Invoicer"; the print page shows INV-0002 and Beta Co and nothing else; the page stays on #/new. Both widths.
5. Invoice list page, Cmd+P: the title stays "Invoices - Invoicer" through beforeprint and afterprint (no invoice number borrowed from an invoice opened earlier). Both widths.
6. Print media (emulated): header, nav, form, footer, mobile bar, toast, "Preview" heading, banner, skip link, dialog and notices all have no box; body text equals the invoice text (542 chars); scrollWidth 1440 / 375, nothing clipped; the logo is 120x48 and loaded. Screenshots 2026-10-29-r2-print-1440.png and 2026-10-29-r2-print-375.png (looked at: logo, business block, INVOICE, number and dates, bill-to, 3 rows, totals $930.60, notes, footer line; at 375 the header stacks and the table still fits). Emulating screen again brings the UI back.
7. page.pdf (A4, backgrounds): 1 page, 596x843 pt, 1 embedded image, all invoice text extractable. Same from the 375 viewport.
8. 40-line invoice typed through the editor (row 21 has a 230-character description), 10% discount, 3-line notes: PDF has 3 pages, rows 1-15 / 16-36 / 37-40; the DESCRIPTION/QTY/UNIT PRICE/AMOUNT header is on every page; every row's description and amount are on the same page (none split); the long description wraps inside its row on page 2; totals, the three notes lines and the footer are on page 3. 2026-10-29-r2-pdf40-page1-1440.png (looked at: page 1 ends cleanly after row 15 with margin left over).
9. Brand-new user with no settings, 375, straight to New invoice, Download PDF: title "INV-0001" at print time, restored after, no errors.
10. Console errors/warnings, page errors, failed requests: none in any run.

Observations (no defect):
- Chromium logs the warning "Ignoring too frequent calls to print()" and shows no second dialog when print() is called again within about a second (my first script run did this; a user double-clicking Download PDF gets one dialog and no error).
