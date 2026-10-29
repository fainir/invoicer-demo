# Regression pass - 2026-10-29 - commit fcbea22 - http://127.0.0.1:8080/ (same static files GitHub Pages will serve)

One line per flow. Round 1 = seven qa-user agents on 524f5ab; round 2 = four qa-user agents on d7c91f9; final = scripted pass on fcbea22 (scripts/qa-smoke.py at 375 and 1440, scripts/qa-defects.py 35/35, node --test 16/16).

| Flow | Round 1 | Round 2 | Final scripted pass on fcbea22 | Result |
|---|---|---|---|---|
| F1 business setup | verified, D1 D2 filed | D1 D2 fixed, D12 filed (toast over nav at 375) | D1 D2 D12 re-checked pass; settings save, errors, logo refusal, reload persist | verified |
| F2 create invoice | not verified, D7 D8 | D7 D8 fixed, D17 D18 D19 filed | D7 D8 D17 D18 D19 pass; totals 693.00 / 715.00, errors, restore after reload, numbering | verified |
| F3 PDF export | verified, D3 filed | D3 fixed, verified (55 checks) | D3 pass; print media hides chrome, 1-page PDF, 40 rows split cleanly (round 2 evidence) | verified |
| F4 invoice list | verified, 0 defects | verified (84 checks), spaces search fixed | duplicate, delete + undo, search, empty states in smoke pass | verified |
| F5 share | verified, D6 filed | D6 fixed, D12 (same toast) filed | D6 D12 pass; clipboard text and mailto verified in round 2 | verified |
| F6 backup and delete | verified, D4 D5 filed | D4 D5 fixed, D13 D14 filed | D4 D5 D13 D14 D15 pass; restore dialog, broken files, delete-all dialog | verified |
| F7 edge states and keyboard | not verified, D9 D10 D11 | D9 D10 D11 fixed, D15 D16 filed | D9 D10 D11 D15 D16 pass; blocked and full storage, keyboard, routes (round 2 evidence) | verified |

Console errors, page errors and failed requests: none in any run (the only expected failure is the headless mailto: request in F5).
Production URL: not live yet (Pages needs the owner's click); rerun this pass with `python3 scripts/qa-smoke.py https://fainir.github.io/invoicer-demo/` and `python3 scripts/qa-defects.py https://fainir.github.io/invoicer-demo/` once it is.
