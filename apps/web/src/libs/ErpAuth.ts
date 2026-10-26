import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { findMockUser } from '@/configs/mockUsers';

export const authOptions: NextAuthOptions = {
  providers: [
    // ล็อกอินจำลองช่วงพัฒนา (อีเมล + รหัสผ่านร่วม) — Backend แทน authorize ด้วยการตรวจจริง
    CredentialsProvider({
      id: 'mock',
      name: 'บัญชีจำลอง',
      credentials: { email: {}, password: {} },
      authorize(credentials) {
        const u = findMockUser(credentials?.email ?? '', credentials?.password ?? '');

        if (!u) return null;
        const [first, ...rest] = u.name.split(' ');

        return {
          id: u.email,
          name: u.name,
          email: u.email,
          STAFFNAME: first,
          STAFFSURNAME: rest.join(' '),
          role: u.role,
          scope: u.scope,
          avatar: u.avatar,
        };
      },
    }),
    {
      id: 'erpauth',
      name: 'erpauth',
      type: 'oauth',
      issuer: 'https://erp.msu.ac.th',
      clientId: process.env.AUTH_CLIENT_ID,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
      authorization: {
        url: 'https://erp.msu.ac.th/authen/oauth/_authorize',
        params: {
          grant_type: 'authorization_code',
          response_type: 'code',
          scope: '',
        },
      },
      token: 'https://erp.msu.ac.th/authen/oauth/token',
      userinfo: 'https://erp.msu.ac.th/authen/api/authuser?progcode=DigiPlan',
      profile(profile) {
        console.log('profile: ', profile);

        const { STAFFID, STAFFNAME, STAFFSURNAME, STAFFEMAIL1 } = profile;

        return {
          id: STAFFID,
          name: `${STAFFNAME} ${STAFFSURNAME}`,
          email: STAFFEMAIL1,
          ...profile,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.user = { ...user, access_token: account?.access_token };
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        ...token,
      };
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : `${baseUrl}/dashboard`;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
  },
};
