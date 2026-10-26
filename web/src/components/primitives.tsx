import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** Minimal signal mark used consistently across marketing and account screens. */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'size-9 rounded-[11px]',
    md: 'size-11 rounded-[14px]',
    lg: 'size-12 rounded-[15px]',
  };
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-[#15927d] to-[#075d54] shadow-[0_8px_18px_rgba(8,117,104,0.18)] ${sizes[size]}`}
    >
      <img
        src={`${import.meta.env.BASE_URL}new_logo_mark.jpg`}
        alt=""
        className="size-full object-cover"
      />
    </span>
  );
}

/** Count a compact value up once when its metric becomes visible. */
export function CountUp({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/^([^\d]*)(\d+)(.*)$/);
    const element = ref.current;
    if (!match || !element) return;

    const [, prefix, digits, suffix] = match;
    const target = Number(digits);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (target === 0 || reducedMotion || !('IntersectionObserver' in window)) {
      setDisplay(value);
      return;
    }

    let animationFrame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const startedAt = performance.now();
      const duration = 760;
      setDisplay(`${prefix}0${suffix}`);

      const frame = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`);
        if (progress < 1) animationFrame = requestAnimationFrame(frame);
        else setDisplay(value);
      };

      animationFrame = requestAnimationFrame(frame);
    }, { threshold: 0.35 });

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return <span ref={ref} className={className} aria-label={value} aria-live="off">{display}</span>;
}

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
      <div className="font-display text-[40px] font-bold leading-none text-brand-600"><CountUp value={value} /></div>
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
