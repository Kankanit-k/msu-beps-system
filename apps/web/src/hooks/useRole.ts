'use client';

// React Imports
import { useCallback, useEffect, useState } from 'react';

// Config Imports
import type { AppRole } from '@/configs/accessControl';

/**
 * Client-side role switching for the template.
 *
 *  - `role`      : the currently *viewed* role, persisted in localStorage.
 *  - `setRole`   : switch the viewed role (used by the sidebar footer toggle).
 *  - `useIsAdmin`: whether the signed-in account may switch roles at all — gates the toggle.
 *
 * This only controls what the sidebar *shows*. Real enforcement lives in
 * src/middleware.ts + src/configs/accessControl.ts.
 *
 * ⚠️ Placeholder: `useIsAdmin` returns true. Wire it to the real session
 *    (e.g. `useAuthUser()` / the user's ERP permissions) before shipping.
 */
export type { AppRole };

const STORAGE_KEY = 'app-view-role';
const ROLE_EVENT = 'app-view-role-change';
const VALID_ROLES: AppRole[] = ['user', 'deptAdmin', 'universityAdmin'];

export const useRole = () => {
  // Default to 'user' on the server + first client render to avoid hydration mismatch.
  const [role, setRoleState] = useState<AppRole>('user');

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(STORAGE_KEY) as AppRole | null;

      if (stored && VALID_ROLES.includes(stored)) {
        setRoleState(stored);
      }
    };

    read();
    window.addEventListener(ROLE_EVENT, read);
    window.addEventListener('storage', read);

    return () => {
      window.removeEventListener(ROLE_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);

  const setRole = useCallback((next: AppRole) => {
    localStorage.setItem(STORAGE_KEY, next);
    setRoleState(next);
    window.dispatchEvent(new Event(ROLE_EVENT));
  }, []);

  return { role, setRole };
};

// TODO: replace with a real check against the authenticated user's permissions.
export const useIsAdmin = (): boolean => true;
