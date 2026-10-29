import { useMemo, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useApp } from '../context';
import { NON_OPERATING, PAY_METHODS, getRange } from '../lib/finance';
import { fdate, kes, sum, toDateInput } from '../lib/format';
import { Badge, ConfirmModal, EmptyState, FormModal, PageHeader, Table, useToast } from '../components/ui';

export default function Expenses() {
  const { scoped, state, addExpense, removeExpense, postRecurring } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false), [cat, setCat] = useState(''), [q, setQ] = useState(''), [del, setDel] = useState(null);
  const cats = state.settings.categories;
  const total = (key) => { const [a, b] = getRange(key); return sum(scoped.expenses.filter((e) => +new Date(e.date) >= +a && +new Date(e.date) <= +b && e.category !== 'Depreciation'), (e) => e.amount); };
  const rows = useMemo(() => scoped.expenses.filter((e) => (!cat || e.category === cat) && (!q || `${e.description} ${e.vendor}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => new Date(b.date) - new Date(a.date)), [scoped.expenses, cat, q]);
  const fields = [
    { name: 'category', label: 'Category', type: 'select', options: cats, required: true }, { name: 'amount', label: 'Amount (KES)', type: 'number', required: true },
    { name: 'description', label: 'Description', required: true, full: true }, { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'vehicleId', label: 'Vehicle', type: 'select', options: state.vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model}` })) },
    { name: 'bookingId', label: 'Related booking (optional)', type: 'select', options: [{ value: '', label: '— None —' }, ...state.bookings.map((b) => ({ value: b.id, label: b.ref }))] },
    { name: 'vendor', label: 'Vendor / supplier' }, { name: 'method', label: 'Payment method', type: 'select', options: PAY_METHODS },
    { name: 'recurring', label: 'Recurrence', type: 'select', options: [{ value: 'none', label: 'One-time' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }] },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <>
      <PageHeader title="Expenses" subtitle="Track what it costs to keep the car earning." actions={<>
        <button className="btn-ghost" onClick={() => { const n = postRecurring(); toast(n ? `Posted ${n} recurring expense(s)` : 'No recurring expenses due'); }}><RefreshCw size={15} />Post recurring</button>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add Expense</button></>} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year']].map(([k, l]) => (
          <div key={k} className="card p-5"><p className="text-xs uppercase tracking-wide text-slate-500">{l}</p><p className="mt-1 font-heading text-xl font-semibold">{kes(total(k))}</p></div>))}
      </div>
      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input className="input min-w-[200px] flex-1" placeholder="Search description or vendor…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <Table head={['Date', 'Category', 'Description', 'Vendor', 'Method', 'Amount', '']} empty={!rows.length && <EmptyState title="No expenses found" action={<button className="btn-primary" onClick={() => setOpen(true)}>Add expense</button>} />}>
          {rows.map((e) => (
            <tr key={e.id}><td className="td">{fdate(e.date)}</td>
              <td className="td"><Badge tone={NON_OPERATING.includes(e.category) ? 'gold' : 'blue'}>{e.category}</Badge>{e.recurring && e.recurring !== 'none' && <span className="ml-1 text-xs text-slate-400">↻ {e.recurring}</span>}</td>
              <td className="td max-w-[240px] truncate">{e.description}</td><td className="td">{e.vendor || '—'}</td><td className="td">{e.method}</td><td className="td font-medium">{kes(e.amount)}</td>
              <td className="td"><button onClick={() => setDel(e)} className="text-slate-400 hover:text-bad"><Trash2 size={15} /></button></td></tr>))}
        </Table>
      </div>
      <p className="mt-3 text-xs text-slate-500">Gold categories (loan interest, loan principal, depreciation) are not operating expenses — principal affects cash flow only; interest and depreciation have their own profit lines.</p>
      <FormModal open={open} onClose={() => setOpen(false)} title="Add expense" fields={fields} wide
        initial={{ category: 'Fuel', amount: '', description: '', date: toDateInput(new Date()), vehicleId: state.vehicles[0]?.id, bookingId: '', vendor: '', method: 'M-Pesa', recurring: 'none', notes: '' }}
        onSubmit={(v) => { addExpense({ ...v, amount: Number(v.amount), date: new Date(v.date).toISOString() }); toast('Expense added'); }} />
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Delete expense?" text={`${del?.category} — ${del ? kes(del.amount) : ''}. This can't be undone.`} onConfirm={() => { removeExpense(del.id); toast('Expense deleted'); }} />
    </>
  );
}
