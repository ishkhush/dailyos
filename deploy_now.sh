#!/bin/bash
# Run this once from Terminal to deploy the latest DailyOS build
# Identical to deploy.sh — packages index.html + sw.js and POSTs to Netlify.
# Prints the live URL on completion.
SITE_ID="c6c49e17-7395-4d93-89d8-35d8732cc282"
TOKEN="nfp_s1CVq1HBGQjNehC61VFCM1SPtme2xTaj3e9e"
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Deploying from $DIR..."
RESPONSE=$(cd "$DIR" && zip -r - index.html sw.js | curl -s -X POST \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary @-)
URL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ssl_url') or d.get('url','deploy failed'))" 2>/dev/null)
echo "Live at: $URL"
