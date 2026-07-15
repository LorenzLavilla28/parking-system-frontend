# ParkingSaaS Frontend

React SPA for the ParkingSaaS platform. One codebase with route-based layouts for the
public, guard, tenant-admin, and platform-admin areas.

## Stack
- React 19 + Vite 6 + TypeScript (strict)
- React Router 7 (role-based layouts + guards)
- TanStack Query 5 (server state) + Axios typed client
- React Hook Form + Zod (forms & validation)
- Tailwind CSS 4 (responsive; large tap targets for guard tablets/phones)
- Zustand (auth/token store, persisted)
- Vitest + Testing Library (unit/component)

## Getting started
```bash
npm install
npm run dev        # http://localhost:5173
```
The dev server expects the backend API at `http://localhost:8080` (see `.env.development`,
`VITE_API_BASE_URL`). Start the backend from `../parking-system-backend` first.

```bash
npm run build      # typecheck (tsc -b) + production bundle to dist/
npm test           # Vitest unit/component tests
npm run typecheck  # types only
```

## Layout
```
src/
├── app/            router, layouts (PublicLayout, AppShell), ProtectedRoute, providers
├── lib/
│   ├── api/        Axios client (envelope unwrap, Problem Details, refresh rotation), types
│   ├── auth/       Zustand auth store + types
│   └── query/      TanStack Query client
├── features/
│   ├── auth/       login page, schema, hooks, api
│   ├── public/     customer pages (Phase 2)
│   ├── guard/      guard interface (Phase 3)
│   ├── tenant-admin/   admin (Phase 4)
│   └── platform-admin/ platform (Phase 5)
├── components/ui/  Button, Input, Card, Alert, Spinner, FormField
└── test/           Vitest setup
```

## Implemented (Phases 1–5)
- **Foundation**: typed Axios client (envelope unwrap, RFC 7807 → `ApiError`, JWT attach,
  single-flight refresh rotation), persisted Zustand auth store, login (RHF + Zod), role-based
  routing behind `ProtectedRoute`, base UI components, TanStack Query.
- **Public customer**: `/location/:slug` plate lookup (CAPTCHA/throttle/multiple handling),
  `/p/:token` masked session page with live fee breakdown → quote → PayMongo checkout redirect,
  `/payment/:reference/status` polling until confirmed.
- **Guard**: working-location switcher, vehicle entry (printable QR ticket), session search,
  exit validation (big PAID/NOT PAID/ADDITIONAL banner), cash payment with change, payment-QR
  display, supervisor force-exit override.
- **Tenant admin**: dashboard, locations CRUD, users (roles + location assignments), rate plans
  (create with rules JSON + versions), read-only sessions. Reports = backend Phase 6 placeholder.
- **Platform admin**: tenants list/create/status, system health (API + DB readiness).
- **Code-split** per route (React.lazy + Suspense) so public pages stay ~1–2 KB gzip each.

Run `npm run build` and `npm test` — both green (31 Vitest tests).

## API contract
See [../docs/API.md](../docs/API.md). Dev CORS origin `http://localhost:5173` is already
allowed by the backend's `appsettings.Development.json`.
