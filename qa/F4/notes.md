# F4 - invoice list: statuses, duplicate, delete + undo, search, empty states

Date: 2026-10-29. Commit: 524f5ab. URL: http://127.0.0.1:8080/ (python3 -m http.server).
Driver: Playwright for Python through scripts/browser.py, fresh browser context per width (empty localStorage), 375x812 and 1440x900.
Every step below was driven through the real UI (Settings form, editor form, list buttons and select, search box, keyboard). localStorage was only read to compare the duplicate with its original.
Console errors/warnings, page errors and failed requests collected during both runs: none.

Verdict: verified at both widths. 54 checks pass at 375 and 54 at 1440, 0 fail. No defect rows. Observations at the end.

## Steps and what I saw

1. Fresh user, `#/invoices`: dashed empty box "No invoices yet - Create your first invoice. It takes about two minutes, and it stays in this browser." with a green "Create an invoice" button and a tip linking to Settings (the tip is only there while no business is set up). No search box and no summary line. Clicking the button opened the editor at `#/new`. Evidence: 2026-10-29-01-empty-375.png.
2. Settings saved (Jane Doe Design, USD, tax 10%). Created INV-0001 Acme Studio ($550.00), INV-0002 Northwind Traders ($214.50, two lines), INV-0003 Blue Harbour Consulting ($396.00) through the editor; each save toasted "Saved INV-000n." and moved to `#/edit/<id>`. List: newest first (0003, 0002, 0001), each row shows number, client, "Due Nov 12, 2026", total, a Draft/Sent/Paid select and Open / Duplicate / Delete. Summary "3 invoices, 3 not paid yet". Evidence: 2026-10-29-02-list-375.png, 2026-10-29-02-list-1440.png.
3. Select INV-0002 -> Sent: toast "INV-0002 marked as sent.", row gets a blue left border and a blue select. INV-0001 -> Paid: toast "INV-0001 marked as paid.", green border and select. Summary "3 invoices, 2 not paid yet" (draft + sent count as not paid; see observation 1). Reload: statuses and summary unchanged. Overdue: editing only the due date to last week was refused with "The due date cannot be before the issue date." (issue date was today) and nothing saved; set issue date to 2 weeks ago and due date to last week on INV-0002 (sent) and INV-0001 (paid). List shows a red OVERDUE badge on INV-0002 only, none on the paid INV-0001, none on INV-0003. Statuses untouched by the edits. Evidence: 2026-10-29-03-status-overdue-375.png, 2026-10-29-03-status-overdue-1440.png.
4. Duplicate INV-0001: INV-0004 appears first, Draft, Acme Studio, $550.00, issue date today (2026-10-29), due in 7 days (same span as the original). Items identical in storage, original INV-0001 byte-identical before and after (still Paid). Toast "Duplicated as INV-0004." with Open; Open loaded `#/edit/<id>` showing INV-0004 with client Acme Studio. Summary "4 invoices, 3 not paid yet". Evidence: 2026-10-29-04-duplicate-1440.png.
5. Delete INV-0003: row gone immediately, summary "3 invoices, 2 not paid yet", toast "Deleted INV-0003." with Undo. Undo after 2 s: toast "Restored INV-0003.", row back at position 2 (0004, 0003, 0002, 0001) still Draft, persisted in storage. Deleted again, waited 8 s: toast gone; reload: INV-0003 still gone, "3 invoices, 2 not paid yet". At the end deleted the remaining three: the empty state ("No invoices yet" + Create an invoice, no Settings tip since the business is set up) appeared right after the last Delete with the "Deleted INV-0001." Undo toast still offered; after 8 s + reload the list is empty and storage holds 0 invoices. Evidence: 2026-10-29-05-delete-undo-375.png, 2026-10-29-09-empty-after-deletes-1440.png.
6. Search typed key by key: "nor" -> only Northwind, "1 of 3 invoices match"; "north" same; "0002" -> INV-0002; "paid" -> INV-0001 (Paid); "sent" -> INV-0002; "zzz" -> no rows, "0 of 3 invoices match", box "No invoices match "zzz". Try a number like INV-0001, part of the client name, or a status." with a Clear search button. Clear search: list back (3 rows), summary back to "3 invoices, 2 not paid yet", box empty and focused with a visible ring. Clear search also works by Tab + Enter. "  ACME " (padded, upper case) matches Acme. Reload while "north" is typed: the search box comes back empty and the full list shows (the query is not kept). Evidence: 2026-10-29-06-search-nomatch-375.png, 2026-10-29-06-search-nomatch-1440.png.
7. Keyboard: from the INV-0004 number link, Tab goes status select -> Open -> Duplicate -> Delete -> next row's number link, every stop with a 3px green outline (`:focus-visible`). Status select: ArrowDown did not change the value in headless Chromium (macOS opens the native picker instead); typing "p" changed it to Paid and toasted "INV-0004 marked as paid." Escape closed the toast. The number link opens the editor. Evidence: 2026-10-29-07-keyboard-focus-1440.png.
8. 375px with a 78-character client name on INV-0004: page scrollWidth 375 (no sideways scroll), every row scrollWidth == clientWidth, right edge 359 <= 375; the client name is cut with an ellipsis ("Blue Harbour Consulti..."); status selects and Open/Duplicate/Delete are 44px tall, search box 46px; nothing sticks out past the viewport. Evidence: 2026-10-29-08-long-name-375.png.

Extra unhappy paths (375, same build):
- Delete while a search filter shows one row: the filtered view switches to the no-match box ("No invoices match "north"") with Clear search, summary "0 of 2 invoices match", toast "Deleted INV-0002." with Undo; Undo brings the row back into the filtered view, search text kept.
- Duplicate while "acme" is typed: INV-0004 appears inside the filtered view, "2 of 4 invoices match".
- Two deletes within 7 s: the second toast replaces the first; Undo restores only INV-0002, INV-0003 is gone for good with no message.
- Reload while the Undo toast is showing: the delete was already saved, so after the reload the invoice is gone and there is no Undo.
- Status change then immediate reload: kept.
- Spaces-only search: all rows shown but the summary reads "2 of 2 invoices match".

## Observations (not filed as defects; the flow as written works)

1. Summary count: with 1 Paid, 1 Sent and 1 Draft the app says "3 invoices, 2 not paid yet". The QA brief expected "1 not paid yet"; in user words the app is right (a sent invoice has not been paid), so no defect filed - flagging the wording for the product owner.
2. Only the most recent delete can be undone; deleting a second invoice inside the 7 s window makes the first delete final without saying so.
3. A reload inside the undo window loses the undo (the delete is saved immediately).
4. A spaces-only search switches the summary to "N of N invoices match" instead of the normal summary.
5. At 375 the toast floats over the bottom row for 7 s; it is dismissable with the x or Escape.
