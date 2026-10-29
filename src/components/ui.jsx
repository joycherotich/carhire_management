import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Inbox, X } from 'lucide-react';

/* ---------- Toasts ---------- */
const ToastCtx = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random();
    setItems((i) => [...i, { id, msg, type }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 print:hidden">
        {items.map((t) => (
          <div key={t.id} className="flex animate-fadeUp items-center gap-2 rounded-xl bg-midnight px-4 py-3 text-sm text-white shadow-xl">
            {t.type === 'error' ? <AlertTriangle size={16} className="text-bad" /> : <CheckCircle2 size={16} className="text-gold" />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Basics ---------- */
const TONES = { green: 'bg-good/10 text-good', red: 'bg-bad/10 text-bad', blue: 'bg-royal/10 text-royal', gold: 'bg-gold/15 text-[#8a6d2b]', slate: 'bg-slate-100 text-slate-600', amber: 'bg-amber-100 text-amber-700' };
export const Badge = ({ tone = 'slate', children }) => <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
const STATUS_TONE = { Inquiry: 'slate', 'Pending Confirmation': 'amber', Confirmed: 'blue', Active: 'green', Completed: 'gold', Cancelled: 'red', 'No-show': 'red', Paid: 'green', Partial: 'amber', Unpaid: 'red', Verified: 'green', Pending: 'amber', Unverified: 'slate' };
export const StatusBadge = ({ s }) => <Badge tone={STATUS_TONE[s] || 'slate'}>{s}</Badge>;

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="text-2xl font-semibold">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Section = ({ title, action, children, className = '' }) => (
  <div className={`card p-5 ${className}`}>
    {(title || action) && <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">{title}</h3>{action}</div>}
    {children}
  </div>
);

export const EmptyState = ({ title = 'Nothing here yet', text, action }) => (
  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
    <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Inbox size={22} /></div>
    <p className="font-medium text-slate-700">{title}</p>
    {text && <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
export function useLoading(ms = 350) {
  const [l, setL] = useState(typeof window !== 'undefined');
  useEffect(() => { const t = setTimeout(() => setL(false), ms); return () => clearTimeout(t); }, [ms]);
  return l;
}

export const Table = ({ head, children, empty }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="border-b border-slate-100 bg-slate-50/60"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
    {empty}
  </div>
);

export function KPI({ icon: Icon, label, value, delta, invert, hint }) {
  const good = delta == null ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <div className="card group animate-fadeUp p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy/5 text-navy transition group-hover:bg-navy group-hover:text-gold"><Icon size={19} /></div>
        {delta != null && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${good ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>
            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/* ---------- Modal / confirm ---------- */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 print:hidden">
      <div className="absolute inset-0 bg-midnight/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full animate-pop overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const ConfirmModal = ({ open, title, text, onConfirm, onClose, label = 'Delete' }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-sm text-slate-600">{text}</p>
    <div className="mt-6 flex justify-end gap-2">
      <button className="btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn-danger" onClick={() => { onConfirm(); onClose(); }}>{label}</button>
    </div>
  </Modal>
);

/* ---------- Forms ---------- */
export const Field = ({ label, error, children, className = '' }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    {children}
    {error && <p className="mt-1 text-xs text-bad">{error}</p>}
  </div>
);
const opts = (o = []) => o.map((x) => (typeof x === 'string' ? { value: x, label: x } : x));

export function FieldsForm({ fields, values, onChange, errors = {} }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = values[f.name] ?? '';
        const cls = f.full || f.type === 'textarea' ? 'sm:col-span-2' : '';
        if (f.type === 'checkbox')
          return <label key={f.name} className={`flex items-center gap-2 text-sm ${cls}`}><input type="checkbox" checked={!!values[f.name]} onChange={(e) => onChange(f.name, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-navy" />{f.label}</label>;
        return (
          <Field key={f.name} label={f.label + (f.required ? ' *' : '')} error={errors[f.name]} className={cls}>
            {f.type === 'select' ? (
              <select className="input" value={v} onChange={(e) => onChange(f.name, e.target.value)}>{opts(f.options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            ) : f.type === 'textarea' ? (
              <textarea rows={3} className="input" value={v} onChange={(e) => onChange(f.name, e.target.value)} placeholder={f.placeholder} />
            ) : (
              <input className="input" type={f.type || 'text'} value={v} min={f.type === 'number' ? 0 : undefined} step={f.step} placeholder={f.placeholder} onChange={(e) => onChange(f.name, e.target.value)} />
            )}
          </Field>
        );
      })}
    </div>
  );
}

export function validate(fields, v) {
  const e = {};
  fields.forEach((f) => {
    const x = v[f.name];
    if (f.required && (x === '' || x == null)) e[f.name] = 'Required';
    else if (f.type === 'number' && x !== '' && x != null && (Number.isNaN(Number(x)) || Number(x) < 0)) e[f.name] = 'Enter a valid number';
  });
  return e;
}

export function FormModal({ open, onClose, title, fields, initial = {}, onSubmit, submitLabel = 'Save', wide }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState({});
  const [formErr, setFormErr] = useState('');
  useEffect(() => { if (open) { setV(initial); setErr({}); setFormErr(''); } }, [open]); // eslint-disable-line
  const submit = (e) => {
    e.preventDefault();
    const er = validate(fields, v);
    setErr(er);
    if (Object.keys(er).length) return;
    const res = onSubmit(v);
    if (typeof res === 'string') setFormErr(res); else onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={title} wide={wide}>
      <form onSubmit={submit}>
        <FieldsForm fields={fields} values={v} errors={err} onChange={(k, x) => setV((p) => ({ ...p, [k]: x }))} />
        {formErr && <p className="mt-4 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{formErr}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary">{submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Date range ---------- */
export const RANGES = [['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year'], ['custom', 'Custom']];
export function RangeFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
        {RANGES.map(([k, l]) => (
          <button key={k} onClick={() => onChange({ ...value, key: k })} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${value.key === k ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      {value.key === 'custom' && (
        <>
          <input type="date" className="input !w-auto !py-1.5" value={value.from || ''} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <span className="text-slate-400">→</span>
          <input type="date" className="input !w-auto !py-1.5" value={value.to || ''} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </>
      )}
    </div>
  );
}
