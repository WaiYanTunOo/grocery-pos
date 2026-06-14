export const CURRENCY = 'Ks';

export function money(value, options = {}) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  const rounded = options.keepDecimals ? amount : Math.round(amount);
  return `${rounded.toLocaleString('en-US', {
    maximumFractionDigits: options.keepDecimals ? 2 : 0
  })} ${CURRENCY}`;
}

export function quantity(value, max = 3) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Number(amount.toFixed(max)).toLocaleString('en-US', {
    maximumFractionDigits: max
  });
}

export function dateTime(value) {
  const timestamp = toMillis(value);
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function todayISO() {
  return localDateISO(new Date());
}

export function localDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
  }
  return 0;
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
