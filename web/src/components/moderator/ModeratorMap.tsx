import { useEffect, useRef, useState } from 'react';
import { BANGALORE_CENTER } from '../../lib/dispatchData';

export interface MapMachine {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  alerted: boolean;
}

export interface MapHospital {
  id: string;
  name: string;
  addr: string;
  lat: number;
  lng: number;
}

export interface MapTeam {
  id: string;
  name: string;
  crew: string;
  lat: number;
  lng: number;
  deployed: boolean;
}

const MAP_LEGEND = [
  { label: 'Sensor Device', className: 'ld-machine' },
  { label: 'Active Alert', className: 'ld-alert' },
  { label: 'Healthcare Team', className: 'ld-team' },
  { label: 'Team Deployed', className: 'ld-team-active' },
  { label: 'Hospital', className: 'ld-hospital' },
];

/**
 * Leaflet command map for the moderator console.
 * Markers are declarative — the parent owns alert/team state and this
 * component mirrors it onto the map.
 */
export default function ModeratorMap({
  machines,
  hospitals,
  teams,
  onMachineClick,
  focusMachineId,
}: {
  machines: MapMachine[];
  hospitals: MapHospital[];
  teams: MapTeam[];
  onMachineClick: (machine: MapMachine) => void;
  focusMachineId: string | null;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const teamMarkersRef = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);

  // Boot Leaflet once
  useEffect(() => {
    if (!mapEl.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapEl.current, { center: BANGALORE_CENTER, zoom: 13, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    setReady(true);

    const resize = () => map.invalidateSize();
    window.setTimeout(resize, 120);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Machine + hospital markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    machines.forEach((m) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="${m.alerted ? 'marker-alert' : 'marker-normal'}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindTooltip(
          `<div class="mod-tip"><b>${m.name}</b><span>${m.area} · ${m.id}</span></div>`,
          { className: 'mod-tooltip', direction: 'top', offset: [0, -8] },
        )
        .on('click', () => onMachineClick(m))
        .addTo(mapRef.current);
      markersRef.current.set(m.id, marker);
    });

    hospitals.forEach((h) => {
      const icon = L.divIcon({
        className: '',
        html: '<div class="marker-hospital"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([h.lat, h.lng], { icon })
        .bindTooltip(`<div class="mod-tip"><b>${h.name}</b><span>${h.addr}</span></div>`, {
          className: 'mod-tooltip',
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(mapRef.current);
    });
  }, [ready, machines, hospitals, onMachineClick]);

  // Team markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;

    teamMarkersRef.current.forEach((m) => m.remove());
    teamMarkersRef.current.clear();

    teams.forEach((t) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="${t.deployed ? 'marker-team-active' : 'marker-team'}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const marker = L.marker([t.lat, t.lng], { icon })
        .bindTooltip(`<div class="mod-tip"><b>${t.name}</b><span>${t.crew}</span></div>`, {
          className: 'mod-tooltip',
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(mapRef.current);
      teamMarkersRef.current.set(t.id, marker);
    });
  }, [ready, teams]);

  // Fly to a focused machine
  useEffect(() => {
    if (!ready || !focusMachineId) return;
    const marker = markersRef.current.get(focusMachineId);
    const machine = machines.find((m) => m.id === focusMachineId);
    if (marker && machine) {
      mapRef.current.flyTo([machine.lat, machine.lng], 15, { duration: 0.9 });
    }
  }, [ready, focusMachineId, machines]);

  return (
    <div className="relative h-full w-full bg-console-800">
      <div ref={mapEl} className="absolute inset-0" />

      {/* Map key legend */}
      <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-white/10 bg-console-900/90 p-3 backdrop-blur">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Map Key</p>
        <ul className="space-y-1.5">
          {MAP_LEGEND.map((l) => (
            <li key={l.label} className="flex items-center gap-2 text-[11px] text-white/70">
              <span className={`${l.className} size-2.5`} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
