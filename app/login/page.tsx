import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <LoginForm />
    </div>
  );
}
