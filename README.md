# ShipCheck — Release Readiness Agent for Jira

> "Is version 2.4 ready to ship?" — ShipCheck answers with a score, a
> verdict, and the evidence, from live Jira data. No guessing.

**Codegeist 2026** (Atlassian × Devpost, 27 Oct – 22 Dec 2026, $120,000).
One app, three prize tracks:

| Track | What qualifies |
|---|---|
| **Category: Apps for Software Teams** | Jira release-readiness for dev teams |
| **Bonus: Best Agents ($1,500 × 6)** | `rovo:agent` module — the ShipCheck agent in Rovo chat |
| **Bonus: Best app with Atlassian MCP ($1,500 × 6)** | `rovo:mcp` module — the same 3 tools for Claude Code, Cursor, any MCP client |

One submission can win one Grand Prize + one Bonus Prize. The same three
read-only actions power the Rovo agent, the MCP tools, and the Jira
project-page dashboard, so the demo is one coherent product, not three
proofs of concept.

## What it does

Ask in Rovo chat (or your MCP client, or open the dashboard):

- **"Is version 2.4 ready to ship?"** → `74/100 — CAUTION`, with the
  deduction breakdown and the top blockers.
- **"What is blocking our release?"** → ranked blocker list: open
  Highest/High priority issues, unassigned issues, stale issues
  untouched > 14 days, issues that block others.
- **"Summarize version 2.4"** → counts by status, priority, type, plus
  the open issues.

The score is **deterministic** (see `src/scoring.js`, unit-tested):

```
score = (Done issues / total) x 100
      - 10 per open Highest-priority issue   (cap -30)
      -  4 per open High-priority issue     (cap -12)
      -  2 per unassigned issue             (cap -10)
      -  1 per stale issue (> 14d untouched)(cap  -8)
verdict: READY (>= 85, no open Highest) | CAUTION (60-84)
         | NOT READY (< 60 or any open Highest) | NO DATA (0 issues)
```

ShipCheck is **read-only by design**. It never creates, updates, or
transitions issues — it points at the issue keys and lets the team act.

## Architecture

```
manifest.yml            rovo:agent + rovo:mcp + 3x action + jira:projectPage
prompts/prompt.md       agent instructions (resource file)
src/index.js            action handlers + UI resolver (shared by agent & MCP)
src/jira.js             Jira Cloud REST client (GA endpoints only)
src/scoring.js          deterministic scoring — pure functions, unit-tested
src/frontend/index.jsx  Jira project page dashboard (UI Kit 2, @forge/react)
skill.md                open-source skill file for third-party MCP agents
test/scoring.test.js     11 unit tests (plain node, no account, no network)
```

- **Only GA Jira REST endpoints** (`POST /rest/api/3/search/jql`,
  `GET /rest/api/3/project/{key}/versions`). No Preview APIs, no
  Teamwork Graph scopes — the app installs on any Jira Cloud site with
  two read scopes: `read:jira-work`, `read:jira-user`.
- **All actions are GET.** Agents triggered by automation rules will
  still call them (Forge skips CREATE/UPDATE/DELETE/TRIGGER actions there).
- **Reads run as the user** (`api.asUser()`), so results are always
  permission-filtered to what that user can already see.

## Repo status (12 Nov 2026)

Built locally, no accounts created. Validated without an Atlassian site:

- `npm test` — **11/11 pass** (scoring model, blockers ranking, version
  picking, JQL building).
- Manifest YAML parses; module wiring cross-checked (actions → functions,
  agent → actions, MCP tools → actions).
- `src/*.js` pass `node --check`; `src/index.js` imports cleanly in node.
- Frontend JSX bundles with esbuild; every component/prop verified
  against the installed `@forge/react` 12.5.0 type definitions
  (one real bug caught and fixed this way: `Table`/`Head`/`Row`/`Cell`
  do not exist in UI Kit 2 — replaced with `DynamicTable`).
- `forge lint` **blocked**: it requires `app.id`, which is only assigned
  by `forge register` — that needs the entrant's Atlassian login (see
  Deploy). Same for `forge deploy` / `forge install`.
- Forge CLI 15.1.0 installed. Note: global install needed
  `--ignore-scripts` (native `keytar` build fails on this VM) and lint
  needed `XDG_CONFIG_HOME` + `forge settings set usage-analytics false`
  to run non-interactively — documented here so the deploy machine
  doesn't trip on the same two issues.

## Deploy (Grey's steps — needs his accounts, ~30 min)

1. **Atlassian Cloud Developer site** (free): sign up at
   https://developer.atlassian.com/cloud/ — pick a **Standard or Premium
   trial** (Rovo is paid-only; a trial includes it). You must be an
   org admin on the site.
2. **Devpost account** (free) + click **Join Hackathon** at
   https://codegeist2026.devpost.com.
3. In this repo: `forge login` (Atlassian account) → `forge register`
   (writes `app.id` into `manifest.yml`) → `npm install` →
   `forge lint` → `forge deploy -e production`.
4. **Install on the dev site**: `forge install -e production`, pick Jira,
   enter the site URL, approve the two read scopes.
5. **Installation link for judges**: developer console → Distribution →
   Edit → **Sharing** (NOT "Sharing within organization") → choose Jira
   → copy the link. This link goes in the Devpost form.
6. **External MCP exposure** (for the MCP bonus demo): Atlassian
   Administration → Apps → Sites → your site → Connected apps → open the
   ShipCheck app → enable Tools / external MCP exposure.
7. **Seed demo data** (5 min, on the dev site): project `WEB`
   ("Website Redesign"), version `2.4` (unreleased), ~10 issues:
   6 Done, 2 In Progress, 1 To Do Highest (`WEB-118` payment bug,
   assigned), 1 To Do High (unassigned), 1 To Do untouched for 3 weeks.
   Expected dashboard: **~74/100 — CAUTION**, 3-4 blockers. Then mark
   `WEB-118` Done live on camera → refresh → **~90/100 — READY**.
   (That before/after arc is scene 4 of `demo-script.md`.)
8. **Demo video** (< 5 min, public YouTube) — script in `demo-script.md`.
9. **Submit on Devpost** before **23 Dec 2026 03:00 WIB** (22 Dec 12:00 PT).
   Form content pre-written in `SUBMISSION.md`. Category: Apps for
   Software Teams. Bonus prizes: Best Agents + Best app with Atlassian MCP.

## Local development (no account needed)

```bash
npm install
npm test          # 11 unit tests, plain node
```

`forge tunnel` / `forge deploy` / `forge install` need `forge login`
+ a developer site — that is step 3 above, not this machine's job.

## License

MIT — see `LICENSE`.
