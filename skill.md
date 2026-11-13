# ShipCheck skill

Use this skill when you (an AI coding agent or assistant) need to answer
whether a Jira release is ready to ship, what is blocking it, or what is
in a release — through the ShipCheck MCP tools exposed by the ShipCheck
Forge app (Codegeist 2026).

## When to use

- The user asks "is version X ready to ship?", "can we release?", "go/no-go?"
- The user asks "what is blocking the release?" or "show me the blockers"
- The user asks "what is in version X?" or "summarize the release"
- You are writing release notes, a go/no-go memo, or a sprint review and
  need live Jira evidence instead of guessing

## When NOT to use

- The user wants to CREATE, UPDATE, or TRANSITION Jira issues. ShipCheck
  is read-only by design. Point at the issue keys instead and let the user
  (or their Jira workflow) make the change.
- The question is not about a Jira version/release. Use the Atlassian MCP
  server's general Jira search tools instead.

## Tools

All tools are read-only (GET). They run as the connected user, so results
are permission-filtered to what that user can already see in Jira.

### version-readiness — "Check release readiness"

Inputs (both optional):
- `projectKey` (string) — Jira project key, for example `WEB`. Omit to
  use the first project on the site.
- `versionName` (string) — Jira version (fixVersion) name, for example
  `2.4`. Omit to use the latest unreleased version.

Returns: `{ ok, projectKey, version: { name, released, releaseDate },
readiness: { score, verdict, breakdown, deductions }, blockers, openIssues }`

- `score` is 0-100, computed deterministically: share of Done issues
  x 100, minus 10 per open Highest-priority issue (cap -30), minus 4 per
  open High-priority issue (cap -12), minus 2 per unassigned issue
  (cap -10), minus 1 per stale issue untouched > 14 days (cap -8).
- `verdict`: `READY` (score >= 85 and no open Highest blocker),
  `CAUTION` (60-84), `NOT READY` (score < 60 or any open Highest
  blocker), `NO DATA` (the version has no issues).
- `blockers` is the ranked list of blocking issues with reasons.
- `openIssues` lists every non-Done issue in the version.

Call this FIRST for any readiness question. If the verdict is not READY,
call `list-blockers` next for the detail.

### list-blockers — "List release blockers"

Same inputs as `version-readiness`. Returns `{ ok, projectKey, version,
readiness, blockerCount, blockers }` where each blocker has
`{ key, summary, reason, priority, status, assignee, updated }`, ranked
worst first (Highest priority, High priority, blocks another issue,
unassigned, stale).

### version-summary — "Summarize a version"

Same inputs. Returns `{ ok, projectKey, version, total, byStatus,
byPriority, byType, openIssues }` — issue counts by status, priority,
and type, plus the open issues.

## How to answer

1. Call the fitting tool. Never invent issue data, scores, or verdicts.
2. Lead with one line: `Version 2.4: 74/100 — CAUTION`.
3. Then the evidence: the deduction breakdown and the top 3-5 blockers
   with keys (`WEB-118`), one per line.
4. End with the single most useful next step (example: "Resolve WEB-118
   and assign WEB-121, then the score rises to ~90").
5. If a tool returns `ok: false`, say what could not be read and mark
   the answer INCOMPLETE. Never fill the gap with a guess.
6. If the version has no issues, say so plainly: there is nothing to score.

## Setup

1. Install the ShipCheck Forge app on the Jira Cloud site (see the
   repo README) and enable external MCP exposure for the app in
   Atlassian Administration (Apps > Sites > your site > Connected apps).
2. Connect your MCP client to the site's Rovo MCP endpoint and select
   the ShipCheck tools.
3. No API keys or extra credentials are needed — tools run as you.
