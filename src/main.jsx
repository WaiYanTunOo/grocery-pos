import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import GroceryApp from './GroceryApp.jsx';
import './index.css';

function AppError({ error, resetErrorBoundary }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">စနစ်ချို့ယွင်းမှု ဖြစ်ပေါ်သွားပါသည်</p>
        <h1 className="mt-2 text-xl font-bold">App ကိုပြန်လည်စတင်ရန် လိုအပ်နေသည်</h1>
        <p className="mt-3 max-h-32 overflow-auto rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </p>
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="mt-5 w-full rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          ပြန်ကြိုးစားမည်
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={AppError} onReset={() => window.location.reload()}>
      <GroceryApp />
    </ErrorBoundary>
  </React.StrictMode>
);
