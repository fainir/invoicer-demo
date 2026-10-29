# CI (local run of .github/workflows/ci.yml steps) - 2026-10-29

GitHub Actions run 40854813832 did not start: 'an Actions budget is preventing further use' (private repo). Same steps run locally:

```
node --check js/app.js: ok
node --check js/calc.js: ok
node --check js/store.js: ok
# tests 16
# pass 16
# fail 0
external URL check: ok (no unexpected external URLs)
```
