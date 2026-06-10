# Agent Teams — Master Reference Guide

Source: https://code.claude.com/docs/en/agent-teams  
Requires: Claude Code v2.1.32+, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

---

## Quick Decision: Should I Use a Team?

| Situation | Use |
|---|---|
| Tasks are independent, parallel work has clear value | Agent team |
| Workers need to message each other, challenge findings | Agent team |
| Sequential tasks, same-file edits, many dependencies | Single session or subagents |
| Only the final result matters, not coordination | Subagents |
| Routine or simple tasks | Single session |

**Rule of thumb:** If teammates would just wait on each other, don't use a team.

---

## Enable

```json
// .claude/settings.local.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in shell.

---

## Architecture

```
Team Lead (your main session)
├── Shared Task List  (claimed/unclaimed/blocked)
├── Mailbox           (direct inter-agent messaging)
├── Teammate A        (own context window)
├── Teammate B        (own context window)
└── Teammate C        (own context window)
```

**Storage (runtime only, auto-deleted on cleanup):**
- Team config: `~/.claude/teams/{team-name}/config.json`
- Tasks: `~/.claude/tasks/{team-name}/`

Do not hand-edit these files — they are overwritten on every state update.

---

## Core Concepts

### Task States
`pending` → `in_progress` → `completed`

- Pending tasks with unresolved dependencies **cannot be claimed** until dependencies complete.
- File locking prevents two teammates claiming the same task simultaneously.
- If a task appears stuck, the work may be done but the status not updated — tell the lead to nudge the teammate or update it manually.

### Communication
- Teammates message each other **directly by name** (no routing through lead).
- Messages are delivered automatically — lead does not poll.
- Idle notification fires automatically when a teammate finishes.
- To broadcast: send one message per recipient (no group-send).

### Permissions
- Teammates inherit the **lead's permission mode at spawn time**.
- Can be changed per-teammate after spawn, not at spawn time.
- If lead runs `--dangerously-skip-permissions`, all teammates do too.
- Pre-approve common operations before spawning to reduce prompt friction.

### Models
- Teammates do **not** inherit the lead's `/model` by default.
- Set default teammate model in `/config` → "Default teammate model".
- Override per-spawn: `"Use Sonnet for each teammate."`

---

## Display Modes

| Mode | How | Best For |
|---|---|---|
| `in-process` (default if no tmux/iTerm2) | All teammates in one terminal | Any terminal, no setup |
| `tmux` / iTerm2 split panes | Each teammate in own pane | Seeing everyone at once |

**Navigate in-process mode:**
- `Shift+Down` — cycle through teammates (wraps back to lead)
- Type to message the focused teammate
- `Enter` — view their session
- `Escape` — interrupt current turn
- `Ctrl+T` — toggle task list

**Set mode persistently:**
```json
// ~/.claude/settings.json
{ "teammateMode": "in-process" }
```

**Set mode for one session:**
```bash
claude --teammate-mode in-process
```

**Split panes require:** tmux (any terminal) OR iTerm2 + `it2` CLI + Python API enabled.  
**Split panes NOT supported in:** VS Code integrated terminal, Windows Terminal, Ghostty.

---

## Prompting Patterns

### Basic team creation
```
Create an agent team to [task]. Spawn [N] teammates:
- One for [role A]
- One for [role B]
- One for [role C]
```

### Specify models
```
Create a team with 4 teammates. Use Sonnet for each teammate.
```

### Require plan approval before implementation
```
Spawn an architect teammate to refactor the auth module.
Require plan approval before they make any changes.
```

### Give rich spawn context (best practice)
```
Spawn a security reviewer teammate with the prompt:
"Review src/auth/ for vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens
in httpOnly cookies. Report issues with severity ratings."
```

### Force lead to wait for teammates
```
Wait for your teammates to complete their tasks before proceeding.
```

### Shut down a specific teammate
```
Ask the researcher teammate to shut down.
```

### Clean up after done
```
Clean up the team.
```

---

## Subagent Definitions as Teammates

Define a role once, reuse as both subagent and teammate:

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

**What carries over from the subagent definition:**
- `tools` allowlist
- `model`
- System prompt body (appended, not replaced)

**What does NOT carry over:**
- `skills` frontmatter
- `mcpServers` frontmatter
- (Teammates load these from project/user settings instead)

Team coordination tools (`SendMessage`, task tools) are always available even when `tools` restricts others.

---

## Hooks for Quality Gates

| Hook | Trigger | Exit 2 effect |
|---|---|---|
| `TeammateIdle` | Teammate about to go idle | Send feedback, keep them working |
| `TaskCreated` | Task being created | Prevent creation, send feedback |
| `TaskCompleted` | Task being marked complete | Prevent completion, send feedback |

Use these to enforce: test coverage required, no schema changes without approval, security review before merge, etc.

---

## Team Sizing Guidelines

| Teams | Tasks per teammate | Notes |
|---|---|---|
| 3–5 teammates | 5–6 tasks each | Sweet spot for most workflows |
| >5 teammates | — | Coordination overhead often outweighs gains |

**Task sizing:**
- Too small → coordination overhead > benefit
- Too large → long runs without check-ins, wasted effort risk
- Right size → self-contained unit with clear deliverable (a function, a test file, a review)

---

## Strong Use Cases

### Parallel code review
```
Create an agent team to review PR #142. Spawn three reviewers:
- Security implications
- Performance impact
- Test coverage validation
Have them each review and report findings.
```

### Competing hypotheses debugging
```
Users report [symptom]. Spawn 5 agent teammates to investigate
different hypotheses. Have them challenge each other's theories
like a scientific debate. Update findings.md with the consensus.
```
Key: adversarial framing prevents anchoring on the first plausible explanation.

### Independent module development
Each teammate owns a separate module/layer — frontend, backend, tests — with no shared file edits.

### Research synthesis
Multiple teammates investigate different aspects of a problem, then share and challenge findings.

---

## Subagents vs Agent Teams (When to Choose)

| | Subagents | Agent Teams |
|---|---|---|
| Context | Own window; results return to caller | Own window; fully independent |
| Communication | Report back to main only | Direct teammate-to-teammate |
| Coordination | Main agent manages all | Shared task list, self-coordinating |
| Best for | Focused tasks, result is all that matters | Complex work needing discussion |
| Token cost | Lower | Higher (each teammate = full Claude instance) |

---

## Limitations (Know Before You Use)

| Limitation | Workaround |
|---|---|
| `/resume` and `/rewind` do NOT restore in-process teammates | After resuming, tell lead to spawn new teammates |
| Task status can lag (teammate doesn't mark done) | Tell lead to nudge teammate; update manually |
| Slow shutdown (waits for current request/tool call) | Plan for delay; don't kill prematurely |
| One team at a time per lead | Clean up before creating a new team |
| No nested teams | Teammates cannot spawn sub-teams |
| Lead is fixed for team lifetime | Cannot promote teammate to lead |
| Permissions set at spawn | Change individual modes post-spawn if needed |
| Split panes: tmux or iTerm2 only | Use in-process mode for broad terminal support |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Teammates not appearing | Press Shift+Down (in-process); verify tmux in PATH; check task was complex enough |
| Too many permission prompts | Pre-approve operations in permission settings before spawning |
| Teammate stopped on error | Check output with Shift+Down; give direct instructions or spawn replacement |
| Lead shuts down too early | "Keep going" or "Wait for teammates before proceeding" |
| Orphaned tmux session | `tmux ls` → `tmux kill-session -t <name>` |
| Lead messages non-existent teammates after resume | Tell lead to spawn new teammates |

---

## CLAUDE.md Works Normally

Teammates read `CLAUDE.md` from their working directory just like a regular session. Use it to give project-wide guidance to all teammates without repeating it in every spawn prompt.

---

## Token Cost Awareness

- Token usage scales linearly with active teammates.
- Each teammate = a full independent Claude context window.
- Research/review/new features: extra tokens usually worthwhile.
- Routine tasks: single session more cost-effective.
- Check `/en/costs#agent-team-token-costs` for usage guidance.

---

## Checklist Before Spawning a Team

- [ ] Task genuinely benefits from parallel, independent work
- [ ] Teammates will NOT need to edit the same files
- [ ] Team size is 3–5 (not more without strong reason)
- [ ] Each teammate has a clear, bounded role in the spawn prompt
- [ ] Task-specific context included in spawn prompt (not assumed from lead history)
- [ ] Common permissions pre-approved to reduce prompt friction
- [ ] Display mode chosen for your terminal setup
- [ ] Planned check-ins to monitor and steer progress
- [ ] Know how to clean up when done
