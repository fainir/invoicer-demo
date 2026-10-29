#!/usr/bin/env bash
# Lighthouse (mobile) on the list and editor screens. Usage: scripts/lighthouse.sh [base-url]
# Uses the npx-cached lighthouse and the Playwright Chrome for Testing build; writes qa/perf/lighthouse-<screen>.html and qa/perf/lighthouse.md
set -euo pipefail
BASE="${1:-http://127.0.0.1:8080}"
LH="$(ls -d "$HOME"/.npm/_npx/*/node_modules/.bin/lighthouse 2>/dev/null | head -1)"
[ -n "$LH" ] || LH="npx -y lighthouse@12"
export CHROME_PATH="${CHROME_PATH:-$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/"Google Chrome for Testing.app"/Contents/MacOS/"Google Chrome for Testing" 2>/dev/null | tail -1)}"
mkdir -p qa/perf
{
  echo "# Lighthouse (mobile emulation) - $(date +%F) - $BASE"; echo
  echo "| Screen | Performance | Accessibility | Best practices | SEO | LCP | CLS | Report |"; echo "|---|---|---|---|---|---|---|---|"
} > qa/perf/lighthouse.md
for pair in "list:/" "editor:/#/new" "settings:/#/settings"; do
  name="${pair%%:*}"; path="${pair#*:}"
  $LH "$BASE$path" --quiet --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=json --output=html --output-path="qa/perf/lighthouse-$name" >/dev/null 2>&1
  python3 - "$name" "$path" <<'PY' >> qa/perf/lighthouse.md
import json, sys
name, path = sys.argv[1], sys.argv[2]
d = json.load(open(f"qa/perf/lighthouse-{name}.report.json"))
c = {k: round(v["score"] * 100) for k, v in d["categories"].items()}
a = d["audits"]
print(f"| {name} ({path}) | {c['performance']} | {c['accessibility']} | {c['best-practices']} | {c['seo']} | {a['largest-contentful-paint']['displayValue']} | {a['cumulative-layout-shift']['displayValue']} | lighthouse-{name}.report.html |")
PY
  rm -f "qa/perf/lighthouse-$name.report.json"
done
cat qa/perf/lighthouse.md
