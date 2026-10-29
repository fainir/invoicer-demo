# F6 - Backup, restore, delete all data

Date: 2026-10-29. Commit: 524f5ab. Surface: Playwright Chromium (scripts/browser.py), fresh context per run, 1440x900 and 375x812, http://127.0.0.1:8080/.
Test files: 24x24 PNG logo (94 bytes, made with zlib/struct); broken files `{not json`, `{"hello":1}`, a version-2 backup, an empty file.

## What I did and what I saw

1. Setup (1440): Settings form filled (Northwind Studio, address, billing@northwind.test, USD, tax 10, prefix NW-, next 100), PNG logo chosen (preview showed it), "Settings saved." toast. Two invoices saved through the editor: NW-0100 Acme Corp (2 x 150) and NW-0101 Beta LLC (3 x 80 + 1 x 45.5). On the list set NW-0101 to Sent and NW-0100 to Paid. List shows "2 invoices, 1 not paid yet", $314.05 Sent and $330.00 Paid. Screenshot 2026-10-29-setup-1440.png.
2. Download backup: a file named invoicer-backup-2026-10-29.json downloaded; toast "Backup downloaded: invoicer-backup-2026-10-29.json". File content: version 1, exportedAt, settings with all 8 fields including the logo data URL (data:image/png;base64,...), 2 invoices each with items, status, client. Saved here as invoicer-backup-2026-10-29.json (1.8 KB). Screenshot 2026-10-29-backup-1440.png. Also downloaded at 375: same name, same toast.
3. Fresh browser (localStorage key invoicer.v1 was null), Settings, Restore from a backup file with that JSON: toast "Restored 2 invoices and your settings."; form shows Northwind Studio, address, email, USD, 10, NW-, 102 and the logo preview (24x24 rendered). List: NW-0101 Beta LLC Sent $314.05, NW-0100 Acme Corp Paid $330.00, "2 invoices, 1 not paid yet". Opened NW-0100: preview shows the logo (img.doc-logo, 24x24, loaded), business block, items and $330.00 total. Screenshots 2026-10-29-restored-settings-1440.png, -restored-list-1440.png, -restored-preview-1440.png. Same restore at 375 gave the same toast and form values.
4. Broken files (1440 and 375), each chosen through the real file input:
   - `{not json` -> "That file is not readable as JSON. Choose a backup downloaded from Invoicer."
   - `{"hello":1}` -> "That file is not an Invoicer backup."
   - version 2 backup -> "That file is not an Invoicer backup."
   - empty file -> "That file is not readable as JSON. Choose a backup downloaded from Invoicer."
   Each time: message visible under the input, input has aria-invalid="true" and a red dashed border, the file input is cleared ("No file chosen"), localStorage unchanged (byte-identical), settings form still shows Northwind Studio. Choosing the valid backup afterwards: error hidden, aria-invalid removed, toast "Restored 2 invoices and your settings." Screenshots 2026-10-29-broken-1440.png (not-json case), 2026-10-29-data-375.png (not-a-backup case, whole "Your data" section at 375, no horizontal scroll: scrollWidth 375).
5. Delete all data (1440 and 375): dialog "Delete all data?" with "This removes your business details and all 2 invoices from this browser. Download a backup first if you might need them." Cancel is focused on open. Cancel -> dialog closes, data unchanged, focus back on the "Delete all data" button. Escape -> same (data unchanged, focus back on the button, no toast). Delete everything -> toast "All data deleted.", stays on Settings with empty form and "No logo", list shows "No invoices yet" empty state, reload still empty; invoicer.v1 holds the defaults `{"version":1,"settings":{"businessName":"",...,"currency":"USD","taxRate":0,"invoicePrefix":"INV-","nextNumber":1},"invoices":[],"draft":null}`. At 375 the dialog is 343 px wide inside the viewport, both buttons 44 px tall. Screenshots 2026-10-29-delete-dialog-1440.png, -deleted-1440.png, -delete-dialog-375.png.
6. Restore after delete (1440 and 375): toast "Restored 2 invoices and your settings.", form and list back, localStorage byte-identical to the state before the delete.
7. Console errors/warnings, page errors and failed requests across all runs: none (errors list empty in every run).

Extra unhappy paths:
- Opening the dialog again after an earlier confirmed delete and pressing Escape: nothing deleted (dialog returnValue was "" on reopen).
- Choosing the same valid backup twice in a row: second pick also restores and shows the toast.
- Restoring a backup on a browser that already has data: created a third invoice NW-0102 after the backup, then restored the backup. NW-0102 disappeared immediately, no dialog, no native confirm, no undo in the toast. Defect D below.
- Restoring a valid backup and then choosing a broken file within 7 seconds: the success toast "Restored 2 invoices and your settings." stays on screen next to the red error (2026-10-29-broken-1440.png). Minor defect.

## Result

Every step the F6 row names works as described at 1440 and 375 with no console or network errors. Two defects outside the named steps:

| D | F6: I restored a backup on a browser that already had newer invoices and the newer invoice (NW-0102) vanished with no warning and no undo; only "Delete all data" asks first | web desktop | todo | qa/F6/notes.md (extra unhappy paths) | |
| D | F6: right after a successful restore I picked a bad file; the red "not readable as JSON" error shows while the black "Restored 2 invoices and your settings." toast is still on screen, so it reads as if the bad file was restored (toast lasts 7 s across actions) | web desktop | todo | qa/F6/2026-10-29-broken-1440.png | |

Observation (not filed): the toast sits over the footer "Everything stays in this browser..." text and Privacy link at the bottom of every page; cosmetic and not specific to F6.
