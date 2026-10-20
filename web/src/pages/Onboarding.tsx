import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Skeleton, Switch, Tooltip } from '@heroui/react';
import { electronAPI } from '../lib/api';
import { CheckIcon } from '../components/icons';

const CONDITION_OPTS = ['Osteoporosis', 'Cardiac History', 'Diabetes', 'Arthritis', 'Post-Stroke Balance Impairment', 'Limited Vision', 'Hearing Loss', 'Dementia / Memory Care'];
const MOBILITY_OPTS = ['Walks unaided', 'Walks with cane', 'Walker / Zimmer frame', 'Wheelchair', 'Mostly bed-bound'];

const RISK_ZONE_STYLE: Record<string, string> = {
  critical: 'border-signal-alert/70 bg-signal-alert/12',
  high: 'border-signal-warn/70 bg-signal-warn/12',
  medium: 'border-signal-info/60 bg-signal-info/12',
  low: 'border-white/30 bg-white/8',
};

const RISK_PIN_STYLE: Record<string, string> = {
  critical: 'bg-signal-alert',
  high: 'bg-signal-warn',
  medium: 'bg-signal-info',
  low: 'bg-white/60',
};

const INPUT_CLASS =
  'w-full rounded-xl border border-console-line bg-console-900 px-3.5 py-2.5 text-[13.5px] text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-brand-400';

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">{children}</label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  select = false,
  maxLength,
  min,
  max,
  inputMode,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  select?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  inputMode?: 'numeric' | 'text' | 'tel' | 'email' | 'url' | 'search' | 'decimal' | 'none';
  children?: ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {select ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_CLASS} appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2393a3b5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
          }}
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
          inputMode={inputMode}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-4 rounded-xl border border-signal-alert/30 bg-signal-alert/10 px-3.5 py-2.5 text-[12.5px] text-signal-alert">
      {message}
    </p>
  );
}

function initials(name: string) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('') || '?'; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function Onboarding() {
  const navigate = useNavigate();

  // session
  const [sessionUser, setSessionUser] = useState<any>(null);

  // wizard
  const [step, setStep] = useState(1);
  const [analyzed, setAnalyzed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  // step1
  const [photo, setPhoto] = useState<string | null>(null);
  const [seniorName, setSeniorName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [language, setLanguage] = useState('English');
  const [conditions, setConditions] = useState<string[]>([]);
  const [mobility, setMobility] = useState('Walks unaided');
  const [docName, setDocName] = useState('');
  const [docHosp, setDocHosp] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [ecRel, setEcRel] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');

  // step2
  const [flat, setFlat] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pin, setPin] = useState('');
  const [buildingType, setBuildingType] = useState('Apartment Complex');
  const [floor, setFloor] = useState('');
  const [elevator, setElevator] = useState(false);
  const [lockBrand, setLockBrand] = useState('');
  const [lockLoc, setLockLoc] = useState('');
  const [notes, setNotes] = useState('');

  // step3
  const [schematic, setSchematic] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [fileTag, setFileTag] = useState('');
  const [planVisible, setPlanVisible] = useState(false);
  const [scanStatus, setScanStatus] = useState('AI Spatial Analysis Running…');
  const [scanConsoleLines, setScanConsoleLines] = useState<string[]>([]);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [scanFxRun, setScanFxRun] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);

  // ui
  const [err1, setErr1] = useState('');
  const [err2, setErr2] = useState('');
  const [err3, setErr3] = useState('');
  const [toast, setToast] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const planImgRef = useRef<HTMLImageElement>(null);

  // boot
  useEffect(() => {
    (async () => {
      try {
        const s = await electronAPI.session();
        if (!s) { navigate('/'); return; }
        setSessionUser(s.user);
      } catch {
        navigate('/');
      }
    })();
  }, [navigate]);

  // toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const toggleCondition = (opt: string) => {
    setConditions(prev => prev.includes(opt) ? prev.filter(c => c !== opt) : [...prev, opt]);
  };

  // photo
  const handlePhotoFile = (file: File | null) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type)) { showToast('Please choose a PNG or JPG photo.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        setPhoto(canvas.toDataURL('image/jpeg', 0.85));
        showToast('Photo attached.');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // plan
  const resetAnalysis = () => {
    setAnalyzed(false);
    setSensors([]);
    setScanConsoleLines([]);
    setConsoleVisible(false);
    setHudVisible(false);
    setScanFxRun(false);
    setSummaryVisible(false);
    setSensors([]);
    setRevealedCount(0);
  };

  const setPlan = (name: string, dataUrl: string) => {
    setSchematic({ name, dataUrl });
    resetAnalysis();
    setPlanVisible(true);
    setFileTag(name);
  };

  const handlePlanFile = (file: File | null) => {
    const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    const okExt = /\.(png|jpe?g|svg|webp)$/i;
    if (!file || (!okTypes.includes(file.type) && !okExt.test(file.name))) { showToast('Use a PNG, JPG, SVG or WEBP floor plan image.'); return; }
    if (file.size > 8 * 1024 * 1024) { showToast('Image too large — keep it under 8MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let dataUrl = reader.result as string;
      if (file.type !== 'image/svg+xml' && dataUrl.length > 3200000) {
        const img = new Image();
        img.onload = () => {
          const maxW = 1400;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          setPlan(file.name, canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => setPlan(file.name, dataUrl);
        img.src = dataUrl;
      } else {
        setPlan(file.name, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderZones = (list: any[], stagger: boolean) => {
    setSensors(list);
    if (!stagger) {
      setRevealedCount(list.length);
      return;
    }
    setRevealedCount(0);
    list.forEach((_, i) => {
      window.setTimeout(() => setRevealedCount(i + 1), i * 190);
    });
  };

  const runAnalysis = async () => {
    if (scanning || !schematic) return;
    setScanning(true);
    setErr3('');
    const isSample = schematic.name === 'Sample 2BHK Floor Plan';
    const result = await electronAPI.analyzeSchematic(isSample ? 'SAMPLE_2BHK' : schematic.dataUrl.length + ':' + schematic.name);
    if (!result || !result.success) {
      setScanning(false);
      setErr3((result && result.message) || 'Analysis engine unavailable. Please try again.');
      return;
    }
    setScanFxRun(true);
    setHudVisible(true);
    setConsoleVisible(true);
    setScanConsoleLines([]);
    const lines = result.scanLog || [];
    for (let i = 0; i < lines.length; i++) {
      setScanStatus(lines[i]);
      setScanConsoleLines(prev => [...prev, '> ' + lines[i]]);
      await sleep(i === lines.length - 1 ? 700 : 560);
    }
    setSensors(result.sensors);
    renderZones(result.sensors, true);
    setScanFxRun(false);
    setHudVisible(false);
    setAnalyzed(true);
    setScanning(false);
    setSummaryVisible(true);
  };

  const validateStep1 = (): boolean => {
    setErr1('');
    if (seniorName.trim().length < 2) { setErr1("Please enter your parent's full name."); return false; }
    if (!ecName.trim()) { setErr1('Emergency contact name is required.'); return false; }
    if (ecPhone.replace(/\D/g, '').length < 8) { setErr1('Enter a valid emergency contact phone number.'); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    setErr2('');
    if (!flat.trim()) { setErr2('Flat / house number is required.'); return false; }
    if (!area.trim()) { setErr2('Area / locality is required.'); return false; }
    if (!city.trim()) { setErr2('City is required.'); return false; }
    if (!/^\d{6}$/.test(pin.trim())) { setErr2('Pincode must be exactly 6 digits.'); return false; }
    return true;
  };

  const autofillDemo = () => {
    setSeniorName('Rishi Sharma');
    setAge('74');
    setGender('Male');
    setLanguage('Hindi');
    setConditions(['Cardiac History', 'Arthritis']);
    setMobility('Walks with cane');
    setDocName('Dr. Meera Iyer');
    setDocHosp('Manipal Hospital, Old Airport Road');
    setDocPhone('+91 80 2502 4444');
    setEcRel('Son — Primary Caregiver');
    setEcName('Rishabh Sharma');
    setEcPhone('+91 98450 40240');
    setFlat('Flat 402, Tower B');
    setArea('Prestige Shantiniketan, Whitefield');
    setCity('Bengaluru');
    setPin('560066');
    setBuildingType('Apartment Complex');
    setFloor('4');
    setElevator(true);
    setLockBrand('Yale Smart Lockbox');
    setLockLoc('Mounted on main door handle');
    setNotes('');
    showToast('Test details filled — press Next to continue.');
  };

  const goStep = (n: number) => {
    setStep(n);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      goStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      goStep(3);
    } else {
      finish();
    }
  };

  const handleBack = () => { if (step > 1) goStep(step - 1); };

  const handleSample = async () => {
    const r = await electronAPI.sampleSchematic();
    if (r && r.success) setPlan('Sample 2BHK Floor Plan', r.dataUrl);
    else showToast('Could not load the sample plan.');
  };

  const finish = async () => {
    if (!analyzed || !sensors.length) { setErr3('Run the AI spatial analysis before finishing.'); return; }
    setBusy(true);
    try {
      const res = await electronAPI.completeOnboarding({
        senior: {
          name: seniorName.trim(),
          age: age,
          gender,
          language,
          conditions,
          mobility,
          photo
        },
        physician: { name: docName.trim(), hospital: docHosp.trim(), phone: docPhone.trim() },
        emergencyContact: { name: ecName.trim(), relation: ecRel.trim(), phone: ecPhone.trim() },
        residence: {
          flat: flat.trim(),
          area: area.trim(),
          city: city.trim(),
          pincode: pin.trim(),
          buildingType,
          floor: floor.trim(),
          elevator,
          lockboxBrand: lockBrand,
          lockboxLocation: lockLoc.trim()
        },
        schematic,
        sensors
      });
      if (res && res.success) {
        navigate('/family-dashboard');
        return;
      }
      setErr3((res && res.message) || 'Could not save your setup. Please try again.');
    } catch {
      setErr3('Could not save your setup. Please try again.');
    }
    setBusy(false);
  };


  const renderStepper = () => {
    const items = [1, 2, 3];
    const labels = ['Senior Profile', 'Residence & Access', 'Schematic & AI Analysis'];
    return (
      <ol className="mb-8 flex items-center gap-2">
        {items.map((s, idx) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full border text-[12.5px] font-bold transition-all ${
                  s < step
                    ? 'border-signal-ok bg-signal-ok/15 text-signal-ok'
                    : s === step
                      ? 'border-brand-400 bg-brand-400/20 text-brand-200'
                      : 'border-console-line bg-console-800 text-white/35'
                }`}
              >
                {s < step ? <CheckIcon className="size-3.5" /> : s}
              </span>
              <span
                className={`whitespace-nowrap text-[12.5px] font-semibold ${
                  s <= step ? 'text-white/90' : 'text-white/35'
                }`}
              >
                {labels[idx]}
              </span>
            </div>
            {idx < 2 && (
              <span
                className={`h-px flex-1 transition-colors ${
                  s < step ? 'bg-signal-ok/50' : 'bg-console-line'
                }`}
              />
            )}
          </li>
        ))}
      </ol>
    );
  };

  if (!sessionUser) {
    return (
      <div className="pg-onboarding min-h-screen bg-console-900 p-8" data-theme="dark">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="mt-8 h-8 w-96 rounded-lg" />
        <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pg-onboarding min-h-screen bg-console-900 text-white" data-theme="dark">
      {/* Top shell */}
      <header className="flex h-14 items-center justify-between border-b border-console-line bg-console-900/95 px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-400/15 text-brand-300">
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">// Family Gateway</p>
            <p className="font-display text-[13.5px] font-bold text-white">Home Setup Wizard</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-console-line bg-console-800 py-1 pl-1 pr-4">
          <span className="grid size-7 place-items-center rounded-full bg-brand-400 text-[11px] font-bold text-console-900">
            {initials(sessionUser.name)}
          </span>
          <span className="text-[12.5px] text-white/60">
            Setting up for <strong className="font-semibold text-white">{sessionUser.name || 'your family'}</strong>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-6 py-10">
        <h1 className="font-display text-[28px] font-bold text-white">Let&apos;s secure your parent&apos;s home</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-white/55">
          Three quick steps: tell us about them, where they live, and share a floor plan — our AI will place the 24GHz
          mmWave sensors where fall risk is highest.
        </p>

        <div className="mt-8">{renderStepper()}</div>

        <div className="rounded-2xl border border-console-line bg-console-800/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          {/* ------------------------------ STEP 1 ------------------------------ */}
          {step === 1 && (
            <section className="p-6 md:p-8">
              <header className="mb-6">
                <h2 className="font-display text-[17px] font-bold text-white">Who are we protecting?</h2>
                <p className="mt-1 text-[13px] text-white/50">
                  This profile powers alert routing and appears on your family dashboard.
                </p>
                <Button size="sm" variant="secondary" className="mt-3" onPress={autofillDemo}>
                  Quick-fill test details
                </Button>
              </header>

              <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                {/* Photo */}
                <div className="md:col-span-2">
                  <FieldLabel>Senior Photo</FieldLabel>
                  <div className="flex items-center gap-4">
                    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-white/20 bg-console-700 text-[18px] font-bold text-white/40">
                      {photo ? (
                        <img src={photo} alt="senior" className="size-full object-cover" />
                      ) : (
                        '?'
                      )}
                    </div>
                    <div>
                      <Button size="sm" variant="secondary" onPress={() => photoInputRef.current?.click()}>
                        Upload Photo
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handlePhotoFile(e.target.files?.[0] || null)}
                      />
                      <p className="mt-2 text-[11px] text-white/35">
                        PNG or JPG. A friendly face makes alerts clearer.
                      </p>
                    </div>
                  </div>
                </div>

                <Field label="Full Name *" value={seniorName} onChange={setSeniorName} placeholder="e.g. Yusuf Khan" />
                <Field label="Age" type="number" value={age} onChange={setAge} placeholder="74" min={35} max={120} />

                <Field label="Gender" value={gender} onChange={setGender} select>
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Field>

                <Field label="Primary Language" value={language} onChange={setLanguage} select>
                  {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati', 'Punjabi'].map(
                    (l) => (
                      <option key={l}>{l}</option>
                    ),
                  )}
                </Field>

                {/* Conditions */}
                <div className="md:col-span-2">
                  <FieldLabel>Health Conditions (select all that apply)</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {CONDITION_OPTS.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => toggleCondition(opt)}
                        aria-pressed={conditions.includes(opt)}
                        className="rounded-full"
                      >
                        <Chip
                          size="sm"
                          variant={conditions.includes(opt) ? 'primary' : 'secondary'}
                          color={conditions.includes(opt) ? 'accent' : 'default'}
                        >
                          <Chip.Label>{opt}</Chip.Label>
                        </Chip>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobility */}
                <div className="md:col-span-2">
                  <FieldLabel>Mobility Profile</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {MOBILITY_OPTS.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setMobility(opt)}
                        aria-pressed={mobility === opt}
                        className="rounded-full"
                      >
                        <Chip
                          size="sm"
                          variant={mobility === opt ? 'primary' : 'secondary'}
                          color={mobility === opt ? 'accent' : 'default'}
                        >
                          <Chip.Label>{opt}</Chip.Label>
                        </Chip>
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Primary Care Physician" value={docName} onChange={setDocName} placeholder="Dr. Meera Iyer" />
                <Field label="Hospital / Clinic" value={docHosp} onChange={setDocHosp} placeholder="Manipal Hospital" />
                <Field label="Physician Phone" type="tel" value={docPhone} onChange={setDocPhone} placeholder="+91 80 XXXX XXXX" />
                <Field
                  label="Contact Relation to Senior"
                  value={ecRel}
                  onChange={setEcRel}
                  placeholder="Son — Primary Caregiver"
                />
                <Field label="Emergency Contact Name *" value={ecName} onChange={setEcName} placeholder="Rishabh Sharma" />
                <Field label="Emergency Contact Phone *" type="tel" value={ecPhone} onChange={setEcPhone} placeholder="+91 98XXX XXXXX" />
              </div>

              <ErrorLine message={err1} />
            </section>
          )}

          {/* ------------------------------ STEP 2 ------------------------------ */}
          {step === 2 && (
            <section className="p-6 md:p-8">
              <header className="mb-6">
                <h2 className="font-display text-[17px] font-bold text-white">Where do they live?</h2>
                <p className="mt-1 text-[13px] text-white/50">
                  Used by response teams and for building-entry logistics during emergencies.
                </p>
              </header>

              <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                <Field label="Flat / House No. *" value={flat} onChange={setFlat} placeholder="Flat 402, Tower B" />
                <Field
                  label="Area / Locality *"
                  value={area}
                  onChange={setArea}
                  placeholder="Prestige Shantiniketan, Whitefield"
                />
                <Field label="City *" value={city} onChange={setCity} placeholder="Bengaluru" />
                <Field label="Pincode *" value={pin} onChange={setPin} placeholder="560066" maxLength={6} inputMode="numeric" />
                <Field label="Building Type" value={buildingType} onChange={setBuildingType} select>
                  <option>Apartment Complex</option>
                  <option>Independent House</option>
                  <option>Assisted Living</option>
                </Field>
                <Field label="Floor Number" value={floor} onChange={setFloor} placeholder="4" />

                <div className="md:col-span-2">
                  <Switch isSelected={elevator} onChange={setElevator} aria-label="Elevator access available">
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <span className="text-[13px] text-white/80">Elevator access available</span>
                    </Switch.Content>
                  </Switch>
                </div>

                <Field label="Emergency Key / Lockbox Brand" value={lockBrand} onChange={setLockBrand} select>
                  <option value="">None installed</option>
                  <option>Yale Smart Lockbox</option>
                  <option>Samsung Digital Lock</option>
                  <option>Godrej Lockbox</option>
                  <option>Other</option>
                </Field>
                <Field
                  label="Lockbox Location / Access Notes"
                  value={lockLoc}
                  onChange={setLockLoc}
                  placeholder="Mounted on main door handle"
                />

                <div className="md:col-span-2">
                  <FieldLabel>Gate / Entry Notes (optional)</FieldLabel>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Visitor parking via Gate 2. Security desk knows the family."
                    className="w-full resize-none rounded-xl border border-console-line bg-console-900 px-3.5 py-2.5 text-[13.5px] text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-brand-400"
                  />
                </div>
              </div>

              <ErrorLine message={err2} />
            </section>
          )}

          {/* ------------------------------ STEP 3 ------------------------------ */}
          {step === 3 && (
            <section className="p-6 md:p-8">
              <header className="mb-6">
                <h2 className="font-display text-[17px] font-bold text-white">
                  Upload a floor plan — AI places the sensors
                </h2>
                <p className="mt-1 text-[13px] text-white/50">
                  Our spatial analysis engine scans the schematic, finds high-risk fall zones and recommends 24GHz
                  mmWave placements.
                </p>
              </header>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="secondary" onPress={() => void handleSample()} isDisabled={scanning}>
                  Load Sample 2BHK Floor Plan
                </Button>
                <Button size="sm" variant="primary" onPress={() => void runAnalysis()} isDisabled={scanning || !schematic}>
                  Run AI Spatial Analysis
                </Button>
                {fileTag && <span className="text-[11px] text-white/40">{fileTag}</span>}
              </div>

              {/* Dropzone */}
              <div
                onClick={() => planInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).classList.add('drag');
                }}
                onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('drag')}
                onDrop={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).classList.remove('drag');
                  handlePlanFile(e.dataTransfer.files?.[0] || null);
                }}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-console-line bg-console-900/60 px-6 py-10 text-center transition-colors hover:border-brand-400/50"
              >
                <svg viewBox="0 0 24 24" className="mx-auto mb-3 size-7 fill-white/25" aria-hidden>
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                <p className="text-[14px] font-semibold text-white/80">Drop your house layout here, or click to browse</p>
                <p className="mt-1 text-[12px] text-white/35">
                  PNG · JPG · SVG · a phone photo of a hand-drawn plan works too
                </p>
                <input
                  ref={planInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => handlePlanFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Plan + scan HUD */}
              {planVisible && (
                <div className="relative mt-4 overflow-hidden rounded-2xl border border-console-line bg-console-900">
                  <img
                    ref={planImgRef}
                    src={schematic?.dataUrl}
                    alt="House floor plan schematic"
                    className="block w-full select-none"
                  />

                  {/* Risk zone overlays */}
                  {sensors.map((s: any, i: number) => (
                    <div
                      key={`zone-${s.id}`}
                      className={`pointer-events-none absolute rounded-[3px] border border-dashed transition-opacity duration-500 ${
                        RISK_ZONE_STYLE[s.risk] ?? RISK_ZONE_STYLE.medium
                      } ${i < revealedCount ? 'opacity-100' : 'opacity-0'}`}
                      style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}
                    />
                  ))}

                  {/* Sensor pins */}
                  {sensors.map((s: any, i: number) => (
                    <Tooltip key={`pin-${s.id}`} delay={120}>
                      <button
                        type="button"
                        className={`absolute z-10 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold text-white shadow-lg transition-all duration-500 ${
                          RISK_PIN_STYLE[s.risk] ?? RISK_PIN_STYLE.medium
                        } ${i < revealedCount ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                        style={{ left: `${s.px}%`, top: `${s.py}%` }}
                        aria-label={`Sensor ${i + 1} — ${s.room}`}
                      >
                        {i + 1}
                      </button>
                      <Tooltip.Content>
                        <p className="text-xs font-semibold">Sensor #{i + 1}</p>
                        <p className="text-xs opacity-70">
                          {s.room} — {s.zone} @ {s.confidence}% confidence
                        </p>
                      </Tooltip.Content>
                    </Tooltip>
                  ))}

                  {/* Scan sweep */}
                  {scanFxRun && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <div className="absolute inset-x-0 h-16 animate-pulse bg-gradient-to-b from-brand-300/25 to-transparent" />
                      <div className="absolute inset-x-0 h-px animate-[scan_1.6s_linear_infinite] bg-brand-300/80" />
                    </div>
                  )}

                  {/* HUD */}
                  {hudVisible && (
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-brand-400/30 bg-console-900/85 px-2.5 py-1.5 backdrop-blur">
                      <span className="size-1.5 animate-pulse rounded-full bg-brand-300" />
                      <span className="font-mono text-[10.5px] font-semibold tracking-wider text-brand-200">
                        {scanStatus}
                      </span>
                    </div>
                  )}

                  {/* Console */}
                  {consoleVisible && (
                    <div className="absolute bottom-0 left-0 right-0 max-h-32 overflow-y-auto border-t border-console-line bg-console-900/92 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/55 backdrop-blur">
                      {scanConsoleLines.map((l, i) => (
                        <div key={i}>{l}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {summaryVisible && (
                <p className="mt-4 rounded-xl border border-signal-ok/25 bg-signal-ok/10 px-4 py-3 text-[12.5px] text-signal-ok">
                  <b>
                    {sensors.length} high-risk zones identified (
                    {sensors.filter((s: any) => s.risk === 'critical').length} critical)
                  </b>{' '}
                  — {sensors.length} x 24GHz mmWave sensors recommended. Hover any sensor pin to inspect its placement.
                </p>
              )}

              <ErrorLine message={err3} />
            </section>
          )}

          {/* Footer nav */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-console-line px-6 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onPress={handleBack} isDisabled={step === 1}>
                Back
              </Button>
              <span className="text-[11px] text-white/30">Saved locally on this device · data/auth-db.json</span>
            </div>
            <Button size="sm" variant="primary" onPress={handleNext} isDisabled={step === 3 && !analyzed}>
              {step < 3 ? 'Continue' : analyzed ? 'Finish Setup & Launch Dashboard' : 'Complete AI Analysis First'}
            </Button>
          </footer>
        </div>
      </main>

      {/* Busy overlay */}
      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-console-900/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <span className="size-9 animate-spin rounded-full border-2 border-brand-300/25 border-t-brand-300" />
            <p className="text-[13px] text-white/60">Saving home setup…</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-console-line bg-console-800 px-4 py-2.5 text-[13px] text-white/85 shadow-[0_14px_40px_rgba(0,0,0,0.6)]">
          {toast}
        </div>
      )}
    </div>
  );
}