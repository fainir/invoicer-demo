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

## Round 2 (2026-10-29, commit d7c91f9)

Same driver (Playwright through scripts/browser.py, fresh context per scenario), 1440x900 for the full replay through the real forms, 375x812 for the data section and both dialogs on a browser that was restored through the real file input. Backup used: downloaded in this round at 1440 (invoicer-backup-2026-10-29.json: version 1, exportedAt, settings with all 8 fields including the logo data URL, NW-0100 paid with 1 item, NW-0101 sent with 2 items). Console errors/warnings, page errors and failed requests: none in any scenario at either width.

### Replay of round 1 (1440)

1. Setup through the real forms (Northwind Studio, address, billing@northwind.test, USD, 10, NW-, 100, 24x24 logo; NW-0100 Acme Corp 2 x 150 set to Paid, NW-0101 Beta LLC 3 x 80 + 1 x 45.5 set to Sent): list "2 invoices, 1 not paid yet", $314.05 Sent, $330.00 Paid.
2. Download backup: same file name and "Backup downloaded: invoicer-backup-2026-10-29.json" toast (now at the top of the screen).
3. Broken files on the populated browser ({not json, {"hello":1}, version 2, empty): same four messages as round 1, no dialog, input cleared, aria-invalid="true", storage byte-identical, no toast.
4. Delete all data: same dialog text, Cancel focused on open; Cancel and Escape keep the data and return focus to the "Delete all data" button; "Delete everything" -> "All data deleted.", stays on Settings with the empty form and "No logo", list shows "No invoices yet", survives reload, storage holds the defaults. Reopening the dialog after a confirmed delete and pressing Escape deletes nothing.
5. Restore after delete: no dialog (defaults only), "Restored 2 invoices and your settings.", storage byte-identical to the pre-delete state, logo preview back.
6. Fresh browser (storage null): restore -> no dialog, toast, form values, list NW-0101 Sent $314.05 and NW-0100 Paid $330.00, NW-0100 preview with the 24x24 logo loaded and the business block.

### Defect re-checks

- Restore over existing data (fixed, both widths): with 3 invoices in the browser (NW-0102 Gamma Inc created after the backup) choosing the backup opened the dialog "Replace your current data?" with "Restoring this backup replaces your settings and the 3 invoices in this browser with the 2 invoices in the file. Download a backup of the current data first if you might need it.", buttons Cancel (focused on open) and "Replace with the backup" (both 44 px tall; dialog 440 px wide at 1440, 343 px at 375 with the buttons wrapped onto two rows, scrollWidth 375). Cancel: dialog closes, storage byte-identical, NW-0102 still listed, no toast, focus back on the file input. Escape: same. Choosing the backup again and pressing Replace: toast "Restored 2 invoices and your settings.", list shows NW-0101 and NW-0100 only, storage byte-identical to the state at backup time, form shows the backup's values and logo. A browser with settings but no invoices also gets the dialog (wording in D5). An empty browser gets no dialog and restores directly. Evidence: 2026-10-29-r2-replace-dialog-1440.png, 2026-10-29-r2-replace-dialog-375.png, 2026-10-29-r2-restored-after-replace-1440.png.
- Stale "Restored" toast (fixed, both widths): valid restore (toast "Restored 2 invoices and your settings." on screen) then {not json chosen within a second: the toast is gone and only the red "That file is not readable as JSON..." message shows, no dialog. Same on the fresh browser and after a Replace. Evidence: 2026-10-29-r2-broken-after-restore-1440.png (data section in view, nothing at the top of the screen).

### 375 (fresh browser, backup chosen through the file input)

Restore without a dialog, toast at the top; second restore -> the Replace dialog (343 px, Cancel focused), Cancel keeps the data and returns focus to the file input, Replace -> toast and byte-identical storage; broken file -> message under the input, no toast, no horizontal scroll; Delete dialog as in round 1 (Cancel keeps data, confirm empties everything); restore after the delete without a dialog.

### Defects

- D4 (minor): an unsaved new-invoice draft is wiped by a restore with no warning. Repro: fresh browser, New invoice, type a client name and an item description (the draft is autosaved to storage within 2 s), open Settings, restore a backup: no dialog, "Restored 2 invoices and your settings.", the draft is gone and New invoice opens empty. On a browser that already has a business or invoices the dialog opens but its text does not mention the draft either. Surface: web desktop and mobile (same code path). Evidence: this section (no screenshot kept, 4-file limit).
- D5 (cosmetic): on a browser with settings but no invoices the dialog says "Restoring this backup replaces your settings with the 2 invoices in the file." The sentence is wrong (settings are not replaced "with invoices"). Repro: fresh browser, save a business name and email, restore a backup. Evidence: this section.
- D3 from qa/F1/notes.md (round 2) applies here too: at 375 the "Restored 2 invoices and your settings." toast (341 px wide) covers the Invoices and Settings tabs and the New invoice button for 7 s; taps at their centres land on the toast.

Observation (not filed, F7 keyboard flow): after "Replace with the backup" keyboard focus lands on the page body because the Settings form re-renders under the dialog; after Cancel or Escape it correctly returns to the file input.

### Verdict

Every step the F6 row names and both round-1 defects verified at 1440 and 375 with no console or network errors. Open: D4 and D5 (minor, outside the named steps) and the shared D3 at 375.
