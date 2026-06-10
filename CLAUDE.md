# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project orientation

Read [overview.md](overview.md) first — it documents every component, all localStorage keys, the AI integration layer, rate limiter, security measures, and the load-bearing constants that must not change.

Read [AGENTS.md](AGENTS.md) for token-efficiency rules: how to read only what you need from `index.html`, when to grep vs Read, and response length expectations.

## No build step

There is no package.json, bundler, or compiler. The app is a single `index.html` file. React 18 and Babel standalone are loaded from cdnjs at runtime — Babel transpiles the inline JSX in the browser. To "run" the app, open `index.html` in a browser or deploy to Netlify.

## Deploy

```bash
bash deploy.sh
```

Zips `index.html` + `sw.js` and POSTs to Netlify via the API. Prints the live URL on completion. The Netlify site ID is `c6c49e17-7395-4d93-89d8-35d8732cc282`.

## Architecture

Everything is in `index.html`. The structure top-to-bottom:

1. **`<head>`** — PWA manifest + icon generated via Canvas API, service worker registration, CDN script tags with SRI hashes, global CSS with all keyframe animations
2. **`<script type="text/babel">`** — All application logic in one script block:
   - Global constants (`C`, `TARGETS`, `GYM_SPLITS`, `GYM_ANCHOR`, etc.)
   - Pure utility functions (`ld`/`sv` for localStorage, `dk`/`tdk` for date keys, `getDayInfo` for workout type)
   - Rate limiter (`checkRateLimit`) and Claude API wrappers (`callClaude`, `analyzePhotoWithKey`)
   - React components in dependency order, with `App` at the bottom as the root
3. `sw.js` — service worker, network-first with cache fallback

All app state lives in `App` and is passed down as props. Every state variable is persisted to localStorage via `useEffect` + `sv()`. On mount, all state initializers call `ld()` to restore from localStorage.

## Load-bearing constants — do not change

```js
GYM_ANCHOR = new Date(2026, 5, 9)   // anchor for alternating gym split rotation
GYM_SPLITS = ["Legs / Triceps / Biceps", "Chest / Back / Shoulders"]
PROFILE    = { currentWeight: 157, goalWeight: 165, height: "5'10\"" }
```

`GYM_ANCHOR` and `GYM_SPLITS` determine which split is shown on any given day. Changing them will silently corrupt all historical attendance data.

## localStorage key conventions

Keys are versioned (e.g. `dos_meals_v7`). If you need to change the shape of stored data in a breaking way, bump the version suffix so old data is ignored rather than misread. Keys: `dos_api_key`, `dos_meals_v7`, `dos_attend_v7`, `dos_usage_v7`, `dos_vocab_v7_<YYYY-MM-DD>`, `dos_learned_v7`, `dos_favorites_v1`, `dos_supps_v1`, `dos_supp_checked_v1`, `dos_bw_log_v1`, `dos_rl` (rate limiter).

## AI calls

Both AI entry points (`callClaude`, `analyzePhotoWithKey`) call `checkRateLimit()` as their first line. The rate limiter enforces 1.2 s minimum gap, 10 req/min, 100 req/day — all stored in `dos_rl`. Never call the Anthropic API directly from a component; always go through these two wrappers.

Text food logging uses `claude-haiku-4-5-20251001`; photo analysis uses `claude-sonnet-4-6`. The system prompt for food logging (`FOOD_SYSTEM`) forces Claude to respond in one of exactly two JSON formats — do not change it without testing the `extractJSON` parser against the new output shape.

## CDN integrity

The three CDN `<script>` tags (React, ReactDOM, Babel, canvas-confetti) have `integrity=` (SRI) hashes. If you upgrade versions, fetch new hashes from cdnjs.cloudflare.com or jsDelivr and update the attribute — the browser will block the script otherwise.

## Do NOT use

- No npm, bundler, TypeScript, or CSS-in-JS
- No external React state libraries (Redux, Zustand, Jotai, Context)
- No UI component libraries — all styles are inline or in the global `<style>` block
- No new CDN scripts without adding an SRI hash (fetch with `curl <url> | openssl dgst -sha384 -binary | openssl base64 -A`)
- No comments unless the WHY is non-obvious

## Adding new code — insertion order

All new code in `index.html` must follow this order inside the `<script type="text/babel">` block:

1. Constants / config (top of script)
2. Pure utilities (after `ld`/`sv`/`dk`)
3. New components **above** the component that uses them
4. Never add anything below the `App` component definition

## Reading index.html efficiently

**Grep first:** `grep -n "ComponentName\|functionName" index.html`
Then read only the relevant line range. The file is large — never read it all at once unless doing a full audit.

## Safety zones — get explicit approval before touching

- `GYM_ANCHOR`, `GYM_SPLITS`, `PROFILE` constants (corrupt historical data if changed)
- `FOOD_SYSTEM` prompt string and `extractJSON` parser (parser depends on exact output shape)
- SRI `integrity=` hashes on all CDN script tags
- `dos_*_v7` / `dos_*_v1` localStorage key names — bump version suffix for breaking schema changes

## Web Speech API known issues (researched 2026-06)

- **GC bug**: Keep the active `SpeechSynthesisUtterance` in a module-level variable (`_currentUtt`) — V8 GCs it mid-speech if only held in a local variable, silently killing `onend` and voice assignment.
- **Android Chrome**: Must set both `u.voice` AND `u.lang = voice.lang.replace('_', '-')` — voice alone is ignored.
- **iOS Safari**: `getVoices()` always returns `[]`. Skip voice selection; only set `u.lang = 'en-US'`. Detect with `/iPhone|iPad|iPod/.test(navigator.userAgent)`.
- **`onend` not firing**: Short syllables on Chrome may never fire `onend`. Workaround already in place: `addEventListener('end',...)` + 3 s timeout fallback in `playSyllables`.

## MediaRecorder MIME type order

`video/mp4;codecs=h264,aac` works on Safari 14+ and Chrome 126+. Fallback to `video/webm;codecs=vp9` for older Chrome. Always use `recorder.mimeType` (resolved type) when constructing the output Blob.

## Drag-and-drop pattern (native HTML5)

Use the HabitsPage pattern as the reference implementation (~line 1100). Key requirements:
- `onDragOver` **must** call `e.preventDefault()` or `onDrop` never fires
- Use `onDragEnd` (not `onDrop`) for the reorder mutation — fires reliably even if dropped outside
- Store drag index in a `useRef` (not state) to avoid stale closure issues in handlers
- Add visual feedback via state: `isDragOver` border highlight on the target row
