import { Avatar, Chip, Switch } from '@heroui/react';
import type { EmergencyContact, NotificationPreferences, Profile } from '../../types/domain';
import { PinIcon } from '../icons';

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

/* -------------------------------------------------------------------------- */
/* Senior profile                                                             */
/* -------------------------------------------------------------------------- */
export function SeniorProfileCard({ profile }: { profile: Profile }) {
  const { senior } = profile;
  const zones = senior.monitoredZones?.length ? senior.monitoredZones : ['Master Bathroom'];

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(40,53,74,0.06)]">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-100/70 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </span>
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink">Senior Profile</h3>
      </header>

      <div className="mb-4 flex items-center gap-3">
        <Avatar className="size-12 shrink-0">
          {senior.photo ? <Avatar.Image src={senior.photo} alt={senior.name} /> : null}
          <Avatar.Fallback className="bg-brand-100 font-display text-sm font-bold text-brand-700">
            {initials(senior.name)}
          </Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-ink">{senior.name || 'Senior profile pending'}</p>
          <p className="truncate text-[12.5px] text-ink-muted">
            {[senior.relation, senior.age ? `${senior.age} years` : null].filter(Boolean).join(' · ') ||
              'Family member under care'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <PinIcon className="mt-0.5 size-3.5 shrink-0 fill-brand-500" />
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Home Address</p>
            <p className="text-[13px] leading-snug text-ink">{senior.address || 'Not set'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <PinIcon className="mt-0.5 size-3.5 shrink-0 fill-brand-500" />
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
              Primary Monitored Room
            </p>
            <p className="text-[13px] leading-snug text-ink">{senior.roomLocation || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {zones.map((z, i) => (
          <Chip
            key={z}
            size="sm"
            variant={senior.roomLocation === z || i === 0 ? 'primary' : 'secondary'}
            color={senior.roomLocation === z || i === 0 ? 'accent' : 'default'}
          >
            <Chip.Label>{z}</Chip.Label>
          </Chip>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Hardware status                                                            */
/* -------------------------------------------------------------------------- */
export function HardwareStatusCard({
  profile,
  otpSecondsLeft,
  onToggleOtp,
}: {
  profile: Profile;
  otpSecondsLeft: number | null;
  onToggleOtp: (enabled: boolean) => void;
}) {
  const radar = profile.hardware.mmwaveRadar;
  const lock = profile.hardware.smartLock;

  const minutes = otpSecondsLeft === null ? 0 : Math.floor(otpSecondsLeft / 60);
  const seconds = otpSecondsLeft === null ? 0 : otpSecondsLeft % 60;
  const rotation = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const circumference = 2 * Math.PI * 17;
  const progress = otpSecondsLeft === null ? 0 : Math.max(0, Math.min(1, otpSecondsLeft / 600));

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(40,53,74,0.06)]">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-100/70 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zM9 21h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1z" />
          </svg>
        </span>
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink">Hardware Status</h3>
      </header>

      <div className="rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-ink">{radar.label}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {radar.location} · {radar.frequency}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
              radar.online ? 'bg-signal-ok/12 text-signal-ok' : 'bg-signal-alert/12 text-signal-alert'
            }`}
          >
            <span className={`size-1.5 rounded-full ${radar.online ? 'bg-signal-ok' : 'bg-signal-alert'}`} />
            {radar.online ? 'Online — 24GHz' : 'Offline'}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-faint">
          Last heartbeat:{' '}
          {radar.lastHeartbeat
            ? new Date(radar.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '—'}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-ink">{lock.label}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">{lock.doorLocation} · OTP-based caregiver & nurse entry</p>
          </div>
          <Switch isSelected={lock.otpEnabled} onChange={onToggleOtp} aria-label="Enable OTP entry">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>

        {lock.otpEnabled ? (
          <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Current Entry OTP</span>
              <span className="font-mono text-[11px] font-semibold text-ink-muted">rotates in {rotation}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-mono text-[26px] font-bold tracking-[0.2em] text-brand-700">
                {lock.currentOtp ? String(lock.currentOtp).split('').join(' ') : '• • • • • •'}
              </span>
              <svg viewBox="0 0 40 40" className="size-10 shrink-0 -rotate-90">
                <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-200" />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  className="text-brand-500 transition-[stroke-dashoffset] duration-1000"
                />
              </svg>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">Share only with trusted visitors. Auto-refreshes.</p>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-line bg-canvas p-3 text-[12px] text-ink-muted">
            OTP entry is disabled. Enable it to issue rotating caregiver entry codes.
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Notification preferences                                                   */
/* -------------------------------------------------------------------------- */
const PREF_ROWS: { key: keyof NotificationPreferences; name: string; desc: string }[] = [
  { key: 'pushAlerts', name: 'Instant Push Alerts', desc: 'Fall or unusual inactivity detected at home' },
  { key: 'smsFallback', name: 'SMS Fallback', desc: 'Backup alert by text if push is missed' },
  { key: 'voiceCall', name: 'Voice Call on Fall Detect', desc: 'Automated call to you within 60 seconds' },
  { key: 'dailySummary', name: 'Daily Wellbeing Summary', desc: 'Evening email recap of activity patterns' },
];

export function NotificationPreferencesCard({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences;
  onChange: (patch: Partial<NotificationPreferences>) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(40,53,74,0.06)]">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-100/70 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </span>
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
          Notification Preferences
        </h3>
      </header>

      <div className="space-y-3.5">
        {PREF_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink">{row.name}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">{row.desc}</p>
            </div>
            <Switch
              isSelected={preferences[row.key]}
              onChange={(v) => onChange({ [row.key]: v })}
              aria-label={row.name}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Emergency contacts                                                         */
/* -------------------------------------------------------------------------- */
export function EmergencyContactsCard({ contacts }: { contacts: EmergencyContact[] }) {
  const sorted = [...contacts].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(40,53,74,0.06)]">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-100/70 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
          </svg>
        </span>
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink">Emergency Contacts</h3>
      </header>

      {!sorted.length ? (
        <p className="rounded-xl border border-dashed border-line bg-surface-2 p-4 text-[12.5px] text-ink-muted">
          No emergency contacts saved yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((c) => (
            <li
              key={`${c.priority}-${c.phone}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100/80 text-[11.5px] font-bold text-brand-700">
                {c.priority || '—'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{c.name}</p>
                <p className="truncate text-[11.5px] text-ink-muted">{c.relation}</p>
                <p className="truncate font-mono text-[12px] text-ink-muted">{c.phone}</p>
              </div>
              <a
                href={`tel:${c.phone}`}
                className="shrink-0 rounded-lg border border-signal-alert/30 bg-signal-alert/[0.06] px-3 py-1.5 text-[12px] font-bold text-signal-alert transition-colors hover:bg-signal-alert/15"
              >
                Call
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
