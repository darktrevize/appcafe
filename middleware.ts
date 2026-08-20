import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, isValidSessionValue } from '@/lib/auth';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (await isValidSessionValue(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}
