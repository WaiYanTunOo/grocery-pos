import { Package } from 'lucide-react';

export function LoadingScreen({ label = 'စနစ်ထဲသို့ ဝင်ရောက်နေပါသည်...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-green-800">
      <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-white px-5 py-4 shadow-sm">
        <Package className="h-6 w-6 animate-pulse" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}
