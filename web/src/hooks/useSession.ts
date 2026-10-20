import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { electronAPI } from '../lib/api';
import type { Profile, SessionInfo, SessionUser } from '../types/domain';

export interface SessionState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: SessionUser | null;
  profile: Profile | null;
  session: SessionInfo | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Loads the active session + profile and keeps the profile fresh.
 * `requireOnboarding` bounces caregivers into the setup wizard until
 * the home configuration has been completed.
 */
export function useSession(options?: { requireOnboarding?: boolean }): SessionState {
  const { requireOnboarding = false } = options ?? {};
  const navigate = useNavigate();
  const [status, setStatus] = useState<SessionState['status']>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await electronAPI.session();
      if (!s) {
        setStatus('anonymous');
        navigate('/', { replace: true });
        return;
      }
      setUser(s.user);
      setProfile(s.profile);
      setSession(s.session ?? null);
      setStatus('authenticated');
      if (requireOnboarding && !s.profile?.onboarding?.completed) {
        navigate('/onboarding', { replace: true });
      }
    } catch {
      setStatus('anonymous');
      navigate('/', { replace: true });
    }
  }, [navigate, requireOnboarding]);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = useCallback(async () => {
    try {
      await electronAPI.signOut();
    } catch {
      /* the local session is cleared regardless */
    }
    sessionStorage.removeItem('currentUser');
    navigate('/', { replace: true });
  }, [navigate]);

  return { status, user, profile, session, refresh: load, signOut };
}
