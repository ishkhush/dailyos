# DailyOS — Project Notes

## What it is
A personal PWA (Progressive Web App) built as a single `index.html` file with React.  
Live at: **https://dailyosish.netlify.app**  
Local folder: `~/Downloads/DailyOS`

## Sections
- **Home** — motivational quotes, daily snapshot, gym streak (🔥 animated), macro progress rings, supplement status
- **Fitness** — gym attendance, alternating splits (Legs/Tris/Bis ↔ Chest/Back/Shoulders), food logging with AI chat (OpenAI key)
- **Supplements** — daily checklist, confetti on full completion
- **Vocab** — flashcard system with learned/unlearned tracking

## Files
| File | Purpose |
|------|---------|
| `index.html` | The entire app (React + CSS + JS, all inline) |
| `sw.js` | Service worker — enables offline use, caches the app |
| `deploy.sh` | One-command Netlify deploy — run `bash ~/Downloads/DailyOS/deploy.sh` |
| `NOTES.md` | This file |

## Netlify
- **Site ID:** c6c49e17-7395-4d93-89d8-35d8732cc282
- **Deploy:** `bash ~/Downloads/DailyOS/deploy.sh`
- Auth token is stored inside `deploy.sh`

## Automated daily upgrades
A scheduled task ("dailyos-daily-upgrade") runs every day at 9am.  
It reads the app, makes 1–3 improvements (cool effects, fitness/nutrition/vocab features, polish), saves the file, and deploys to Netlify automatically.  
Manage it in the **Scheduled** section of the Claude sidebar.

## Key constants (don't change these)
- `GYM_ANCHOR = new Date(2026, 5, 9)` — anchor date for workout split rotation
- `GYM_SPLITS = ["Legs / Triceps / Biceps", "Chest / Back / Shoulders"]`
- Dark theme: `#0a0a0c` bg, `#a78bfa` purple, `#60a5fa` blue

## Recent improvements (June 9, 2026)
- Gym streak counter with 🔥 pulse animation
- Animated SVG macro progress rings (protein / carbs / fat) on Home
- Confetti burst when all supplements are checked off
- Smooth page transition animations between tabs

## How to start a new Claude session on this project
1. Open Cowork
2. Connect the `~/Downloads/DailyOS` folder
3. Say "continue working on DailyOS" — Claude will read this file for full context
