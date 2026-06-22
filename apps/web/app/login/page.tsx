import { AuthForm } from '@/components/auth-form';

export default function LoginPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <AuthForm mode="login" />
    </main>
  );
}
