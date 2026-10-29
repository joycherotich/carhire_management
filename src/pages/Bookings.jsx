import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useApp } from '../context';
import { BOOKING_STATUSES, RENTAL_TYPES, balanceFor, bookingTotal, payStatus } from '../lib/finance';
import { fdt, kes } from '../lib/format';
import { EmptyState, PageHeader, StatusBadge, Table, Badge } from '../components/ui';
import BookingForm from '../components/BookingForm';

export default function Bookings() {
  const { scoped, custName } = useApp();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(''), [status, setStatus] = useState(''), [type, setType] = useState('');
  const [open, setOpen] = useState(sp.get('new') === '1');
  const close = () => { setOpen(false); if (sp.get('new')) setSp({}); };
  const rows = scoped.bookings
    .filter((b) => (!status || b.status === status) && (!type || b.type === type) && (!q || `${b.ref} ${custName(b.customerId)}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => new Date(b.start) - new Date(a.start));

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every rental, from inquiry to completion." actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />New Booking</button>} />
      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3.5 top-3 text-slate-400" /><input className="input !pl-10" placeholder="Search reference or customer…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{RENTAL_TYPES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <Table head={['Reference', 'Customer', 'Type', 'Pickup', 'Return', 'Total', 'Payment', 'Status']} empty={!rows.length && <EmptyState title="No bookings found" text="Adjust the filters or create a new booking." />}>
          {rows.map((b) => (
            <tr key={b.id} onClick={() => nav(`/bookings/${b.id}`)} className="cursor-pointer transition hover:bg-slate-50/80">
              <td className="td font-medium text-navy">{b.ref}</td><td className="td">{custName(b.customerId)}</td><td className="td">{b.type}</td>
              <td className="td">{fdt(b.start)}</td><td className="td">{fdt(b.end)}</td><td className="td font-medium">{kes(bookingTotal(b))}</td>
              <td className="td">{['Cancelled', 'No-show', 'Inquiry'].includes(b.status) ? '—' : <Badge tone={{ Paid: 'green', Partial: 'amber', Unpaid: 'red' }[payStatus(b, scoped.payments)]}>{payStatus(b, scoped.payments)}{balanceFor(b, scoped.payments) > 0 ? ` · ${kes(balanceFor(b, scoped.payments))} due` : ''}</Badge>}</td>
              <td className="td"><StatusBadge s={b.status} /></td>
            </tr>
          ))}
        </Table>
      </div>
      <BookingForm open={open} onClose={close} onCreated={(id) => nav(`/bookings/${id}`)} />
    </>
  );
}
