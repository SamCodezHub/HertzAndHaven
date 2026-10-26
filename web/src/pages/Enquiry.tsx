import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/primitives';

const ENQUIRY_EMAIL = 'samruddhgamez@gmail.com';

export default function Enquiry() {
  const [message, setMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const enquiry = String(data.get('enquiry') ?? '').trim();
    const subject = encodeURIComponent(`Hertz & Haven enquiry from ${name}`);
    const body = encodeURIComponent([
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || 'Not provided'}`,
      '',
      'Enquiry:',
      enquiry,
    ].join('\n'));

    setMessage('Your email app should open with your enquiry ready. Press Send there to deliver it.');
    window.location.href = `mailto:${ENQUIRY_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10 sm:px-6">
      <div className="pointer-events-none fixed -left-36 -top-44 size-[500px] rounded-full bg-brand-300/20 blur-[150px]" />
      <div className="pointer-events-none fixed -bottom-48 -right-32 size-[440px] rounded-full bg-brand-400/15 blur-[150px]" />

      <div className="relative z-10 w-full max-w-[620px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Hertz and Haven home">
            <BrandMark size="lg" />
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-brand-600">Family care, connected</span>
              <span className="mt-0.5 block font-display text-[19px] font-bold tracking-[-0.03em] text-ink">Hertz &amp; Haven</span>
            </span>
          </Link>
          <Link to="/#download" className="text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-500">
            Download app
          </Link>
        </header>

        <section className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_22px_64px_rgba(40,53,74,0.10)] sm:p-9">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-600">We’re here to help</p>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[38px]">
            Send us an enquiry
          </h1>
          <p className="mb-7 mt-3 max-w-[490px] text-[14px] leading-relaxed text-ink-muted">
            Tell us a little about what you need. We’ll prepare an email addressed to our team so you can review and send it.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-[12px] font-semibold text-ink-muted">
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                placeholder="Full name"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-muted">
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-muted">
                Phone number <span className="font-normal text-ink-faint">(optional)</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  placeholder="+91 98XXX XXXXX"
                />
              </label>
            </div>

            <label className="block text-[12px] font-semibold text-ink-muted">
              How can we help?
              <textarea
                name="enquiry"
                required
                minLength={10}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                placeholder="Tell us what you’d like to know about Hertz & Haven…"
              />
            </label>

            {message && <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-[13px] leading-relaxed text-brand-700">{message}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-brand-action px-4 py-3.5 text-[14px] font-bold text-white transition hover:bg-brand-action-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              Send enquiry
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-muted">
            Your email app will open to send the message. Or email us at{' '}
            <a className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2" href={`mailto:${ENQUIRY_EMAIL}`}>
              {ENQUIRY_EMAIL}
            </a>.
          </p>
        </section>

        <Link to="/" className="mt-6 block text-center text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-500">
          ← Back to Hertz &amp; Haven
        </Link>
      </div>
    </main>
  );
}
