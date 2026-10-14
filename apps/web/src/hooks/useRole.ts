'use client';

// React Imports
import { useCallback, useEffect, useState } from 'react';

// Config Imports
import { roleOrder } from '@/configs/accessControl';
import type { AppRole, RoleScope } from '@/configs/accessControl';

/**
 * Client-side role switching for the template.
 *
 *  - `role`      : the currently *viewed* role, persisted in localStorage.
 *  - `scope`     : คณะ/หลักสูตรของบทบาทนั้น (ผู้ดูแลคณะ → คณะ · อาจารย์ → คณะ + หลักสูตร)
 *  - `setRole`   : switch the viewed role (+ its scope).
 *  - `useIsAdmin`: whether the signed-in account may switch roles at all — gates the toggle.
 *
 * This only controls what the UI *shows*. Real enforcement lives in
 * src/middleware.ts + src/configs/accessControl.ts.
 *
 * ⚠️ Placeholder: `useIsAdmin` returns true and the scope is picked by hand. Wire both to the
 *    real session (e.g. `useAuthUser()` / the user's ERP permissions) before shipping.
 */
export type { AppRole, RoleScope };

const STORAGE_KEY = 'app-view-role';
const SCOPE_KEY = 'app-view-scope';
const ROLE_EVENT = 'app-view-role-change';
const NO_SCOPE: RoleScope = { faculty: null, program: null };

const readScope = (): RoleScope => {
  try {
    const raw = localStorage.getItem(SCOPE_KEY);

    return raw ? { ...NO_SCOPE, ...(JSON.parse(raw) as Partial<RoleScope>) } : NO_SCOPE;
  } catch {
    return NO_SCOPE;
  }
};

export const useRole = () => {
  // Default to 'user' on the server + first client render to avoid hydration mismatch.
  const [role, setRoleState] = useState<AppRole>('user');
  const [scope, setScopeState] = useState<RoleScope>(NO_SCOPE);
  /** อ่านบทบาทจาก localStorage แล้ว — ก่อนหน้านั้น role ยังเป็นค่าเริ่มต้น */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(STORAGE_KEY) as AppRole | null;

      if (stored && roleOrder.includes(stored)) {
        setRoleState(stored);
      }

      setScopeState(readScope());
      setReady(true);
    };

    read();
    window.addEventListener(ROLE_EVENT, read);
    window.addEventListener('storage', read);

    return () => {
      window.removeEventListener(ROLE_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);

  const setRole = useCallback((next: AppRole, nextScope: RoleScope = NO_SCOPE) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(SCOPE_KEY, JSON.stringify(nextScope));
    } catch {
      // โหมดส่วนตัว — สลับได้เฉพาะหน้านี้
    }

    setRoleState(next);
    setScopeState(nextScope);
    window.dispatchEvent(new Event(ROLE_EVENT));
  }, []);

  return { role, scope, ready, setRole };
};

// TODO: replace with a real check against the authenticated user's permissions.
export const useIsAdmin = (): boolean => true;
