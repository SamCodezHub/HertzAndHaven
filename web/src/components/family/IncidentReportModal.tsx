import { Button } from '@heroui/react';
import type { IncidentLogEntry, Profile } from '../../types/domain';

export default function IncidentReportModal({
  entry,
  profile,
  onClose,
}: {
  entry: IncidentLogEntry | null;
  profile: Profile;
  onClose: () => void;
}) {
  if (!entry) return null;

  const d = entry.dispatch;
  const dt = new Date(entry.timestamp);
  const seniorName = profile.senior?.name || 'Senior';
  const address = profile.residence?.flat || profile.senior?.address || 'Residence';

  const summary: [string, string][] = [
    ['Patient', seniorName],
    ['Location', address],
    ['Sensor', `${entry.sensorId || '--'} — ${entry.sensorRoom || ''}`],
    ['Zone', entry.sensorZone || '—'],
    ['Response Unit', d?.unit || '—'],
    ['Destination', d?.origin || '—'],
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-console-900/80 p-4 backdrop-blur-sm"
      data-theme="dark"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-console-line bg-console-900 shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <header className="border-b border-console-line px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-white">Incident Report</h2>
          <p className="mt-0.5 text-[12px] text-white/50">
            Resolved on {dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} at{' '}
            {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Incident{' '}
            {entry.id}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Summary</p>
          <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {summary.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-console-line bg-console-800 p-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">{k}</dt>
                <dd className="mt-0.5 truncate text-[12.5px] font-medium text-white/85">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            Timeline — what happened and when
          </p>
          <div className="space-y-1">
            {(entry.timeline?.length ? entry.timeline : []).map((e, i) => (
              <div key={i} className="flex gap-3 font-mono text-[11.5px]">
                <span className="shrink-0 text-white/35">[{e.ts}]</span>
                <span
                  className={
                    e.cls === 'alert' ? 'text-signal-alert' : e.cls === 'ok' ? 'text-signal-ok' : e.cls === 'head' ? 'text-brand-300' : 'text-white/60'
                  }
                >
                  {e.text}
                </span>
              </div>
            ))}
            {!entry.timeline?.length && (
              <p className="font-mono text-[11.5px] text-white/40">No timeline captured.</p>
            )}
          </div>
        </div>

        <footer className="border-t border-console-line px-5 py-3">
          <Button variant="secondary" fullWidth onPress={onClose}>
            Close Report
          </Button>
        </footer>
      </div>
    </div>
  );
}
