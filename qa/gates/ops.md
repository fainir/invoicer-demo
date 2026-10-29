# Ops gate - 2026-10-29

- Deploy: push to main; GitHub Pages serves the repo root (README 'Deploy'). Enable once with scripts/enable-pages.sh after the repo is public.
- Rollback = git revert <commit> && git push. Tried once on main:
```
15f7254 Revert "test: rollback marker (to be reverted)"
3240730 test: rollback marker (to be reverted)
404e265 docs: security, CI and Lighthouse gate evidence, cost line, lighthouse script
```
- CI: .github/workflows/ci.yml (syntax check, unit tests, external-URL check). Blocked on the private repo by the Actions budget; steps run locally in ci-local.md. Runs free once the repo is public.
- Env vars: none. Secrets: none. Domain/TLS: github.io, managed by GitHub.
- README run-in-10-minutes check: clone, python3 -m http.server 8080, open http://localhost:8080 (verified in this session).
