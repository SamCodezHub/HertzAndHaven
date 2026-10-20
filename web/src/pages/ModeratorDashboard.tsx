import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Skeleton } from '@heroui/react';
import { useSession } from '../hooks/useSession';
import { haversine } from '../lib/geo';
import ModeratorMap, { type MapHospital, type MapMachine, type MapTeam } from '../components/moderator/ModeratorMap';
import { AlertFeedPanel, type ModeratorAlert } from '../components/moderator/AlertFeedPanel';
import ResponseDrawer, { type ResponseTeam } from '../components/moderator/ResponseDrawer';

/* -------------------------------------------------------------------------- */
/* Reference data                                                             */
/* -------------------------------------------------------------------------- */
const HOSPITALS: MapHospital[] = [
  { id: 'H001', name: 'Manipal Hospital', addr: 'Old Airport Road', lat: 12.9612, lng: 77.6412 },
  { id: 'H002', name: 'Apollo Hospital', addr: 'Bannerghatta Road', lat: 12.8888, lng: 77.5991 },
  { id: 'H003', name: 'Narayana Health', addr: 'Bommasandra', lat: 12.821, lng: 77.683 },
  { id: 'H004', name: 'Fortis Hospital', addr: 'Bannerghatta Road', lat: 12.893, lng: 77.596 },
  { id: 'H005', name: 'Ramaiah Hospital', addr: 'New BEL Road', lat: 13.0265, lng: 77.564 },
  { id: 'H006', name: 'Vydehi Hospital', addr: 'Whitefield', lat: 12.972, lng: 77.748 },
];

const MACHINES: Omit<MapMachine, 'alerted'>[] = [
  { id: 'M001', name: 'Fall Sensor A', area: 'MG Road', lat: 12.9758, lng: 77.6085, phone: '+919876543210' },
  { id: 'M002', name: 'Motion Tracker B', area: 'Whitefield', lat: 12.9698, lng: 77.75, phone: '+919876543211' },
  { id: 'M003', name: 'Radar Unit C', area: 'Electronic City', lat: 12.8453, lng: 77.6602, phone: '+919876543212' },
  { id: 'M004', name: 'Fall Sensor D', area: 'Indiranagar', lat: 12.9784, lng: 77.6408, phone: '+919876543213' },
  { id: 'M005', name: 'Motion Tracker E', area: 'Koramangala', lat: 12.9352, lng: 77.6245, phone: '+919876543214' },
  { id: 'M006', name: 'Radar Unit F', area: 'Hebbal', lat: 13.0358, lng: 77.597, phone: '+919876543215' },
  { id: 'M007', name: 'Fall Sensor G', area: 'Jayanagar', lat: 12.9293, lng: 77.5843, phone: '+919876543216' },
  { id: 'M008', name: 'Motion Tracker H', area: 'Marathahalli', lat: 12.9562, lng: 77.6976, phone: '+919876543217' },
  { id: 'M009', name: 'Radar Unit I', area: 'Yelahanka', lat: 13.1007, lng: 77.5763, phone: '+919876543218' },
  { id: 'M010', name: 'Fall Sensor J', area: 'Bannerghatta Road', lat: 12.893, lng: 77.596, phone: '+919876543219' },
  { id: 'M011', name: 'Motion Tracker K', area: 'HSR Layout', lat: 12.9116, lng: 77.6389, phone: '+919876543220' },
  { id: 'M012', name: 'Radar Unit L', area: 'Sarjapur Road', lat: 12.9081, lng: 77.6839, phone: '+919876543221' },
];

const TEAM_SEEDS = [
  { id: 'T001', name: 'Alpha Response', crew: 'Dr. Priya, Nurse Ravi', lat: 12.9758, lng: 77.6085 },
  { id: 'T002', name: 'Bravo Medic', crew: 'Dr. Arjun, EMT Kavitha', lat: 12.9698, lng: 77.75 },
  { id: 'T003', name: 'Charlie First Aid', crew: 'Dr. Sneha, Nurse Manoj', lat: 12.8453, lng: 77.6602 },
  { id: 'T004', name: 'Delta Medic', crew: 'Dr. Vikram, EMT Deepa', lat: 13.0358, lng: 77.597 },
  { id: 'T005', name: 'Echo Care', crew: 'Dr. Anita, Nurse Suresh', lat: 12.9293, lng: 77.5843 },
  { id: 'T006', name: 'Foxtrot Response', crew: 'Dr. Kiran, EMT Lakshmi', lat: 12.9562, lng: 77.6976 },
];

/* -------------------------------------------------------------------------- */
export default function ModeratorDashboard() {
  const { status, user, signOut } = useSession();
  const navigate = useNavigate();

  const [machines, setMachines] = useState<MapMachine[]>([]);
  const [alerts, setAlerts] = useState<ModeratorAlert[]>([]);
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedAlert, setSelectedAlert] = useState<ModeratorAlert | null>(null);
  const [focusMachineId, setFocusMachineId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);

  /* Role gate — moderators only */
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    if (user.role !== 'moderator') {
      navigate('/family-dashboard', { replace: true });
    }
  }, [status, user, navigate]);

  /* Seed state */
  useEffect(() => {
    setMachines(MACHINES.map((m) => ({ ...m, alerted: false })));
    setTeams(
      TEAM_SEEDS.map((t) => ({
        ...t,
        dist: 0,
        deployed: false,
      })),
    );
  }, []);

  const pushNotification = useCallback((title: string, body: string) => {
    setNotification({ title, body });
    window.setTimeout(() => setNotification((n) => (n && n.title === title ? null : n)), 4000);
  }, []);

  /* Alert showcase */
  const triggerAlert = useCallback(() => {
    setMachines((prev) => {
      const candidates = prev.filter((m) => !m.alerted);
      if (!candidates.length) return prev;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const alert: ModeratorAlert = {
        id: `a${Date.now()}`,
        machineId: target.id,
        machineName: target.name,
        area: target.area,
        message: 'High velocity anomaly detected — immediate review required.',
        time: 'just now',
        resolved: false,
        severity: 'critical',
      };
      setAlerts((a) => [alert, ...a]);
      pushNotification(`Alert — ${target.name}`, `${target.area} · Velocity spike detected`);
      return prev.map((m) => (m.id === target.id ? { ...m, alerted: true } : m));
    });
  }, [pushNotification]);

  const handleMachineClick = useCallback((machine: MapMachine) => {
    if (!machine.alerted) {
      setFocusMachineId(machine.id);
      return;
    }
    const existing = alerts.find((a) => a.machineId === machine.id && !a.resolved);
    if (existing) {
      setSelectedAlert(existing);
      setFocusMachineId(machine.id);
    }
  }, [alerts]);

  const selectAlert = useCallback((alert: ModeratorAlert) => {
    setSelectedAlert(alert);
    setFocusMachineId(alert.machineId);
  }, []);

  const resolveAlert = useCallback((alert: ModeratorAlert) => {
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, resolved: true } : a)));
    setMachines((prev) => prev.map((m) => (m.id === alert.machineId ? { ...m, alerted: false } : m)));
    setSelectedAlert(null);
    setFocusMachineId(null);
    pushNotification('Alert resolved', `${alert.machineName} marked as false alarm`);
  }, [pushNotification]);

  const deployTeam = useCallback(
    (teamId: string) => {
      setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, deployed: true } : t)));
      const team = teams.find((t) => t.id === teamId);
      if (team) pushNotification('Team deployed', `${team.name} en route to incident`);
    },
    [teams, pushNotification],
  );

  const availableTeams = useMemo(() => {
    if (!selectedAlert) return [];
    const machine = machines.find((m) => m.id === selectedAlert.machineId);
    if (!machine) return [];
    return teams
      .filter((t) => !t.deployed)
      .map((t) => ({ ...t, dist: haversine(machine.lat, machine.lng, t.lat, t.lng) }))
      .sort((a, b) => a.dist - b.dist);
  }, [selectedAlert, machines, teams]);

  const mapTeams: MapTeam[] = useMemo(
    () => teams.map((t) => ({ id: t.id, name: t.name, crew: t.crew, lat: t.lat, lng: t.lng, deployed: t.deployed })),
    [teams],
  );

  if (status === 'loading') {
    return (
      <div className="pg-moderator flex h-screen flex-col bg-console-900" data-theme="dark">
        <Skeleton className="h-12 w-full rounded-none" />
        <div className="grid flex-1 grid-cols-[300px_1fr]">
          <Skeleton className="h-full rounded-none" />
          <Skeleton className="h-full rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="pg-moderator flex h-screen flex-col overflow-hidden bg-console-900 text-white" data-theme="dark">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-console-line bg-console-900 px-4">
        <div className="flex items-center gap-3">
          <span className="size-2.5 rounded-full bg-signal-ok" />
          <span className="font-display text-[14px] font-bold text-white">Elderly Accident Prevention</span>
          <Button size="sm" variant="danger" onPress={triggerAlert}>
            Alert Showcase
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/55">
            moderator · <strong className="text-white/85">{user?.name ?? 'mod'}</strong>
          </span>
          <Button size="sm" variant="ghost" onPress={() => void signOut()}>
            Logout
          </Button>
        </div>
      </header>

      {/* Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="min-h-0 border-r border-console-line">
          <AlertFeedPanel
            alerts={alerts}
            machines={machines}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectAlert={selectAlert}
          />
        </aside>

        <main className="relative min-h-0">
          <ModeratorMap
            machines={machines}
            hospitals={HOSPITALS}
            teams={mapTeams}
            onMachineClick={handleMachineClick}
            focusMachineId={focusMachineId}
          />

          {/* Response drawer */}
          {selectedAlert && (
            <div className="absolute inset-y-0 right-0 z-[600] w-full max-w-[360px] shadow-[-20px_0_60px_rgba(0,0,0,0.55)]">
              <ResponseDrawer
                alert={selectedAlert}
                machine={machines.find((m) => m.id === selectedAlert.machineId) ?? null}
                teams={availableTeams}
                onClose={() => {
                  setSelectedAlert(null);
                  setFocusMachineId(null);
                }}
                onResolve={resolveAlert}
                onDeployTeam={deployTeam}
              />
            </div>
          )}
        </main>
      </div>

      {/* Toast notification */}
      {notification && (
        <div className="fixed left-1/2 top-16 z-[700] w-[320px] -translate-x-1/2 rounded-xl border border-console-line bg-console-800 p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          <p className="text-[13px] font-bold text-white">{notification.title}</p>
          <p className="mt-0.5 text-[12px] text-white/55">{notification.body}</p>
        </div>
      )}
    </div>
  );
}
