import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import type { ModeratorAlert, ModeratorMachine } from './AlertFeedPanel';

export interface ResponseTeam {
  id: string;
  name: string;
  crew: string;
  lat: number;
  lng: number;
  dist: number;
  deployed: boolean;
}

export default function ResponseDrawer({
  alert,
  machine,
  teams,
  onClose,
  onResolve,
  onDeployTeam,
}: {
  alert: ModeratorAlert | null;
  machine: ModeratorMachine | null;
  teams: ResponseTeam[];
  onClose: () => void;
  onResolve: (alert: ModeratorAlert) => void;
  onDeployTeam: (teamId: string) => void;
}) {
  const [callState, setCallState] = useState<'ready' | 'calling' | 'confirmed'>('ready');
  const [smsSent, setSmsSent] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const [classified, setClassified] = useState<'false' | 'actual' | null>(null);

  useEffect(() => {
    setCallState('ready');
    setSmsSent(false);
    setClassified(null);
    setSmsBody(
      machine ? `Alert: Anomaly detected at ${machine.area}. Please verify safety immediately.` : '',
    );
  }, [machine]);

  if (!alert || !machine) return null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-console-line bg-console-900">
      <header className="flex items-center justify-between gap-3 border-b border-console-line px-4 py-3">
        <h2 className="truncate font-display text-[13px] font-bold uppercase tracking-[0.14em] text-white">
          Alert — {machine.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close response panel"
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {/* Call device */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Calling Device</p>
          <div className="rounded-xl border border-console-line bg-console-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] text-white/50">
                  {callState === 'confirmed' ? 'Call confirmed' : callState === 'calling' ? 'Calling…' : 'Ready to call'}
                </p>
                <p className="font-mono text-[13px] text-white/85">{machine.phone}</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                isDisabled={callState !== 'ready'}
                onPress={() => setCallState('calling')}
              >
                {callState === 'calling' ? 'Calling…' : 'Call'}
              </Button>
            </div>

            {callState === 'calling' && (
              <div className="mt-3 rounded-lg border border-signal-warn/30 bg-signal-warn/10 p-2.5">
                <p className="text-[11.5px] text-white/70">Is this a false alarm? Confirm with the person at the location.</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="secondary" onPress={() => setCallState('confirmed')}>
                    False alarm
                  </Button>
                  <Button size="sm" variant="danger" onPress={() => setCallState('confirmed')}>
                    Real threat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SMS */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Send SMS</p>
          <div className="rounded-xl border border-console-line bg-console-800 p-3">
            <textarea
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-console-900 p-2.5 text-[12px] text-white/80 outline-none focus:border-brand-400"
            />
            <Button size="sm" variant="primary" fullWidth className="mt-2" onPress={() => setSmsSent(true)}>
              Send SMS
            </Button>
            {smsSent && (
              <p className="mt-2 text-[11.5px] text-signal-ok">SMS sent to {machine.phone}</p>
            )}
          </div>
        </section>

        {/* Classification */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Classification</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={classified === 'false' ? 'secondary' : 'ghost'}
              onPress={() => setClassified('false')}
            >
              False Alert
            </Button>
            <Button
              size="sm"
              variant={classified === 'actual' ? 'danger' : 'ghost'}
              onPress={() => setClassified('actual')}
            >
              Actual Alert
            </Button>
          </div>
        </section>

        {/* Healthcare teams */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Healthcare Teams</p>
          {!teams.length && (
            <p className="rounded-xl border border-console-line bg-console-800 p-3 text-[12px] text-white/40">
              All teams are currently deployed.
            </p>
          )}
          <ul className="space-y-1.5">
            {teams.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-console-line bg-console-800 p-2.5 transition-colors hover:border-brand-400/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] font-semibold text-white/85">{t.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-white/45">{t.dist.toFixed(1)} km</span>
                </div>
                <p className="mt-0.5 truncate text-[10.5px] text-white/40">{t.crew}</p>
                <Button
                  size="sm"
                  variant="primary"
                  fullWidth
                  className="mt-2"
                  onPress={() => onDeployTeam(t.id)}
                >
                  Deploy Team
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="border-t border-console-line p-3">
        <Button variant="secondary" fullWidth onPress={() => onResolve(alert)}>
          Resolve Alert
        </Button>
      </footer>
    </aside>
  );
}
