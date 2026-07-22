# DailyOS — Agent Overview

## What It Is

A single-file Progressive Web App (PWA) for personal fitness, nutrition, supplements, and vocabulary tracking. Built as one `index.html` with React 18 loaded via CDN (no build step, no node_modules). Lives at **https://dailyosish.netlify.app**.

---

## File Structure

```
DailyOS/
├── index.html        — The entire app (~1,700 lines of HTML + CSS + JSX)
├── sw.js             — Service worker for offline caching
├── deploy.sh         — One-command Netlify deploy script
├── deploy_now.sh     — Alternate deploy script (functionally identical)
├── NOTES.md          — Human-readable project notes
├── overview.md       — This file (AI agent context)
└── ishhhh.png        — Hero photo used in the Home page parallax header
```

---

## index.html — Internal Structure

The file is divided into four main sections inside one HTML file:

### 1. `<head>` — PWA Bootstrap (lines 1–88)

**Icon generation**: A `<script>` block runs immediately and uses the Canvas API to draw the "DailyOS" app icon at 192×192 and 512×512. The icon is a rounded rectangle with a purple-to-blue gradient "D OS" wordmark.

**Web App Manifest**: Generated inline as a `data:` URI and injected as a `<link rel="manifest">`. Declares the app as a standalone PWA with dark background.

**Service Worker**: Registered on `window.load` via `navigator.serviceWorker.register('./sw.js')`.

**CDN scripts** (with SRI integrity hashes for supply-chain protection):
- `react.production.min.js` v18.2.0
- `react-dom.production.min.js` v18.2.0
- `babel-standalone.min.js` v7.23.10 — transpiles the inline JSX at runtime

**Global CSS**: All styles are inline in a single `<style>` block. Keyframe animations defined: `fadeIn`, `slideUp`, `popIn`, `pulse`, `glow`, `spin`, `sweepRing`, `recPulse`, `shimmer`, `heatPop`, `sparkleIn`, `bwPulse`, `restDone`, `flashRest`.

---

### 2. `<script type="text/babel">` — All Application Logic (lines 92–1725)

This single script tag contains all React components, utilities, and state. Babel transpiles it at runtime.

#### Constants (lines 95–217)

| Constant | Purpose |
|----------|---------|
| `C` | Color palette — `C.accent` (#b39dfa purple), `C.green`, `C.amber`, `C.blue`, `C.red`, `C.bg` through `C.bg4`, `C.border`, `C.text` through `C.text3` |
| `ISH_IMG` | Base64-encoded PNG of the user's hero photo (embedded inline) |
| `QUOTES` | Array of motivational quotes, one shown per day |
| `WORDS` | Vocabulary word bank for the daily flashcard system |
| `DAYS_L`, `DAYS_S`, `MONTHS_L`, `MONTHS_S` | Date label arrays |
| `GYM_ANCHOR` | `new Date(2026, 5, 9)` — anchor date for alternating workout split rotation |
| `GYM_SPLITS` | `["Legs / Triceps / Biceps", "Chest / Back / Shoulders"]` |
| `TARGETS` | Macro targets by day type: `combo` (kickboxing + gym), `kb` (kickboxing only), `gym` (gym only), `rest` |
| `PROFILE` | `{ currentWeight: 157, goalWeight: 165, height: "5'10\"" }` |
| `DEFAULT_SUPPLEMENTS` | 5-item lean bulk stack: Creatine, Vitamin D3, Omega-3, Zinc, Magnesium |

#### Utility Functions (lines 218–285)

| Function | What it does |
|----------|-------------|
| `getDayInfo(date)` | Returns `{ type, isKick, isGym, gymSplit }` for any date — computes workout type by comparing days since `GYM_ANCHOR` and day of week |
| `dk(date)` | Returns an ISO date key `"YYYY-MM-DD"` for a Date object (used as localStorage keys) |
| `tdk()` | Returns today's date key |
| `vd(offset)` | Returns a Date shifted by `offset` days from today (used for date navigation in FitnessPage) |
| `ld(key, fallback)` | `localStorage.getItem` + JSON parse, returns fallback on missing/error |
| `sv(key, value)` | `localStorage.setItem` + JSON stringify, silently swallows errors |
| `getQuote()` | Picks a daily quote deterministically by `(year*366 + month*31 + date) % QUOTES.length` |
| `getTodayWords()` | Picks 3 vocabulary words deterministically by date seed using a sin-based PRNG |
| `speak(text, rate)` | Speaks text via `SpeechSynthesisUtterance` |
| `playSyllables(syls)` | Speaks an array of syllables one by one with 320ms pauses (for vocabulary pronunciation) |
| `extractJSON(raw)` | Robust JSON parser — tries raw parse, strips markdown code fences, then regex-extracts `{...}` as fallback |

#### Rate Limiter (lines 271–284)

```
RATE = { perMinute: 10, perDay: 100, minMs: 1200 }
```

`checkRateLimit()` reads/writes the `dos_rl` localStorage key `{ calls: [], daily: {}, last: 0 }`. It enforces:
- **1.2s minimum gap** between calls
- **10 calls per rolling 60-second window**
- **100 calls per day** (keyed by `tdk()`)

Throws an error (displayed to user) if any limit is exceeded. Called at the top of both `callClaude` and `analyzePhotoWithKey`.

#### Claude API Layer (lines 287–318)

| Function | Model | Purpose |
|----------|-------|---------|
| `callClaude(apiKey, messages, system, maxTokens, model)` | `claude-haiku-4-5-20251001` (default) | General-purpose Claude API call. Uses `anthropic-dangerous-direct-browser-access: true` header to allow direct browser requests |
| `analyzePhotoWithKey(apiKey, b64, mime)` | `claude-sonnet-4-6` | Sends a base64 image to Claude vision with a precise nutrition analysis prompt; returns structured JSON |

Both functions call `checkRateLimit()` first and POST directly to `https://api.anthropic.com/v1/messages`.

---

### 3. React Components (lines 321–1722)

#### `ApiKeyScreen` (line 321)
**Shown when**: No API key is saved (`!apiKey` in App).  
**Props**: `{ onSave }`  
**What it does**: Password input for the Anthropic API key. Validates it starts with `sk-ant-`, tests it with a minimal Claude call, then saves to `dos_api_key` in localStorage.

---

#### `FoodAIChat` (line 376)
**Shown as**: Full-screen overlay from FitnessPage.  
**Props**: `{ apiKey, onAddMeal, onClose, favorites, onSaveFavorite }`  
**State**: `messages`, `input`, `loading`, `pendingResult`, `photoScanning`  
**What it does**:
- Conversational food logger backed by Claude Haiku with `FOOD_SYSTEM` prompt
- Claude responds in one of two JSON formats: `{"type":"question"}` (asks for clarification) or `{"type":"result"}` (returns macros)
- **Photo mode**: File input → FileReader → base64 → `analyzePhotoWithKey()` → displays estimated macros
- Race condition guard: `sendMessage` and `handlePhoto` both check `loading || photoScanning` before proceeding
- **Favorites**: Pin any logged meal; quick-add from favorites list without re-asking Claude
- `confirmAdd()` calls `onAddMeal()` which adds the meal to the parent FitnessPage state

**System prompt** (`FOOD_SYSTEM`): Forces Claude to always output one of the two JSON formats. Instructs it to ask for portion size if not given, and use brand-specific data for known brands.

---

#### `WeeklyHistory` (line 561)
Sub-component within FoodAIChat. Renders a 7-day scrollable history of meals grouped by day.

#### `WeightSparkline` (line 607)
Inline SVG sparkline chart of bodyweight over time. Renders as a path from the `bwLog` array. Tappable to open the `WeightLogModal`.

#### `CalorieRing` (line 674)
Animated SVG donut ring showing calorie progress vs daily target. Uses CSS animation `sweepRing` with `stroke-dashoffset`.

---

#### `HomePage` (line 719)
**Props**: `{ meals, usage, supps, suppChecked, setPage, scrollY, bwLog, setShowBwModal }`  
**Sections rendered**:
1. **Hero header** — Parallax photo of user (`ishhhh.png`), fades and scales on scroll. Ambient glow blobs in background.
2. **Greeting + quote** — Day label, motivational quote, gym streak counter (🔥 pulse animation)
3. **Day type banner** — Shows today's workout type (Kickboxing + Gym / Kickboxing / Gym / Rest)
4. **Macro rings** — Three animated SVG rings for protein, carbs, fat progress vs TARGETS
5. **Calorie ring** — `CalorieRing` component
6. **Lean bulk progress** — Progress bar from `currentWeight` (157 lb) to `goalWeight` (165 lb), reads from `bwLog`
7. **Weight sparkline** — Tappable `WeightSparkline`
8. **Supplement snapshot** — X/Y taken today, tapping navigates to Supplements tab
9. **App usage calendar** — 28-day dot grid showing which days the app was opened
10. **Gym heatmap** — `GymHeatmap` component

**Scroll tracking**: App root scroll position is tracked and passed down as `scrollY` to drive the parallax.

---

#### `GymHeatmap` (line 932)
Renders a calendar grid (13 weeks × 7 days) colored by attendance. Each cell is colored by how many activities were logged that day. Tapping a cell does nothing (display only).

---

#### `RestTimer` (line 1002)
Persistent floating rest timer at bottom of FitnessPage. Tapping cycles through: `idle → 90s → 120s → 180s → idle`. Countdown renders in place; when it hits 0, a "REST DONE" flash overlay appears with `flashRest` animation.

---

#### `WeightLogModal` (line 1105)
Full-screen modal for logging bodyweight. Input field + save button. Appends `{ date: tdk(), weight: number }` to `bwLog` array. Lists recent 10 entries.

---

#### `FitnessPage` (line 1159)
**Props**: `{ meals, setMeals, attend, setAttend, apiKey, favorites, setFavorites, bwLog, setBwLog }`  
**State**: `off` (date offset), `showChat`, `showBwModal`  
**Sections**:
1. **Date navigator** — `‹ Today ›` arrows, shifts `off` to view past/future days
2. **Day banner** — Color-coded by day type, shows workout tags
3. **Macro targets** — Displays target cal/carbs/protein/fat for the selected day type
4. **Attendance checkboxes** — "Mark Kickboxing" / "Mark Gym" buttons that toggle `attend[dKey]`
5. **Macro progress bars** — 4 bars for Cal, Carbs, Prot, Fat vs targets
6. **Meal log** — Scrollable list of logged meals with delete buttons
7. **Add food button** — Opens `FoodAIChat` overlay
8. **Favorites list** — Quick-add pins; each has a remove button
9. **Weight section** — `WeightSparkline` + log button → `WeightLogModal`
10. **`RestTimer`** — Always rendered at top (floating)

---

#### `SupplementsPage` (line 1334)
**Props**: `{ supps, setSupps, checked, setChecked }`  
**Sections**:
1. **Progress bar** — X/Y taken, percentage, turns green when all done, fires confetti when 100%
2. **Morning stack** — Supplements with `time === "morning"`, checkbox to mark taken
3. **Evening stack** — Supplements with `time === "evening"`
4. **Add supplement** — Expandable form with name, dose, time fields
- Supplement state is keyed per-day (`checked[tdk()]`) so each day starts fresh

---

#### `VocabPage` (line 1450)
**Props**: `{ vocab, setVocab, learned, setLearned }`  
**Tabs**: "today" (3 daily words) / "learned" (all-time learned words)  
**Features**:
- `getTodayWords()` picks 3 deterministic words per day from `WORDS` bank
- **Speak** button uses `speak()` + `playSyllables()` for pronunciation
- **Mark learned** toggles a word as learned, adds it to the persistent `learned` array
- **Video recording**: Each word card has a "Record" button. Uses `MediaRecorder` + `getUserMedia` to record a webcam video of the user pronouncing the word. Preview → confirm saves as base64 data URL in localStorage. Discard revokes the object URL. Live camera preview shown via `liveVideoRef` while recording.

---

#### `Nav` (line 1658)
Fixed bottom navigation bar. 4 tabs: Home 🏠, Fitness 💪, Vocab 📖, Supps 💊. Active tab highlighted with purple glow. Respects iOS safe area inset via `env(safe-area-inset-bottom)`.

---

#### `App` (line 1673) — Root Component

All global state lives here:

| State key | localStorage key | Default |
|-----------|-----------------|---------|
| `page` | — | `"home"` |
| `apiKey` | `dos_api_key` | `""` |
| `meals` | `dos_meals_v7` | `{}` |
| `attend` | `dos_attend_v7` | `{}` |
| `usage` | `dos_usage_v7` | `{}` |
| `vocab` | `dos_vocab_v7_<date>` | `getTodayWords()` |
| `learned` | `dos_learned_v7` | `[]` |
| `favorites` | `dos_favorites_v1` | `[]` |
| `supps` | `dos_supps_v1` | `DEFAULT_SUPPLEMENTS` |
| `suppChecked` | `dos_supp_checked_v1` | `{}` |
| `bwLog` | `dos_bw_log_v1` | `[]` |
| `theme` | `dos_theme_v1` | `"OG"` |
| emoji recents (EmojiSheet-local) | `dos_emoji_recent_v1` | first 16 of `HABIT_EMOJIS` |
| body photos (index) | `dos_body_index_v1` | `[]` |
| last backup (module-level) | `dos_backup_meta_v1` | — |

Every state variable has a corresponding `useEffect` that calls `sv()` to persist it on every change. Usage counter is incremented once per page load.

**Body-progress photos** are the one exception to the localStorage rule: JPEG blobs live in **IndexedDB** (`dailyos` DB → `bodyPhotos` store, keyPath `date`), too large for localStorage. `dos_body_index_v1` holds just the `[{date, ts}]` index. The `ProgressPage`/`ProgressViewer` components own this state via `idbGetAll`/`idbPut`/`idbDel`; `fileToProgressBlob` resizes captures to ~1080px JPEG. Photos never leave the device (no AI, no upload).

**Backup/restore**: `buildBackup`/`downloadBackup`/`importBackup` utils (after the storage section) export every `dos_*` localStorage key verbatim plus IndexedDB photos as base64 into one JSON envelope; `BackupSheet` (after `ThemeSheet`) is the UI, opened from a HomePage hero icon, the ProgressPage footer link, or auto-opened on iOS when the last backup (`dos_backup_meta_v1`) is >7 days stale (non-iOS auto-downloads directly). `BACKUP_EXCLUDE` keeps `dos_api_key`/`dos_el_key_v1` out of exports and refuses them at import. `ApiKeyScreen` has an import entry point for fresh-device restores.

**Gate**: If `!apiKey`, renders `<ApiKeyScreen>` instead of the app.

---

## sw.js — Service Worker

Cache name: `dailyos-v3`

| Event | Behavior |
|-------|---------|
| `install` | Caches `./` (the root, which resolves to `index.html`); calls `skipWaiting()` immediately |
| `activate` | Deletes all caches except `dailyos-v3`; calls `clients.claim()` |
| `fetch` (navigate) | Network-first for page navigation; falls back to cached `./` if offline |
| `fetch` (other) | Network-first for all other requests; caches successful 200 responses; falls back to cache |

---

## deploy.sh / deploy_now.sh

Both scripts are identical in effect. Steps:
1. `zip -r - index.html sw.js` — creates an in-memory zip of only the two app files
2. `curl -X POST` to `https://api.netlify.com/api/v1/sites/<SITE_ID>/deploys` with `Authorization: Bearer <TOKEN>` and `Content-Type: application/zip`
3. Parses the JSON response with Python's `json` module to extract the live URL
4. Prints `Live at: <url>`

**Site ID**: `c6c49e17-7395-4d93-89d8-35d8732cc282`  
**Token**: Stored inline in the script (Netlify personal access token)

---

## Data Flow

```
User action
    │
    ▼
React component state (useState)
    │
    ├─── useEffect → sv("dos_*", value) → localStorage
    │
    └─── Claude API call (if food/photo)
              │
              ├─── checkRateLimit() ← dos_rl in localStorage
              │
              └─── fetch("https://api.anthropic.com/v1/messages")
                        │
                        └─── Returns JSON → extractJSON() → update meals state
```

On next load, all `useState` initializers call `ld("dos_*", default)` to restore from localStorage.

---

## AI Integration

| Feature | Model | Trigger | Output |
|---------|-------|---------|--------|
| Food text logging | `claude-haiku-4-5-20251001` | User types food in FoodAIChat | JSON `{type, name, calories, carbs, protein, fat, fiber}` |
| Photo meal scan | `claude-sonnet-4-6` | User uploads photo in FoodAIChat | JSON `{name, calories, carbs, protein, fat, fiber, items[], confidence, note}` |

The API key is entered once at first launch, stored in `dos_api_key` (localStorage), and passed down from `App` as a prop to every component that needs it.

---

## Security Measures

| Measure | Implementation |
|---------|---------------|
| **SRI hashes** | `integrity=` attributes on all 3 CDN `<script>` tags prevent tampering |
| **Rate limiting** | `checkRateLimit()` enforces 1.2s gap, 10/min, 100/day before any API call |
| **Concurrent call guard** | `sendMessage` and `handlePhoto` check `loading \|\| photoScanning` to prevent races |
| **API key validation** | `ApiKeyScreen` requires key to start with `sk-ant-` and tests it live before saving |
| **No server secrets** | All secrets (API key, Netlify token) are client-side only — acceptable since this is a personal single-user app |

---

## Key Constants for Future Sessions

These values are load-bearing — changing them will break streak/split calculations:

```js
GYM_ANCHOR = new Date(2026, 5, 9)          // June 9, 2026
GYM_SPLITS = ["Legs / Triceps / Biceps", "Chest / Back / Shoulders"]
PROFILE    = { currentWeight: 157, goalWeight: 165, height: "5'10\"" }
```

Theme colors: `#0a0a0c` background, `#b39dfa` accent purple, `#60a5fa` blue.
