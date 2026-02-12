import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Check if user is logged in via cookie
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  
  // Protect the main page
  if (pathname === '/' && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect logged-in users from login page to main page
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
