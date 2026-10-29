# F5 - Share an invoice (copy summary / email draft)

Date: 2026-10-29. Commit: 524f5ab. Served at http://127.0.0.1:8080/.
Tool: Playwright (Python) through scripts/browser.py, headless Chromium, context permissions clipboard-read + clipboard-write.
Each run is a fresh browser context (empty localStorage). Widths: 1440x900 and 375x812. Every screenshot below was opened and looked at.

## What I did and what I saw

1. Settings: name "Jane Doe Design", email jane@example.com, tax 10 -> toast "Settings saved.".
   New invoice: client "Acme Studio", email billing@acme.com, lines "Logo design" 2 x 150 and "Brand guidelines" 1 x 400,
   discount Percent 10, tax rate pre-filled with 10 from settings, note "Thanks for your business. Pay within 14 days.".
   Save -> URL #/edit/<id>, title "INV-0001", line "Draft - last saved Oct 29, 2026, 12:42 PM", toast "Saved INV-0001.".
   At 375 I saved with the Save button in the bottom bar; same result.
   Screenshot: 2026-10-29-01-saved-1440.png

2. Copy summary on the draft: toast "Summary copied. Mark INV-0001 as sent?" with a "Mark as sent" button and an X.
   Screenshot: 2026-10-29-02-copy-toast-1440.png
   navigator.clipboard.readText() returned exactly this (verbatim, LF line breaks):

```
Invoice INV-0001
From: Jane Doe Design
To: Acme Studio
Issued: Oct 29, 2026   Due: Nov 12, 2026

- Logo design: 2 x $150.00 = $300.00
- Brand guidelines: 1 x $400.00 = $400.00

Subtotal: $700.00
Discount (10%): -$70.00
Tax (10%): $63.00
Total due: $693.00

Notes: Thanks for your business. Pay within 14 days.

Questions? Reply to jane@example.com
```

   Numbers check: 300 + 400 = 700, 10% discount 70, tax 10% of 630 = 63, total 693. Matches the preview.
   Clicked "Mark as sent": toast "INV-0001 marked as sent.", title line "Sent - last saved ...", list row status select = Sent.
   Screenshot: 2026-10-29-03-sent-list-1440.png
   Same at 375 (via keyboard, see 7). Clipboard text identical at 375.

3. Copy again on the sent invoice: toast "Summary copied." only, no button. Clipboard text unchanged.
   Screenshot: 2026-10-29-04-copy-sent-1440.png

4. Email invoice. href of #email-link (verbatim):
   mailto:billing@acme.com?subject=Invoice%20INV-0001%20from%20Jane%20Doe%20Design&body=Invoice%20INV-0001%0D%0AFrom%3A%20Jane%20Doe%20Design%0D%0ATo%3A%20Acme%20Studio%0D%0AIssued%3A%20Oct%2029%2C%202026%20%20%20Due%3A%20Nov%2012%2C%202026%0D%0A%0D%0A-%20Logo%20design%3A%202%20x%20%24150.00%20%3D%20%24300.00%0D%0A-%20Brand%20guidelines%3A%201%20x%20%24400.00%20%3D%20%24400.00%0D%0A%0D%0ASubtotal%3A%20%24700.00%0D%0ADiscount%20(10%25)%3A%20-%2470.00%0D%0ATax%20(10%25)%3A%20%2463.00%0D%0ATotal%20due%3A%20%24693.00%0D%0A%0D%0ANotes%3A%20Thanks%20for%20your%20business.%20Pay%20within%2014%20days.%0D%0A%0D%0AQuestions%3F%20Reply%20to%20jane%40example.com
   Decoded: subject "Invoice INV-0001 from Jane Doe Design"; body equals the clipboard text with every LF replaced by CRLF (checked byte for byte, no bare LF). No raw spaces or newlines in the href.
   Clicking it in headless Chromium: the page stays on #/edit/<id> with the form intact, toast "Opening your email app." (no Mark as sent offer because the invoice is already sent).
   Headless Chromium has no mail handler, so Playwright reports one requestfailed for the mailto: URL. No console error, no page error.
   Screenshot: 2026-10-29-05-email-click-1440.png
   Same at 375.

5. Cleared the client email and clicked Email invoice: page stays, toast "Add a valid client email first, or copy the summary instead.",
   focus moves to the Client email field (focus ring visible, page scrolled up to it). href became mailto:?subject=... (no address).
   Typed "nope" and clicked again: same toast, same focus. Both widths.
   Screenshot: 2026-10-29-06-email-invalid-1440.png

6. New unsaved invoice (#/new shows "Will be numbered INV-0002 when you save."), client "Beta Co", one line "Consulting" 3 x 80, Copy summary:
   toast "Summary copied." (no offer). Clipboard (verbatim):

```
Invoice INV-0002
From: Jane Doe Design
To: Beta Co
Issued: Oct 29, 2026   Due: Nov 12, 2026

- Consulting: 3 x $80.00 = $240.00

Subtotal: $240.00
Tax (10%): $24.00
Total due: $264.00

Questions? Reply to jane@example.com
```
   No discount line (discount 0) and no Notes line (empty). Same at 375.
   Screenshot: 2026-10-29-07-copy-unsaved-1440.png

7. 375px. Share buttons: Copy summary at x 16-168, Email invoice at x 180-316, both 44px tall, in the form above the Preview;
   the bottom bar is at y 751-812. With the buttons scrolled into the middle of the screen, elementFromPoint at each button centre returns the button itself.
   Screenshot: 2026-10-29-08-share-buttons-375.png
   Keyboard: clicked into Notes, Tab x3 (Save invoice, Download PDF, Copy summary), Enter -> toast with offer.
   Toast box x 16-359, y 662-728 (bar starts at 751): fully on screen, not under the bar; elementFromPoint at the Mark as sent button centre is that button.
   Tab x7 from Copy summary (Email invoice, Back to invoices, bar Preview, bar Save, footer Privacy, footer Source, Mark as sent); toast still visible;
   focus ring on the toast button: outline solid 3px rgb(255,253,248) (visible in the screenshot).
   Screenshot: 2026-10-29-09-copy-toast-375.png
   Enter -> "INV-0001 marked as sent.", title line "Sent - ...", the page smooth-scrolls to the top (scroll-behavior: smooth) and focus lands on the H1 "INV-0001" (top 85px, settled within 400ms). List row = Sent.
   Screenshot: 2026-10-29-10-keyboard-sent-375.png

8. Console / page errors / failed requests across all runs: empty, except the one headless-Chromium requestfailed for the mailto: navigation in step 4 (see above).

## Observations

- Toast covers the share buttons when they sit near the bottom of the window (both widths). Measured: at 1440x900 with the action row scrolled to the bottom edge,
  toast y 816-876 over buttons y 800-844; at 375 with the buttons resting just above the bar (y 699-743), toast y 662-728. elementFromPoint at the centre of
  Copy summary and Email invoice returns the toast in both cases. The toast closes with X, Escape, or after 7 s. Visible in 2026-10-29-02-copy-toast-1440.png. Filed as D below.
- Toasts survive hash navigation (the "marked as sent" toast was still showing after going to the list and back within 7 s). Not a problem for a user.
- First 375 run: one DOM query for the toast button returned nothing a few ms after the toast appeared (the toast box was already 66px tall, which only happens with the button present). Not reproduced in two later runs; nothing user-visible.
- One measurement run timed out waiting for the Settings save button in a fresh context (server or harness hiccup while other QA agents share the server); the rerun passed with no errors.

## Result

Verified at 1440x900 and 375x812: copy summary text, Mark as sent offer and action, plain toast on sent and unsaved invoices, mailto to/subject/CRLF body,
missing and invalid client email handling with focus, keyboard path, no console or network errors.
One minor defect filed:

| D | F5: After I tap Copy summary with the buttons near the bottom of the screen, the black message pops up on top of Copy summary and Email invoice, so I have to close it or wait 7 seconds before I can tap Email invoice | web 375 + desktop | todo | qa/F5/2026-10-29-02-copy-toast-1440.png | |

## Round 2 (2026-10-29, commit d7c91f9)

Re-test after the fix "toasts now appear at the top of the screen so they never cover the Copy summary / Email invoice buttons or the footer". Same surface and driver as round 1 (Playwright through scripts/browser.py, headless Chromium, context permissions clipboard-read + clipboard-write, fresh context per width, 1440x900 and 375x812). 62 checks, 0 failed, plus a separate header probe at both widths.

Result: the round-1 defect is fixed (the toast no longer covers the share buttons or the footer), and every round-1 scenario still passes. NOT verified at 375: the toast now sits on top of the header links (Invoices, Settings, New invoice) whenever the page is at the top. Defect row below.

What I did and what I saw:

1. Settings (Jane Doe Design, jane@example.com, tax 10), invoice INV-0001 for Acme Studio / billing@acme.com with "Logo design" 2 x 150 and "Brand guidelines" 1 x 400, 10% discount, tax pre-filled with 10, note. Saved (bar Save button at 375): title "INV-0001 - Invoicer", "Draft - last saved ...".
2. Fix check. Scrolled so the share buttons sit at the bottom edge of the usable viewport (1440: buttons y 796-840 of 900; 375: buttons y 647-691 with "Back to invoices" under them and the bar at 751-812), clicked Copy summary. Toast "Summary copied. Mark INV-0001 as sent?" with Mark as sent, at y 12-72 (1440, x 470-970) and y 12-78 (375, x 16-359, two text lines), opacity 1, z-index 50. elementFromPoint at the centres of Copy summary and Email invoice returns those buttons, and at the centre of Mark as sent returns that button. Screenshots 2026-10-29-r2-copy-toast-bottom-1440.png and -375.png (looked at: toast at the top, both share buttons and the footer / bottom bar clear).
3. Clipboard text identical to round 1, byte for byte, at both widths (Issued Oct 29, 2026, Due Nov 12, 2026, $693.00 total). Mark as sent: "INV-0001 marked as sent.", "Sent - last saved", list row Sent. Copy again on the sent invoice: "Summary copied." with no button, clipboard unchanged.
4. Email invoice href: mailto:billing@acme.com, subject "Invoice INV-0001 from Jane Doe Design", body equal to the clipboard text with CRLF line breaks only, no raw spaces or newlines. Clicking it: page stays on #/edit/<id> with the form, toast "Opening your email app.", one headless requestfailed for the mailto: URL (expected), nothing else.
5. Client email emptied, Email invoice: toast "Add a valid client email first, or copy the summary instead.", focus in the Client email field, page stays, href "mailto:?subject=..." with no address. "nope": same toast and focus. Both widths.
6. Unsaved #/new ("Will be numbered INV-0002 when you save."), Beta Co, Consulting 3 x 80, Copy summary: "Summary copied." with no offer, clipboard identical to round 1 (no discount or notes lines), still on #/new.
7. Keyboard, both widths (invoice set back to Draft from the list first): Copy summary and Email invoice 44 px tall and inside the viewport; Notes, Tab x3 = Save invoice, Download PDF, Copy summary; with the buttons scrolled to the bottom edge, Enter: toast with the offer at the top, buttons still hit-testable; Tab x5 (1440) / x7 (375) reaches Mark as sent with the toast still up and a 3 px rgb(255,253,248) ring; Enter: "INV-0001 marked as sent.", "Sent - ...", focus on the H1 at y 85 / 83.
8. Header probe (what the top toast covers when the page is at the top). 1440: the toast (x 470-970 or 590-850) never touches the header links (x 952-1264); tapping New invoice while a toast shows opens #/new. 375, list page right after a status change (scrollY 0): toast x 57-318, y 12-72 lies over Invoices, Settings and the New invoice button (their centres hit the toast text or its X). A tap at the centre of New invoice hit the toast's X: the toast closed and the page stayed on #/invoices; the same tap after closing the toast opened #/new. 375, editor at the top right after Save or after Copy summary: toast x 89-286 covers Invoices and Settings, New invoice is still reachable. Screenshot 2026-10-29-r2-toast-covers-nav-375.png (looked at: the black toast sits over the header, only the burger icon and the right edge of the New invoice button are visible).
9. Console / page errors / failed requests: none besides the headless mailto in step 4 (one per width).

Observations (no defect):
- The toast fades in over 200 ms (toast-in); a screenshot taken at once shows it at y 4 and translucent. Settled values are above.
- At 1440 the toast overlaps the sticky "Preview" heading in the right column; the toast is on top (Mark as sent inside the overlap is hit-testable).
- When the page is scrolled down, the header is off screen and the toast covers only the form content under it, which is not interactive at the top of the viewport in the cases tested.

## Defects (round 2)

| D | F5: On my phone, right after I save, change a status or copy the summary, the black message sits on top of the Invoices / Settings / New invoice links at the top of the page for 7 seconds; tapping New invoice there only closes the message (and Invoices / Settings do nothing) until I close it or wait | web 375 | todo | qa/F5/2026-10-29-r2-toast-covers-nav-375.png | |
