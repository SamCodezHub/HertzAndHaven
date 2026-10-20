import { Button } from '@heroui/react';
import type { Sensor } from '../../types/domain';

export interface TelemetryReading {
  height: number;
  velocity: number;
  state: string;
  rssi: number;
  heartbeat: string;
}

export interface TelemetrySensor extends Sensor {
  index: number;
  falling: boolean;
  busy: boolean;
  reading: TelemetryReading;
  dispatchLines: string[];
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-[11.5px] text-ink-muted">{label}</span>
      <b className="font-mono text-[12.5px] font-semibold text-ink">{value}</b>
    </span>
  );
}

/** One live mmWave radar node readout. */
export function TelemetryCard({
  sensor,
  selected,
  onSelect,
  onTriggerFall,
}: {
  sensor: TelemetrySensor;
  selected: boolean;
  onSelect: () => void;
  onTriggerFall: () => void;
}) {
  const { reading } = sensor;

  return (
    <article
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onSelect();
      }}
      className={`cursor-pointer rounded-2xl border bg-surface-2 p-4 transition-all ${
        selected ? 'border-brand-400 shadow-[0_10px_30px_rgba(40,53,74,0.12)]' : 'border-line hover:border-brand-300'
      } ${sensor.falling ? 'border-signal-alert bg-signal-alert/[0.06]' : ''}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[13.5px] font-bold text-ink">
            {sensor.room} Sensor #{String(sensor.index).padStart(2, '0')}{' '}
            <span className="font-mono text-[10.5px] font-semibold text-ink-faint">[24GHz mmWave]</span>
          </h4>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {sensor.zone} · placement confidence {sensor.confidence}%
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
            sensor.falling
              ? 'bg-signal-alert/12 text-signal-alert'
              : 'bg-signal-ok/12 text-signal-ok'
          }`}
        >
          <span className={`size-1.5 rounded-full ${sensor.falling ? 'bg-signal-alert' : 'bg-signal-ok'}`} />
          {sensor.falling ? 'FALL DETECTED' : 'ONLINE'}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Metric label="Centroid Height" value={`${reading.height.toFixed(2)} m`} />
        <Metric label="Velocity" value={`${reading.velocity.toFixed(2)} m/s`} />
        <Metric label="State" value={reading.state} />
        <Metric label="RSSI" value={`${reading.rssi} dBm`} />
      </div>

      {sensor.dispatchLines.length > 0 && (
        <div className="mt-3 rounded-lg border border-signal-alert/25 bg-signal-alert/[0.05] p-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-signal-alert">
            !! Emergency protocol active
          </p>
          <ul className="mt-1.5 space-y-1">
            {sensor.dispatchLines.map((line, i) => (
              <li key={i} className="text-[11.5px] leading-snug text-ink-muted">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-ink-faint">{reading.heartbeat}</span>
        <Button
          size="sm"
          variant="outline"
          className="border-signal-alert/35 text-signal-alert hover:bg-signal-alert/10"
          isDisabled={sensor.busy}
          onPress={(e) => {
            e.continuePropagation?.();
            onTriggerFall();
          }}
        >
          Trigger Fall Test
        </Button>
      </footer>
    </article>
  );
}
