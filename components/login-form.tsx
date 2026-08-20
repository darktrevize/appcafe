'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from '@/lib/auth-actions';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Ingresando…' : 'Ingresar'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<LoginState, FormData>(login, undefined);

  return (
    <Card className="w-full max-w-sm">
      <h1 className="mb-1 text-lg font-semibold text-neutral-100">Control de Stock — Tostado de Café</h1>
      <p className="mb-4 text-sm text-neutral-400">Ingresá la contraseña para continuar</p>

      {state?.error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required autoFocus />
        </div>
        <SubmitButton />
      </form>
    </Card>
  );
}
