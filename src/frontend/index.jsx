/**
 * ShipCheck dashboard — Jira project page (UI Kit 2, @forge/react).
 *
 * Shows the release-readiness report for the selected version: score,
 * verdict, deduction breakdown, and the ranked blocker table. Data comes
 * from the same backend functions the Rovo agent and MCP tools use
 * (src/index.js resolver: listVersions / getReadiness).
 */
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Button,
  DynamicTable,
  Heading,
  Inline,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Text,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

const VERDICT_APPEARANCE = {
  READY: 'success',
  CAUTION: 'inprogress',
  'NOT READY': 'removed',
  'NO DATA': 'default',
};

const App = () => {
  const [context, setContext] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const projectKey =
    context?.extension?.project?.key || context?.project?.key || '';

  useEffect(() => {
    view
      .getContext()
      .then(setContext)
      .catch((e) => {
        setError(String(e?.message || e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!projectKey) return;
    setLoading(true);
    invoke('listVersions', { projectKey })
      .then((res) => {
        if (!res.ok) {
          setError(res.error || 'Could not list versions.');
          return;
        }
        const list = res.versions || [];
        setVersions(list);
        const def = list.find((v) => !v.released) || list[0];
        if (def) setSelected(def.name);
      })
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [projectKey]);

  const loadReadiness = (versionName) => {
    if (!projectKey || !versionName) return;
    setLoading(true);
    invoke('getReadiness', { projectKey, versionName })
      .then((res) => {
        if (!res.ok) {
          setError(res.error || 'Could not load readiness.');
          setReport(null);
          return;
        }
        setError('');
        setReport(res);
      })
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReadiness(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, selected]);

  const readiness = report?.readiness;

  return (
    <Stack space="space.200">
      <Heading size="large">ShipCheck — Release Readiness</Heading>
      <Text>
        Deterministic go / no-go for your next release, from live Jira data.
        Ask the ShipCheck agent in Rovo the same question — it uses this
        exact report.
      </Text>

      {error ? (
        <SectionMessage appearance="warning" title="Could not load data">
          <Text>{error}</Text>
        </SectionMessage>
      ) : null}

      {versions.length > 0 ? (
        <Inline space="space.100">
          {versions.map((v) => (
            <Button
              key={v.id}
              appearance={v.name === selected ? 'primary' : 'default'}
              onClick={() => setSelected(v.name)}
            >
              {v.name}
              {v.released ? ' (released)' : ''}
            </Button>
          ))}
          <Button appearance="subtle" onClick={() => loadReadiness(selected)}>
            Refresh
          </Button>
        </Inline>
      ) : null}

      {loading ? <Spinner size="medium" label="Loading readiness…" /> : null}

      {!loading && readiness && readiness.score !== null ? (
        <Stack space="space.200">
          <Inline space="space.100" alignBlock="center">
            <Heading size="medium">
              {report.version.name}: {readiness.score}/100
            </Heading>
            <Lozenge appearance={VERDICT_APPEARANCE[readiness.verdict] || 'default'}>
              {readiness.verdict}
            </Lozenge>
          </Inline>

          <Stack space="space.050">
            {readiness.deductions.map((d) => (
              <Text key={d.label}>
                {d.label}: {d.points > 0 ? `+${d.points}` : d.points}
              </Text>
            ))}
          </Stack>

          <Heading size="small">
            Blockers ({report.blockers.length})
          </Heading>
          {report.blockers.length === 0 ? (
            <Text>No blockers. Nothing stands between this version and shipping.</Text>
          ) : (
            <DynamicTable
              head={{
                cells: [
                  { key: 'issue', content: 'Issue' },
                  { key: 'reason', content: 'Reason' },
                  { key: 'priority', content: 'Priority' },
                  { key: 'status', content: 'Status' },
                ],
              }}
              rows={report.blockers.map((b) => ({
                key: b.key,
                cells: [
                  { key: 'issue', content: b.key },
                  { key: 'reason', content: b.reason },
                  { key: 'priority', content: b.priority },
                  { key: 'status', content: b.status },
                ],
              }))}
            />
          )}
        </Stack>
      ) : null}

      {!loading && readiness && readiness.score === null ? (
        <SectionMessage appearance="information" title="No data yet">
          <Text>
            Version {report.version.name} has no issues assigned to it, so
            there is nothing to score. Assign issues to this fixVersion first.
          </Text>
        </SectionMessage>
      ) : null}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
