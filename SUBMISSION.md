# ShipCheck — Devpost submission draft (Codegeist 2026)

Copy-paste source for the Devpost form. Fill in the bracketed fields
(installation link, video link, repo link) after the deploy steps in
README.md are done.

## Title

ShipCheck — Release Readiness Agent for Jira

## Tagline

"Is version 2.4 ready to ship?" — a score, a verdict, and the evidence,
from live Jira data.

## Category

Apps for Software Teams

## Bonus prizes entered

- Best Agents — Rovo/Assignable agents (`rovo:agent` module)
- Best app with Atlassian MCP (`rovo:mcp` module)

## Description

Release day is in two days and nobody can say, with evidence, whether
the version is actually ready to ship. ShipCheck answers that question.

ShipCheck is a Forge app for Jira built around one idea: a release
decision should come from live data, not from a feeling. Ask the
ShipCheck agent in Rovo chat — "Is version 2.4 ready to ship?" — and it
answers with a deterministic 0-100 score, a verdict (READY / CAUTION /
NOT READY), the deduction breakdown, and the ranked blockers behind it.
The same report lives on a Jira project-page dashboard, and the same
three tools are exposed through the Atlassian MCP server, so Claude Code
and other MCP clients can ask the same question. An open-source skill.md
in the repo teaches third-party agents how to use the tools.

The scoring formula is fixed and transparent: share of Done issues x 100,
minus 10 per open Highest-priority issue (cap -30), minus 4 per open
High-priority issue (cap -12), minus 2 per unassigned issue (cap -10),
minus 1 per stale issue untouched over 14 days (cap -8). The model is
unit-tested (11 tests, plain node, no account needed).

ShipCheck is read-only by design. It never creates, updates, or
transitions issues — it points at the issue keys and lets the team act.
It uses only GA Jira REST endpoints and two read scopes
(`read:jira-work`, `read:jira-user`), so it installs on any Jira Cloud
site. All actions are GET, so agents triggered by automation rules can
call them too.

## How it meets the technology requirement

Built on Atlassian Forge (runtime nodejs22.x, Forge CLI 15.1.0) and
integrated with Jira Cloud via the Jira REST API v3, plus the Rovo
platform: one `rovo:agent` module (the ShipCheck agent), one `rovo:mcp`
module (the same three actions as MCP tools), and one `jira:projectPage`
module (UI Kit dashboard). One codebase serves all three surfaces.

## Installation / testing instructions for judges

1. Open the installation link: [INSTALLATION LINK]
2. Install on a Jira Cloud site (Standard/Premium trial is enough;
   Rovo is required for the agent and MCP demos) and approve the two
   read scopes.
3. Seed demo data (2 min): create a project, a version (unreleased),
   and ~10 issues across Done / In Progress / To Do, including one
   Highest-priority open issue. Or use the seeded WEB / 2.4 project on
   the demo site if access is shared.
4. In Rovo chat, ask: "Is version 2.4 ready to ship?" then "What is
   blocking our release?"
5. Open the project page "ShipCheck — Release Readiness" for the same
   report as a dashboard.
6. (MCP) In Atlassian Administration, enable external MCP exposure for
   the app, connect Claude Code to the site MCP endpoint, and ask the
   same readiness question.

## Demo video

[DEMO VIDEO — public YouTube link, < 5 min]

## Source code

https://github.com/JohnyKucel/shipcheck (public, MIT license)

## Built with

Forge, Jira Cloud REST API, Rovo (`rovo:agent`, `rovo:mcp`), UI Kit 2
(`@forge/react`), Node.js 22.
