export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {Icon && <Icon className="mb-3 h-12 w-12 text-slate-300" />}
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
