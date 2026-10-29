# F7 - Edge states: no business yet, storage blocked / full, keyboard-only

Date: 2026-10-29. Commit: 524f5ab. Served at http://127.0.0.1:8080/ (python http.server).
Driven with Playwright (scripts/browser.py), fresh context per scenario, 375x812 and 1440x900, headless Chromium.
Console errors, page errors and failed requests were collected on every run; none came from the app
(one `css/print.css` ERR_CONNECTION_RESET appeared only while three browsers hammered the dev server at once and did not recur alone).

Verdict: **not verified** - 3 defects (D-a, D-b in the storage-full path; D-c sideways scroll at 375 with large totals). Everything else below passed.

## 1. No business set up yet (375 + 1440) - pass
- Fresh load, `#/invoices`: empty state "No invoices yet", button "Create an invoice", and "Tip: add your business details in Settings first..." where "Settings" links to `#/settings`.
- `#/new`: yellow notice "Add your business details so they appear on this invoice." with an "Open Settings" link (`#/settings`); preview header shows "Your business name".
- Clicked Open Settings -> Settings page (title "Settings - Invoicer"); saved name + email -> toast "Settings saved."; back on `#/new` the notice is gone and the preview shows "Acme Studio".
- Screens: `2026-10-29-01-nobiz-375.png`, `2026-10-29-01-nobiz-1440.png` (full page; the floating Total/Save bar mid-page in the 375 capture is a full-page screenshot artifact of a fixed bar).

## 2. Storage blocked (375 + 1440) - pass
- Init script makes every `window.localStorage` access throw. On load a red banner (bg rgb(248,228,224), text rgb(169,50,31)): "This browser is blocking site storage, so your invoices will disappear when you close this tab. Allow site data for this page to keep them." + "Dismiss". Dismiss hides it.
- Settings page says "Storage: memory only; this browser is blocking site storage. See the privacy note."
- Saved settings (toast "Settings saved."), created INV-0001 for Client One $200.00 (toast "Saved INV-0001."), list shows "1 invoice, 1 not paid yet". Reload -> list empty again and the banner is back (expected: memory only).
- Console: no errors, no warnings. Screens: `2026-10-29-02-blocked-375.png`, `2026-10-29-02-blocked-1440.png`.

## 3. Storage full (375 + 1440) - 2 defects
- Init script: `setItem` throws `DOMException('quota','QuotaExceededError')` for values over 50 chars (the app's 1-char probe still passes, so the app starts in normal mode).
- Save settings -> banner "Could not save: this browser's storage is full. Remove the logo in Settings or delete old invoices, then try again." + Dismiss. Form values stay (name, address, email, tax 20). No crash, no console error. Dismiss works; the banner comes back on the next failed save.
- The app keeps working in memory for the session: `#/new` shows the business name, an invoice can be added and appears in the list.
- **D-a (both widths)**: after pressing Save (settings, "Save invoice", or the sticky Save at 375) nothing visible changes where the user is: no toast, no message near the button, `#form-error` empty. The banner is rendered at the top of the page, far out of view: at 375 banner top = -1023px (scrollY 1100), at 1440 banner top = -608px (scrollY 685). The user thinks the click did nothing. Screens: `2026-10-29-03-full-375.png`, `2026-10-29-03-full-1440.png` (viewport right after Save: no banner in sight).
- **D-b (both widths)**: "Save invoice" with full storage keeps the user on `#/new` ("New invoice" heading stays, hash stays `#/new`), no "Saved" toast, yet the invoice is added to the in-memory list. Pressing Save again adds a second invoice with the same number: list shows two rows "INV-0001 / Client One / $100.00" (reproduced at 375 and 1440, also via the sticky Save at 375). Screen: `2026-10-29-03-full-twice.png`.

## 4. Corrupt stored data (375) - pass
- `invoicer.v1` preset to `{broken`, `{"version": 9}`, `null`, `[1,2]`: app starts clean (empty list, default settings, USD, `#/new` works), no banner, no console error. After a valid settings save the key is rewritten (`{"version":1,...}`) and survives a reload.
- Note: my first attempt saved settings without an email and got the field error "Enter the email clients should reply to." - that is validation, not a storage problem.
- Screen: `2026-10-29-04-corrupt-375.png`.

## 5. Keyboard-only (375 + 1440) - pass
- Fresh load, first Tab = "Skip to content" link, visible (16,8 141x48, opacity 1) as a dark pill with a 3px green outline. Enter -> focus lands on the `<h1>` inside `#main`, hash `#main`.
- Header order: brand "Invoicer" -> Invoices -> Settings -> New invoice; then main content; then footer Privacy, Source. Every stop `:focus-visible` with `outline: solid 3px rgb(31,95,74) offset 2px`.
- List (one invoice): Search -> INV-0001 link -> status select -> Open -> Duplicate -> Delete, all ringed.
- Editor: all 19 focusable controls at 1440 (21 at 375, incl. the sticky "Preview" and "Save") reached in order; every one ringed. Only the 4th Tab inside each native date input (Chromium's calendar-icon sub-stop) reports no `:focus-visible`; that is browser-native behaviour, not app CSS.
- Space and Enter on "Add line" add a row and move focus to its description; Enter/Space on the row's remove button removes it and focuses the previous row. Enter on "Save invoice" saves (toast "Saved INV-0001.", route `#/edit/<id>`), Escape hides the toast.
- Settings: Tab to "Delete all data", Enter -> dialog opens with focus on Cancel (ringed); Tab -> "Delete everything" -> (browser UI / body, page content is inert) -> Cancel -> ...; no control behind the dialog ever receives focus. Escape closes it and focus returns to "Delete all data" (ringed). Enter on Cancel closes without deleting (invoices intact).
- Toast: shown for ~7 s (page clock 2044 -> 9039 ms) after click or keyboard Enter; Escape hides it at once, also when focus is in a text field. After a keyboard Delete in the list, focus goes to body, the next Tab continues from the list, and "Undo" in the toast is 4 Tab stops away (Create an invoice -> Privacy -> Source -> Undo) with the toast still open; Enter on Undo restores the row.
- Screens (composites of the focused stops): `2026-10-29-05-keyboard-1440.png`, `2026-10-29-05-keyboard-375.png`.

## 6. Route edge cases (375 + 1440) - pass
- `#/edit/doesnotexist`: "Invoice not found - This invoice may have been deleted. Back to invoices" (link to `#/invoices`), title "Invoice not found - Invoicer". `#/whatever`, `#/edit/`, `#/new/extra`, `#`: list view, title "Invoices - Invoicer" (hash left as typed).
- list -> New invoice -> Settings, then Back: `#/new` with the form and title "New invoice - Invoicer"; Back again: `#/invoices`, "Invoices - Invoicer"; Forward: `#/new` again. After a nav click focus is on the view's `<h1>`.
- Screen: `2026-10-29-06-notfound-375.png`.

## 7. Reduced motion + horizontal overflow at 375 - 1 defect
- `reduced_motion="reduce"` (matchMedia confirms): toast visible 50 ms after Save, `animation: toast-in 1e-05s`, `transition 1e-05s`, `document.getAnimations()` empty, `scroll-behavior: auto` (smooth only under no-preference). Toast still open after 6 s. Both widths, no console errors.
- `scrollWidth` at 375 with ordinary content: `#/invoices` 375, `#/new` 375, `#/edit/<id>` 375, `#/settings` 375, not-found 375, `#/whatever` 375, `privacy.html` 375. Long client name with spaces, a 60-char unbroken description and a 34-char unbroken address line all stay at 375.
- **D-c (375)**: a total of $1,250,000.00 (or EUR) makes the invoice page 392 px wide (`table.doc-items` in the preview, 17 px sideways scroll); $999,999.00 fits; JPY 1,250,000 fits (no decimals). A $9,999,999,990,000.00 total widens the invoice page to 487 px and the list to 386 px (row total/status/actions). A 40-digit unbroken address line pushes `#/new` to 380 px (edge case, not filed). Screen: `2026-10-29-07-reduced-motion-overflow-375.png` (reduced-motion toast + the two overflow views scrolled right).

## Defect rows for READINESS.md
| D-a | F7: with storage full, pressing Save shows no reaction where I am; the "Could not save" banner sits at the top of the page out of view (1023px above at 375, 608px at desktop), no toast or message near the button | web 375 + desktop | todo | qa/F7/2026-10-29-03-full-375.png | |
| D-b | F7: with storage full, Save invoice leaves me on New invoice with no confirmation but still adds the invoice to the list; pressing Save again adds a second invoice with the same number INV-0001 | web 375 + desktop | todo | qa/F7/2026-10-29-03-full-twice.png | |
| D-c | F7: on a phone an invoice total of $1,250,000.00 makes the invoice page scroll sideways (preview table 392px wide at 375); a huge total also makes the list scroll sideways (386px) | web 375 | todo | qa/F7/2026-10-29-07-reduced-motion-overflow-375.png | |
