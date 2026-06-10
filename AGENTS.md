# AGENTS.md — Token Efficiency for DailyOS

Rules for every agent working in this repo. Follow them without exception.

---

## Read the minimum

`index.html` is ~1,900 lines. **Never read the whole file.** Always locate first, then read only what you need.

**Pattern:**
```
1. grep for the symbol/section → get the line number
2. Read with offset + limit (±20 lines around the target)
3. Edit with the exact old_string → done
```

```bash
# Find a component
grep -n "function FitnessPage\|function HomePage\|function VocabPage" index.html

# Find a CSS rule or constant
grep -n "GYM_ANCHOR\|dos_habits\|habitStreak\|_resolveVoice" index.html
```

Do not `cat` or Read the whole file to "get context." `overview.md` and `CLAUDE.md` already contain the architecture. Trust them.

---

## Do not re-derive known facts

`overview.md` documents every component, prop, localStorage key, AI model, and load-bearing constant. Before searching the code for any of these, read `overview.md` first. If it answers the question, stop — do not also grep the file.

---

## Edit > Write

For any change to `index.html` or `sw.js`, use **Edit** (diff), not **Write** (full overwrite). Write on a 1,900-line file wastes the entire file as output tokens.

---

## Parallel tool calls

If two tool calls don't depend on each other, fire them in the same message. Example — finding two separate functions:
```
grep "function SupplementsPage" + grep "dos_supps_v1"  ← one message, two calls
```
Never serialize independent lookups.

---

## Never re-read after editing

Edit/Write fails loudly if the change didn't apply. If it succeeded, the state is updated. Do not Read the file again to confirm — it wastes a full round-trip.

---

## grep before Read

If you need to verify something exists, use `grep -n` first. Only call Read if you need to see surrounding context that grep can't provide.

---

## Response length rules

- Code changes: state what changed in one sentence. No bullet summaries of every line touched.
- Investigations: give the answer and the file:line. Not a tour of everything you read.
- Errors: state the root cause and fix. No recap of what you tried first.

---

## Specific to this codebase

| Task | Efficient approach |
|------|--------------------|
| Add a new component | grep for `// ── [ADJACENT SECTION]` to find insertion line; Read ±5 lines; Edit once |
| Add App state | grep for `dos_bw_log_v1` (last state block); Read 5 lines; Edit to append new `useState` + `useEffect` |
| Change a CSS animation | grep for the `@keyframes` name; Read 5 lines; Edit |
| Add a localStorage key | Bump version suffix; update `overview.md` key list in the same turn |
| Deploy | `bash deploy.sh` — one command, no further steps |
| Find component props | Read `overview.md` — every component's props are documented there |

---

## When to spawn a subagent

Only when:
- The task genuinely requires parallel independent workstreams
- The search space is large and open-ended (e.g., "find all places X is referenced")

Do NOT spawn for: single-file edits, lookups answerable by grep, tasks that take <3 tool calls.

---

## MCP tools available

Two MCP servers run in this project (`.mcp.json`). Use them to cut token cost on navigation.

**Token Savior** — symbol-based navigation + persistent memory

| When | Use |
|------|-----|
| Need to read a specific component | `mcp__token-savior__get_function_source` with the component name |
| Need to find a symbol | `mcp__token-savior__search_codebase` instead of grep + Read |
| Want to persist a fact across sessions | `mcp__token-savior__remember` (stores in SQLite) |
| Would otherwise read >50 lines to locate something | Use Token Savior first |

Token Savior profile is `optimized` (15 tools, safe cross-project). Bash output compaction is auto-active for git/test commands.

**code-review-graph** — blast-radius + semantic search (30 MCP tools)

| When | Use |
|------|-----|
| Change touches `App` state or a shared util | `mcp__code-review-graph__blast_radius` to see which components are affected |
| Conceptual search ("find the gym split logic") | `mcp__code-review-graph__semantic_search` |
| One-line CSS or trivial edit | **Skip** — graph overhead exceeds plain Read for trivial changes |

Run `uvx --python 3.11 --from code-review-graph code-review-graph build` after large structural changes to keep the index fresh.

---

## What not to add

- Comments explaining what code does — names already do that
- Error handling for impossible states
- Abstractions for hypothetical future needs
- Trailing "summary of changes" in responses
