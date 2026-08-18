import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useAuth, homeRouteForRoles } from './hooks';
import { ChangePasswordForm } from './ChangePasswordForm';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="app-surface grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Change your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account is using a temporary password. Set a new one before continuing.
        </p>
        <div className="mt-7"><ChangePasswordForm onSuccess={(session) => navigate((location.state as { from?: string } | null)?.from ?? homeRouteForRoles(session.user.roles), { replace: true })} /></div>
      </Card>
    </div>
  );
}
