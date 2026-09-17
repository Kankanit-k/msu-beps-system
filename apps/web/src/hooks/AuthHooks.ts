import { useSession, signOut } from 'next-auth/react';

import type { StaffData } from '@/types/sessionTypes';

export const useAuthUser = () => {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  let validatedUser: StaffData | null = null;

  if (!isLoading && isAuthenticated && session?.user) {
    const currentUser = session.user;

    // console.log("useAuthUser: Raw user from session:", currentUser);

    // ตรวจสอบว่ามีข้อมูลผู้ใช้จาก ERP หรือไม่
    if (currentUser?.id || currentUser?.STAFFID) {
      validatedUser = currentUser;
    }
  } else if (!isLoading) {
    // กรณีไม่ได้ loading แต่ไม่ authenticated หรือไม่มี session.user
    console.log('useAuthUser: User not authenticated or session/user is missing.');
  }

  return {
    isLoading,
    isAuthenticated,
    user: validatedUser,
  };
};

export const useAuthMethod = () => {
  return {
    logout: signOut,
  };
};
