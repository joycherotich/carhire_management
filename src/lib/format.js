import { format } from 'date-fns';

export const kes = (n = 0) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;
export const short = (n = 0) => {
  const a = Math.abs(n);
  return a >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`;
};
export const num = (n = 0, d = 0) => (Number(n) || 0).toLocaleString('en-KE', { maximumFractionDigits: d });
export const pct = (n = 0, d = 1) => `${(Number(n) || 0).toFixed(d)}%`;
export const fdate = (d) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');
export const fdt = (d) => (d ? format(new Date(d), 'dd MMM yyyy, HH:mm') : '—');
export const toInput = (d) => format(new Date(d), "yyyy-MM-dd'T'HH:mm");
export const toDateInput = (d) => format(new Date(d), 'yyyy-MM-dd');
export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
export const sum = (arr, fn = (x) => x) => arr.reduce((s, x) => s + (Number(fn(x)) || 0), 0);

export const toCSV = (cols, rows) =>
  [cols, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

export function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// Safe storage (works in SSR/tests and private mode)
export const store = {
  get(k, fallback = null) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
