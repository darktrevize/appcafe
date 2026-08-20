'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, getExpectedSessionValue } from './auth';

export type LoginState = { error: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '');

  if (!password || password !== (process.env.APP_PASSWORD ?? '')) {
    return { error: 'Contraseña incorrecta' };
  }

  const value = await getExpectedSessionValue();
  cookies().set(AUTH_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // No maxAge/expires: session cookie, cleared when the browser closes.
  });

  redirect('/');
}
