/**
 * ShipCheck backend: Rovo agent actions + MCP tools + dashboard resolver.
 *
 * The three actions below are shared by BOTH the rovo:agent module and the
 * rovo:mcp module (same action keys in the manifest), so one codebase serves
 * Rovo chat and third-party MCP clients (Claude Code, Cursor, …).
 *
 * All actions are GET (read-only). They never create, update, or delete
 * anything — agents triggered by automation rules will still call them.
 */
import ResolverModule from '@forge/resolver';
// Defensive: the Forge bundler resolves the default export to the Resolver
// class, while plain node (outside the Forge runtime) exposes the CJS
// module object { default: Resolver }. Both shapes resolve to the class.
const Resolver = ResolverModule?.default ?? ResolverModule;
import {
  getVersionReadinessData,
  getVersionSummaryData,
  listVersions,
} from './jira.js';

function inputs(payload) {
  // Action handlers receive inputs at the top level of the payload.
  // Be defensive: also look one level down (payload.input) just in case.
  const src = payload || {};
  return {
    projectKey: src.projectKey ?? src.input?.projectKey ?? '',
    versionName: src.versionName ?? src.input?.versionName ?? '',
  };
}

function toErrorResult(error) {
  return {
    ok: false,
    error: String(error?.message || error),
    hint: 'If a version or project name was given, check the spelling. If nothing was given, the site may have no projects or versions yet.',
  };
}

export async function getVersionReadiness(payload) {
  try {
    const { projectKey, versionName } = inputs(payload);
    const data = await getVersionReadinessData(projectKey, versionName);
    return { ok: true, ...data };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listBlockers(payload) {
  try {
    const { projectKey, versionName } = inputs(payload);
    const data = await getVersionReadinessData(projectKey, versionName);
    return {
      ok: true,
      projectKey: data.projectKey,
      version: data.version,
      readiness: data.readiness,
      blockerCount: data.blockers.length,
      blockers: data.blockers,
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getVersionSummary(payload) {
  try {
    const { projectKey, versionName } = inputs(payload);
    const data = await getVersionSummaryData(projectKey, versionName);
    return { ok: true, ...data };
  } catch (error) {
    return toErrorResult(error);
  }
}

// --- Jira project page (UI Kit dashboard) ---------------------------------
const resolver = new Resolver();

resolver.define('listVersions', async ({ payload }) => {
  try {
    return { ok: true, ...(await listVersions(payload?.projectKey || '')) };
  } catch (error) {
    return toErrorResult(error);
  }
});

resolver.define('getReadiness', async ({ payload }) => {
  try {
    const data = await getVersionReadinessData(payload?.projectKey || '', payload?.versionName || '');
    return { ok: true, ...data };
  } catch (error) {
    return toErrorResult(error);
  }
});

export const dashboardResolver = resolver.getDefinitions();
