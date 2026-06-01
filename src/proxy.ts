import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('auth_session');

  // Allow the sync API to run without a session if a secure API key is provided
  if (pathname === '/api/imports/sync') {
    const apiKey = request.nextUrl.searchParams.get('apiKey');
    const systemApiKey = process.env.SYNC_API_KEY || 'cuong_resort_sync_default_token_123';
    if (apiKey === systemApiKey) {
      return NextResponse.next();
    }
  }

  // Define paths that are public
  const isLoginPage = pathname === '/login';

  // If user is trying to access dashboard/reports but has no session, redirect to login
  if (!hasSession && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    // Remember where they wanted to go
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and visits login page, redirect to dashboard
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Intercept all routes except static assets and standard API auth paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication APIs if any)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - mock_google_drive (local assets)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|mock_google_drive).*)',
  ],
};
