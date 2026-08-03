import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ParkingCircle } from 'lucide-react';
import { LoadingState } from '@/components/ui/states';
import { PRODUCT_NAME } from '@/app/brand';

/** Minimal, mobile-first chrome for unauthenticated customer pages. */
export function PublicLayout() {
  return (
    <div className="app-surface flex min-h-full flex-col">
      <header className="border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center px-4">
          <span className="flex items-center gap-2 font-bold text-brand-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-white">
              <ParkingCircle className="h-5 w-5" />
            </span>
            {PRODUCT_NAME}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
