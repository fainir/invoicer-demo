Evidence for READINESS.md rows. Layout: qa/<row-id>/<date>-<width>.png and qa/<row-id>/notes.md;
qa/ux/, qa/gates/, qa/perf/, qa/prod/ for reviews, gates, Lighthouse and production smoke tests.
Keep it small: overwrite superseded screenshots. Never store secrets or real user data here.

## How to QA this project (for agents and humans)

- Serve: `python3 -m http.server 8080 --bind 127.0.0.1` in the repo root, then http://127.0.0.1:8080/ (the parent session usually has it running).
- Drive the real UI with Playwright for Python through the helper:
  ```python
  import sys; sys.path.insert(0, "scripts"); from browser import open_page
  with open_page(375, 812) as (page, errors):   # fresh browser context = fresh user, empty localStorage
      page.goto("http://127.0.0.1:8080/#/settings"); page.wait_for_selector("#settings-form")
      ...; page.screenshot(path="qa/F1/2026-10-29-375.png", full_page=True)
  print(errors)   # console errors/warnings, page errors, failed requests collected during the run
  ```
  Use 375x812 and 1440x900. Look at every screenshot you save (Read the PNG). Do not use the shared built-in browser pane while other QA agents run.
- Routes: `#/invoices` (list), `#/new` (editor), `#/edit/<id>`, `#/settings`, `privacy.html`.
- Settings fields: `#f-businessName`, `#f-address`, `#f-email`, `#f-logo` (file), `#f-currency`, `#f-taxRate`, `#f-invoicePrefix`, `#f-nextNumber`; submit `#settings-form button[type=submit]`; data section: `[data-action=export]`, `#f-restore` (file), `[data-action=delete-all]` opens `#confirm-dialog` (buttons value=cancel / value=confirm).
- Editor fields: `#f-clientName`, `#f-clientEmail`, `#f-clientAddress`, `#f-issueDate`, `#f-dueDate`, `#f-currency`, line items `#item-desc-N`, `#item-qty-N`, `#item-price-N`, `[data-action=add-item]`, `[data-action=remove-item][data-index=N]`, `#f-discountType`, `#f-discountValue`, `#f-taxRate`, `#f-notes`; actions: `#invoice-form button[type=submit]` (Save), `[data-action=print]`, `[data-action=copy-summary]`, `#email-link`; preview `#preview`; errors `.field-error:not([hidden])`, `#form-error`.
- List: `#search`, `.invoice-row`, status `select[data-action=status]`, `[data-action=duplicate]`, `[data-action=delete]`, toast `#toast` with `[data-action=toast-action]` (Undo / Open / Mark as sent) and `[data-action=toast-close]`, banner `#banner`.
- Storage: one localStorage key `invoicer.v1` holding `{version:1, settings, invoices, draft}`. Seed quickly with `page.evaluate` + reload, but drive the real forms for the verdict.
- Print/PDF: `page.emulate_media(media="print")` then screenshot, or `page.pdf(path=...)`; clicking Download PDF sets `document.title` to the invoice number while printing.
- Clipboard: open the context with `permissions=["clipboard-read", "clipboard-write"]` (pass `permissions=[...]` to open_page) and read back with `page.evaluate("navigator.clipboard.readText()")`.
- Downloads: `with page.expect_download() as d: page.click("[data-action=export]")`, then `d.value.path()`.
- Blocked or full storage: `page.add_init_script("...")` that makes `localStorage.setItem` throw (`DOMException('x', 'QuotaExceededError')`) before loading the page.
