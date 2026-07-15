import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  MapPin,
  Menu,
  ParkingCircle,
  UserCircle,
  X,
} from 'lucide-react';
import { useAuth, useLogout } from '@/features/auth/hooks';
import { useGuardLocations } from '@/features/guard/useGuardLocations';
import { cn } from '@/components/ui/cn';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/states';
import {
  getAuthorizedWorkspaces,
  getNavigationGroups,
  getWorkspaceById,
  getWorkspaceForPath,
  isActiveNavigationItem,
  type NavigationGroup,
  type NavigationItem,
  type WorkspaceDefinition,
  type WorkspaceId,
} from '@/app/workspaces';

const COLLAPSED_KEY = 'parkingsaas.shell.sidebarCollapsed.v1';

export function AppShell({ workspaceId }: { workspaceId: WorkspaceId }) {
  const { user } = useAuth();
  const logout = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsedPreference);

  const authorizedWorkspaces = useMemo(() => getAuthorizedWorkspaces(user?.roles), [user?.roles]);
  const routeWorkspace = getWorkspaceForPath(location.pathname);
  const activeWorkspace = routeWorkspace ?? getWorkspaceById(workspaceId);
  const navigationGroups = getNavigationGroups(activeWorkspace, user?.roles);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // Local storage can be unavailable in private browsing or embedded contexts.
    }
  }, [sidebarCollapsed]);

  const switchWorkspace = (workspace: WorkspaceDefinition) => {
    navigate(workspace.defaultPath);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };

  return (
    <div
      className={cn(
        'app-surface min-h-screen lg:grid',
        sidebarCollapsed ? 'lg:grid-cols-[4.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[16rem_minmax(0,1fr)]',
      )}
    >
      <DesktopSidebar
        activeWorkspace={activeWorkspace}
        authorizedWorkspaces={authorizedWorkspaces}
        collapsed={sidebarCollapsed}
        groups={navigationGroups}
        pathname={location.pathname}
        onCollapseChange={setSidebarCollapsed}
        onWorkspaceSelect={switchWorkspace}
      />

      <div className="min-w-0">
        <MobileHeader
          activeWorkspace={activeWorkspace}
          buttonRef={menuButtonRef}
          onOpenNavigation={() => setDrawerOpen(true)}
        />
        <DesktopTopBar
          activeWorkspace={activeWorkspace}
          userName={user?.fullName || user?.email || 'Account'}
          email={user?.email}
          logout={logout}
        />

        <main className="w-full max-w-[1320px] scroll-pt-24 px-4 py-5 sm:px-5 lg:px-6 lg:py-7 xl:px-8">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileNavigationDrawer
        activeWorkspace={activeWorkspace}
        authorizedWorkspaces={authorizedWorkspaces}
        groups={navigationGroups}
        logout={logout}
        open={drawerOpen}
        pathname={location.pathname}
        userName={user?.fullName || user?.email || 'Account'}
        email={user?.email}
        onClose={closeDrawer}
        onNavigate={closeDrawer}
        onWorkspaceSelect={(workspace) => {
          setDrawerOpen(false);
          switchWorkspace(workspace);
          window.setTimeout(() => menuButtonRef.current?.focus(), 0);
        }}
      />
    </div>
  );
}

function DesktopSidebar({
  activeWorkspace,
  authorizedWorkspaces,
  collapsed,
  groups,
  pathname,
  onCollapseChange,
  onWorkspaceSelect,
}: {
  activeWorkspace: WorkspaceDefinition;
  authorizedWorkspaces: WorkspaceDefinition[];
  collapsed: boolean;
  groups: NavigationGroup[];
  pathname: string;
  onCollapseChange: (collapsed: boolean) => void;
  onWorkspaceSelect: (workspace: WorkspaceDefinition) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen min-h-0 border-r border-slate-200/80 bg-white/92 shadow-sm lg:flex lg:flex-col">
      <div className={cn('border-b border-slate-100', collapsed ? 'p-3' : 'p-4')}>
        <Link
          to={activeWorkspace.defaultPath}
          className={cn('flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', collapsed && 'justify-center')}
          aria-label="ParkingSaaS home"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white shadow-sm">
            <ParkingCircle className="h-6 w-6" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-4 text-slate-950">ParkingSaaS</span>
              <span className="block truncate text-xs text-slate-500">{activeWorkspace.contextLabel}</span>
            </span>
          )}
        </Link>
      </div>

      <div className={cn('space-y-5 border-b border-slate-100', collapsed ? 'p-3' : 'p-4')}>
        <WorkspaceSwitcher
          activeWorkspace={activeWorkspace}
          authorizedWorkspaces={authorizedWorkspaces}
          collapsed={collapsed}
          onSelect={onWorkspaceSelect}
        />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label={`${activeWorkspace.label} navigation`}>
        <SidebarNavigation groups={groups} pathname={pathname} collapsed={collapsed} />
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => onCollapseChange(!collapsed)}
          className={cn(
            'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}

function DesktopTopBar({
  activeWorkspace,
  userName,
  email,
  logout,
}: {
  activeWorkspace: WorkspaceDefinition;
  userName: string;
  email?: string;
  logout: ReturnType<typeof useLogout>;
}) {
  const showLocation = activeWorkspace.id === 'gate-operations';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 hidden h-16 items-center border-b border-white/70 bg-white/85 px-6 backdrop-blur-xl lg:flex',
        showLocation ? 'justify-between' : 'justify-end',
      )}
    >
      {showLocation && <GateLocationControl />}
      <UserMenu userName={userName} email={email} logout={logout} align="right" />
    </header>
  );
}

function GateLocationControl({ compact = false }: { compact?: boolean }) {
  const { locations, selectedId, selected, setLocation, isLoading } = useGuardLocations();

  if (isLoading) {
    return (
      <div className={cn('min-w-0 text-sm text-slate-500', compact ? 'px-1' : undefined)}>
        Loading working location...
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={cn('min-w-0 text-sm font-semibold text-amber-700', compact ? 'px-1' : undefined)}>
        No assigned working location
      </div>
    );
  }

  if (locations.length === 1) {
    return (
      <div className={cn('flex min-w-0 items-center gap-2 text-sm', compact ? 'rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200' : undefined)}>
        <MapPin className="h-4 w-4 shrink-0 text-brand-700" />
        <span className="font-semibold text-slate-600">Working location:</span>
        <span className="truncate font-bold text-slate-950">{selected?.name ?? locations[0].name}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-2', compact ? 'block space-y-2' : undefined)}>
      <label
        htmlFor={compact ? 'mobile-working-location' : 'desktop-working-location'}
        className="shrink-0 text-sm font-semibold text-slate-600"
      >
        Working location
      </label>
      <Select
        id={compact ? 'mobile-working-location' : 'desktop-working-location'}
        className={cn(compact ? 'max-w-none' : 'w-64')}
        value={selectedId ?? ''}
        onChange={(event) => {
          const nextLocation = event.target.value;
          if (!nextLocation || nextLocation === selectedId) return;
          const confirmed = window.confirm('Changing the working location updates gate workflows and may affect any in-progress form. Continue?');
          if (confirmed) setLocation(nextLocation);
        }}
        aria-label="Working location"
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function MobileHeader({
  activeWorkspace,
  buttonRef,
  onOpenNavigation,
}: {
  activeWorkspace: WorkspaceDefinition;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onOpenNavigation: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/70 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpenNavigation}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-4 text-slate-950">ParkingSaaS</p>
        <p className="truncate text-xs text-slate-500">{activeWorkspace.label}</p>
      </div>
    </header>
  );
}

function WorkspaceSwitcher({
  activeWorkspace,
  authorizedWorkspaces,
  collapsed = false,
  onSelect,
}: {
  activeWorkspace: WorkspaceDefinition;
  authorizedWorkspaces: WorkspaceDefinition[];
  collapsed?: boolean;
  onSelect: (workspace: WorkspaceDefinition) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const ActiveIcon = activeWorkspace.icon;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (authorizedWorkspaces.length <= 1) {
    return collapsed ? (
      <span
        className="group relative flex h-11 w-full items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100"
        title={activeWorkspace.label}
        aria-label={activeWorkspace.label}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
          {activeWorkspace.label}
        </span>
      </span>
    ) : (
      <div>
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">Workspace</p>
        <div className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <ActiveIcon className="h-4 w-4 text-brand-700" />
          {activeWorkspace.label}
        </div>
      </div>
    );
  }

  const onItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = authorizedWorkspaces.length - 1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowDown'
            ? index === lastIndex ? 0 : index + 1
            : index === 0 ? lastIndex : index - 1;
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <div ref={menuRef} className="relative">
      {!collapsed && <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">Workspace</p>}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-11 w-full items-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          collapsed ? 'justify-center px-0' : 'justify-between gap-2 px-3',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? `Workspace: ${activeWorkspace.label}` : undefined}
        title={collapsed ? activeWorkspace.label : undefined}
      >
        <span className={cn('flex min-w-0 items-center gap-2', collapsed && 'justify-center')}>
          <ActiveIcon className="h-4 w-4 shrink-0 text-brand-700" />
          {!collapsed && <span className="truncate">{activeWorkspace.label}</span>}
        </span>
        {!collapsed && <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 min-w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl',
            collapsed ? 'left-full top-0 ml-2' : 'left-0 right-0 top-[calc(100%+0.5rem)]',
          )}
        >
          {authorizedWorkspaces.map((workspace, index) => {
            const Icon = workspace.icon;
            const selected = workspace.id === activeWorkspace.id;
            return (
              <button
                key={workspace.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onKeyDown={(event) => onItemKeyDown(event, index)}
                onClick={() => {
                  setOpen(false);
                  onSelect(workspace);
                  buttonRef.current?.focus();
                }}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  selected ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {workspace.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarNavigation({
  groups,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  groups: NavigationGroup[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <SidebarNavigationGroup key={group.label} group={group} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function SidebarNavigationGroup({
  group,
  pathname,
  collapsed,
  onNavigate,
}: {
  group: NavigationGroup;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {!collapsed && <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-400">{group.label}</p>}
      <div className="space-y-1">
        {group.items.map((item) => (
          <SidebarNavigationItem key={item.to} item={item} active={isActiveNavigationItem(pathname, item)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function SidebarNavigationItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-visible:block">
          {item.label}
        </span>
      )}
    </Link>
  );
}

function UserMenu({
  userName,
  email,
  logout,
  align = 'left',
}: {
  userName: string;
  email?: string;
  logout: ReturnType<typeof useLogout>;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserCircle className="h-5 w-5 text-slate-500" />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-48 truncate text-sm font-semibold text-slate-800">{userName}</span>
          {email && <span className="block max-w-48 truncate text-xs text-slate-500">{email}</span>}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
            {email && <p className="truncate text-xs text-slate-500">{email}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout.mutate();
            }}
            className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileNavigationDrawer({
  activeWorkspace,
  authorizedWorkspaces,
  groups,
  logout,
  open,
  pathname,
  userName,
  email,
  onClose,
  onNavigate,
  onWorkspaceSelect,
}: {
  activeWorkspace: WorkspaceDefinition;
  authorizedWorkspaces: WorkspaceDefinition[];
  groups: NavigationGroup[];
  logout: ReturnType<typeof useLogout>;
  open: boolean;
  pathname: string;
  userName: string;
  email?: string;
  onClose: () => void;
  onNavigate: () => void;
  onWorkspaceSelect: (workspace: WorkspaceDefinition) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstFocusable = getFocusableElements(panelRef.current)[0];
    window.setTimeout(() => firstFocusable?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative flex h-full w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Application navigation"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <Link to={activeWorkspace.defaultPath} onClick={onNavigate} className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white shadow-sm">
              <ParkingCircle className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-4 text-slate-950">ParkingSaaS</span>
              <span className="block truncate text-xs text-slate-500">{activeWorkspace.contextLabel}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 border-b border-slate-100 p-4">
          <WorkspaceSwitcher
            activeWorkspace={activeWorkspace}
            authorizedWorkspaces={authorizedWorkspaces}
            onSelect={onWorkspaceSelect}
          />
          {activeWorkspace.id === 'gate-operations' && <GateLocationControl compact />}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-label={`${activeWorkspace.label} mobile navigation`}>
          <SidebarNavigation groups={groups} pathname={pathname} onNavigate={onNavigate} />
        </nav>

        <div className="border-t border-slate-100 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
            {email && <p className="truncate text-xs text-slate-500">{email}</p>}
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
}

function readCollapsedPreference() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}
