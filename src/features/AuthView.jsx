import { useState } from 'react';
import { AlertTriangle, Lock, Mail, ShieldCheck, Store, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatAuthError } from '../utils/authErrors.js';

export function AuthView() {
  const { login, register, authError } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    requestedRole: 'cashier',
    setupCode: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-100 lg:grid-cols-[minmax(420px,1fr)_1.2fr]">
      <section className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-green-100 text-green-700">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Grocery POS</h1>
              <p className="text-sm text-slate-500">
                {mode === 'login' ? 'စနစ်ထဲသို့ ဝင်ရောက်ရန်' : 'အသုံးပြုသူအသစ် ဖန်တီးရန်'}
              </p>
            </div>
          </div>

          {(error || authError) && <AuthErrorPanel error={error || authError} />}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Field icon={UserRound} label="အမည်">
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(event) => update('displayName', event.target.value)}
                  className="input-control pl-10"
                  placeholder="ဥပမာ - Manager"
                />
              </Field>
            )}

            <Field icon={Mail} label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                className="input-control pl-10"
                placeholder="admin@example.com"
              />
            </Field>

            <Field icon={Lock} label="Password">
              <input
                required
                minLength={6}
                type="password"
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                className="input-control pl-10"
                placeholder="••••••••"
              />
            </Field>

            {mode === 'register' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field icon={ShieldCheck} label="Role">
                  <select
                    value={form.requestedRole}
                    onChange={(event) => update('requestedRole', event.target.value)}
                    className="input-control pl-10"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
                <Field icon={Lock} label="Setup code">
                  <input
                    type="password"
                    value={form.setupCode}
                    onChange={(event) => update('setupCode', event.target.value)}
                    className="input-control pl-10"
                    placeholder="optional unless configured"
                  />
                </Field>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-green-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? 'စောင့်ပါ...' : mode === 'login' ? 'ဝင်မည်' : 'အကောင့်ဖန်တီးမည်'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((prev) => (prev === 'login' ? 'register' : 'login'));
              setError('');
            }}
            className="mt-5 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {mode === 'login' ? 'အကောင့်အသစ် ဖန်တီးရန်' : 'ရှိပြီးသားအကောင့်ဖြင့် ဝင်ရန်'}
          </button>
        </div>
      </section>

      <section className="hidden bg-green-800 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-200">Operations</p>
          <h2 className="mt-4 max-w-2xl text-5xl font-extrabold leading-tight">
            POS, inventory, reports, and audit trail in one console.
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {['Stock control', 'Role guard', 'CSV export'].map((item) => (
            <div key={item} className="rounded-lg border border-white/20 bg-white/10 p-4 font-semibold">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuthErrorPanel({ error }) {
  const normalized =
    typeof error === 'string'
      ? {
          title: 'Authentication မအောင်မြင်ပါ',
          body: error,
          action: 'Firebase configuration နှင့် Sign-in provider ကိုစစ်ပါ။',
          code: ''
        }
      : error;

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-bold">{normalized.title}</p>
          <p className="mt-1 leading-6">{normalized.body}</p>
          <p className="mt-2 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-red-700">
            {normalized.action}
          </p>
          {normalized.code && <p className="mt-2 font-mono text-[11px] text-red-500">{normalized.code}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        {children}
      </span>
    </label>
  );
}
