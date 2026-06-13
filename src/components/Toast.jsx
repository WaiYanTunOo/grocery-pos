import { CheckCircle2, Info, X } from 'lucide-react';

export function Toast({ message, tone = 'success', onClose }) {
  if (!message) return null;
  const Icon = tone === 'success' ? CheckCircle2 : Info;
  const styles =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-green-200 bg-green-50 text-green-800';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border bg-white shadow-xl">
      <div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${styles}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 opacity-70 hover:bg-white/70 hover:opacity-100"
          aria-label="Close"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
