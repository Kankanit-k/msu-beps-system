// Next Imports
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Third-party Imports
import { getToken } from 'next-auth/jwt';

// Config Imports
import { accessLevelRank, requiredLevelFor, resolveUserLevel } from '@/configs/accessControl';
import { AUTH_DISABLED } from '@/configs/authBypass';
import themeConfig from '@configs/themeConfig';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const required = requiredLevelFor(pathname);

  // Public routes (and the dev bypass) skip all checks.
  if (required === 'public' || AUTH_DISABLED) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not signed in → send to login, remembering where they were headed.
  if (!token) {
    const loginUrl = req.nextUrl.clone();

    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('callbackUrl', pathname);

    return NextResponse.redirect(loginUrl);
  }

  // Signed in but not allowed here → bounce to the home page.
  if (accessLevelRank[resolveUserLevel(token)] < accessLevelRank[required]) {
    const homeUrl = req.nextUrl.clone();

    homeUrl.pathname = themeConfig.homePageUrl;
    homeUrl.search = '';

    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except the auth API, Next internals, and static files.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
