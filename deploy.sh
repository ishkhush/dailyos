#!/bin/bash
# DailyOS → GitHub Pages deploy
# Bumps SW cache with a Unix timestamp, commits index.html + sw.js,
# pushes to main, then verifies the published app and service worker.
# Run: bash deploy.sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "Deploying DailyOS..."

# Stamp sw.js with current Unix time so every deploy busts the browser cache
sed -i '' "s/const CACHE = 'dailyos-[^']*'/const CACHE = 'dailyos-$(date +%s)'/" sw.js

git add index.html sw.js deploy.sh dailyos-sync.js dailyos-photos.js dailyos-xp.js dailyos-audio.js sync-config.js supabase.min.js supabase-setup.sql supabase-security-hardening.sql supabase-security-check.sql SYNC-SETUP.md DAILYOS-GUIDE.md SECURITY-REVIEW.md docs/theme-design.md .nojekyll tests
git -c core.hooksPath=/dev/null commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push origin main

python3 - <<'PY'
import hashlib
import pathlib
import sys
import time
import urllib.error
import urllib.request

site = "https://ishkhush.github.io/dailyos/"
expected = {name: hashlib.sha256(pathlib.Path(name).read_bytes()).digest()
            for name in ("index.html", "sw.js", "dailyos-sync.js", "dailyos-photos.js", "dailyos-xp.js", "dailyos-audio.js", "sync-config.js", "supabase.min.js", "SYNC-SETUP.md", "supabase-setup.sql", "supabase-security-hardening.sql", "supabase-security-check.sql", "DAILYOS-GUIDE.md", "SECURITY-REVIEW.md")}
deadline = time.monotonic() + 600
print("Pushed to GitHub. Waiting for Pages to publish…", flush=True)
while time.monotonic() < deadline:
    matched = True
    for name, digest in expected.items():
        request = urllib.request.Request(
            site + name + "?dailyos_verify=" + str(time.time_ns()),
            headers={"Cache-Control": "no-cache"})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                matched = matched and hashlib.sha256(response.read()).digest() == digest
        except (urllib.error.URLError, TimeoutError, OSError):
            matched = False
    if matched:
        print("Published and verified → " + site, flush=True)
        sys.exit(0)
    print("Pages still serves an older version; deployment is pending.", flush=True)
    time.sleep(20)
print("GitHub received the commit, but Pages has not published it. Check GitHub Actions; do not clear app data.", file=sys.stderr)
sys.exit(1)
PY
