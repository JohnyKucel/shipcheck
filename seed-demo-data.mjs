#!/usr/bin/env node
/**
 * Seed demo data for the ShipCheck Codegeist demo (README step 7).
 *
 * Creates project WEB ("Website Redesign"), version 2.4 (unreleased),
 * and 20 issues, then prints the expected ShipCheck score before/after
 * the top blocker is fixed — computed with the SAME scoring code the
 * app ships (src/scoring.js), so the numbers on camera match the code.
 *
 * Seed mix (verified against computeReadiness, 2026-11-13):
 *   18 Done + 1 open Highest (payment bug, assigned to you)
 *            + 1 open High (hero image, unassigned)
 *   BEFORE: 18/20 done = 90 - 10 (Highest) - 4 (High) - 2 (unassigned)
 *           = 74/100, NOT READY (any open Highest forces NOT READY)
 *   AFTER (mark the Highest bug Done): 19/20 = 95 - 4 - 2 = 89/100, READY
 *
 * Why not the old README mix (6 Done of 11)? Its arithmetic was never
 * checked against the code: it scores 37 NOT READY before and 56 CAUTION
 * after — the demo narration (74 -> 90) would have been false on camera.
 * The mix below reproduces the intended 74 -> ~90 arc truthfully.
 *
 * Stale issues: Jira REST cannot backdate `created`/`updated`, so a
 * "stale" issue cannot be seeded by this script. Score above assumes
 * stale = 0. If you want the stale beat, use Jira's CSV import
 * (which accepts a Created date) for one issue, then re-check the score.
 *
 * Issue keys: Jira auto-numbers issues, so the Highest bug will NOT be
 * WEB-118 on a fresh project — this script prints a role -> key mapping
 * at the end. Use THOSE keys in the demo narration, not the placeholders
 * in demo-script.md.
 *
 * Usage:
 *   JIRA_SITE=https://darmih8.atlassian.net \
 *   JIRA_EMAIL=you@example.com JIRA_API_TOKEN=xxxx \
 *   node seed-demo-data.mjs [--dry-run]
 *
 * The API token is created at https://id.atlassian.com/manage-profile/security/api-tokens
 * (needs the Atlassian account login). It is read from the environment
 * only and never printed or stored.
 */

import { computeReadiness } from './src/scoring.js';

const SITE = process.env.JIRA_SITE;
const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_API_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SITE || !EMAIL || !TOKEN) {
  console.error('Missing env: set JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN.');
  console.error('Create a token at https://id.atlassian.com/manage-profile/security/api-tokens');
  process.exit(1);
}

const BASE = SITE.replace(/\/$/, '');
const auth = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
const headers = { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' };

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const msg = json?.errorMessages?.join('; ') || json?.message || text.slice(0, 300);
    throw new Error(`${method} ${path} -> HTTP ${res.status}: ${msg}`);
  }
  return json;
}

// --- Issue plan -----------------------------------------------------------
const DONE_SUMMARIES = [
  'Migrate header to new design system',
  'Update pricing page copy',
  'Add sitemap.xml',
  'Fix broken anchor links on docs pages',
  'Compress hero images',
  'Update robots.txt',
  'Refresh testimonial section',
  'Fix mobile nav overlap',
  'Add alt text to product images',
  'Update footer copyright year',
  'Remove deprecated jQuery plugin',
  'Fix 404 on /careers page',
  'Add favicon variants',
  'Update team page bios',
  'Fix typo on About page',
  'Minify CSS bundle',
  'Add Open Graph tags',
  'Archive old blog posts',
];
const TOP_BLOCKER = { summary: 'Payment fails on checkout retry', type: 'Bug', priority: 'Highest' };
const HIGH_OPEN = { summary: 'Homepage hero image missing on mobile', type: 'Task', priority: 'High' };

async function getTransitions(key) {
  const data = await api(`/rest/api/3/issue/${key}/transitions`);
  return data.transitions || [];
}

async function transitionTo(key, statusName) {
  const transitions = await getTransitions(key);
  const t = transitions.find(
    (x) => x.to?.name?.toLowerCase() === statusName.toLowerCase()
  );
  if (!t) {
    console.warn(`  ! No transition to "${statusName}" for ${key}. Available: ${transitions.map((x) => `${x.name} -> ${x.to?.name}`).join(', ') || 'none'}`);
    return false;
  }
  await api(`/rest/api/3/issue/${key}/transitions`, { method: 'POST', body: { transition: { id: t.id } } });
  return true;
}

async function createIssue(fields) {
  const data = await api('/rest/api/3/issue', { method: 'POST', body: { fields } });
  return data.key;
}

async function main() {
  console.log(`Site: ${BASE}${DRY_RUN ? '  [DRY RUN — no writes]' : ''}`);

  const me = await api('/rest/api/3/myself');
  console.log(`Authenticated as: ${me.displayName} (${me.emailAddress})`);

  // 1. Project WEB
  let project;
  try {
    project = await api('/rest/api/3/project/WEB');
    console.log('Project WEB already exists — reusing it.');
  } catch (e) {
    if (!String(e.message).includes('HTTP 404')) throw e;
    if (DRY_RUN) {
      console.log('[dry-run] Would create project WEB ("Website Redesign", Scrum template).');
      project = { id: 'dry-run', key: 'WEB' };
    } else {
      console.log('Creating project WEB...');
      project = await api('/rest/api/3/project', {
        method: 'POST',
        body: {
          key: 'WEB',
          name: 'Website Redesign',
          projectTypeKey: 'software',
          projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-scrum-template',
          leadAccountId: me.accountId,
        },
      }).catch((err) => {
        throw new Error(
          `Project creation failed: ${err.message}\n` +
          'Create the project manually in Jira (Projects > Create project, key WEB), then re-run this script.'
        );
      });
      console.log(`Project WEB created (id ${project.id}).`);
    }
  }

  // 2. Version 2.4
  const versions = await api(`/rest/api/3/project/${project.key}/versions`);
  let version = (versions || []).find((v) => v.name === '2.4');
  if (!version) {
    if (DRY_RUN) {
      console.log('[dry-run] Would create version 2.4 (unreleased).');
      version = { id: 'dry-run', name: '2.4' };
    } else {
      version = await api('/rest/api/3/version', {
        method: 'POST',
        body: { name: '2.4', projectId: Number(project.id), released: false, description: 'Website Redesign 2.4 — ShipCheck demo version' },
      });
      console.log('Version 2.4 created.');
    }
  } else {
    console.log('Version 2.4 already exists — reusing it.');
  }

  // 3. Existing issues in the version (idempotency check)
  const existing = await api(
    `/rest/api/3/search/jql?jql=${encodeURIComponent('project = WEB AND fixVersion = "2.4"')}&fields=summary,status,priority,assignee,updated&maxResults=100`
  );
  const existingSummaries = new Set((existing.issues || []).map((i) => i.fields.summary));
  console.log(`Found ${(existing.issues || []).length} existing issue(s) in WEB / 2.4.`);

  // 4. Issue types available in the project
  const meta = await api(`/rest/api/3/issue/createmeta?projectKeys=WEB&expand=projects.issuetypes.fields`);
  const types = meta.projects?.[0]?.issuetypes?.map((t) => t.name) || [];
  const pickType = (want) => (types.includes(want) ? want : types[0]);
  console.log(`Issue types in WEB: ${types.join(', ') || '(unknown — using Task/Bug names)'}`);

  const fixVersions = [{ name: '2.4' }];
  const created = [];
  const skip = (summary) => {
    if (existingSummaries.has(summary)) {
      console.log(`  - skip (exists): ${summary}`);
      return true;
    }
    return false;
  };

  // 5. Create the issues
  for (const summary of DONE_SUMMARIES) {
    if (skip(summary)) continue;
    if (DRY_RUN) { console.log(`[dry-run] Would create Done issue: ${summary}`); continue; }
    const key = await createIssue({
      project: { key: 'WEB' },
      summary,
      issuetype: { name: pickType('Task') },
      priority: { name: 'Medium' },
      fixVersions,
    });
    const moved = await transitionTo(key, 'Done');
    console.log(`  + ${key} (Done${moved ? '' : ' — LEFT IN TO DO, transition missing'}): ${summary}`);
    created.push(key);
  }

  let blockerKey = null;
  if (!skip(TOP_BLOCKER.summary)) {
    if (DRY_RUN) console.log('[dry-run] Would create Highest bug (assigned to you): ' + TOP_BLOCKER.summary);
    else {
      blockerKey = await createIssue({
        project: { key: 'WEB' },
        summary: TOP_BLOCKER.summary,
        issuetype: { name: pickType('Bug') },
        priority: { name: 'Highest' },
        assignee: { accountId: me.accountId },
        fixVersions,
      });
      console.log(`  + ${blockerKey} (To Do, Highest, assigned to you): ${TOP_BLOCKER.summary}`);
      created.push(blockerKey);
    }
  } else {
    blockerKey = (existing.issues || []).find((i) => i.fields.summary === TOP_BLOCKER.summary)?.key || null;
  }

  let highKey = null;
  if (!skip(HIGH_OPEN.summary)) {
    if (DRY_RUN) console.log('[dry-run] Would create High issue (unassigned): ' + HIGH_OPEN.summary);
    else {
      highKey = await createIssue({
        project: { key: 'WEB' },
        summary: HIGH_OPEN.summary,
        issuetype: { name: pickType('Task') },
        priority: { name: 'High' },
        fixVersions,
      });
      console.log(`  + ${highKey} (To Do, High, unassigned): ${HIGH_OPEN.summary}`);
      created.push(highKey);
    }
  } else {
    highKey = (existing.issues || []).find((i) => i.fields.summary === HIGH_OPEN.summary)?.key || null;
  }

  if (DRY_RUN) {
    console.log('\nDry run done — no changes made. Re-run without --dry-run to seed.');
    return;
  }

  // 6. Verify: fetch the version's issues and score them with the shipped code
  const after = await api(
    `/rest/api/3/search/jql?jql=${encodeURIComponent('project = WEB AND fixVersion = "2.4"')}&fields=summary,status,priority,assignee,updated,issuelinks&maxResults=100`
  );
  const issues = after.issues || [];
  const before = computeReadiness(issues);
  console.log('\n--- VERIFY (live Jira data, shipped scoring code) ---');
  console.log(`Issues in WEB / 2.4: ${before.breakdown.total} (done ${before.breakdown.done}, open Highest ${before.breakdown.openHighest}, open High ${before.breakdown.openHigh}, unassigned ${before.breakdown.unassigned}, stale ${before.breakdown.stale})`);
  console.log(`BEFORE (as seeded): ${before.score}/100 — ${before.verdict}`);
  for (const d of before.deductions) console.log(`  ${d.label}: ${d.points > 0 ? '+' : ''}${d.points}`);

  if (blockerKey) {
    const fixed = issues.map((i) =>
      i.key === blockerKey
        ? { ...i, fields: { ...i.fields, status: { name: 'Done', statusCategory: { key: 'done' } } } }
        : i
    );
    const afterFix = computeReadiness(fixed);
    console.log(`AFTER (mark ${blockerKey} Done): ${afterFix.score}/100 — ${afterFix.verdict}`);
  }

  console.log('\n--- ROLE -> KEY MAPPING (use these keys in the demo narration) ---');
  console.log(`Top blocker (Highest, payment bug): ${blockerKey || '(not found)'}`);
  console.log(`Open High (hero image, unassigned): ${highKey || '(not found)'}`);
  console.log(`Done issues: ${DONE_SUMMARIES.length} seeded (see above)`);
  console.log('\nDone. Next: README step 8 (record the demo video), then submit on Devpost.');
}

main().catch((e) => {
  console.error('\nFAILED: ' + e.message);
  process.exit(1);
});
