import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarPlus, FileText, Plus, Printer, Receipt } from 'lucide-react';
import { useApp } from '../context';
import { BLOCKING, balanceFor, bookingTotal, calcOvertime, calcRental, findConflicts, paidFor, payStatus, PAY_METHODS } from '../lib/finance';
import { fdt, fdate, kes, toDateInput, toInput } from '../lib/format';
import { Badge, EmptyState, Field, FormModal, Modal, Section, StatusBadge, useToast } from '../components/ui';

const Row = ({ k, v, bold }) => <div className={`flex justify-between py-1.5 text-sm ${bold ? 'border-t border-slate-200 pt-3 font-semibold text-navy' : ''}`}><span className="text-slate-500">{k}</span><span>{v}</span></div>;

export default function BookingDetail() {
  const { id } = useParams();
  const { state, updateBooking, addPayment, custName, depositsHeld } = useApp();
  const { toast } = useToast();
  const [pay, setPay] = useState(false), [ext, setExt] = useState(false), [ret, setRet] = useState(false);
  const [doc, setDoc] = useState(null);
  const [newEnd, setNewEnd] = useState(''), [retAt, setRetAt] = useState('');
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return <EmptyState title="Booking not found" action={<Link to="/bookings" className="btn-primary">Back to bookings</Link>} />;

  const s = state.settings;
  const cust = state.customers.find((c) => c.id === b.customerId), veh = state.vehicles.find((v) => v.id === b.vehicleId);
  const pays = state.payments.filter((p) => p.bookingId === b.id).sort((a, c) => new Date(c.date) - new Date(a.date));
  const total = bookingTotal(b), paid = paidFor(b.id, state.payments), bal = total - paid, held = depositsHeld(b.id);
  const overdue = b.status === 'Active' && new Date(b.end) < new Date();

  const go = (status) => {
    if (BLOCKING.includes(status) && findConflicts(state.bookings, { vehicleId: b.vehicleId, start: b.start, end: b.end, excludeId: b.id }).length) return toast('Conflicts with another confirmed booking', 'error');
    updateBooking(b.id, { status }); toast(`Marked ${status}`);
  };
  const print = (t) => { setDoc(t); setTimeout(() => window.print(), 80); };
  const ot = calcOvertime({ end: b.end, actualReturn: retAt || new Date(), settings: s });

  const payFields = [
    { name: 'type', label: 'Type', type: 'select', options: [{ value: 'payment', label: 'Rental payment' }, { value: 'deposit', label: 'Security deposit received' }, { value: 'deposit_refund', label: 'Deposit refund' }, { value: 'refund', label: 'Rental refund' }] },
    { name: 'amount', label: 'Amount (KES)', type: 'number', required: true },
    { name: 'method', label: 'Method', type: 'select', options: PAY_METHODS }, { name: 'reference', label: 'Reference (e.g. M-Pesa code)' },
    { name: 'date', label: 'Date', type: 'date', required: true },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy"><ArrowLeft size={14} />Bookings</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="flex items-center gap-3 text-2xl font-semibold">{b.ref}<StatusBadge s={b.status} /></h1><p className="mt-1 text-sm text-slate-500">{custName(b.customerId)} · {veh?.make} {veh?.model}</p></div>
          <div className="flex flex-wrap gap-2">
            {['Inquiry', 'Pending Confirmation'].includes(b.status) && <button className="btn-primary" onClick={() => go('Confirmed')}>Confirm</button>}
            {b.status === 'Confirmed' && <button className="btn-primary" onClick={() => go('Active')}>Start rental</button>}
            {b.status === 'Active' && <><button className="btn-ghost" onClick={() => { setNewEnd(toInput(b.end)); setExt(true); }}><CalendarPlus size={16} />Extend</button><button className="btn-primary" onClick={() => { setRetAt(toInput(new Date())); setRet(true); }}>Mark returned</button></>}
            {['Inquiry', 'Pending Confirmation', 'Confirmed'].includes(b.status) && <><button className="btn-ghost" onClick={() => go('Cancelled')}>Cancel</button><button className="btn-ghost" onClick={() => go('No-show')}>No-show</button></>}
          </div>
        </div>

        {overdue && <div className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm text-bad"><AlertTriangle size={16} />Overdue — was due back {fdt(b.end)}. Overtime accrues at {kes(s.overtimeRate)}/hr after the grace period.</div>}

        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Rental details" className="lg:col-span-2">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Row k="Customer" v={cust?.name} /><Row k="Phone" v={cust?.phone || '—'} /><Row k="Rental type" v={b.type} /><Row k="Rate" v={kes(b.rate)} />
              <Row k="Pickup" v={fdt(b.start)} /><Row k="Return" v={fdt(b.end)} /><Row k="Pickup location" v={b.pickup || '—'} /><Row k="Drop-off" v={b.dropoff || '—'} />
              <Row k="Billable units" v={b.units} />{b.actualReturn && <Row k="Actual return" v={fdt(b.actualReturn)} />}
            </div>
            {b.notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{b.notes}</p>}
          </Section>
          <Section title="Charges">
            <Row k={`Rental (${b.units} × ${kes(b.rate)})`} v={kes(b.base)} />
            {b.extras > 0 && <Row k="Extra charges" v={kes(b.extras)} />}{b.chauffeur > 0 && <Row k="Driver service" v={kes(b.chauffeur)} />}
            {b.overtime > 0 && <Row k="Overtime" v={kes(b.overtime)} />}{b.discount > 0 && <Row k="Discount" v={`−${kes(b.discount)}`} />}
            <Row k="Total" v={kes(total)} bold /><Row k="Paid" v={kes(paid)} />
            <Row k="Balance" v={<span className={bal > 0 ? 'font-semibold text-bad' : 'text-good'}>{kes(bal)}</span>} />
            <div className="mt-3 rounded-xl bg-gold/10 p-3 text-xs text-[#8a6d2b]">Deposit {kes(b.deposit)} · held {kes(held)} <span className="opacity-70">(liability, not revenue)</span></div>
          </Section>
        </div>

        <Section title="Payments" action={<button className="btn-ghost btn-sm" onClick={() => setPay(true)}><Plus size={14} />Record</button>}>
          {pays.length ? <ul className="divide-y divide-slate-100">{pays.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5 text-sm"><div><p className="font-medium capitalize">{p.type.replace('_', ' ')}</p><p className="text-xs text-slate-500">{p.method} · {fdate(p.date)}{p.reference ? ` · ${p.reference}` : ''}</p></div><b>{kes(p.amount)}</b></li>))}</ul>
            : <EmptyState title="No payments yet" />}
          <div className="mt-3 flex items-center gap-2"><Badge tone={{ Paid: 'green', Partial: 'amber', Unpaid: 'red' }[payStatus(b, state.payments)]}>{payStatus(b, state.payments)}</Badge></div>
        </Section>

        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => print('agreement')}><FileText size={16} />Print agreement</button>
          <button className="btn-ghost" onClick={() => print('invoice')}><Printer size={16} />Print invoice</button>
          <button className="btn-ghost" onClick={() => print('receipt')}><Receipt size={16} />Print receipt</button>
        </div>
      </div>

      <FormModal open={pay} onClose={() => setPay(false)} title="Record payment" fields={payFields}
        initial={{ type: 'payment', amount: Math.max(0, bal) || '', method: 'M-Pesa', reference: '', date: toDateInput(new Date()) }}
        onSubmit={(v) => { const e = addPayment({ bookingId: b.id, type: v.type, amount: Number(v.amount), method: v.method, reference: v.reference, date: new Date(v.date).toISOString() }); if (!e) toast('Payment recorded'); return e || undefined; }} />

      <Modal open={ext} onClose={() => setExt(false)} title="Extend booking">
        {(() => {
          const c = calcRental({ type: b.type, start: b.start, end: newEnd || b.end, rate: b.rate, settings: s });
          const conf = findConflicts(state.bookings, { vehicleId: b.vehicleId, start: b.start, end: newEnd || b.end, excludeId: b.id });
          return <>
            <Field label="New return time"><input type="datetime-local" className="input" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></Field>
            <p className="mt-3 text-sm text-slate-600">New rental charge: <b>{kes(c.base)}</b> ({c.units} billable units)</p>
            {conf.length > 0 && <p className="mt-2 rounded-xl bg-bad/10 p-2 text-sm text-bad">Conflicts with {conf.map((x) => x.ref).join(', ')}</p>}
            <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setExt(false)}>Cancel</button>
              <button className="btn-primary" disabled={conf.length > 0 || new Date(newEnd) <= new Date(b.start)} onClick={() => { updateBooking(b.id, { end: new Date(newEnd).toISOString(), units: c.units, base: c.base }); toast('Booking extended'); setExt(false); }}>Extend</button></div></>;
        })()}
      </Modal>

      <Modal open={ret} onClose={() => setRet(false)} title="Mark vehicle returned">
        <Field label="Actual return time"><input type="datetime-local" className="input" value={retAt} onChange={(e) => setRetAt(e.target.value)} /></Field>
        <p className="mt-3 text-sm text-slate-600">{ot.charge > 0 ? <>Late by {Math.round(ot.minutes / 60 * 10) / 10} h → overtime charge <b className="text-bad">{kes(ot.charge)}</b></> : 'Returned within the grace period — no overtime.'}</p>
        <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setRet(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => { updateBooking(b.id, { status: 'Completed', actualReturn: new Date(retAt).toISOString(), overtime: ot.charge }); toast('Rental completed'); setRet(false); }}>Complete rental</button></div>
      </Modal>

      {/* Printable document */}
      <div id="print-area" className="hidden p-10 text-sm text-slate-800 print:block">
        {doc && <>
          <div className="mb-6 flex items-end justify-between border-b-2 border-navy pb-4"><div><h1 className="text-2xl font-bold">{s.businessName}</h1><p className="text-slate-500">{s.ownerEmail}</p></div>
            <div className="text-right"><h2 className="text-xl font-semibold uppercase">{doc === 'agreement' ? 'Rental Agreement' : doc === 'invoice' ? 'Invoice' : 'Payment Receipt'}</h2><p>{b.ref} · {fdate(new Date())}</p></div></div>
          <div className="mb-6 grid grid-cols-2 gap-6"><div><p className="font-semibold">Customer</p><p>{cust?.name}</p><p>{cust?.phone}</p></div><div><p className="font-semibold">Vehicle</p><p>{veh?.make} {veh?.model} · {veh?.color}</p><p>{veh?.reg}</p></div>
            <div><p className="font-semibold">Pickup</p><p>{fdt(b.start)}</p><p>{b.pickup}</p></div><div><p className="font-semibold">Return</p><p>{fdt(b.end)}</p><p>{b.dropoff}</p></div></div>
          <table className="mb-6 w-full border-collapse"><tbody>
            <tr className="border-b"><td className="py-2">Rental ({b.units} × {kes(b.rate)} / {b.type.toLowerCase()})</td><td className="text-right">{kes(b.base)}</td></tr>
            {b.extras > 0 && <tr className="border-b"><td className="py-2">Extra charges</td><td className="text-right">{kes(b.extras)}</td></tr>}
            {b.chauffeur > 0 && <tr className="border-b"><td className="py-2">Driver service</td><td className="text-right">{kes(b.chauffeur)}</td></tr>}
            {b.overtime > 0 && <tr className="border-b"><td className="py-2">Overtime</td><td className="text-right">{kes(b.overtime)}</td></tr>}
            {b.discount > 0 && <tr className="border-b"><td className="py-2">Discount</td><td className="text-right">−{kes(b.discount)}</td></tr>}
            <tr className="font-bold"><td className="py-2">Total</td><td className="text-right">{kes(total)}</td></tr>
            {doc !== 'agreement' && <><tr><td className="py-1">Paid</td><td className="text-right">{kes(paid)}</td></tr><tr className="font-semibold"><td className="py-1">Balance due</td><td className="text-right">{kes(bal)}</td></tr></>}
            {b.deposit > 0 && <tr><td className="py-1 text-slate-500">Refundable security deposit</td><td className="text-right text-slate-500">{kes(b.deposit)}</td></tr>}
          </tbody></table>
          {doc === 'receipt' && <div className="mb-6"><p className="mb-1 font-semibold">Payments received</p>{pays.filter((p) => p.type === 'payment').map((p) => <p key={p.id}>{fdate(p.date)} · {p.method} {p.reference} — {kes(p.amount)}</p>)}</div>}
          {doc === 'agreement' && <ol className="mb-10 list-decimal space-y-1 pl-5 text-slate-600"><li>The renter must hold a valid driving licence and is responsible for the vehicle for the whole rental period.</li><li>Late returns beyond the grace period are charged at {kes(s.overtimeRate)} per hour.</li><li>Fuel is to be returned at the level it was collected. Traffic fines are the renter's responsibility.</li><li>The security deposit is refundable after inspection, less any damage or outstanding charges.</li></ol>}
          {doc === 'agreement' && <div className="mt-16 grid grid-cols-2 gap-10"><div className="border-t pt-2">Renter signature</div><div className="border-t pt-2">For {s.businessName}</div></div>}
        </>}
      </div>
    </div>
  );
}
