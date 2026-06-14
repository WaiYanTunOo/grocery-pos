import { useMemo, useRef, useState } from 'react';
import { HashRouter, Navigate, NavLink, Outlet, Route, Routes, useOutletContext } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Warehouse
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataProvider.jsx';
import { isFirebaseConfigured, missingFirebaseKeys } from './firebase.js';
import { AuthView } from './features/AuthView.jsx';
import { POSView } from './features/POSView.jsx';
import { InventoryView } from './features/InventoryView.jsx';
import { ReportsView } from './features/ReportsView.jsx';
import { AuditLogView } from './features/AuditLogView.jsx';
import { LoadingScreen } from './components/LoadingScreen.jsx';
import { Toast } from './components/Toast.jsx';

const navItems = [
  { to: '/pos', label: 'အရောင်း', icon: ShoppingCart, roles: ['cashier', 'admin'] },
  { to: '/inventory', label: 'ပစ္စည်းစာရင်း', icon: Warehouse, roles: ['admin'] },
  { to: '/reports', label: 'အစီရင်ခံစာ', icon: BarChart3, roles: ['admin'] },
  { to: '/audit', label: 'Audit', icon: ClipboardList, roles: ['admin'] }
];

export default function GroceryApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <AuthGate />
      </HashRouter>
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (!isFirebaseConfigured) return <ConfigMissing />;
  if (loading) return <LoadingScreen />;
  if (!user) return <AuthView />;

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POSView />} />
          <Route element={<AdminOnly />}>
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/audit" element={<AuditLogView />} />
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

function AppShell() {
  const { user, profile, role, logout } = useAuth();
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const availableNav = useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [role]
  );

  const notify = (message, tone = 'success') => {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="no-print border-b border-green-800 bg-green-700 text-white shadow-sm">
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
              <Store className="h-6 w-6" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-base font-bold">မိသားစု ကုန်စုံဆိုင်</h1>
              <p className="truncate text-xs text-green-100">Enterprise POS Console</p>
            </div>
          </div>

          <nav className="flex min-w-0 flex-1 justify-center gap-1">
            {availableNav.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>

          <div className="flex items-center gap-2 border-l border-green-600 pl-3">
            <div className="hidden text-right md:block">
              <p className="max-w-48 truncate text-xs font-semibold">{profile?.displayName || user.email}</p>
              <p className="text-[11px] uppercase tracking-wide text-green-200">{role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-md p-2 hover:bg-green-600"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet context={{ notify }} />
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          'flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition',
          isActive ? 'bg-green-900 text-white' : 'text-green-50 hover:bg-green-600'
        ].join(' ')
      }
      title={item.label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">{item.label}</span>
    </NavLink>
  );
}

function AdminOnly() {
  const { isAdmin } = useAuth();
  const outletContext = useOutletContext();
  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-4 h-14 w-14 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900">Admin ခွင့်ပြုချက် လိုအပ်ပါသည်</h2>
          <p className="mt-2 text-sm text-slate-500">
            ဤစာမျက်နှာသည် မန်နေဂျာ/အုပ်ချုပ်သူ အကောင့်များအတွက်သာ ဖြစ်ပါသည်။
          </p>
        </div>
      </div>
    );
  }

  return <Outlet context={outletContext} />;
}

function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-red-700">
          <Package className="h-7 w-7" />
          <h1 className="text-xl font-bold">Firebase configuration မပြည့်စုံပါ</h1>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          `.env` ထဲမှာ အောက်ပါ Vite variables များထည့်ပြီး dev server ကိုပြန်စပါ။
        </p>
        <div className="mt-4 rounded-md bg-slate-100 p-3 text-sm font-mono text-slate-800">
          {missingFirebaseKeys.map((key) => (
            <div key={key}>VITE_FIREBASE_{key.replace(/([A-Z])/g, '_$1').toUpperCase()}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
