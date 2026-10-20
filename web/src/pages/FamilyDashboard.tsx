import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Skeleton } from '@heroui/react';
import { useSession } from '../hooks/useSession';
import { electronAPI } from '../lib/api';
import {
  AMBULANCE_UNIT,
  DISPATCH_HOSPITALS,
  DISPATCH_ORIGIN,
  DISPATCH_TEAMS,
  FEED_MESSAGES,
  HOME_SITE,
  fillTemplate,
  pickRandom,
} from '../lib/dispatchData';
import { haversine } from '../lib/geo';
import type { AuditEntry, EmergencyPhase, IncidentLogEntry } from '../types/domain';
import SchematicConsole from '../components/family/SchematicConsole';
import { TelemetryCard, type TelemetrySensor } from '../components/family/TelemetryCard';
import {
  EmergencyContactsCard,
  HardwareStatusCard,
  NotificationPreferencesCard,
  SeniorProfileCard,
} from '../components/family/ManagementCards';
import { PastIncidentsCard } from '../components/family/PastIncidentsCard';
import DispatchOverlay from '../components/family/DispatchOverlay';
import IncidentReportModal from '../components/family/IncidentReportModal';
import { Pill } from '../components/primitives';

const INCIDENT_LOG_KEY = 'eap_incident_log';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(name: string) {
  return String(name || '').split(/\s+/)[0] || '';
}

function initials(name: string) {
  return (
    String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?'
  );
}

export default function FamilyDashboard() {
  const { status, user, profile, session, refresh, signOut } = useSession({ requireOnboarding: true });

  const [telemetry, setTelemetry] = useState<TelemetrySensor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fallingIds, setFallingIds] = useState<Set<string>>(new Set());
  const [dispatchLines, setDispatchLines] = useState<Record<string, string[]>>({});
  const [otpSecondsLeft, setOtpSecondsLeft] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<IncidentLogEntry[]>([]);
  const [reportEntry, setReportEntry] = useState<IncidentLogEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Emergency dispatch state
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [phase, setPhase] = useState<EmergencyPhase>('idle');
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [statusPill, setStatusPill] = useState('DISPATCHING…');
  const [transport, setTransport] = useState({ phase: 'Dispatching…', eta: '--', detail: 'Waiting for deployment…', progress: 0 });
  const [feed, setFeed] = useState<string[]>([]);
  const [dispatchOtp, setDispatchOtp] = useState('0000');
  const [simSpeed, setSimSpeed] = useState(1);

  const timers = useRef<number[]>([]);
  const fallTimers = useRef<number[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Derived telemetry                                                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!profile) return;
    const sensors = profile.onboarding?.sensors ?? [];
    setTelemetry(
      sensors.map((s, i) => ({
        ...s,
        index: i + 1,
        falling: false,
        busy: false,
        reading: {
          height: s.baseHeight,
          velocity: 0.02,
          state: 'Stationary',
          rssi: -54 - Math.floor(Math.random() * 10),
          heartbeat: 'Last heartbeat: just now',
        },
        dispatchLines: [],
      })),
    );
  }, [profile]);

  /* ---------------------------------------------------------------------- */
  /* Incident log                                                            */
  /* ---------------------------------------------------------------------- */
  const loadIncidents = useCallback(() => {
    try {
      const raw = localStorage.getItem(INCIDENT_LOG_KEY);
      const list = raw ? (JSON.parse(raw) as IncidentLogEntry[]) : [];
      setIncidents([...list].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
    } catch {
      setIncidents([]);
    }
  }, []);

  useEffect(loadIncidents, [loadIncidents]);

  /* ---------------------------------------------------------------------- */
  /* OTP countdown                                                           */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!profile) return;
    const tick = () => {
      const until = profile.hardware?.smartLock?.otpValidUntil;
      if (!until) {
        setOtpSecondsLeft(null);
        return;
      }
      const remain = Math.ceil((new Date(until).getTime() - Date.now()) / 1000);
      setOtpSecondsLeft(Math.max(0, remain));
      if (remain <= 0) void refresh();
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => window.clearInterval(iv);
  }, [profile, refresh]);

  /* ---------------------------------------------------------------------- */
  /* Profile persistence helpers                                             */
  /* ---------------------------------------------------------------------- */
  const persist = useCallback(
    async (patch: Record<string, unknown>, successMsg?: string) => {
      try {
        const res = await electronAPI.updateProfile(patch);
        if (res?.success) {
          await refresh();
          if (successMsg) showToast(successMsg);
        } else {
          showToast(res?.message || 'Could not save changes.');
        }
      } catch {
        showToast('Could not save changes.');
      }
    },
    [refresh, showToast],
  );

  const prefTimer = useRef<number | null>(null);
  const handlePrefChange = useCallback(
    (patch: Record<string, boolean>) => {
      if (prefTimer.current) window.clearTimeout(prefTimer.current);
      prefTimer.current = window.setTimeout(() => {
        void persist({ notificationPreferences: patch }, 'Notification preferences saved');
      }, 350);
    },
    [persist],
  );

  /* ---------------------------------------------------------------------- */
  /* Emergency protocol                                                      */
  /* ---------------------------------------------------------------------- */
  const emAudit = useCallback((text: string, cls: AuditEntry['cls'] = '') => {
    const now = new Date();
    const ts = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    setAudit((prev) => [...prev, { ts, text, cls }]);
  }, []);

  const runEmergencyPhase = useCallback(
    (sensorId: string, sensorRoom: string, sensorZone: string) => {
      const seniorName = profile?.senior?.name ?? 'the senior';
      setPhase('calling');
      emAudit(`Fall event detected by ${sensorId} (${sensorRoom} / ${sensorZone})`, 'alert');
      emAudit('Centroid height dropped to 0.18 m — motion signature: FALL', 'alert');

      const lines: string[] = [];
      const push = (line: string) => {
        lines.push(line);
        setDispatchLines((prev) => ({ ...prev, [sensorId]: [...lines] }));
      };
      push('!! FALL DETECTED — EMERGENCY PROTOCOL ACTIVE');

      schedule(() => {
        push('Initiating 112 emergency call…');
        emAudit('Initiating 112 emergency call', 'head');
      }, 1000);
      schedule(() => {
        push(`Senior verified: ${seniorName} — Location: Flat 402`);
        emAudit(`Senior verified: ${seniorName} via ambient sensor confirmation`);
      }, 2000);
      schedule(() => {
        push('Emergency services responding…');
        emAudit('Emergency services responding — dispatch accepted', 'head');
      }, 3200);

      setPhase('dispatching');
      schedule(() => {
        push('Push notification delivered → Rishabh Sharma (app)');
        emAudit('Push notification delivered → Rishabh Sharma');
      }, 3800);
      schedule(() => {
        push('SMS fallback queued → +91 98450 40240');
        emAudit('SMS fallback queued → +91 98450 40240');
      }, 4400);
      schedule(() => {
        push('Voice call ringing caregiver…');
        emAudit('Voice call initiated to primary caregiver');
      }, 5000);
      schedule(() => {
        push(`${AMBULANCE_UNIT} dispatched — ETA 5 min`);
        emAudit(`${AMBULANCE_UNIT} dispatched from Manipal Hospital`, 'head');
      }, 5800);

      setPhase('en_route');
      schedule(() => {
        setStatusPill('AMBULANCE EN ROUTE');
        setDispatchOpen(true);
        emAudit('Dispatch map activated — live tracking enabled');
        emAudit('Digital lockbox OTP generated (valid for paramedic entry)');
      }, 6500);
    },
    [emAudit, profile, schedule],
  );

  const triggerFall = useCallback(
    (sensorId: string) => {
      const sensor = telemetry.find((t) => t.id === sensorId);
      if (!sensor || sensor.busy) return;

      setFallingIds((prev) => new Set(prev).add(sensorId));
      setTelemetry((prev) =>
        prev.map((t) =>
          t.id === sensorId
            ? {
                ...t,
                busy: true,
                falling: true,
                reading: { ...t.reading, velocity: 1.62, state: 'FALL MOTION SIGNATURE' },
              }
            : t,
        ),
      );

      // Centroid height drop animation
      const fromH = sensor.baseHeight;
      const targetH = 0.18;
      const t0 = Date.now();
      const iv = window.setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / 900);
        setTelemetry((prev) =>
          prev.map((t) =>
            t.id === sensorId
              ? {
                  ...t,
                  reading: {
                    ...t.reading,
                    height: fromH - (fromH - targetH) * p,
                    velocity: 1.65 * (1 - p),
                    state: 'FALL MOTION SIGNATURE',
                  },
                }
              : t,
          ),
        );
        if (p >= 1) window.clearInterval(iv);
      }, 60);
      fallTimers.current.push(iv);

      schedule(() => runEmergencyPhase(sensorId, sensor.room, sensor.zone), 1000);
    },
    [telemetry, schedule, runEmergencyPhase],
  );

  const resolveEmergency = useCallback(
    (sensorId: string) => {
      const sensor = telemetry.find((t) => t.id === sensorId);
      emAudit('Ambulance arrival confirmed by caregiver', 'ok');
      emAudit('Medical handoff completed — patient stabilized', 'ok');
      emAudit('Incident closed — all systems restored to MONITORING', 'ok');
      setStatusPill('RESOLVED');

      const entry: IncidentLogEntry = {
        id: `EVT-${Date.now()}`,
        sensorId,
        sensorRoom: sensor?.room ?? '',
        sensorZone: sensor?.zone ?? '',
        timestamp: new Date().toISOString(),
        timeline: audit,
        dispatch: {
          unit: AMBULANCE_UNIT,
          paramedic: 'Ravi K.',
          origin: DISPATCH_ORIGIN,
          destination: profile?.senior?.address || 'Senior Residence',
          otpUsed: dispatchOtp,
          distance: '3.2 km',
          eta: '5 min',
        },
      };

      try {
        const raw = localStorage.getItem(INCIDENT_LOG_KEY);
        const list = raw ? (JSON.parse(raw) as IncidentLogEntry[]) : [];
        list.push(entry);
        localStorage.setItem(INCIDENT_LOG_KEY, JSON.stringify(list));
        loadIncidents();
        emAudit(`Incident log saved to local audit store (${list.length} total)`);
      } catch {
        /* storage unavailable — the in-memory list still renders */
      }

      schedule(() => {
        setDispatchOpen(false);
        setReportEntry(entry);
        setPhase('idle');
        clearTimers();
        setFallingIds((prev) => {
          const next = new Set(prev);
          next.delete(sensorId);
          return next;
        });
        setDispatchLines((prev) => {
          const next = { ...prev };
          delete next[sensorId];
          return next;
        });
        setTelemetry((prev) =>
          prev.map((t) =>
            t.id === sensorId
              ? {
                  ...t,
                  busy: false,
                  falling: false,
                  reading: {
                    ...t.reading,
                    height: t.baseHeight,
                    velocity: 0.02,
                    state: 'Stationary',
                  },
                }
              : t,
          ),
        );
      }, 1500);
    },
    [audit, clearTimers, dispatchOtp, emAudit, loadIncidents, profile, schedule, telemetry],
  );

  const dismissDispatch = useCallback(() => {
    clearTimers();
    setDispatchOpen(false);
    setPhase('idle');
    setAudit([]);
    setFeed([]);
    setFallingIds(new Set());
    setDispatchLines({});
    setTelemetry((prev) =>
      prev.map((t) => ({
        ...t,
        busy: false,
        falling: false,
        reading: { ...t.reading, height: t.baseHeight, velocity: 0.02, state: 'Stationary' },
      })),
    );
  }, [clearTimers]);

  /* Transport simulation */
  useEffect(() => {
    if (!dispatchOpen) return;
    const iv = window.setInterval(() => {
      setTransport((prev) => {
        const next = Math.min(1, prev.progress + 0.02 * simSpeed);
        const phaseText = next < 0.25 ? 'Dispatching…' : next < 0.55 ? 'En route to patient' : next < 0.8 ? 'Patient loaded' : 'Arriving at hospital';
        return {
          phase: phaseText,
          eta: `${Math.max(1, Math.round((1 - next) * 5))} min`,
          detail: next < 0.55 ? 'Ambulance navigating to residence…' : 'Patient secured, transporting to hospital…',
          progress: next,
        };
      });
    }, 900);
    return () => window.clearInterval(iv);
  }, [dispatchOpen, simSpeed]);

  /* Live feed */
  useEffect(() => {
    if (!dispatchOpen) return;
    const iv = window.setInterval(() => {
      setFeed((prev) => {
        const cat = transport.progress < 0.25 ? 'approaching' : transport.progress < 0.55 ? 'traffic' : transport.progress < 0.8 ? 'transporting' : 'arriving';
        const line = fillTemplate(pickRandom(FEED_MESSAGES[cat]), { hospital: 'Manipal Hospital', eta: 5, dist: '3.2' });
        return [...prev.slice(-6), line];
      });
    }, 2600);
    return () => window.clearInterval(iv);
  }, [dispatchOpen, transport.progress]);

  useEffect(() => {
    if (dispatchOpen) {
      setDispatchOtp(String(Math.floor(1000 + Math.random() * 9000)));
      setTransport({ phase: 'Dispatching…', eta: '--', detail: 'Waiting for deployment…', progress: 0 });
    }
  }, [dispatchOpen]);

  /* Cleanup */
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      fallTimers.current.forEach((t) => window.clearInterval(t));
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */
  const sensors = profile?.onboarding?.sensors ?? [];
  const schematic = profile?.onboarding?.schematic ?? null;
  const address = profile?.senior?.address || 'Home address not set yet.';
  const seniorFirst = firstName(profile?.senior?.name ?? '') || 'your parent';

  const sortedHospitals = useMemo(() => {
    const home = HOME_SITE;
    return [...DISPATCH_HOSPITALS].sort(
      (a, b) => haversine(home.lat, home.lng, a.lat, a.lng) - haversine(home.lat, home.lng, b.lat, b.lng),
    );
  }, []);

  if (status === 'loading' || !profile || !user) {
    return (
      <div className="pg-family min-h-screen bg-canvas p-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pg-family min-h-screen bg-canvas">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between gap-4 border-b border-line bg-surface/90 px-5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Hertz and Haven logo" className="h-9 w-auto object-contain" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">// Family Gateway</p>
            <p className="truncate font-display text-[13.5px] font-bold text-ink">
              The Hertz and Haven Company — Family Gateway
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Pill tone={session?.remember ? 'info' : 'neutral'} dot>
            {session?.remember ? 'Auto sign-in active' : 'Session only'}
          </Pill>
          <div className="flex items-center gap-2 rounded-full border border-line bg-canvas py-1 pl-1 pr-3.5">
            <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
              {initials(user.name)}
            </span>
            <span className="text-[12.5px] font-semibold text-ink">{user.name || 'Caregiver'}</span>
          </div>
          <Button size="sm" variant="danger" onPress={() => void signOut()}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-10 pt-6">
        {/* Hero */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-bold text-ink">
              {greeting()}, {firstName(user.name) || 'Caregiver'} — watching over {seniorFirst}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-ink-muted">
              <svg viewBox="0 0 24 24" className="size-3.5 fill-brand-500" aria-hidden>
                <path d="M12 2C8.13 2 5 5.13 5 8c0 5.25 7 13 7 13s7-7.75 7-13c0-2.87-2.13-6-7-6zm0 8.5A2.5 2.5 0 1 1 12 5.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              {address}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 shadow-[0_4px_14px_rgba(150,183,200,0.2)]">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-ok opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-signal-ok" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">All Systems Nominal</p>
              <p className="text-[11.5px] text-ink-muted">
                {sensors.length} AI-placed sensors streaming · mesh nominal
              </p>
            </div>
          </div>
        </div>

        {/* Monitor row */}
        <div className="mb-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <SchematicConsole
            schematic={schematic}
            sensors={sensors}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
            fallingIds={fallingIds}
            hudText={`LIVE · ${sensors.length} SENSORS · 24GHz MESH`}
          />

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(40,53,74,0.06)]">
            <header className="mb-1 flex items-center gap-2.5">
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-100/70 text-brand-600">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
                  <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
                </svg>
              </span>
              <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
                Live Sensor Telemetry
              </h3>
            </header>
            <p className="mb-4 text-[12.5px] text-ink-muted">
              Realtime centroid elevation, motion and signal stream from every AI-placed mmWave radar.
            </p>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {telemetry.length === 0 && <Skeleton className="h-32 rounded-2xl" />}
              {telemetry.map((t) => (
                <TelemetryCard
                  key={t.id}
                  sensor={{
                    ...t,
                    falling: fallingIds.has(t.id),
                    dispatchLines: dispatchLines[t.id] ?? [],
                  }}
                  selected={selectedId === t.id}
                  onSelect={() => setSelectedId((cur) => (cur === t.id ? null : t.id))}
                  onTriggerFall={() => triggerFall(t.id)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Management grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SeniorProfileCard profile={profile} />

          <HardwareStatusCard
            profile={profile}
            otpSecondsLeft={otpSecondsLeft}
            onToggleOtp={(enabled) =>
              void persist(
                { smartLock: { otpEnabled: enabled } },
                enabled ? 'Smart Lock OTP entry enabled' : 'Smart Lock OTP entry disabled',
              )
            }
          />

          <NotificationPreferencesCard
            preferences={profile.caregiver.notificationPreferences}
            onChange={(patch) => handlePrefChange(patch as Record<string, boolean>)}
          />

          <EmergencyContactsCard contacts={profile.senior.emergencyContacts} />

          <div className="md:col-span-2 xl:col-span-2">
            <PastIncidentsCard incidents={incidents} onOpen={setReportEntry} />
          </div>
        </div>

        {/* Footer policy strip */}
        <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-center text-[11.5px] text-ink-muted">
          Session secured on this device · <strong className="font-semibold text-ink">Auto sign-in active on next launch</strong> ·
          Accounts &amp; profiles stored securely in your browser (localStorage)
        </p>
      </main>

      {/* Dispatch overlay */}
      <DispatchOverlay
        open={dispatchOpen}
        phase={phase}
        audit={audit}
        hospitals={sortedHospitals}
        teams={DISPATCH_TEAMS}
        address={address}
        home={HOME_SITE}
        statusPill={statusPill}
        transport={transport}
        feed={feed}
        otp={dispatchOtp}
        simSpeed={simSpeed}
        onSimSpeed={setSimSpeed}
        onConfirm={() => {
          const falling = [...fallingIds][0];
          if (falling) resolveEmergency(falling);
        }}
        onClose={dismissDispatch}
        onTeamSelect={() => undefined}
      />

      <IncidentReportModal entry={reportEntry} profile={profile} onClose={() => setReportEntry(null)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink shadow-[0_12px_36px_rgba(40,53,74,0.18)]">
          {toast}
        </div>
      )}
    </div>
  );
}
