import { Accordion, Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { IconTile, SectionHeading, StatCard } from '../components/primitives';
import {
  AlertIcon,
  CheckCircleIcon,
  HeartIcon,
  LockIcon,
  MessageIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
  TagIcon,
  TrendIcon,
} from '../components/icons';

const FAQS = [
  {
    q: 'How does fall detection work without cameras?',
    a: 'The Hertz and Haven Company uses 24GHz FMCW mmWave radar — the same technology in self-driving cars. It sends invisible radio waves that bounce off objects and people. The AI analyzes the reflected signals to detect sudden changes in movement patterns that indicate a fall. It works through walls, in total darkness, and does not capture any visual images — preserving complete privacy.',
  },
  {
    q: 'Does my parent need to wear anything?',
    a: 'No. The radar sensors are mounted on walls and are completely invisible. Your parent does not need to wear any device, press any button, or change any habit. The system works passively in the background — true set-and-forget protection.',
  },
  {
    q: "Is my family's data safe?",
    a: 'All data — including passwords, session tokens, health information, and floor plans — is stored securely in your browser’s local storage. Passwords are salted and hashed before storage, and session tokens are rotated on sign-in. Nothing is sent to external servers. You have complete ownership and control of your data.',
  },
  {
    q: 'What happens when a fall is detected?',
    a: 'The system triggers a multi-step emergency response: (1) Family caregivers receive push notifications immediately, (2) SMS and automated voice calls ensure reachability, (3) You can confirm or dismiss the alert from the dashboard, (4) If confirmed, healthcare teams are deployed with live GPS tracking to the patient’s location.',
  },
  {
    q: 'How is the floor plan analysis done?',
    a: 'Upload a photo, sketch, or digital floor plan of your parent’s home. Our AI spatial analysis engine scans the layout, identifies high-risk fall zones (bathrooms, staircases, kitchen), and recommends optimal positions for up to 12 radar sensors. The analysis takes under 10 seconds and includes confidence scores for each placement.',
  },
  {
    q: 'What does "Family Gateway" mean?',
    a: 'Family Gateway is the caregiver-facing dashboard of The Hertz and Haven Company. It’s your single command centre — view sensor status, monitor room activity, manage emergency contacts, control smart lock OTPs, track deployed healthcare teams, and receive alerts. It works on any browser, from anywhere in the world.',
  },
];

const SCENARIOS = [
  {
    tone: 'alert' as const,
    icon: <AlertIcon className="size-4" />,
    title: 'The Silent Fall Crisis',
    body: 'A senior slips in the bathroom at 2 AM. Without monitoring, no one knows until a family member calls hours later. By then, hypothermia and complications set in.',
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
  { n: 1, title: 'Create Account', body: 'Sign up as a family caregiver. Add your parent’s name, health conditions, and emergency contacts in a simple form.' },
  { n: 2, title: 'Upload Floor Plan', body: 'Take a photo of your parent’s home layout — even a hand-drawn sketch works. Our AI uses it to understand the space.' },
  { n: 3, title: 'AI Places Sensors', body: 'Our spatial analysis engine scans the floor plan, identifies high-risk fall zones (bathrooms, staircases), and recommends exact sensor placements.' },
  { n: 4, title: 'Monitor & Protect', body: 'Mount the sensors on walls. They instantly begin monitoring. Falls, intrusions, and anomalies are detected and alerted in real-time.' },
];

const FEATURES = [
  {
    tone: 'alert' as const,
    icon: <AlertIcon className="size-5" />,
    title: 'Instant Fall Detection',
    body: 'Our radar sensors detect falls in under 3 seconds. The technology works through walls, in complete darkness, and through smoke — unlike cameras or infrared sensors. When a fall is detected, the system immediately begins the emergency response chain.',
    wide: true,
  },
  {
    tone: 'ok' as const,
    icon: <ShieldIcon className="size-5" />,
    title: 'Emergency Response Chain',
    body: 'Alerts cascade to family members, neighbours, and healthcare teams simultaneously. Track ambulance deployment, hospital ETA, and team location in real-time on a live map.',
  },
  {
    tone: 'info' as const,
    icon: <TrendIcon className="size-5" />,
    title: 'Family Dashboard',
    body: 'A real-time command centre showing sensor status, room activity, emergency contacts, and OTP-secured smart lock controls — all from your phone or laptop, anywhere in the world.',
  },
  {
    tone: 'accent' as const,
    icon: <SparkIcon className="size-5" />,
    title: 'AI Spatial Analysis',
    body: 'Upload any floor plan — photo, sketch, or blueprint — and our AI identifies fall-risk zones, optimal sensor positions, and coverage gaps. It learns from thousands of elderly home layouts.',
  },
  {
    tone: 'ok' as const,
    icon: <LockIcon className="size-5" />,
    title: 'Smart Lock OTP',
    body: 'Rotating one-time passwords for door access. Caregivers, nurses, and emergency responders get time-limited codes — no spare keys needed, no security risk.',
  },
  {
    tone: 'info' as const,
    icon: <MessageIcon className="size-5" />,
    title: 'Multi-Channel Alerts',
    body: 'Push notifications, SMS fallback, and automated voice calls ensure alerts reach someone — even if the family member’s phone is on silent or out of battery.',
  },
];

const NUMBERS = [
  { value: '<3s', label: 'Average fall detection time from incident to alert' },
  { value: '24/7', label: 'Continuous monitoring with zero blind spots' },
  { value: '0', label: 'Cameras, wearables, or monthly subscription fees' },
  { value: '140M+', label: 'Aging population in India to protect' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="pg-landing relative min-h-screen overflow-x-hidden bg-canvas">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed -left-36 -top-52 size-[520px] rounded-full bg-brand-300/20 blur-[160px]" />
      <div className="pointer-events-none fixed -bottom-44 -right-28 size-[440px] rounded-full bg-brand-400/15 blur-[160px]" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex h-[62px] items-center justify-between border-b border-line bg-canvas/85 px-6 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Hertz and Haven logo" className="h-11 w-auto object-contain" />
          <span className="hidden font-display text-[15px] font-bold text-ink sm:inline">
            The Hertz and Haven Company
          </span>
        </div>
        <div className="flex items-center gap-5 md:gap-8">
          {[
            ['The Problem', '#problem'],
            ['How It Works', '#how'],
            ['Features', '#features'],
            ['FAQ', '#faq'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
          <Button size="sm" variant="primary" onPress={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-[1060px] px-6 pb-20 pt-28 text-center md:pt-36">
        <p className="mb-6 inline-block rounded-full border border-brand-200 bg-brand-100/50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">
          Sensing danger, delivering Haven
        </p>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.12] text-ink md:text-[52px]">
          Your parents deserve <span className="text-brand-500">safety</span> that never{' '}
          <span className="text-brand-500">sleeps</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-relaxed text-ink-muted md:text-[18px]">
          Invisible 24GHz radar sensors watch over your parents around the clock. When a fall happens, our AI
          detects it in under 3 seconds and sends alerts to you and emergency responders — automatically.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Button size="lg" variant="primary" onPress={() => navigate('/login')}>
            Create Free Account
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onPress={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See How It Works
          </Button>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
          {[
            'No cameras — 100% privacy',
            'All data stored securely',
            'Free for families',
          ].map((t) => (
            <span key={t} className="flex items-center gap-2 text-[12px] text-ink-muted">
              <CheckCircleIcon className="size-3.5 fill-signal-ok" />
              {t}
            </span>
          ))}
        </div>
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
              India is home to an aging population of over 140 million, with a rapidly growing demographic of seniors
              living with limited daily supervision. Falls are the leading cause of injury-related death among those
              over 65 — and most go unnoticed for critical minutes or even hours.
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
                  <p className="font-display text-[30px] font-bold leading-none text-brand-500">{v}</p>
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
          title="How The Hertz and Haven Company Works"
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
              className={`rounded-2xl border border-line bg-surface p-7 transition-all hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(40,53,74,0.10)] ${
                f.wide ? 'md:col-span-2' : ''
              }`}
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
            As we began this journey, a common conversation in our team was the quiet worry we all felt about our own
            aging parents and grandparents. Living far apart, the distance felt personal. We all shared a simple
            question: 'What if they need help and no one is there?' This shared concern became our mission. We built
            The Hertz and Haven Company to bridge that gap to provide a non-intrusive, dignified way for families to
            maintain a true sense of connection and security, ensuring loved ones are never really alone.
          </p>
          <p className="mt-5 text-[14px] font-semibold text-ink">
            The Hertz and Haven Company Team{' '}
            <span className="font-normal text-ink-muted">· Young Founders Challenge 2026</span>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-[760px] px-6 py-16 md:py-20">
        <SectionHeading title="Frequently Asked Questions" />
        <Accordion className="mt-10 w-full" hideSeparator>
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

      {/* CTA */}
      <section className="relative z-10 px-6 py-16">
        <div className="relative mx-auto max-w-[800px] overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-[#1e1e30] px-8 py-14 text-center md:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-[280px] rounded-full bg-brand-300/15 blur-[60px]" />
          <h2 className="relative font-display text-[26px] font-bold text-white md:text-[30px]">
            Protect the people who raised you
          </h2>
          <p className="relative mx-auto mt-3 max-w-[500px] text-[15px] leading-relaxed text-white/55">
            Create a free account in 2 minutes. Set up home monitoring in under 10. No credit card, no subscription, no
            technician visit required.
          </p>
          <Button size="lg" variant="primary" className="relative mt-7" onPress={() => navigate('/login')}>
            Get Started — It's Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex max-w-[1060px] flex-col items-center justify-between gap-3 border-t border-line px-6 py-8 text-[12px] text-ink-faint md:flex-row">
        <span>© 2026 The Hertz and Haven Company · Young Founders Challenge 2026 · All data stored securely</span>
        <div className="flex gap-6">
          <a href="#features" className="text-ink-muted transition-colors hover:text-brand-500">
            Features
          </a>
          <a href="#faq" className="text-ink-muted transition-colors hover:text-brand-500">
            FAQ
          </a>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-ink-muted transition-colors hover:text-brand-500"
          >
            Sign In
          </button>
        </div>
      </footer>
    </div>
  );
}
