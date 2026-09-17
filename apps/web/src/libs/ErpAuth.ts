import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
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
