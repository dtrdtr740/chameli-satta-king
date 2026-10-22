import { redirect } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { getCurrentUser } from '@/lib/auth';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/admin');
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Admin login</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Sign in to manage results and content.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
