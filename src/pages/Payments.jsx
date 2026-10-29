import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Landmark, Plus, RotateCcw, Wallet } from 'lucide-react';
import { useApp } from '../context';
import { EARNED, PAY_METHODS, balanceFor, bookingTotal } from '../lib/finance';
import { fdate, kes, sum, toDateInput } from '../lib/format';
import { Badge, ConfirmModal, EmptyState, FormModal, KPI, PageHeader, Section, Table, useToast } from '../components/ui';

const TYPE = { payment: ['Payment', 'green'], deposit: ['Deposit in', 'gold'], deposit_refund: ['Deposit refund', 'slate'], refund: ['Refund', 'red'] };

export default function Payments() {
  const { scoped, state, addPayment, removePayment } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false), [filter, setFilter] = useState(''), [del, setDel] = useState(null);
  const ref = (id) => state.bookings.find((b) => b.id === id);
  const rows = scoped.payments.filter((p) => !filter || p.type === filter).sort((a, b) => new Date(b.date) - new Date(a.date));
  const received = sum(scoped.payments.filter((p) => p.type === 'payment'), (p) => p.amount) - sum(scoped.payments.filter((p) => p.type === 'refund'), (p) => p.amount);
  const held = sum(scoped.payments.filter((p) => p.type === 'deposit'), (p) => p.amount) - sum(scoped.payments.filter((p) => p.type === 'deposit_refund'), (p) => p.amount);
  const owing = scoped.bookings.filter((b) => EARNED.includes(b.status)).map((b) => ({ b, bal: balanceFor(b, scoped.payments) })).filter((x) => x.bal > 0).sort((a, b) => b.bal - a.bal);
  const billed = sum(scoped.bookings.filter((b) => EARNED.includes(b.status)), bookingTotal);

  const bookingOpts = useMemo(() => scoped.bookings.filter((b) => !['Cancelled', 'No-show'].includes(b.status)).map((b) => ({ value: b.id, label: `${b.ref} · ${state.customers.find((c) => c.id === b.customerId)?.name}` })), [scoped.bookings, state.customers]);
  const fields = [
    { name: 'bookingId', label: 'Booking', type: 'select', options: bookingOpts, required: true, full: true },
    { name: 'type', label: 'Type', type: 'select', options: [{ value: 'payment', label: 'Rental payment' }, { value: 'deposit', label: 'Security deposit received' }, { value: 'deposit_refund', label: 'Deposit refund' }, { value: 'refund', label: 'Rental refund' }] },
    { name: 'amount', label: 'Amount (KES)', type: 'number', required: true }, { name: 'method', label: 'Method', type: 'select', options: PAY_METHODS },
    { name: 'reference', label: 'Reference' }, { name: 'date', label: 'Date', type: 'date', required: true },
  ];

  return (
    <>
      <PageHeader title="Income & Payments" subtitle="Every shilling in, every balance outstanding." actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Record Payment</button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI icon={Wallet} label="Received" value={kes(received)} hint="Net of refunds" />
        <KPI icon={Banknote} label="Outstanding" value={kes(owing.reduce((s, x) => s + x.bal, 0))} hint={`${owing.length} unpaid booking(s)`} />
        <KPI icon={Landmark} label="Deposits held" value={kes(held)} hint="Liability — not profit" />
        <KPI icon={RotateCcw} label="Collection rate" value={`${billed ? Math.round((received / billed) * 100) : 0}%`} hint="Received ÷ billed" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-4"><h3 className="text-sm font-semibold">Transactions</h3>
            <select className="input !w-auto !py-1.5" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All types</option>{Object.entries(TYPE).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <Table head={['Date', 'Booking', 'Type', 'Method', 'Reference', 'Amount', '']} empty={!rows.length && <EmptyState title="No transactions" />}>
            {rows.map((p) => (
              <tr key={p.id}><td className="td">{fdate(p.date)}</td><td className="td"><Link className="text-royal hover:underline" to={`/bookings/${p.bookingId}`}>{ref(p.bookingId)?.ref}</Link></td>
                <td className="td"><Badge tone={TYPE[p.type][1]}>{TYPE[p.type][0]}</Badge></td><td className="td">{p.method}</td><td className="td font-mono text-xs">{p.reference || '—'}</td>
                <td className="td font-medium">{kes(p.amount)}</td><td className="td"><button className="text-xs text-slate-400 hover:text-bad" onClick={() => setDel(p)}>Remove</button></td></tr>))}
          </Table>
        </div>
        <Section title="Outstanding balances">
          {owing.length ? <ul className="divide-y divide-slate-100">{owing.map(({ b, bal }) => (
            <li key={b.id}><Link to={`/bookings/${b.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-royal"><div><p className="font-medium">{state.customers.find((c) => c.id === b.customerId)?.name}</p><p className="text-xs text-slate-500">{b.ref}</p></div><b className="text-bad">{kes(bal)}</b></Link></li>))}</ul> : <EmptyState title="All settled" />}
        </Section>
      </div>
      <FormModal open={open} onClose={() => setOpen(false)} title="Record payment" fields={fields}
        initial={{ bookingId: bookingOpts[0]?.value, type: 'payment', amount: '', method: 'M-Pesa', reference: '', date: toDateInput(new Date()) }}
        onSubmit={(v) => { const e = addPayment({ ...v, amount: Number(v.amount), date: new Date(v.date).toISOString() }); if (!e) toast('Payment recorded'); return e || undefined; }} />
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Remove payment?" text="This permanently removes the payment record and changes the booking balance." label="Remove" onConfirm={() => { removePayment(del.id); toast('Payment removed'); }} />
    </>
  );
}
