import { Tabs } from '@heroui/react';
import { Pill } from '../primitives';

export interface ModeratorAlert {
  id: string;
  machineId: string;
  machineName: string;
  area: string;
  message: string;
  time: string;
  resolved: boolean;
  severity: 'critical' | 'warning';
}

export interface ModeratorMachine {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  alerted: boolean;
}

export function AlertFeedPanel({
  alerts,
  machines,
  activeTab,
  onTabChange,
  onSelectAlert,
}: {
  alerts: ModeratorAlert[];
  machines: ModeratorMachine[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectAlert: (alert: ModeratorAlert) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-console-900">
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        selectedKey={activeTab}
        onSelectionChange={(key) => onTabChange(String(key))}
      >
        <Tabs.ListContainer className="border-b border-console-line">
          <Tabs.List aria-label="Console sections">
            <Tabs.Tab id="alerts">
              Live Alerts
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="machines">
              Machines
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="alerts" className="min-h-0 flex-1 overflow-y-auto p-3">
          {!alerts.length && (
            <p className="px-2 py-8 text-center text-[12.5px] text-white/40">No alerts yet</p>
          )}
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelectAlert(a)}
                  className="w-full rounded-xl border border-console-line bg-console-800 p-3 text-left transition-colors hover:border-brand-400/50 hover:bg-console-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold text-white">{a.machineName}</span>
                    <Pill tone={a.severity === 'critical' ? 'alert' : 'warn'}>{a.severity.toUpperCase()}</Pill>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-white/55">{a.message}</p>
                  <p className="mt-1 text-[10.5px] text-white/35">{a.time}</p>
                </button>
              </li>
            ))}
          </ul>
        </Tabs.Panel>

        <Tabs.Panel id="machines" className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="space-y-1.5">
            {machines.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2.5 rounded-lg border border-console-line bg-console-800 px-3 py-2"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${m.alerted ? 'bg-signal-alert' : 'bg-signal-info'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-white/85">{m.name}</p>
                  <p className="truncate text-[10.5px] text-white/40">
                    {m.area} · {m.id}
                  </p>
                </div>
                {m.alerted && (
                  <span className="shrink-0 rounded-full bg-signal-alert/20 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-signal-alert">
                    ALERT
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
