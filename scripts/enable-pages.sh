#!/usr/bin/env bash
# Enable GitHub Pages for this repo (branch main, root). Needs: gh logged in, repo public or a plan with Pages on private repos.
set -euo pipefail
REPO="${1:-fainir/invoicer-demo}"
if gh api "repos/$REPO/pages" >/dev/null 2>&1; then
  echo "Pages already enabled: $(gh api "repos/$REPO/pages" --jq .html_url)"
else
  gh api -X POST "repos/$REPO/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/' --jq .html_url
fi
