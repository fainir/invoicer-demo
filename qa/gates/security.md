# Security gate - 2026-10-29

## Secrets scan (repo history and working tree)
result: 0 matches

## External URLs and third-party scripts in shipped files
index.html:38:      <p>Everything stays in this browser. Nothing is sent anywhere. <a href="privacy.html">Privacy</a> · <a href="https://github.com/fainir/invoicer-demo">Source</a></p>
index.html:55:  <script src="js/calc.js"></script>
index.html:56:  <script src="js/store.js"></script>
index.html:57:  <script src="js/app.js"></script>
privacy.html:27:    <p>The source code is public at <a href="https://github.com/fainir/invoicer-demo">github.com/fainir/invoicer-demo</a>.</p>

## Runtime network requests (Playwright, every flow)
requests:
  http://127.0.0.1:8080/
  http://127.0.0.1:8080/css/print.css
  http://127.0.0.1:8080/css/styles.css
  http://127.0.0.1:8080/js/app.js
  http://127.0.0.1:8080/js/calc.js
  http://127.0.0.1:8080/js/store.js
  http://127.0.0.1:8080/privacy.html
external: none
console errors: none

## Input validation
All user input validated in js/calc.js validateInvoice/validateSettings (unit tested) and escaped with esc() before innerHTML in js/app.js:
esc() call sites: 48

## Dependencies
No package.json, no node_modules, no runtime dependencies. npm audit not applicable.

## Rate limits / authz
Not applicable: no server, no accounts, no endpoints.
