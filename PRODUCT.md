# Invoicer

One line: Invoicer helps freelancers send a clean, correct invoice in one sitting without signing up for anything or paying for invoicing software.

## Who

A solo freelancer (designer, developer, writer, consultant) who sends a handful of invoices a month and wants them to look professional, add up correctly, and be out the door in two minutes. They work on a laptop most of the time but sometimes need to send an invoice from their phone. The owner of this project is the first user and is also testing the build harness with it.

## Core job

Turn "I did this work for this client" into a correct, good-looking invoice the client can receive as a PDF or in an email, in one sitting, with nothing to install or sign up for.

## Flows

See the Flows table in READINESS.md. In short: set up business details once (F1), create an invoice with live preview (F2), export it as PDF through the browser print flow (F3), manage the invoice list with statuses, duplicate, delete with undo and search (F4), share a plain-text summary or open an email draft (F5), back up, restore and delete all data (F6), and handle the empty, error and storage-failure states (F7).

## Non-goals (v1)

- No accounts, sync or server. Data lives in the browser's localStorage only.
- No sending email from the app; the share flow opens the user's own mail client.
- No payments, payment links or online payment status.
- No recurring invoices, estimates, quotes, expenses or time tracking.
- No currency conversion; each invoice has one currency.
- No multi-user or multi-business support.

## Success metric

Invoices marked "sent" per week by the owner (readable in the app's list). A second useful number: time from "New invoice" to "Download PDF" under two minutes in QA.

## Stack and hosting

Static web app: HTML, CSS and vanilla JavaScript, no build step, no dependencies, no network calls at runtime. Fonts come from the system because the app makes no network requests.

Run: `python3 -m http.server 8080` (then open http://localhost:8080) | Test: `node --test tests/` | Deploy: push to `main`; GitHub Pages serves the repository root (see README "Deploy").

Hosting: GitHub Pages from the repo `fainir/invoicer-demo`. The repo starts private; making it public and enabling Pages is the owner's click.

## Data model

All data is in localStorage under the key `invoicer.v1` as one JSON document.

| Entity | Key fields |
|---|---|
| settings | businessName, address, email, logoDataUrl (optional, max 300 KB), currency (ISO code), taxRate (percent), invoicePrefix ("INV-"), nextNumber (integer) |
| invoice | id, number, status (draft, sent, paid), issueDate, dueDate, currency, client {name, email, address}, items [{description, quantity, unitPrice}], taxRate, discount {type: percent or fixed, value}, notes, createdAt, updatedAt |
| draftInProgress | the editor form of an unsaved invoice, restored after a refresh |

Totals are derived, never stored: subtotal = sum of round2(quantity x unitPrice); discount applies to the subtotal; tax applies after the discount; total = subtotal - discount + tax.

Privacy: business and client details are personal data. They never leave the browser. The user can download a JSON backup, restore it, or delete everything from Settings. There is no analytics, no cookies, no third-party script.

## Decisions

- 2026-10-29 - Name: Invoicer. Tagline: "One-click invoices for freelancers."
- 2026-10-29 - Stack: static HTML/CSS/JS with no build step, as the brief asked. Logic that can be wrong (totals, numbering, validation, summary text) lives in `js/calc.js` and is unit-tested with Node's built-in test runner.
- 2026-10-29 - Visual direction: a "paper ledger" look. Warm off-white surfaces, near-black ink, one deep green accent, a serif display face for headings and the invoice document, a system sans for controls, tabular numbers everywhere money appears. No web fonts because the app makes no network calls.
- 2026-10-29 - Invoice numbers are assigned when an invoice is first saved (prefix + zero-padded counter from Settings), so abandoned drafts do not burn numbers. The preview shows the number the invoice will get.
- 2026-10-29 - Discount is applied before tax. Quantities may be decimal (hours). Money is rounded to 2 decimals per line.
- 2026-10-29 - Delete uses undo (7 seconds) instead of a confirm dialog; "Delete all data" in Settings is the one action that confirms first.
- 2026-10-29 - The editor autosaves the unsaved form to localStorage so a refresh or accidental navigation does not lose work.
- 2026-10-29 - PDF export is the browser's print dialog with a print stylesheet; the document title is set to the invoice number so the suggested filename is right.
- 2026-10-29 - Repo starts private; going public and enabling Pages is the owner's single click, per the brief.

## Open questions

None that change the build. Default currency is USD and default tax rate is 0 until the owner sets them in Settings.
