# F1 - First run: business settings

Date: 2026-10-29. Commit: 524f5ab. URL: http://127.0.0.1:8080/ (python3 http.server). Widths: 375x812 and 1440x900.
Driver: Playwright for Python through scripts/browser.py (fresh context per run = empty localStorage). No built-in browser pane used.
Fixtures (generated with zlib + struct, no installs): logo-ok.png 200x80, 244 bytes; logo-big.png 360 KB (valid PNG header, random IDAT payload); notes.txt 420 bytes.

Verdict: verified at both widths. Every acceptance point in the row holds. Two minor defects filed (D1, D2 below); neither blocks the flow.

## What I did and what I saw (identical at 375 and 1440 unless noted)

1. Fresh user opens `/`: list page "Invoices" with the empty state "No invoices yet / Create your first invoice..." and the line "Tip: add your business details in Settings first so they appear on every invoice." with Settings as a link. localStorage key `invoicer.v1` is absent. No horizontal overflow at 375 (scrollWidth 375). Clicked Settings in the nav: hash `#/settings`, heading "Settings", defaults: name empty, email empty, currency USD, tax 0, prefix INV-, next 1. Evidence: 2026-10-29-01-empty-list-{375,1440}.png.
2. Submitted Settings empty: red outline + "Enter your business name, or your own name." under Business name; "Enter the email clients should reply to." under Email; summary box "Fix the 2 highlighted fields to save your settings."; focus landed on Business name (document.activeElement = f-businessName, aria-invalid=true, aria-describedby points at the error). Nothing written to storage. No toast.
3. Entered email "nope", tax rate 150, next number 0, submitted: "That does not look like an email address.", "Tax rate must be between 0 and 100.", "Next number must be a whole number, 1 or more." under each field, plus the name error; summary "Fix the 4 highlighted fields to save your settings."; focus on Business name. Typed fixes character by character: each error vanished while typing (email, tax, next number, name) and the summary box disappeared once all four were valid. Also tried a whitespace-only name and "jane @example.com": both rejected with the same messages. Evidence: 2026-10-29-02-settings-errors-{375,1440}.png.
4. Filled Jane Doe Design / "12 Market St\nSpringfield 12345" / jane@example.com / ILS / 17 / INV- / 7, saved: toast "Settings saved.", no summary error. Reloaded: all seven values still in the form; storage settings = {businessName, address with the newline, email, currency ILS, taxRate 17, invoicePrefix INV-, nextNumber 7}. Opened `#/new`: subtitle "Will be numbered INV-0007 when you save."; preview shows "Jane Doe Design", "12 Market St" and "Springfield 12345" on separate lines (a `<br>` between them), "jane@example.com", "Number INV-0007", currency select = ILS with shekel amounts in the preview, Tax rate field = 17 and "Tax (17%)" in the totals. Evidence: 2026-10-29-03-new-preview-{375,1440}.png (taken after step 5a, so the logo is in the preview too).
5. Logo:
   a. logo-ok.png via the file input: toast "Logo added. Save settings to keep it.", logo preview shows the image (200x80, alt "Your logo"), no field error. Saved: "Settings saved.", "Remove logo" button appears, storage logoDataUrl 350 chars. `#/new` preview shows the logo above the business name (160x64 on screen).
   b. logo-big.png (360 KB): red outline on the file input and "That image is 360 KB. Use one under 300 KB so it fits in browser storage." under it; summary "Fix the highlighted field to save your settings."; the previous logo stays in the preview; the file input is reset to "No file chosen". Evidence: 2026-10-29-04-logo-refused-{375,1440}.png (taken with the earlier toast dismissed first).
   c. notes.txt: "Choose an image file (PNG, JPG or SVG)." under the field, previous logo stays.
   d. Clicked Save after the refusal (toast cleared first): toast "Settings saved.", both error messages disappear, storage still has the 350-char logo, `#/new` still shows it. See D2.
   e. Reloaded, clicked "Remove logo": toast "Logo removed. Save settings to keep the change.", preview shows "No logo", button gone. Saved: "Settings saved.", storage logoDataUrl empty, `#/new` preview has no `img.doc-logo` and still shows the name, address and email.
6. Unhappy paths:
   - Refresh mid-edit: typed "Changed But Not Saved" and tax 5, reloaded: the form shows the saved values (Jane Doe Design, 17); the edits are gone with no notice. Acceptable as stated in the brief; recorded only.
   - Double submit: two real clicks on Save in a row and Enter pressed twice in the name field each produced exactly one "Settings saved." toast, one settings object in storage, zero invoices, next number unchanged. (My first attempt called form.requestSubmit() twice in one script tick; the second call hit the form the app had just re-rendered and Chrome logged "Form submission canceled because the form is not connected". A user cannot do that; real clicks and keys are clean.)
   - Back button after Invoices -> Settings: returns to `#/invoices` with the list heading. After setup the empty list no longer shows the Settings tip, only "Create an invoice".
7. Console / page errors / failed requests from open_page: empty on every scenario at both widths, except the test-induced warning noted in 6.

## Defects

- D1 (minor, both widths): the helper line under "Next invoice number" does not follow what I type. With prefix "ACME-" and next number 42 typed, it still read "The next invoice will be INV-0001." until I pressed Save, after which it read "ACME-0042." Repro: Settings, type ACME- in prefix, 42 in next number, read the grey line. Evidence: 2026-10-29-05-hint-stale-375.png (same at 1440).
- D2 (minor, both widths): after a refused logo (360 KB PNG or a .txt), the pink summary says "Fix the highlighted field to save your settings.", but clicking Save succeeds anyway: "Settings saved.", both messages vanish, the old logo is kept. The outcome is safe; the message is wrong. Repro: Settings with a saved logo, choose a 360 KB PNG, click Save. Evidence: 2026-10-29-06-saved-after-refusal-1440.png (same at 375; refusal state in 2026-10-29-04-logo-refused-*.png).

## Observations (not F1 defects)

- After Save the form re-renders and keyboard focus drops to the page body (document.activeElement is empty), so a keyboard user has to Tab from the top again. Belongs to F7 (keyboard-only).
- The "Settings saved." toast lives 7 s and survives navigation, so it can still be on screen next to a logo refusal if the user is fast. Not reproducible at human speed in my judgment.
- Empty required fields show placeholders ("Jane Doe Design", "jane@example.com") in grey while the error says to enter a value; the contrast between placeholder and value is clear in the screenshots.
