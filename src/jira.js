/**
 * Jira Cloud REST client for ShipCheck (Forge, runs as the user).
 *
 * Uses only GA Jira REST endpoints — no Preview APIs — so the app installs
 * on any Jira Cloud site with the two read scopes in the manifest:
 *   read:jira-work, read:jira-user
 *
 * All reads run as the chatting user (api.asUser), so results are always
 * permission-filtered to what that user can already see.
 */
import api, { route } from '@forge/api';
import {
  buildVersionJql,
  pickDefaultVersion,
  computeReadiness,
  findBlockers,
  summarizeIssues,
} from './scoring.js';

const ISSUE_FIELDS = [
  'summary',
  'status',
  'priority',
  'assignee',
  'updated',
  'issuetype',
  'fixVersions',
  'issuelinks',
];

async function jiraGet(path) {
  const res = await api.asUser().requestJira(route`${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira GET ${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function jiraSearchJql(jql) {
  // POST /rest/api/3/search/jql is the current Jira Cloud search endpoint
  // (GET /rest/api/3/search with a jql query param is deprecated).
  const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, fields: ISSUE_FIELDS, maxResults: 100 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira search failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** First project (by key) when the caller did not name one. */
export async function resolveProjectKey(projectKey) {
  if (projectKey && String(projectKey).trim()) return String(projectKey).trim().toUpperCase();
  const data = await jiraGet('/rest/api/3/project/search?maxResults=50');
  const first = (data.values || [])[0];
  if (!first) throw new Error('No Jira projects found on this site.');
  return first.key;
}

/** Latest unreleased version by default; exact name match when given. */
export async function resolveVersion(projectKey, versionName) {
  const versions = await jiraGet(`/rest/api/3/project/${projectKey}/versions`);
  if (versionName && String(versionName).trim()) {
    const wanted = String(versionName).trim().toLowerCase();
    const found = (versions || []).find((v) => String(v.name).toLowerCase() === wanted);
    if (!found) {
      throw new Error(
        `Version "${versionName}" not found in project ${projectKey}. Available: ${(versions || []).map((v) => v.name).join(', ') || 'none'}.`
      );
    }
    return found;
  }
  const picked = pickDefaultVersion(versions || []);
  if (!picked) throw new Error(`Project ${projectKey} has no versions yet. Create one first.`);
  return picked;
}

export async function getVersionIssues(projectKey, version) {
  const jql = buildVersionJql(projectKey, version.name);
  const data = await jiraSearchJql(jql);
  return data.issues || [];
}

export async function listVersions(projectKey) {
  const key = await resolveProjectKey(projectKey);
  const versions = await jiraGet(`/rest/api/3/project/${key}/versions`);
  return {
    projectKey: key,
    versions: (versions || []).map((v) => ({
      id: v.id,
      name: v.name,
      released: !!v.released,
      releaseDate: v.releaseDate || null,
    })),
  };
}

export async function getVersionReadinessData(projectKey, versionName, now = new Date()) {
  const key = await resolveProjectKey(projectKey);
  const version = await resolveVersion(key, versionName);
  const issues = await getVersionIssues(key, version);
  const readiness = computeReadiness(issues, now);
  const blockers = findBlockers(issues, now);
  return {
    projectKey: key,
    version: { name: version.name, released: !!version.released, releaseDate: version.releaseDate || null },
    readiness,
    blockers,
    openIssues: issues.filter((i) => i?.fields?.status?.statusCategory?.key !== 'done').map((i) => ({
      key: i.key,
      summary: i?.fields?.summary || '',
      status: i?.fields?.status?.name || 'Unknown',
      priority: i?.fields?.priority?.name || 'None',
      assignee: i?.fields?.assignee?.displayName || null,
    })),
  };
}

export async function getVersionSummaryData(projectKey, versionName) {
  const key = await resolveProjectKey(projectKey);
  const version = await resolveVersion(key, versionName);
  const issues = await getVersionIssues(key, version);
  return {
    projectKey: key,
    version: { name: version.name, released: !!version.released, releaseDate: version.releaseDate || null },
    ...summarizeIssues(issues),
    openIssues: issues.filter((i) => i?.fields?.status?.statusCategory?.key !== 'done').map((i) => ({
      key: i.key,
      summary: i?.fields?.summary || '',
      status: i?.fields?.status?.name || 'Unknown',
      priority: i?.fields?.priority?.name || 'None',
      assignee: i?.fields?.assignee?.displayName || null,
    })),
  };
}
