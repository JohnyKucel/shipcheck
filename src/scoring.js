/**
 * ShipCheck scoring — pure functions, no Forge imports.
 * Unit-tested in test/scoring.test.js with `npm test` (plain node, no Atlassian account).
 *
 * The model is deliberately deterministic: the agent never invents a score,
 * it reports what the rules below compute from live Jira data.
 *
 * READINESS SCORE (0-100)
 *   base        = share of issues in a Done status category x 100
 *   -10 each    open Highest-priority issue        (cap -30)
 *   -4  each    open High-priority issue           (cap -12)
 *   -2  each    unassigned issue in the version    (cap -10)
 *   -1  each    stale issue (not Done, untouched > 14 days) (cap -8)
 *   Score is clamped to 0-100 and rounded to an integer.
 *
 * VERDICT
 *   NO DATA   — the version has no issues at all
 *   NOT READY — score < 60, OR any open Highest-priority blocker exists
 *   CAUTION   — score 60-84
 *   READY     — score >= 85 AND zero open Highest-priority blockers
 *
 * An "open" issue is any issue whose statusCategory.key is not "done".
 * "Stale" is measured against the issue's `updated` timestamp.
 */

export const STALE_DAYS = 14;
export const WEIGHTS = {
  doneShare: 100,
  highestBlocker: 10,
  highestBlockerCap: 30,
  highBlocker: 4,
  highBlockerCap: 12,
  unassigned: 2,
  unassignedCap: 10,
  stale: 1,
  staleCap: 8,
};

export function isDone(issue) {
  return issue?.fields?.status?.statusCategory?.key === 'done';
}

export function isOpen(issue) {
  return !isDone(issue);
}

export function priorityName(issue) {
  return issue?.fields?.priority?.name || 'None';
}

export function isStale(issue, now = new Date()) {
  if (isDone(issue)) return false;
  const updated = issue?.fields?.updated;
  if (!updated) return false;
  const ageMs = now.getTime() - new Date(updated).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/** Issues that block at least one other issue via an outward "blocks" link. */
export function blocksOthers(issue) {
  const links = issue?.fields?.issuelinks || [];
  return links.some(
    (l) => l.outwardIssue && l.type && /block/i.test(l.type.name || '')
  );
}

export function buildVersionJql(projectKey, versionName) {
  const safeVersion = String(versionName).replace(/"/g, '\\"');
  return `project = ${projectKey} AND fixVersion = "${safeVersion}" ORDER BY priority DESC, updated ASC`;
}

/**
 * Pick the default version when the user did not name one:
 * latest unreleased version (prefer one with a releaseDate), else the
 * latest released one, else null. `versions` is the array returned by
 * GET /rest/api/3/project/{key}/versions.
 */
export function pickDefaultVersion(versions) {
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const unreleased = versions.filter((v) => !v.released);
  const pool = unreleased.length > 0 ? unreleased : versions;
  const withDate = pool.filter((v) => v.releaseDate);
  const sorted = [...(withDate.length > 0 ? withDate : pool)].sort((a, b) =>
    String(b.name).localeCompare(String(a.name))
  );
  return sorted[0] || null;
}

export function summarizeIssues(issues) {
  const byStatus = {};
  const byPriority = {};
  const byType = {};
  for (const issue of issues) {
    const status = issue?.fields?.status?.name || 'Unknown';
    const priority = priorityName(issue);
    const type = issue?.fields?.issuetype?.name || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
  }
  return { total: issues.length, byStatus, byPriority, byType };
}

/**
 * Ranked blockers, worst first. Each entry: { key, summary, reason, priority, status, assignee, updated }.
 * Reasons, in rank order: Highest priority open, High priority open,
 * blocks another issue, unassigned, stale.
 */
export function findBlockers(issues, now = new Date()) {
  const rank = (issue) => {
    if (isOpen(issue) && priorityName(issue) === 'Highest') return 0;
    if (isOpen(issue) && priorityName(issue) === 'High') return 1;
    if (isOpen(issue) && blocksOthers(issue)) return 2;
    if (isOpen(issue) && !issue?.fields?.assignee) return 3;
    if (isStale(issue, now)) return 4;
    return 5;
  };
  const reason = (issue) => {
    if (isOpen(issue) && priorityName(issue) === 'Highest') return 'Highest priority, still open';
    if (isOpen(issue) && priorityName(issue) === 'High') return 'High priority, still open';
    if (isOpen(issue) && blocksOthers(issue)) return 'Blocks another issue';
    if (isOpen(issue) && !issue?.fields?.assignee) return 'No assignee';
    if (isStale(issue, now)) return `Untouched for over ${STALE_DAYS} days`;
    return 'Other';
  };
  return issues
    .filter((issue) => rank(issue) < 5)
    .map((issue) => ({
      key: issue.key,
      summary: issue?.fields?.summary || '',
      reason: reason(issue),
      priority: priorityName(issue),
      status: issue?.fields?.status?.name || 'Unknown',
      assignee: issue?.fields?.assignee?.displayName || null,
      updated: issue?.fields?.updated || null,
    }))
    .sort((a, b) => {
      const ra = ['Highest priority, still open', 'High priority, still open', 'Blocks another issue', 'No assignee', `Untouched for over ${STALE_DAYS} days`].indexOf(a.reason);
      const rb = ['Highest priority, still open', 'High priority, still open', 'Blocks another issue', 'No assignee', `Untouched for over ${STALE_DAYS} days`].indexOf(b.reason);
      return ra - rb;
    });
}

export function computeReadiness(issues, now = new Date()) {
  const total = issues.length;
  if (total === 0) {
    return {
      score: null,
      verdict: 'NO DATA',
      breakdown: {
        total: 0,
        done: 0,
        openHighest: 0,
        openHigh: 0,
        unassigned: 0,
        stale: 0,
      },
      deductions: [],
    };
  }
  const done = issues.filter(isDone).length;
  const openHighest = issues.filter(
    (i) => isOpen(i) && priorityName(i) === 'Highest'
  ).length;
  const openHigh = issues.filter(
    (i) => isOpen(i) && priorityName(i) === 'High'
  ).length;
  const unassigned = issues.filter((i) => isOpen(i) && !i?.fields?.assignee).length;
  const stale = issues.filter((i) => isStale(i, now)).length;

  const donePoints = (done / total) * WEIGHTS.doneShare;
  const dHighest = Math.min(openHighest * WEIGHTS.highestBlocker, WEIGHTS.highestBlockerCap);
  const dHigh = Math.min(openHigh * WEIGHTS.highBlocker, WEIGHTS.highBlockerCap);
  const dUnassigned = Math.min(unassigned * WEIGHTS.unassigned, WEIGHTS.unassignedCap);
  const dStale = Math.min(stale * WEIGHTS.stale, WEIGHTS.staleCap);

  let score = Math.round(donePoints - dHighest - dHigh - dUnassigned - dStale);
  score = Math.max(0, Math.min(100, score));

  let verdict;
  if (openHighest > 0 || score < 60) verdict = 'NOT READY';
  else if (score >= 85) verdict = 'READY';
  else verdict = 'CAUTION';

  return {
    score,
    verdict,
    breakdown: { total, done, openHighest, openHigh, unassigned, stale },
    deductions: [
      { label: `${done}/${total} done`, points: +Math.round(donePoints * 10) / 10 },
      { label: `${openHighest} open Highest-priority`, points: -dHighest },
      { label: `${openHigh} open High-priority`, points: -dHigh },
      { label: `${unassigned} unassigned`, points: -dUnassigned },
      { label: `${stale} stale (>${STALE_DAYS}d untouched)`, points: -dStale },
    ],
  };
}
