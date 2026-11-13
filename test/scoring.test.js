/**
 * Unit tests for the deterministic ShipCheck scoring model.
 * Run with `npm test` (plain node, no Atlassian account, no network).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeReadiness,
  findBlockers,
  summarizeIssues,
  pickDefaultVersion,
  buildVersionJql,
} from '../src/scoring.js';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-12T09:00:00.000Z');

function issue(key, opts = {}) {
  const {
    status = 'Done',
    priority = 'Medium',
    assignee = 'Ada',
    updatedDaysAgo = 1,
    links = [],
    type = 'Task',
  } = opts;
  const statusKey =
    status === 'Done' ? 'done' : status === 'In Progress' ? 'indeterminate' : 'new';
  return {
    key,
    fields: {
      summary: `Issue ${key}`,
      status: { name: status, statusCategory: { key: statusKey } },
      priority: { name: priority },
      assignee: assignee ? { displayName: assignee } : null,
      updated: new Date(now.getTime() - updatedDaysAgo * DAY).toISOString(),
      issuetype: { name: type },
      issuelinks: links,
    },
  };
}

test('all done: 100, READY', () => {
  const issues = [issue('WEB-1'), issue('WEB-2'), issue('WEB-3'), issue('WEB-4')];
  const r = computeReadiness(issues, now);
  assert.equal(r.score, 100);
  assert.equal(r.verdict, 'READY');
  assert.equal(r.breakdown.done, 4);
});

test('half done, no blockers: 50, NOT READY', () => {
  const issues = [
    ...[1, 2, 3, 4, 5].map((n) => issue(`WEB-${n}`)),
    ...[6, 7, 8, 9, 10].map((n) => issue(`WEB-${n}`, { status: 'To Do' })),
  ];
  const r = computeReadiness(issues, now);
  assert.equal(r.score, 50);
  assert.equal(r.verdict, 'NOT READY');
});

test('one open Highest blocker forces NOT READY even at 80', () => {
  const issues = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => issue(`WEB-${n}`)),
    issue('WEB-10', { status: 'To Do', priority: 'Highest' }),
  ];
  const r = computeReadiness(issues, now);
  assert.equal(r.score, 80); // 90 - 10
  assert.equal(r.verdict, 'NOT READY');
  assert.equal(r.breakdown.openHighest, 1);
});

test('High + unassigned deductions: 74, CAUTION', () => {
  const issues = [
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => issue(`WEB-${n}`)),
    issue('WEB-9', { status: 'To Do', priority: 'High' }),
    issue('WEB-10', { status: 'To Do', priority: 'Medium', assignee: null }),
  ];
  const r = computeReadiness(issues, now);
  assert.equal(r.score, 74); // 80 - 4 - 2
  assert.equal(r.verdict, 'CAUTION');
  assert.equal(r.breakdown.openHigh, 1);
  assert.equal(r.breakdown.unassigned, 1);
});

test('one stale issue costs 1 point: 89, still READY', () => {
  const issues = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => issue(`WEB-${n}`)),
    issue('WEB-10', { status: 'To Do', priority: 'Medium', updatedDaysAgo: 30 }),
  ];
  const r = computeReadiness(issues, now);
  assert.equal(r.score, 89); // 90 - 1
  assert.equal(r.verdict, 'READY');
  assert.equal(r.breakdown.stale, 1);
});

test('empty version: NO DATA, score null', () => {
  const r = computeReadiness([], now);
  assert.equal(r.score, null);
  assert.equal(r.verdict, 'NO DATA');
});

test('Highest deduction capped at -30, score clamped at 0', () => {
  const issues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
    issue(`WEB-${n}`, { status: 'To Do', priority: 'Highest' })
  );
  const r = computeReadiness(issues, now);
  assert.equal(r.score, 0); // 0 done - 30 (Highest cap) -> clamped to 0
  assert.equal(r.verdict, 'NOT READY');
});

test('findBlockers ranks Highest, High, blocks-others, unassigned, stale', () => {
  const stale = issue('WEB-5', { status: 'To Do', priority: 'Low', updatedDaysAgo: 30 });
  const unassigned = issue('WEB-4', { status: 'To Do', priority: 'Low', assignee: null });
  const blocker = issue('WEB-3', {
    status: 'To Do',
    priority: 'Low',
    links: [{ outwardIssue: { key: 'WEB-9' }, type: { name: 'Blocks' } }],
  });
  const high = issue('WEB-2', { status: 'To Do', priority: 'High' });
  const highest = issue('WEB-1', { status: 'To Do', priority: 'Highest' });
  const done = issue('WEB-6');
  const ranked = findBlockers([stale, unassigned, blocker, high, highest, done], now);
  assert.deepEqual(
    ranked.map((b) => b.key),
    ['WEB-1', 'WEB-2', 'WEB-3', 'WEB-4', 'WEB-5']
  );
  assert.equal(ranked[0].reason, 'Highest priority, still open');
  assert.equal(ranked[4].reason, 'Untouched for over 14 days');
});

test('summarizeIssues counts by status, priority, type', () => {
  const issues = [
    issue('WEB-1'),
    issue('WEB-2', { status: 'In Progress', priority: 'High', type: 'Bug' }),
    issue('WEB-3', { status: 'To Do', priority: 'Low', type: 'Story' }),
  ];
  const s = summarizeIssues(issues);
  assert.equal(s.total, 3);
  assert.deepEqual(s.byStatus, { Done: 1, 'In Progress': 1, 'To Do': 1 });
  assert.deepEqual(s.byPriority, { Medium: 1, High: 1, Low: 1 });
  assert.deepEqual(s.byType, { Task: 1, Bug: 1, Story: 1 });
});

test('pickDefaultVersion prefers latest unreleased with a date', () => {
  const versions = [
    { name: '2.3', released: true, releaseDate: '2026-10-01' },
    { name: '2.4', released: false, releaseDate: '2026-12-01' },
    { name: '2.5', released: false, releaseDate: null },
  ];
  assert.equal(pickDefaultVersion(versions).name, '2.4');
  assert.equal(pickDefaultVersion([]), null);
  assert.equal(
    pickDefaultVersion([{ name: '1.0', released: true }]).name,
    '1.0'
  );
});

test('buildVersionJql escapes quotes in the version name', () => {
  assert.equal(
    buildVersionJql('WEB', '2.4'),
    'project = WEB AND fixVersion = "2.4" ORDER BY priority DESC, updated ASC'
  );
  assert.equal(
    buildVersionJql('WEB', '2."4'),
    'project = WEB AND fixVersion = "2.\\"4" ORDER BY priority DESC, updated ASC'
  );
});
