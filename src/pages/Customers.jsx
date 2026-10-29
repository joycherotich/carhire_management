import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Plus, Repeat, Search, Users } from 'lucide-react';
import { useApp } from '../context';
import { BOOKED, EARNED, bookingTotal, paidFor } from '../lib/finance';
import { fdate, kes, sum } from '../lib/format';
import { EmptyState, FormModal, KPI, Modal, PageHeader, StatusBadge, Table, Field, useToast } from '../components/ui';

const fields = [
  { name: 'name', label: 'Full name', required: true, full: true }, { name: 'phone', label: 'Phone number', required: true }, { name: 'email', label: 'Email', type: 'email' },
  { name: 'idVerified', label: 'Verification status', type: 'select', options: ['Unverified', 'Pending', 'Verified'] }, { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Customers() {
  const { state, addCustomer, updateCustomer } = useApp();
  const { toast } = useToast();
  const [q, setQ] = useState(''), [open, setOpen] = useState(false), [sel, setSel] = useState(null), [note, setNote] = useState('');
  const stats = (c) => {
    const bs = state.bookings.filter((b) => b.customerId === c.id && BOOKED.includes(b.status));
    const earned = bs.filter((b) => EARNED.includes(b.status));
    const spent = sum(earned, bookingTotal);
    return { bs, count: bs.length, spent, owed: Math.max(0, spent - sum(earned, (b) => paidFor(b.id, state.payments))) };
  };
  const rows = state.customers.filter((c) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase())).map((c) => ({ c, ...stats(c) })).sort((a, b) => b.spent - a.spent);
  const repeat = rows.filter((r) => r.count > 1);
  const customer = sel && state.customers.find((c) => c.id === sel);
  const cs = customer && stats(customer);

  return (
    <>
      <PageHeader title="Customers" subtitle="Know who rents from you, and how reliably they pay." actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add Customer</button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KPI icon={Users} label="Customers" value={state.customers.length} /><KPI icon={Repeat} label="Repeat customers" value={repeat.length} hint={state.customers.length ? `${Math.round((repeat.length / state.customers.length) * 100)}% of base` : ''} />
        <KPI icon={Users} label="Top customer" value={rows[0]?.c.name || '—'} hint={rows[0] ? kes(rows[0].spent) : ''} />
      </div>
      <div className="card">
        <div className="border-b border-slate-100 p-4"><div className="relative"><Search size={16} className="absolute left-3.5 top-3 text-slate-400" /><input className="input !pl-10" placeholder="Search name, phone or email…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <Table head={['Customer', 'Phone', 'Bookings', 'Total spent', 'Outstanding', 'Verification']} empty={!rows.length && <EmptyState title="No customers" />}>
          {rows.map(({ c, count, spent, owed }) => (
            <tr key={c.id} onClick={() => { setSel(c.id); setNote(c.notes || ''); }} className="cursor-pointer hover:bg-slate-50/80">
              <td className="td font-medium text-navy">{c.name} {count > 1 && <span className="ml-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-[#8a6d2b]">Repeat</span>}</td><td className="td">{c.phone}</td><td className="td">{count}</td>
              <td className="td">{kes(spent)}</td><td className={`td ${owed > 0 ? 'font-medium text-bad' : ''}`}>{kes(owed)}</td><td className="td"><StatusBadge s={c.idVerified} /></td></tr>))}
        </Table>
      </div>
      <p className="mt-3 text-xs text-slate-500">Identification documents are not displayed here. Store them in restricted-access storage once the backend is connected.</p>

      <FormModal open={open} onClose={() => setOpen(false)} title="Add customer" fields={fields} initial={{ name: '', phone: '', email: '', idVerified: 'Unverified', notes: '' }} onSubmit={(v) => { addCustomer(v); toast('Customer added'); }} />
      <Modal open={!!customer} onClose={() => setSel(null)} title={customer?.name || ''} wide>
        {customer && <>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600"><span className="flex items-center gap-1"><Phone size={14} />{customer.phone}</span>{customer.email && <span className="flex items-center gap-1"><Mail size={14} />{customer.email}</span>}</div>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">{[['Bookings', cs.count], ['Spent', kes(cs.spent)], ['Owes', kes(cs.owed)]].map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className="font-semibold">{v}</p></div>)}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Verification"><select className="input" value={customer.idVerified} onChange={(e) => updateCustomer(customer.id, { idVerified: e.target.value })}>{['Unverified', 'Pending', 'Verified'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Notes"><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => updateCustomer(customer.id, { notes: note })} /></Field>
          </div>
          <h4 className="mb-2 mt-5 text-sm font-semibold">Booking history</h4>
          <ul className="divide-y divide-slate-100">{cs.bs.sort((a, b) => new Date(b.start) - new Date(a.start)).map((b) => <li key={b.id}><Link to={`/bookings/${b.id}`} className="flex items-center justify-between py-2 text-sm hover:text-royal"><span>{b.ref} · {b.type} · {fdate(b.start)}</span><span className="flex items-center gap-2">{kes(bookingTotal(b))}<StatusBadge s={b.status} /></span></Link></li>)}</ul>
          {!cs.bs.length && <p className="text-sm text-slate-500">No bookings yet.</p>}
        </>}
      </Modal>
    </>
  );
}
