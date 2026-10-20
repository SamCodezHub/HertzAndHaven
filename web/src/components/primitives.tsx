import type { ReactNode } from 'react';

/** Section eyebrow + heading + optional lede, used across marketing surfaces. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'center',
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'center' | 'start';
}) {
  const isCenter = align === 'center';
  return (
    <header className={isCenter ? 'text-center' : ''}>
      {eyebrow && (
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">{eyebrow}</p>
      )}
      <h2 className="font-display text-[30px] font-bold leading-tight text-ink md:text-[34px]">{title}</h2>
      {lede && <p className="mt-3 text-[15px] leading-relaxed text-muted">{lede}</p>}
    </header>
  );
}

/** Big-number metric tile used by the "By the Numbers" band. */
export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-9 text-center transition-shadow hover:shadow-[0_12px_36px_rgba(40,53,74,0.10)]">
      <div className="font-display text-[40px] font-bold leading-none text-brand-600">{value}</div>
      <div className="mt-2 text-[13px] leading-relaxed text-muted">{label}</div>
    </div>
  );
}

/** Coloured square icon tile used by feature + scenario cards. */
export function IconTile({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: 'accent' | 'ok' | 'info' | 'alert' | 'warn';
}) {
  const tones: Record<string, string> = {
    accent: 'bg-brand-100/60 text-brand-600',
    ok: 'bg-signal-ok/10 text-signal-ok',
    info: 'bg-signal-info/12 text-brand-500',
    alert: 'bg-signal-alert/10 text-signal-alert',
    warn: 'bg-signal-warn/12 text-signal-warn',
  };
  return (
    <span className={`inline-flex size-11 items-center justify-center rounded-[13px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Small pill used for statuses, counts and metadata. */
export function Pill({
  children,
  tone = 'neutral',
  dot = false,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'alert' | 'warn' | 'info';
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-brand-100/60 text-ink-muted border-brand-200',
    ok: 'bg-signal-ok/12 text-signal-ok border-signal-ok/25',
    alert: 'bg-signal-alert/10 text-signal-alert border-signal-alert/25',
    warn: 'bg-signal-warn/12 text-signal-warn border-signal-warn/25',
    info: 'bg-brand-100/70 text-brand-600 border-brand-200',
  };
  const dots: Record<string, string> = {
    neutral: 'bg-ink-faint',
    ok: 'bg-signal-ok',
    alert: 'bg-signal-alert',
    warn: 'bg-signal-warn',
    info: 'bg-brand-500',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold tracking-wide ${tones[tone]}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}
