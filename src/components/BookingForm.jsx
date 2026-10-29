import { useEffect, useMemo, useState } from 'react';
import { addDays, addHours, startOfHour } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../context';
import { BLOCKING, BOOKING_STATUSES, PAY_METHODS, RENTAL_TYPES, calcRental, findConflicts } from '../lib/finance';
import { kes, toInput, uid } from '../lib/format';
import { Field, Modal, useToast } from './ui';

export default function BookingForm({ open, onClose, onCreated }) {
  const { state, addBooking, nextRef } = useApp();
  const { toast } = useToast();
  const s = state.settings;
  const init = () => {
    const st = addHours(startOfHour(new Date()), 1);
    return { customerId: state.customers[0]?.id || 'new', newName: '', newPhone: '', newEmail: '', vehicleId: state.vehicles[0]?.id || '', type: 'Daily', start: toInput(st), end: toInput(addDays(st, 1)), pickup: '', dropoff: '', rate: s.rates.Daily, discount: 0, extras: 0, chauffeur: 0, deposit: s.defaultDeposit, depositReceived: false, method: 'M-Pesa', paid: 0, reference: '', status: 'Confirmed', notes: '', override: false, overrideReason: '' };
  };
  const [f, setF] = useState(init);
  const [err, setErr] = useState({});
  useEffect(() => { if (open) { setF(init()); setErr({}); } }, [open]); // eslint-disable-line
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const N = (k) => Number(f[k]) || 0;
  const I = (k, type = 'text', extra = {}) => <input className="input" type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} />;

  const changeType = (t) => {
    const st = new Date(f.start);
    const end = t === 'Hourly' ? addHours(st, 4) : addDays(st, { Daily: 1, Weekly: 7, Monthly: 30 }[t]);
    setF((p) => ({ ...p, type: t, rate: s.rates[t], end: toInput(end) }));
  };
  const calc = useMemo(() => calcRental({ type: f.type, start: f.start, end: f.end, rate: f.rate, settings: s }), [f.type, f.start, f.end, f.rate, s]);
  const total = Math.max(0, calc.base + N('extras') + N('chauffeur') - N('discount'));
  const conflicts = useMemo(() => (BLOCKING.includes(f.status) && f.start && f.end ? findConflicts(state.bookings, { vehicleId: f.vehicleId, start: f.start, end: f.end }) : []), [f.status, f.vehicleId, f.start, f.end, state.bookings]);

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (f.customerId === 'new' && !f.newName.trim()) er.newName = 'Customer name required';
    if (!f.vehicleId) er.vehicleId = 'Select a vehicle';
    if (new Date(f.end) <= new Date(f.start)) er.end = 'Return must be after pickup';
    if (N('rate') <= 0) er.rate = 'Rate must be greater than 0';
    if (conflicts.length && (!f.override || !f.overrideReason.trim())) er.override = 'Tick override and give a reason to proceed';
    setErr(er);
    if (Object.keys(er).length) return;
    const booking = {
      id: uid('bk'), ref: nextRef(), customerId: f.customerId, vehicleId: f.vehicleId, type: f.type, start: new Date(f.start).toISOString(), end: new Date(f.end).toISOString(),
      pickup: f.pickup, dropoff: f.dropoff, rate: N('rate'), units: calc.units, base: calc.base, discount: N('discount'), extras: N('extras'), chauffeur: N('chauffeur'), overtime: 0,
      deposit: N('deposit'), status: f.status, notes: f.notes + (conflicts.length ? ` [Conflict override: ${f.overrideReason}]` : ''), createdAt: new Date().toISOString(),
    };
    addBooking({
      booking, newCustomer: f.customerId === 'new' ? { name: f.newName.trim(), phone: f.newPhone, email: f.newEmail } : null,
      payment: N('paid') > 0 ? { amount: N('paid'), method: f.method, reference: f.reference } : null, deposit: f.depositReceived,
    });
    toast(`Booking ${booking.ref} created`);
    onClose(); onCreated?.(booking.id);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Booking" wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer"><select className="input" value={f.customerId} onChange={(e) => set('customerId', e.target.value)}>{state.customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}<option value="new">+ New customer</option></select></Field>
          <Field label="Vehicle" error={err.vehicleId}><select className="input" value={f.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>{state.vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.reg}</option>)}</select></Field>
          {f.customerId === 'new' && <>
            <Field label="Customer name *" error={err.newName}>{I('newName')}</Field><Field label="Phone">{I('newPhone', 'tel')}</Field>
            <Field label="Email" className="sm:col-span-2">{I('newEmail', 'email')}</Field></>}
          <Field label="Rental type"><select className="input" value={f.type} onChange={(e) => changeType(e.target.value)}>{RENTAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>{BOOKING_STATUSES.filter((x) => !['Completed', 'Cancelled', 'No-show'].includes(x)).map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Pickup date & time">{I('start', 'datetime-local')}</Field>
          <Field label="Return date & time" error={err.end}>{I('end', 'datetime-local')}</Field>
          <Field label="Pickup location">{I('pickup')}</Field><Field label="Drop-off location">{I('dropoff')}</Field>
        </div>

        {conflicts.length > 0 && (
          <div className="rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm text-bad">
            <p className="flex items-center gap-2 font-medium"><AlertTriangle size={16} />Conflicts with {conflicts.map((c) => c.ref).join(', ')}</p>
            <label className="mt-2 flex items-center gap-2 text-slate-700"><input type="checkbox" checked={f.override} onChange={(e) => set('override', e.target.checked)} />Authorized override</label>
            {f.override && <input className="input mt-2" placeholder="Reason for override" value={f.overrideReason} onChange={(e) => set('overrideReason', e.target.value)} />}
            {err.override && <p className="mt-1 text-xs">{err.override}</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`Agreed rate / ${f.type.toLowerCase().replace('ly', '')}`} error={err.rate}>{I('rate', 'number', { min: 0 })}</Field>
          <Field label="Discount (KES)">{I('discount', 'number', { min: 0 })}</Field>
          <Field label="Extra charges (KES)">{I('extras', 'number', { min: 0 })}</Field>
          <Field label="Driver service (KES)">{I('chauffeur', 'number', { min: 0 })}</Field>
          <Field label="Security deposit (KES)">{I('deposit', 'number', { min: 0 })}</Field>
          <label className="flex items-end gap-2 pb-2.5 text-sm"><input type="checkbox" checked={f.depositReceived} onChange={(e) => set('depositReceived', e.target.checked)} />Deposit received</label>
          <Field label="Payment received now (KES)">{I('paid', 'number', { min: 0 })}</Field>
          <Field label="Payment method"><select className="input" value={f.method} onChange={(e) => set('method', e.target.value)}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Payment reference">{I('reference')}</Field>
        </div>
        <Field label="Notes"><textarea className="input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>

        <div className="rounded-2xl bg-navy p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <span>{calc.actualHours.toFixed(1)} actual hrs → <b className="text-white">{calc.units} billable {f.type === 'Hourly' ? 'hour(s)' : f.type === 'Daily' ? 'day(s)' : f.type === 'Weekly' ? 'week(s)' : 'month(s)'}</b></span>
            <span>Base {kes(calc.base)}</span>
          </div>
          <p className="mt-1 font-heading text-2xl font-semibold text-gold">{kes(total)}</p>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Create booking</button></div>
      </form>
    </Modal>
  );
}
