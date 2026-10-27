import { Accordion, Button } from '@heroui/react';
import { Link } from 'react-router-dom';
import { BrandMark, CountUp, IconTile, SectionHeading, StatCard } from '../components/primitives';
import {
  AlertIcon,
  CheckCircleIcon,
  HeartIcon,
  LockIcon,
  MessageIcon,
  PlusIcon,
  TagIcon,
  TrendIcon,
} from '../components/icons';

const FAQS = [
  {
    q: 'How does fall detection work without cameras?',
    a: 'The system uses 24GHz FMCW mmWave radar. It reads changes in reflected radio waves to identify movement patterns associated with a fall, without capturing images or video.',
  },
  {
    q: 'Does my parent need to wear anything?',
    a: 'No. The radar sensors are mounted in the home, so your parent does not need to wear a device, press a button, or change their routine.',
  },
  {
    q: "Is my family's data safe?",
    a: 'The web app keeps account and profile data in this browser’s local storage and stores passwords as salted hashes. Use a device you trust, especially when adding family or health details.',
  },
  {
    q: 'What happens when a fall is detected?',
    a: 'A possible fall can be reviewed from the family dashboard. Keep emergency contacts up to date, and choose the alert preferences that work for your family.',
  },
  {
    q: 'How do I add a floor plan?',
    a: 'During setup, upload a photo, sketch, or digital floor plan of your parent’s home. The app then shows suggested sensor locations for you to review.',
  },
  {
    q: 'What is the Hertz & Haven dashboard?',
    a: 'It is the family view for room and sensor status, emergency contacts, smart-lock OTP settings, and alert preferences. You can access it from the web app on a supported browser.',
  },
];

const SCENARIOS = [
  {
    tone: 'alert' as const,
    icon: <AlertIcon className="size-4" />,
    title: 'A Fall at Home',
    body: 'A senior slips at home late at night. Without monitoring, family may not know until much later. A delay can make injuries harder to treat and prolong the emergency before help arrives.',
  },
  {
    tone: 'warn' as const,
    icon: <TagIcon className="size-4.5" />,
    title: 'Wearables Get Forgotten',
    body: 'Most elderly people stop wearing panic buttons and smartwatches within weeks. They’re uncomfortable, need charging, and carry social stigma at home.',
  },
  {
    tone: 'ok' as const,
    icon: <HeartIcon className="size-4.5" />,
    title: 'Our Solution: Invisible Protection',
    body: 'Radar sensors mounted on walls are invisible and require zero effort from your parents. They work through walls, in the dark, and never need charging.',
  },
];

const STEPS = [
  { n: 1, title: 'Create Account', body: 'Set up a family account so the people who help care for your parent can stay connected.' },
  { n: 2, title: 'Add Home Details', body: 'Add your parent’s profile, home address, and primary emergency contact during a guided setup.' },
  { n: 3, title: 'Review Sensor Setup', body: 'Upload a floor plan and review suggested sensor locations for the rooms you want to monitor.' },
  { n: 4, title: 'Stay Connected', body: 'Use the family dashboard to check room status, manage smart-lock OTP settings, and choose how alerts reach your family.' },
];

const FEATURES = [
  {
    tone: 'info' as const,
    icon: <TrendIcon className="size-5" />,
    title: 'Family Dashboard',
    body: 'See room and sensor status, keep emergency contacts close, and review your home’s safety setup from one simple view.',
  },
  {
    tone: 'ok' as const,
    icon: <LockIcon className="size-5" />,
    title: 'Smart-Lock OTP',
    body: 'Manage rotating, time-limited access codes for the smart lock, with clear controls in the family dashboard.',
  },
  {
    tone: 'info' as const,
    icon: <MessageIcon className="size-5" />,
    title: 'Multichannel Alerts',
    body: 'Choose push, SMS fallback, and voice-call preferences so your family has more than one way to receive an important update.',
  },
];

const NUMBERS = [
  { value: '<3s', label: 'Average fall detection time from incident to alert' },
  { value: '24/7', label: 'Continuous monitoring with zero blind spots' },
  { value: '0', label: 'Cameras, wearables, or monthly subscription fees' },
  { value: '140M+', label: 'Aging population in India to protect' },
];

function HomeSafetyIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <svg viewBox="0 0 620 520" className="block h-auto w-full drop-shadow-[0_24px_34px_rgba(45,74,58,0.13)]" role="img" aria-labelledby="homeSafetyTitle">
        <title id="homeSafetyTitle">A warm family home with a discreet safety sensor and connected room status</title>
        <defs>
          <linearGradient id="sceneBg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#E3F0E5"/><stop offset="1" stopColor="#F8EBD6"/></linearGradient>
          <linearGradient id="windowBg" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#B9D9CF"/><stop offset="1" stopColor="#F0D59E"/></linearGradient>
          <linearGradient id="sofaBg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#719B83"/><stop offset="1" stopColor="#467766"/></linearGradient>
        </defs>
        <rect x="18" y="17" width="584" height="482" rx="40" fill="url(#sceneBg)"/>
        <circle cx="518" cy="91" r="39" fill="#EABF78" opacity=".82"/>
        <path d="M70 211 308 51l238 160" fill="none" stroke="#FFFDF7" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="93" y="204" width="430" height="239" rx="24" fill="#FFFCF4"/>
        <path d="M93 408h430v12a24 24 0 0 1-24 24H117a24 24 0 0 1-24-24z" fill="#E9D8BC"/>
        <rect x="135" y="243" width="125" height="117" rx="9" fill="url(#windowBg)"/>
        <path d="M197 243v117M135 301h125" stroke="#FFFDF7" strokeWidth="8"/>
        <path d="M146 336c16-21 28-17 43-5 15-24 31-28 59-10v39h-102z" fill="#8BAE8A" opacity=".72"/>
        <rect x="289" y="300" width="183" height="89" rx="23" fill="url(#sofaBg)"/>
        <rect x="276" y="350" width="208" height="48" rx="18" fill="#5D8A74"/>
        <rect x="290" y="377" width="22" height="49" rx="10" fill="#476C5E"/>
        <rect x="449" y="377" width="22" height="49" rx="10" fill="#476C5E"/>
        <rect x="302" y="314" width="54" height="41" rx="13" fill="#E7B27E"/>
        <rect x="400" y="314" width="54" height="41" rx="13" fill="#D4E1C8"/>
        <ellipse cx="380" cy="435" rx="139" ry="13" fill="#D8C6A9" opacity=".62"/>
        <circle cx="374" cy="267" r="27" fill="#C9835F"/>
        <path d="M348 264c2-24 16-35 33-31 13 3 21 14 19 28-8-7-16-10-26-10-7 8-15 12-26 13z" fill="#4F5349"/>
        <path d="M340 299c18-17 46-18 66 0l17 69h-103z" fill="#E7B27E"/>
        <path d="M345 308c17-14 41-14 57 0l8 60h-73z" fill="#2F7669"/>
        <path d="M354 367h30l-8 49h-39zM384 367h28l18 49h-39z" fill="#465B54"/>
        <path d="M337 320c-16 13-24 29-25 47M407 318c15 11 22 25 25 39" fill="none" stroke="#C9835F" strokeWidth="11" strokeLinecap="round"/>
        <circle cx="494" cy="224" r="9" fill="#0B806F"/>
        <circle cx="494" cy="224" r="28" fill="none" stroke="#0B806F" strokeOpacity=".42" strokeWidth="2"/>
        <circle cx="494" cy="224" r="48" fill="none" stroke="#0B806F" strokeOpacity=".2" strokeWidth="2" strokeDasharray="5 7"/>
        <path d="M494 272v20" stroke="#0B806F" strokeWidth="2" strokeDasharray="4 5"/>
        <path d="M517 381h35v58h-35z" fill="#B97853"/>
        <path d="M534 386c-30-14-25-42-8-50 19 11 21 28 8 50zM536 392c5-29 24-38 36-28-2 21-15 31-36 28zM531 400c-25-18-45-9-43 7 17 11 31 8 43-7z" fill="#5F9870"/>
        <rect x="75" y="97" width="177" height="72" rx="17" fill="#FFFEFA" stroke="#FFFFFF" strokeWidth="2"/>
        <circle cx="101" cy="121" r="6" fill="#3E9A70"/>
        <text x="117" y="125" fill="#536B60" fontSize="11" fontFamily="Arial, sans-serif" fontWeight="700" letterSpacing="1">HOME STATUS</text>
        <text x="96" y="151" fill="#24372F" fontSize="15" fontFamily="Arial, sans-serif" fontWeight="700">All rooms connected</text>
        <circle cx="513" cy="128" r="4" fill="#FFFDF7" opacity=".8"/>
        <circle cx="550" cy="167" r="3" fill="#FFFDF7" opacity=".8"/>
      </svg>
      <div className="absolute bottom-3 left-0 flex items-center gap-3 rounded-2xl border border-white/80 bg-surface/95 px-4 py-3 shadow-[0_14px_38px_rgba(36,55,47,0.15)] backdrop-blur-md sm:bottom-7 sm:-left-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2.4-5 4.2 10 2.3-5H21"/><path d="M12 22s8-4.5 8-12V5l-8-3-8 3v5c0 7.5 8 12 8 12z"/></svg>
        </span>
        <span><strong className="block text-[12px] font-bold text-ink">Thoughtful, everyday protection</strong><span className="mt-0.5 block text-[11px] text-ink-muted">Privacy first. Family connected.</span></span>
      </div>
    </div>
  );
}

export default function Landing() {
  const scrollToDownloads = () => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="pg-landing relative min-h-screen overflow-x-hidden bg-canvas">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed -left-36 -top-52 size-[520px] rounded-full bg-brand-300/20 blur-[160px]" />
      <div className="pointer-events-none fixed -bottom-44 -right-28 size-[440px] rounded-full bg-brand-400/15 blur-[160px]" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex h-[78px] items-center justify-between border-b border-ink/10 bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:px-12">
        <a href="/" className="flex items-center gap-3" aria-label="Hertz and Haven home">
          <BrandMark />
          <span className="font-display text-[15px] font-bold tracking-[-0.03em] text-ink sm:text-[17px]">Hertz &amp; Haven</span>
        </a>
        <div className="hidden items-center gap-5 lg:flex xl:gap-7">
          {[
            ['The Problem', '#problem'],
            ['How It Works', '#how'],
            ['Features', '#features'],
            ['FAQ', '#faq'],
            ['Download', '#download'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
          <Link to="/enquiry" className="text-[13px] font-semibold text-ink-muted transition-colors hover:text-brand-600">
            Enquire
          </Link>
          <Button size="sm" variant="primary" onPress={scrollToDownloads}>
            Download App
          </Button>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <Link to="/enquiry" className="text-[12px] font-semibold text-brand-700 transition-colors hover:text-brand-500">
            Enquire
          </Link>
          <Button size="sm" variant="primary" onPress={scrollToDownloads}>
            Download App
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-20 sm:px-8 md:pb-20 md:pt-24 lg:grid-cols-[0.96fr_1.04fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-28">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-[#c8ded2] bg-[#eaf2e9] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-700 sm:text-[11px]">
            Sensing danger, delivering Haven
          </p>
          <h1 className="max-w-[620px] font-display text-[40px] font-extrabold leading-[1.04] tracking-[-0.055em] text-ink sm:text-[50px] lg:text-[60px]">
            Your parents deserve <span className="text-brand-500">safety</span> that never{' '}
            <span className="text-brand-500">sleeps</span>
          </h1>
          <p className="mt-5 max-w-[540px] text-[15px] leading-relaxed text-ink-muted md:text-[16px]">
            Discreet 24GHz radar sensors help monitor your parents at home. When a fall is detected, Hertz &amp; Haven helps share an alert with family and coordinate a faster response — without cameras or wearables.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <Button size="lg" variant="primary" onPress={scrollToDownloads}>
              Download the App
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onPress={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            {['No cameras or wearables', 'Built around family care', 'Designed for Indian homes'].map((item) => (
              <span key={item} className="flex items-center gap-2 text-[11px] text-ink-muted">
                <CheckCircleIcon className="size-3.5 fill-signal-ok" />{item}
              </span>
            ))}
          </div>
        </div>
        <HomeSafetyIllustration />
      </section>

      {/* The Problem */}
      <section id="problem" className="relative z-10 mx-auto max-w-[1060px] px-6 py-16 md:py-20">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="font-display text-[28px] font-bold leading-tight text-ink md:text-[34px]">
              Every <span className="text-brand-500">11 seconds</span>, an elderly person is treated in the{' '}
              <span className="text-brand-500">ER</span> from a <span className="text-brand-500">fall</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">
              India is home to a growing number of older adults, many living with limited daily supervision. A fall or
              other emergency at home can go unnoticed for critical minutes or even hours.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Adult children living in other cities carry the constant worry:{' '}
              <em className="text-ink">"What if something happens and no one is there?"</em> Existing solutions are
              either invasive (cameras), easily forgotten (wearables), or simply too expensive.
            </p>
            <div className="mt-7 flex flex-wrap gap-8">
              {[
                ['140M+', 'Aging population in India'],
                ['47%', 'Of falls go undetected for 30+ min'],
                ['3x', 'Survival rate with rapid response'],
              ].map(([v, l]) => (
                <div key={v}>
                  <CountUp value={v} className="font-display text-[30px] font-bold leading-none text-brand-500" />
                  <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-7 shadow-[0_16px_48px_rgba(40,53,74,0.08)]">
            {SCENARIOS.map((s, i) => (
              <div
                key={s.title}
                className={`flex gap-4 py-4 ${i !== SCENARIOS.length - 1 ? 'border-b border-line' : ''}`}
              >
                <IconTile tone={s.tone}>{s.icon}</IconTile>
                <div>
                  <h4 className="text-[14px] font-bold text-ink">{s.title}</h4>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto max-w-[1060px] px-6 py-16 md:py-20">
        <SectionHeading
          title="How Hertz & Haven Works"
          lede="From unboxing to 24/7 protection in under 10 minutes. No technicians, no wiring."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-line bg-surface p-7 text-center transition-all hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(40,53,74,0.08)]"
            >
              <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-brand-500 font-display text-[18px] font-bold text-white">
                {s.n}
              </span>
              <h3 className="text-[15px] font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-[1060px] px-6 py-16 md:py-20">
        <SectionHeading
          title="Built for Families Who Care"
          lede="Every feature is designed to give you peace of mind while respecting your parents' independence and dignity."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-line bg-surface p-7 transition-all hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(40,53,74,0.10)]"
            >
              <IconTile tone={f.tone}>{f.icon}</IconTile>
              <h3 className="mt-4 text-[16px] font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* By the numbers */}
      <section id="numbers" className="relative z-10 mx-auto max-w-[1060px] px-6 py-16 md:py-20">
        <SectionHeading title="By the Numbers" lede="Real impact, measured and verified." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map((n) => (
            <StatCard key={n.value} value={n.value} label={n.label} />
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="relative z-10 mx-auto max-w-[800px] px-6 py-16 md:py-20">
        <div className="text-center">
          <h2 className="font-display text-[28px] font-bold text-ink md:text-[30px]">Why We Built This</h2>
          <p className="mt-6 text-[19px] italic leading-relaxed text-ink md:text-[20px]">
            We started with a familiar worry: what if someone we love needs help and no one is nearby? Hertz &amp; Haven
            grew from that question into a simple goal — help families stay connected to the people and places they
            care about, while respecting the dignity and independence of older adults.
          </p>
          <p className="mt-5 text-[14px] font-semibold text-ink">
            The Hertz &amp; Haven Team{' '}
            <span className="font-normal text-ink-muted">· Young Founders Challenge 2026</span>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-[760px] px-6 py-16 md:py-20">
        <SectionHeading title="Frequently Asked Questions" />
        <Accordion className="mt-10 w-full" hideSeparator allowsMultipleExpanded>
          {FAQS.map((f) => (
            <Accordion.Item key={f.q}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <span className="flex-1 pr-4 text-left text-[15px] font-bold text-ink">{f.q}</span>
                  <Accordion.Indicator>
                    <PlusIcon className="size-4 text-brand-500 transition-transform duration-200" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <p className="text-[14px] leading-relaxed text-ink-muted">{f.a}</p>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>

      {/* Download app */}
      <section id="download" className="relative z-10 px-5 py-14 sm:px-6 md:py-20">
        <div className="relative mx-auto grid max-w-[1100px] gap-8 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_10%_10%,rgba(73,161,126,0.48),transparent_36%),linear-gradient(135deg,#173f38,#102f2d_74%)] p-6 text-white shadow-[0_22px_54px_rgba(27,61,51,0.20)] sm:p-9 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12 lg:p-14">
          <div className="pointer-events-none absolute -bottom-52 -right-24 size-[390px] rounded-full border border-white/10 shadow-[0_0_0_34px_rgba(255,255,255,0.025),0_0_0_74px_rgba(255,255,255,0.02)]" />
          <div className="relative z-10">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#a8d5b9]">Download the Hertz &amp; Haven app</p>
            <h2 className="max-w-[390px] font-display text-[32px] font-bold leading-tight tracking-[-0.035em] text-white md:text-[42px]">
              Bring peace of mind with you.
            </h2>
            <p className="mt-4 max-w-[390px] text-[14px] leading-relaxed text-white/75">
              Install Hertz &amp; Haven on Android or Windows, or check the app stores for current availability.
            </p>
          </div>
          <div className="relative z-10 grid gap-3 sm:grid-cols-2">
            <a className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-white/20 bg-surface px-4 py-3 text-ink transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="https://apps.apple.com/in/search?term=Hertz%20%26%20Haven" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-brand-700" fill="currentColor" aria-hidden="true"><path d="M16.37 12.06c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.04-.99 2.06-.6.88-1.22 1.75-2.2 1.77-.96.02-1.27-.57-2.37-.57-1.1 0-1.45.55-2.36.59-.95.04-1.67-.95-2.27-1.82-1.23-1.78-2.17-5.04-.91-7.24.62-1.09 1.73-1.78 2.94-1.8.92-.02 1.79.62 2.36.62.57 0 1.64-.77 2.77-.66.47.02 1.8.19 2.65 1.42-.07.04-1.58.92-1.57 2.69ZM14.55 6.6c.5-.6.84-1.42.75-2.24-.72.03-1.59.48-2.11 1.08-.46.53-.86 1.36-.75 2.16.8.06 1.61-.4 2.11-1Z"/></svg>
              <span><small className="block text-[10px] text-ink-muted">For iPhone and iPad</small><strong className="mt-1 block text-[14px]">Check App Store availability</strong></span>
            </a>
            <a className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-white/20 bg-surface px-4 py-3 text-ink transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="https://play.google.com/store/search?q=Hertz%20%26%20Haven&amp;c=apps" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-brand-700" fill="currentColor" aria-hidden="true"><path d="M3.2 2.8c-.14.22-.2.5-.2.83v16.74c0 .34.07.62.2.84L12.56 12 3.2 2.8Zm10.4 7.18L5.36 1.67l11.47 6.52-3.23 1.79Zm4.48 2.48-3.02-1.68 3.32-1.84 2.08 1.18c.72.41.72 1.05 0 1.46l-2.38.88ZM5.36 22.33l8.24-8.31 3.23 1.79L5.36 22.33Zm7.2-10.33 4.27 2.37-11.47 6.52 7.2-8.89Z"/></svg>
              <span><small className="block text-[10px] text-ink-muted">For Android phones</small><strong className="mt-1 block text-[14px]">Check Google Play availability</strong></span>
            </a>
            <a href="/Hertz-Haven.apk" download="Hertz-Haven.apk" aria-describedby="download-note" className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-white/20 bg-surface px-4 py-3 text-left text-ink transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg>
              <span><small className="block text-[10px] text-ink-muted">Android package</small><strong className="mt-1 block text-[14px]">Download Android APK</strong></span>
            </a>
            <a href="https://github.com/SamCodezHub/HertzAndHaven/releases/latest/download/Hertz-Haven-Setup.exe" aria-describedby="download-note" className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-white/20 bg-surface px-4 py-3 text-left text-ink transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4M7 8h4v4H7zm6 0h4v4h-4zM7 14h4m2 0h4"/></svg>
              <span><small className="block text-[10px] text-ink-muted">Windows 10 and 11</small><strong className="mt-1 block text-[14px]">Download Windows installer</strong></span>
            </a>
            <p id="download-note" className="text-[11px] leading-relaxed text-white/65 sm:col-span-2">
              The Windows installer downloads from GitHub Releases. Android downloads the APK directly. App Store and Google Play buttons open availability searches.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex max-w-[1060px] flex-col items-center justify-between gap-3 border-t border-line px-6 py-8 text-[12px] text-ink-faint md:flex-row">
        <span>© 2026 Hertz &amp; Haven · Young Founders Challenge 2026 · Privacy-minded family care</span>
        <div className="flex flex-wrap justify-center gap-5">
          <a href="#features" className="text-ink-muted transition-colors hover:text-brand-500">
            Features
          </a>
          <a href="#faq" className="text-ink-muted transition-colors hover:text-brand-500">
            FAQ
          </a>
          <a href="#download" className="text-ink-muted transition-colors hover:text-brand-500">
            Download App
          </a>
          <Link to="/enquiry" className="text-ink-muted transition-colors hover:text-brand-500">
            Enquire
          </Link>
        </div>
      </footer>
    </div>
  );
}
