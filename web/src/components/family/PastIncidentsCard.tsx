import { Table } from '@heroui/react';
import type { IncidentLogEntry } from '../../types/domain';

export function PastIncidentsCard({
  incidents,
  onOpen,
}: {
  incidents: IncidentLogEntry[];
  onOpen: (entry: IncidentLogEntry) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(40,53,74,0.06)]">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-100/70 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M12 2c1.1 0 2 .9 2 2v2h2c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h2V4c0-1.1.9-2 2-2z" />
          </svg>
        </span>
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink">Past Incidents</h3>
      </header>

      {!incidents.length ? (
        <p className="rounded-xl border border-dashed border-line bg-surface-2 p-4 text-[12.5px] text-ink-muted">
          No past incidents yet. Resolved emergencies will appear here.
        </p>
      ) : (
        <Table aria-label="Past incident history" className="text-[12.5px]">
          <Table.ScrollContainer>
            <Table.Content className="min-w-[420px]">
              <Table.Header>
                <Table.Column isRowHeader>Incident</Table.Column>
                <Table.Column>Location</Table.Column>
                <Table.Column>Logged</Table.Column>
                <Table.Column> </Table.Column>
              </Table.Header>
              <Table.Body>
                {incidents.map((entry) => {
                  const dt = new Date(entry.timestamp);
                  return (
                    <Table.Row key={entry.id}>
                      <Table.Cell>
                        <span className="font-mono text-[11px] font-semibold text-ink">{entry.id}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-ink-muted">
                          {entry.sensorRoom}
                          {entry.sensorZone ? ` · ${entry.sensorZone}` : ''}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-ink-muted">
                          {dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}{' '}
                          {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <button
                          type="button"
                          onClick={() => onOpen(entry)}
                          className="text-[12px] font-semibold text-brand-600 hover:text-brand-700"
                        >
                          View →
                        </button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </section>
  );
}
