/**
 * Hertz & Haven — shared domain types.
 * Mirrors the shapes persisted by the browser auth store (src/lib/api.ts).
 */

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Sensor {
  id: string;
  room: string;
  zone: string;
  risk: RiskLevel;
  /** Zone box geometry, percentages of the schematic canvas */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pin anchor, percentages of the schematic canvas */
  px: number;
  py: number;
  confidence: number;
  baseHeight: number;
}

export interface EmergencyContact {
  priority: number;
  name: string;
  relation: string;
  phone: string;
}

export interface Physician {
  name: string;
  hospital: string;
  phone: string;
}

export interface SeniorProfile {
  name: string;
  relation: string;
  age: number | null;
  gender: string;
  language: string;
  conditions: string[];
  mobility: string;
  photo: string | null;
  address: string;
  roomLocation: string;
  monitoredZones: string[];
  emergencyContacts: EmergencyContact[];
  physician: Physician;
}

export interface Residence {
  flat: string;
  area: string;
  city: string;
  pincode: string;
  buildingType: string;
  floor: string;
  elevator: boolean;
  lockboxBrand: string;
  lockboxLocation: string;
}

export interface NotificationPreferences {
  pushAlerts: boolean;
  smsFallback: boolean;
  voiceCall: boolean;
  dailySummary: boolean;
}

export interface RadarHardware {
  label: string;
  location: string;
  statusText: string;
  online: boolean;
  frequency: string;
  lastHeartbeat: string | null;
}

export interface SmartLockHardware {
  label: string;
  doorLocation: string;
  otpEnabled: boolean;
  otpLength: number;
  otpRotationMinutes: number;
  currentOtp: string | null;
  otpValidUntil: string | null;
}

export interface Hardware {
  mmwaveRadar: RadarHardware;
  smartLock: SmartLockHardware;
}

export interface Schematic {
  name: string;
  dataUrl: string;
}

export interface OnboardingState {
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  schematic: Schematic | null;
  sensors: Sensor[];
}

export interface CaregiverProfile {
  name: string;
  relation: string;
  phone: string;
  email: string;
  notificationPreferences: NotificationPreferences;
}

export interface Profile {
  caregiver: CaregiverProfile;
  senior: SeniorProfile;
  residence: Residence;
  onboarding: OnboardingState;
  hardware: Hardware;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isDemo: boolean;
}

export interface SessionInfo {
  token: string;
  remember: boolean;
  expiresAt: string;
}

/* -------------------------------------------------------------------------- */
/* Emergency dispatch domain                                                  */
/* -------------------------------------------------------------------------- */

export type EmergencyPhase = 'idle' | 'fall' | 'calling' | 'dispatching' | 'en_route' | 'arriving';

export interface AuditEntry {
  ts: string;
  text: string;
  cls: '' | 'alert' | 'ok' | 'head';
}

export interface DispatchHospital {
  id: string;
  name: string;
  addr: string;
  lat: number;
  lng: number;
}

export interface DispatchTeam {
  id: string;
  name: string;
  crew: string;
  lat: number;
  lng: number;
}

export interface IncidentLogEntry {
  id: string;
  sensorId: string;
  sensorRoom: string;
  sensorZone: string;
  timestamp: string;
  timeline: AuditEntry[];
  dispatch: {
    unit: string;
    paramedic: string;
    origin: string;
    destination: string;
    otpUsed: string;
    distance: string;
    eta: string;
  };
}
