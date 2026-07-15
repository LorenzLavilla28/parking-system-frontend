import { Link } from 'react-router-dom';
import { ParkingCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="app-surface flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-sm">
        <ParkingCircle className="h-8 w-8" />
      </span>
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
      <Link to="/login">
        <Button variant="secondary">Go to sign in</Button>
      </Link>
    </div>
  );
}
