# ShipCheck — Privacy Policy

ShipCheck is a Forge app for Jira that answers one question: "is this release ready to ship?"

## What ShipCheck does with your data

- **It reads Jira data only when you ask it to.** ShipCheck calls the Jira REST API (issues, versions, projects) through the scopes `read:jira-work` and `read:jira-user`, and computes a readiness score (0–100) with a READY / CAUTION / NOT READY verdict plus the evidence behind it.
- **It stores nothing.** ShipCheck keeps no database, no logs of your issues, and no copy of your Jira data. Scores are computed on demand and returned in the same request. No personal data is stored by the app.
- **It sends your data nowhere else.** ShipCheck talks only to your own Atlassian site. It does not share data with third parties, does not run analytics or tracking, and does not show ads.

## Contact

Questions about this policy: Rosy Maulana (individual developer) — darmih8@gmail.com.

Last updated: 2026-11-13.
