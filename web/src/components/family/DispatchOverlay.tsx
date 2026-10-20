import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import type { AuditEntry, DispatchHospital, DispatchTeam, EmergencyPhase } from '../../types/domain';

export const PHASES: { key: EmergencyPhase; label: string }[] = [
  { key: 'fall', label: 'Fall' },
  { key: 'calling', label: '112 Call' },
  { key: 'dispatching', label: 'Dispatch' },
  { key: 'en_route', label: 'En Route' },
  { key: 'arriving', label: 'Arrival' },
];

export const SIM_SPEEDS = [1, 2, 5, 10, 15];

/**
 * Full-screen emergency dispatch console: live map, transport telemetry,
 * phase tracker and the incident audit log.
 */
export default function DispatchOverlay({
  open,
  phase,
  audit,
  hospitals,
  teams,
  address,
  home,
  statusPill,
  transport,
  feed,
  otp,
  simSpeed,
  onSimSpeed,
  onConfirm,
  onClose,
  onTeamSelect,
}: {
  open: boolean;
  phase: EmergencyPhase;
  audit: AuditEntry[];
  hospitals: DispatchHospital[];
  teams: DispatchTeam[];
  address: string;
  home: { lat: number; lng: number };
  statusPill: string;
  transport: { phase: string; eta: string; detail: string; progress: number };
  feed: string[];
  otp: string;
  simSpeed: number;
  onSimSpeed: (v: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  onTeamSelect: (id: string) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const activePhaseIndex = Math.max(0, PHASES.findIndex((p) => p.key === phase));

  // Leaflet setup
  useEffect(() => {
    if (!open || !mapEl.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapEl.current, { center: [home.lat, home.lng], zoom: 13, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    setMapReady(true);

    const resize = () => map.invalidateSize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [open, home.lat, home.lng]);

  // Markers
  useEffect(() => {
    if (!mapReady || !layerRef.current) return;
    const L = (window as any).L;
    layerRef.current.clearLayers();

    hospitals.forEach((h) => {
      L.marker([h.lat, h.lng], {
        icon: L.divIcon({ className: '', html: '<div class="hp-marker"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
      })
        .bindTooltip(`<div class="hp-tip"><b>${h.name}</b><span>${h.addr}</span></div>`, {
          className: 'hp-tooltip',
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(layerRef.current);
    });

    teams.forEach((t) => {
      L.marker([t.lat, t.lng], {
        icon: L.divIcon({ className: '', html: '<div class="team-marker"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
      })
        .bindTooltip(`<div class="hp-tip"><b>${t.name}</b><span>${t.crew}</span></div>`, {
          className: 'hp-tooltip',
          direction: 'top',
          offset: [0, -8],
        })
        .on('click', () => onTeamSelect(t.id))
        .addTo(layerRef.current);
    });

    L.marker([home.lat, home.lng], {
      icon: L.divIcon({ className: '', html: '<div class="home-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    })
      .bindTooltip('<div class="hp-tip"><b>Patient residence</b><span>Incident origin</span></div>', {
        className: 'hp-tooltip',
        direction: 'top',
        offset: [0, -10],
      })
      .addTo(layerRef.current);
  }, [mapReady, hospitals, teams, home.lat, home.lng, onTeamSelect]);

  const auditBody = useMemo(
    () =>
      audit.map((e, i) => (
        <div key={i} className="audit-line" data-tone={e.cls || undefined}>
          <span className="audit-ts">[{e.ts}]</span>
          {e.text}
        </div>
      )),
    [audit],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-console-900/85 p-4 backdrop-blur-sm"
      data-theme="dark"
    >
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-console-line bg-console-900 shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-console-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.16em] text-white">
              Active Emergency Dispatch
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-white/50">Real-time ambulance tracking — {address}</p>
          </div>
          <span className="rounded-full border border-signal-alert/40 bg-signal-alert/15 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-signal-alert">
            {statusPill}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dispatch map"
            className="grid size-8 place-items-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
          <div className="relative min-h-[320px] bg-console-800">
            <div ref={mapEl} className="absolute inset-0" />
            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-white/10 bg-console-900/85 p-3 backdrop-blur">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Map Key</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-[11px] text-white/70">
                  <span className="size-2.5 rounded-full bg-signal-info" /> Sensor Device
                </li>
                <li className="flex items-center gap-2 text-[11px] text-white/70">
                  <span className="size-2.5 rounded-full bg-signal-alert" /> Active Alert
                </li>
                <li className="flex items-center gap-2 text-[11px] text-white/70">
                  <span className="size-2.5 rounded-full bg-brand-400" /> Healthcare Team
                </li>
                <li className="flex items-center gap-2 text-[11px] text-white/70">
                  <span className="size-2.5 rounded-full bg-signal-warn" /> Team Deployed
                </li>
                <li className="flex items-center gap-2 text-[11px] text-white/70">
                  <span className="size-2.5 rotate-45 bg-white/80" /> Hospital
                </li>
              </ul>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-console-line p-4">
            {/* Transport */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Transport Status</p>
              <div className="rounded-xl border border-console-line bg-console-800 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] font-semibold text-white">{transport.phase}</span>
                  <span className="font-mono text-[12px] font-bold text-brand-300">ETA: {transport.eta}</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-[width] duration-500"
                    style={{ width: `${Math.round(transport.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11.5px] text-white/50">{transport.detail}</p>
              </div>
            </div>

            {/* Simulation speed */}
            <div className="rounded-xl border border-console-line bg-console-800 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-300">
                  Simulation
                </span>
                <span className="font-mono text-[10.5px] font-bold tracking-wider text-white/50">
                  SIM SPEED: {simSpeed}x
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {SIM_SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSimSpeed(s)}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                      simSpeed === s
                        ? 'border-brand-400 bg-brand-400/20 text-brand-300'
                        : 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-snug text-white/35">
                Speed-up only affects the <strong className="text-white/60">simulation playback</strong> of the ambulance
                ETA. Real emergency response is unaffected.
              </p>
            </div>

            {/* OTP */}
            <div className="rounded-xl border border-brand-400/30 bg-brand-400/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-300">Digital Lockbox OTP</p>
              <p className="mt-1 font-mono text-[28px] font-bold tracking-[0.25em] text-white">{otp}</p>
            </div>

            {/* Nearby hospitals */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Nearby Hospitals</p>
              <ul className="space-y-1.5">
                {hospitals.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2.5 rounded-lg border border-console-line bg-console-800 px-2.5 py-2"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/10 text-[11px] font-bold text-white/70">
                      H
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">{h.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Response teams */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Response Teams</p>
              <ul className="space-y-1.5">
                {teams.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2.5 rounded-lg border border-console-line bg-console-800 px-2.5 py-2"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-400/20 text-[11px] font-bold text-brand-300">
                      {t.name[0]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">{t.name}</span>
                    <span className="shrink-0 rounded-full bg-signal-ok/15 px-2 py-0.5 text-[10px] font-semibold text-signal-ok">
                      Ready
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Live feed */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Live Feed</p>
              <ul className="space-y-1 rounded-xl border border-console-line bg-console-800 p-2.5">
                {feed.map((f, i) => (
                  <li key={i} className="text-[11.5px] leading-snug text-white/60">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Phase tracker */}
        <div className="flex flex-wrap items-center gap-2 border-t border-console-line px-5 py-3">
          {PHASES.map((p, i) => {
            const state = i < activePhaseIndex ? 'done' : i === activePhaseIndex ? 'active' : '';
            return (
              <div key={p.key} className={`dp-step ${state}`}>
                <span className="dp-dot" />
                {p.label}
              </div>
            );
          })}
        </div>

        {/* Audit log */}
        <div className="max-h-[150px] overflow-y-auto border-t border-console-line px-5 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            Incident Timeline &amp; Audit Log
          </p>
          <div className="space-y-1 font-mono text-[11.5px]">{auditBody}</div>
        </div>

        {/* Confirm */}
        <div className="border-t border-console-line px-5 py-3">
          <Button variant="primary" fullWidth onPress={onConfirm}>
            Confirm Ambulance Arrival &amp; Medical Handoff
          </Button>
        </div>
      </div>
    </div>
  );
}
