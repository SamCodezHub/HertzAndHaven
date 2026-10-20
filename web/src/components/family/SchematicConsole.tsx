import { Tooltip } from '@heroui/react';
import type { Sensor } from '../../types/domain';

const RISK_TONE: Record<string, { box: string; pin: string; ring: string }> = {
  critical: { box: 'border-signal-alert/60 bg-signal-alert/12', pin: 'bg-signal-alert', ring: 'ring-signal-alert/40' },
  high: { box: 'border-signal-warn/60 bg-signal-warn/12', pin: 'bg-signal-warn', ring: 'ring-signal-warn/40' },
  medium: { box: 'border-signal-info/55 bg-signal-info/12', pin: 'bg-signal-info', ring: 'ring-signal-info/40' },
  low: { box: 'border-ink-faint/50 bg-ink-faint/10', pin: 'bg-ink-faint', ring: 'ring-ink-faint/40' },
};

const LEGEND = [
  { label: 'Critical zone', color: '#ff5d73' },
  { label: 'High risk', color: '#ffb454' },
  { label: 'Medium risk', color: '#4cd7c4' },
  { label: 'Watch list', color: '#8f9bb3' },
];

/**
 * Dark "console" schematic card: renders the uploaded floor plan with
 * risk-zone overlays, numbered sensor pins and a live HUD readout.
 */
export default function SchematicConsole({
  schematic,
  sensors,
  selectedId,
  onSelect,
  fallingIds,
  hudText,
}: {
  schematic: { name: string; dataUrl: string } | null;
  sensors: Sensor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fallingIds: Set<string>;
  hudText: string;
}) {
  if (!sensors.length) {
    return (
      <div className="rounded-2xl border border-console-line bg-console-900 p-6 text-console-400">
        <p className="text-sm">NO SCHEMATIC ON FILE</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-console-line bg-console-900 p-5 shadow-[0_18px_50px_rgba(16,19,26,0.45)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-white/10 text-white">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
          </svg>
        </span>
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-white">
          Interactive Home Schematic
        </h3>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-console-line bg-console-800">
        {schematic?.dataUrl && (
          <img
            src={schematic.dataUrl}
            alt="Home floor plan schematic"
            className="block w-full select-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* Risk zone overlays */}
        {sensors.map((s) => {
          const tone = RISK_TONE[s.risk] ?? RISK_TONE.medium;
          return (
            <div
              key={`zone-${s.id}`}
              className={`pointer-events-none absolute rounded-[3px] border border-dashed ${tone.box}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}
            />
          );
        })}

        {/* Sensor pins */}
        {sensors.map((s, i) => {
          const tone = RISK_TONE[s.risk] ?? RISK_TONE.medium;
          const isFalling = fallingIds.has(s.id);
          const isSelected = selectedId === s.id;
          return (
            <Tooltip key={`pin-${s.id}`} delay={120}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-label={`Sensor ${i + 1} — ${s.room}, ${s.zone}`}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-full text-[11px] font-bold text-white shadow-lg ring-2 transition-transform ${tone.pin} ${
                  tone.ring
                } ${isSelected ? 'scale-110 ring-4' : ''} ${isFalling ? 'animate-ping' : 'hover:scale-110'}`}
                style={{ left: `${s.px}%`, top: `${s.py}%` }}
              >
                {i + 1}
              </button>
              <Tooltip.Content>
                <p className="text-xs font-semibold">Sensor #{i + 1}</p>
                <p className="text-xs opacity-70">
                  {s.room} · {s.zone} · {s.confidence}% confidence
                </p>
              </Tooltip.Content>
            </Tooltip>
          );
        })}

        {/* Live HUD */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-white/85">{hudText}</span>
        </div>
      </div>

      {/* Risk legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-2 text-[11.5px] text-white/55">
            <span className="size-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-[11.5px] text-white/40">Click a pin to inspect its sensor</span>
      </div>
    </div>
  );
}
