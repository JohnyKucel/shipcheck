/**
 * Regression test for the 2026-11-13 live bug: Forge's `route` tagged
 * template rejects any interpolated segment containing `/`. The old
 * jiraGet did route`${path}` (whole path interpolated) and every Jira
 * read failed with "Disallowing path manipulation attempt", so the
 * dashboard showed "Could not load data" and no score ever rendered.
 *
 * Rule enforced here: every route`...` in src/jira.js must be a static
 * template, or interpolate ONLY a single path segment (projectKey/key)
 * that can never contain a slash.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raw = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'jira.js'),
  'utf8'
);
// Strip comments first: the explanatory comment above jiraGet mentions the
// forbidden pattern by name, so only executable code is scanned.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('jira.js never interpolates a whole path into route`...`', () => {
  assert.ok(!src.includes('route`${path}`'), 'route`${path}` must never come back');
  assert.ok(!src.includes('route`${'), 'no route template may start with an interpolation');
});

test('every route template interpolates only single-segment identifiers', () => {
  const templates = [...src.matchAll(/route`([^`]*)`/g)].map((m) => m[1]);
  assert.ok(templates.length >= 2, `expected >= 2 route templates, found ${templates.length}`);
  for (const tpl of templates) {
    for (const interp of [...tpl.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1].trim())) {
      assert.ok(
        interp === 'projectKey' || interp === 'key',
        `route template interpolates "${interp}" — only single-segment projectKey/key allowed: ${tpl}`
      );
    }
  }
});
