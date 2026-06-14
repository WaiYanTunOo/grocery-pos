import { useEffect, useState } from 'react';
import { Activity, AlertCircle, Clock, Search, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { subscribeAuditLogs } from '../services/firestoreService.js';
import { dateTime } from '../utils/format.js';
import { EmptyState } from '../components/EmptyState.jsx';

export function AuditLogView() {
  const { storeId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAuditLogs(
      storeId,
      (items) => {
        setLogs(items);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message || 'Audit log loading failed.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [storeId]);

  const visibleLogs = logs.filter((log) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return `${log.actorEmail || ''} ${log.action || ''} ${log.details || ''}`.toLowerCase().includes(term);
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Activity className="h-5 w-5 text-indigo-700" />
              Audit trail
            </h1>
            <p className="mt-1 text-sm text-slate-500">နောက်ဆုံးလုပ်ဆောင်ချက် ၁၅၀ ခုကို စစ်ဆေးနိုင်ပါသည်။</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input-control pl-10"
              placeholder="User, action, detail"
            />
          </div>
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-4">
            <EmptyState icon={Clock} title="မှတ်တမ်းများ ရယူနေပါသည်" />
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Activity} title="Audit log မရှိသေးပါ" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      အချိန်
                    </span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      User
                    </span>
                  </th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">အသေးစိတ်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{dateTime(log.timestamp)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{log.actorEmail || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs font-bold ${actionStyle(log.action)}`}>
                        {log.action || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function actionStyle(action) {
  switch (action) {
    case 'LOGIN':
      return 'bg-blue-50 text-blue-700';
    case 'LOGOUT':
      return 'bg-slate-100 text-slate-700';
    case 'ADD_PRODUCT':
      return 'bg-green-50 text-green-700';
    case 'UPDATE_PRODUCT':
      return 'bg-amber-50 text-amber-700';
    case 'DELETE_PRODUCT':
      return 'bg-red-50 text-red-700';
    case 'SALE':
      return 'bg-indigo-50 text-indigo-700';
    case 'REGISTER':
      return 'bg-teal-50 text-teal-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
