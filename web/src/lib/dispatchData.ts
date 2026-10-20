import type { DispatchHospital, DispatchTeam } from '../types/domain';

/** Bengaluru centre point used by every map surface. */
export const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

/** Default residence anchor — Flat 402, Prestige Shantiniketan, Whitefield. */
export const HOME_SITE: { lat: number; lng: number } = { lat: 12.9698, lng: 77.7500 };

export const DISPATCH_HOSPITALS: DispatchHospital[] = [
  { id: 'H001', name: 'Manipal Hospital', addr: 'Old Airport Road, Bengaluru', lat: 12.9612, lng: 77.6412 },
  { id: 'H002', name: 'Apollo Hospital', addr: 'Bannerghatta Road, Bengaluru', lat: 12.8888, lng: 77.5991 },
  { id: 'H003', name: 'Narayana Health', addr: 'Bommasandra, Bengaluru', lat: 12.821, lng: 77.683 },
  { id: 'H004', name: 'Fortis Hospital', addr: 'Bannerghatta Road, Bengaluru', lat: 12.893, lng: 77.596 },
  { id: 'H005', name: 'Ramaiah Hospital', addr: 'New BEL Road, Bengaluru', lat: 13.0265, lng: 77.564 },
  { id: 'H006', name: 'Vydehi Hospital', addr: 'Whitefield, Bengaluru', lat: 12.972, lng: 77.748 },
];

export const DISPATCH_TEAMS: DispatchTeam[] = [
  { id: 'T001', name: 'Alpha Response', crew: 'Dr. Priya, Nurse Ravi', lat: 12.9758, lng: 77.6085 },
  { id: 'T002', name: 'Bravo Medic', crew: 'Dr. Arjun, EMT Kavitha', lat: 12.9698, lng: 77.75 },
  { id: 'T003', name: 'Charlie First Aid', crew: 'Dr. Sneha, Nurse Manoj', lat: 12.8453, lng: 77.6602 },
];

export const AMBULANCE_UNIT = 'ALS Unit #KA-53-MC-1204';
export const DISPATCH_ORIGIN = 'Manipal Hospital Emergency Wing, Bengaluru';

/** Ambient traffic multipliers by Bengaluru corridor. */
export const TRAFFIC_ZONES: Record<string, number> = {
  'MG Road': 1.6,
  Whitefield: 1.4,
  'Electronic City': 1.3,
  Indiranagar: 1.5,
  Koramangala: 1.7,
  Hebbal: 1.3,
  Jayanagar: 1.4,
  Marathahalli: 1.8,
  Yelahanka: 1.2,
  'Bannerghatta Rd': 1.5,
  'HSR Layout': 1.4,
  'Sarjapur Road': 1.3,
  default: 1.4,
};

export const FEED_MESSAGES = {
  approaching: [
    'En route to patient. Traffic moderate.',
    'Navigating current route. ETA updated.',
    'Almost at the scene.',
    'Approaching from the north.',
  ],
  arrived: [
    'Arrived at patient location. Assessing.',
    'On scene. Patient stable. Beginning assessment.',
    'Reached the location. Checking vitals.',
  ],
  transporting: [
    'Patient loaded. Heading to {hospital}. ETA {eta} min.',
    'Ambulance mobile. Patient stable. Route clear.',
    'Transporting to {hospital}. Moderate traffic.',
  ],
  traffic: [
    'Heavy traffic on current road.',
    'Signal delay. +2 min to ETA.',
    'Clear road ahead.',
    'Slowly progressing through market area.',
  ],
  arriving: [
    'Approaching {hospital}. Preparing handoff.',
    'Almost at hospital. ER team alerted.',
    '500m from {hospital}. Final approach.',
  ],
  atHospital: [
    'Patient handed over to ER at {hospital}.',
    'Transfer complete at {hospital}.',
    'Mission complete. Patient stable at {hospital}.',
  ],
} as const;

export type FeedCategory = keyof typeof FEED_MESSAGES;

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function fillTemplate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}
