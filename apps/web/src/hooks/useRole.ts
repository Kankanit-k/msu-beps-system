'use client';

// React Imports
import { useCallback, useEffect, useState } from 'react';

// Third-party Imports
import { useSession } from 'next-auth/react';

// Config Imports
import { DEFAULT_ROLE, roleOrder } from '@/configs/accessControl';
import type { AppRole, RoleScope } from '@/configs/accessControl';

/**
 * บทบาท + ขอบเขตของผู้ใช้ — มาจาก session ที่ล็อกอิน (บัญชีจำลอง configs/mockUsers.ts)
 * ล็อกอินแล้วสลับบทบาทไม่ได้ (มติประชุม) · ตัวสลับด้านล่างใช้ได้เฉพาะตอนปิด auth (AUTH_DISABLED) เท่านั้น
 *
 *  - `role`      : the currently *viewed* role, persisted in localStorage.
 *  - `scope`     : คณะ/หลักสูตรของบทบาทนั้น (ผู้บริหาร/เจ้าหน้าที่คณะ → คณะ · อาจารย์ → คณะ + หลักสูตร)
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
// ฝั่ง client ของ AUTH_DISABLED (configs/authBypass)
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
const noop = () => {};

/** ล้างบทบาทที่เลือกไว้ตอนปิด auth — เรียกตอนล็อกอิน/ออก ไม่ให้ค่าเก่าค้าง */
export const clearViewRole = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SCOPE_KEY);
  } catch {
    // โหมดส่วนตัว
  }
};

const readScope = (): RoleScope => {
  try {
    const raw = localStorage.getItem(SCOPE_KEY);

    return raw ? { ...NO_SCOPE, ...(JSON.parse(raw) as Partial<RoleScope>) } : NO_SCOPE;
  } catch {
    return NO_SCOPE;
  }
};

export const useRole = () => {
  const { data: session, status } = useSession();
  const account = session?.user;
  // Default role on the server + first client render to avoid hydration mismatch.
  const [role, setRoleState] = useState<AppRole>(DEFAULT_ROLE);
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

  if (account?.role && roleOrder.includes(account.role)) {
    return { role: account.role, scope: account.scope ?? NO_SCOPE, ready: true, setRole: noop };
  }

  // ยังไม่ปิด auth แต่ session ยังโหลดไม่เสร็จ/ไม่มีบทบาท → ยังไม่พร้อม (RoleGuard ไม่เรนเดอร์หน้า)
  return { role, scope, ready: ready && AUTH_DISABLED && status !== 'loading', setRole };
};

/** แสดงตัวสลับ "มุมมองสิทธิ์" ได้ไหม — เฉพาะตอนปิด auth (demo) · ล็อกอินจริงใช้บัญชีทดสอบแทน */
export const useIsAdmin = (): boolean => AUTH_DISABLED;
