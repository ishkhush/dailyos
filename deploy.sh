#!/bin/bash
# DailyOS → GitHub Pages deploy
# Bumps SW cache with a Unix timestamp, commits index.html + sw.js,
# pushes to main (GitHub Pages auto-rebuilds in ~90s), then restores sw.js.
# Run: bash deploy.sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "Deploying DailyOS..."

# Stamp sw.js with current Unix time so every deploy busts the browser cache
sed -i '' "s/const CACHE = 'dailyos-[^']*'/const CACHE = 'dailyos-$(date +%s)'/" sw.js

git add index.html sw.js
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push origin main

# Restore sw.js sentinel so the next deploy's sed works
git checkout sw.js

echo "Deployed → https://ishkhush.github.io/dailyos"
echo "(GitHub Pages rebuilds in ~90 seconds)"
