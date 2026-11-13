# ShipCheck — demo video script (< 5 min, target ~4:20)

Record on the developer site seeded per README step 7 (project WEB,
version 2.4: 6 Done, 2 In Progress, 1 To Do Highest WEB-118, 1 To Do High
unassigned, 1 stale). Show the app WORKING in the first 60 seconds —
judges are not required to watch beyond 5 minutes.

No copyrighted music, no third-party trademarks on screen. Narration in
clear English (all submission materials must be in English). Captions on.

## Scene 1 — Hook (0:00–0:20)

- [VISUAL] Jira board, version 2.4, 10 issues in mixed states. Cursor
  hovers over the release date, 2 days away.
- [NARRATOR] "Every team has lived this: release day is in two days and
  nobody can say, with evidence, whether version 2.4 is actually ready
  to ship. ShipCheck answers that question — with a score, a verdict,
  and the receipts."

## Scene 2 — Rovo agent (0:20–2:00)

- [VISUAL] Rovo chat open on a Jira issue. Type: "Is version 2.4 ready
  to ship?"
- [VISUAL] ShipCheck answers: "Version 2.4: 74/100 — CAUTION", then the
  deduction breakdown (8/10 done, 1 open Highest, 1 open High,
  1 unassigned, 1 stale) and the top blockers with keys.
- [NARRATOR] "ShipCheck is a Rovo agent. It reads live Jira data and
  scores the release with a fixed, transparent formula — no guessing,
  no invented numbers. Seventy-four, CAUTION: one Highest-priority bug
  is still open."
- [VISUAL] Follow-up, typed: "What is blocking our release?"
- [VISUAL] Ranked blocker list: WEB-118 payment bug (Highest),
  WEB-121 unassigned (High), WEB-124 untouched for 3 weeks.
- [NARRATOR] "And it ranks exactly what is standing in the way."

## Scene 3 — Dashboard (2:00–2:50)

- [VISUAL] Switch to the Jira project page: "ShipCheck — Release
  Readiness". Same 74/100, same CAUTION lozenge, same blocker table.
- [NARRATOR] "The same report lives on the project page, so the whole
  team sees one number — the agent, the dashboard, and the API all read
  from the same backend."

## Scene 4 — Before / after, live (2:50–3:30)

- [VISUAL] In Jira, mark WEB-118 Done. Back on the dashboard, click
  Refresh.
- [VISUAL] Score jumps to ~90/100 — READY, green lozenge. Blocker
  table shrinks.
- [NARRATOR] "Fix the top blocker, refresh, and the verdict moves with
  the work. Ninety — READY. That is the whole loop: evidence in,
  decision out."

## Scene 5 — MCP in a third-party client (3:30–4:00)

- [VISUAL] Claude Code terminal. Ask: "Is WEB 2.4 ready to ship?"
  The ShipCheck MCP tool runs; same 90/100 answer appears.
- [NARRATOR] "The same three tools are exposed through the Atlassian
  MCP server, so any MCP client can ask the same question — plus an
  open-source skill.md in the repo that teaches third-party agents how
  to use them."

## Scene 6 — Outro (4:00–4:20)

- [VISUAL] Title card: ShipCheck — Release Readiness Agent for Jira.
  Forge app: Rovo agent + MCP tools + project dashboard. Read-only,
  deterministic, two scopes.
- [NARRATOR] "ShipCheck: ship with confidence, because the answer comes
  from your data. Built on Forge for Codegeist 2026."
- [VISUAL] Repo link + installation-link note on screen. End.

## Shot list / checklist before recording

- [ ] Dev site on Standard/Premium trial, Rovo on, ShipCheck installed
- [ ] Seed data per README step 7 (score must read ~74 before scene 4)
- [ ] Rovo chat: ShipCheck agent visible and answering
- [ ] Dashboard page installed on project WEB
- [ ] Claude Code connected to the site MCP endpoint, ShipCheck tools on
- [ ] Record at 1080p, export < 5 min, upload as Public on YouTube
