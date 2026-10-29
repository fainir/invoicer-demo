# Invoicer

One-click invoices for freelancers. A static web app: set up your business once, create an invoice with a live preview, download it as a PDF, share a summary by email, and keep a list with draft / sent / paid statuses. Everything stays in your browser (localStorage). No accounts, no server, no network calls.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Any static file server works; there is no build step.

## Test

```bash
node --test tests/*.test.js
```

Unit tests cover the money math, validation, numbering, summary text, mailto links and backup parsing in `js/calc.js`. QA evidence for every user flow lives under `qa/` and is linked from `READINESS.md`.

## Deploy

GitHub Pages serves the repository root from the `main` branch.

1. Make the repository public (GitHub > Settings > General > Danger zone > Change visibility) or use a plan that allows Pages on private repos.
2. GitHub > Settings > Pages > Build and deployment > Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Or run `bash scripts/enable-pages.sh`.
3. Every push to `main` redeploys. Rollback: `git revert <commit> && git push`.

Production URL once enabled: https://fainir.github.io/invoicer-demo/

## Files

- `index.html` - the app shell; `privacy.html` - the privacy note
- `css/styles.css` - screen styles; `css/print.css` - print stylesheet used for PDF export
- `js/calc.js` - pure logic (also loaded by the tests); `js/store.js` - localStorage with an in-memory fallback; `js/app.js` - UI and routing
- `tests/` - Node test runner tests
- `READINESS.md` - the production ledger; `PRODUCT.md` - the spec; `qa/` - evidence

## Privacy

Business details, clients and invoices are stored in the browser's local storage on the user's device only. The app makes no network requests after it loads, sets no cookies and includes no third-party scripts. Backups are plain JSON files the user downloads themselves. See `privacy.html`.

Rollback test marker (this line is reverted in the next commit).
