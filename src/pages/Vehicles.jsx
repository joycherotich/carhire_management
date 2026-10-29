import { useState } from 'react';
import { AlertTriangle, Car, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { useApp } from '../context';
import { computeFinancials, vehicleStatus } from '../lib/finance';
import { fdate, kes, num, pct, toDateInput } from '../lib/format';
import { maintenanceAlerts } from '../lib/alerts';
import { Badge, FormModal, PageHeader, Section, useToast } from '../components/ui';

const fields = [
  { name: 'make', label: 'Make', required: true }, { name: 'model', label: 'Model', required: true }, { name: 'color', label: 'Colour' },
  { name: 'reg', label: 'Registration number', required: true }, { name: 'year', label: 'Manufacturing year', type: 'number' }, { name: 'vin', label: 'Chassis / VIN' },
  { name: 'engine', label: 'Engine capacity' }, { name: 'fuelType', label: 'Fuel type', type: 'select', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
  { name: 'transmission', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual'] }, { name: 'odometer', label: 'Odometer (km)', type: 'number' },
  { name: 'purchasePrice', label: 'Purchase price (KES)', type: 'number' }, { name: 'purchaseDate', label: 'Purchase date', type: 'date' },
  { name: 'marketValue', label: 'Current market value (KES)', type: 'number' }, { name: 'depRate', label: 'Depreciation rate / yr (e.g. 0.15)', type: 'number', step: '0.01' },
  { name: 'insuranceProvider', label: 'Insurance provider / cover' }, { name: 'insurancePolicy', label: 'Policy number' },
  { name: 'insuranceExpiry', label: 'Insurance expiry', type: 'date' }, { name: 'inspectionDue', label: 'Inspection due', type: 'date' },
  { name: 'financing', label: 'Ownership / financing' }, { name: 'loanBalance', label: 'Outstanding loan (KES)', type: 'number' },
];
const toForm = (v) => ({ ...v, purchaseDate: v.purchaseDate ? toDateInput(v.purchaseDate) : '', insuranceExpiry: v.insuranceExpiry ? toDateInput(v.insuranceExpiry) : '', inspectionDue: v.inspectionDue ? toDateInput(v.inspectionDue) : '' });
const fromForm = (v) => {
  const o = { ...v };
  ['year', 'odometer', 'purchasePrice', 'marketValue', 'depRate', 'loanBalance'].forEach((k) => { o[k] = Number(v[k]) || 0; });
  ['purchaseDate', 'insuranceExpiry', 'inspectionDue'].forEach((k) => { o[k] = v[k] ? new Date(v[k]).toISOString() : ''; });
  return o;
};

export default function Vehicles() {
  const { state, addVehicle, updateVehicle } = useApp();
  const { toast } = useToast();
  const [sel, setSel] = useState(state.vehicles[0]?.id);
  const [edit, setEdit] = useState(null), [add, setAdd] = useState(false);
  const v = state.vehicles.find((x) => x.id === sel) || state.vehicles[0];

  const d = v && { ...state, vehicles: [v], bookings: state.bookings.filter((b) => b.vehicleId === v.id), expenses: state.expenses.filter((e) => e.vehicleId === v.id), fuel: state.fuel.filter((f) => f.vehicleId === v.id), payments: state.payments };
  const life = v && computeFinancials(d, new Date(v.purchaseDate || '2000-01-01'), new Date());
  const alerts = v ? maintenanceAlerts({ maintenance: state.maintenance, vehicles: [v] }) : [];
  const st = v && vehicleStatus(v, state.bookings);
  const insDays = v?.insuranceExpiry ? differenceInCalendarDays(new Date(v.insuranceExpiry), new Date()) : null;

  return (
    <>
      <PageHeader title="My Vehicles" subtitle="Your fleet, its performance and its health." actions={<button className="btn-primary" onClick={() => setAdd(true)}><Plus size={16} />Add Vehicle</button>} />
      {state.vehicles.length > 1 && <div className="mb-4 flex gap-2">{state.vehicles.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-xl border px-4 py-2 text-sm ${x.id === v.id ? 'border-navy bg-navy text-white' : 'bg-white'}`}>{x.make} {x.model}</button>)}</div>}
      {v && (
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="relative grid min-h-[260px] place-items-center bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6">
                {v.image ? <img src={v.image} alt={`${v.make} ${v.model}`} className="max-h-80 w-full object-contain mix-blend-multiply" /> : <Car size={96} className="text-slate-300" />}
                <span className="absolute left-5 top-5"><Badge tone={st === 'Available' ? 'green' : st === 'On rent' ? 'blue' : 'amber'}>{st}</Badge></span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold">{v.make} {v.model}</h2><p className="text-sm text-slate-500">{v.color} · {v.year} · <span className="rounded bg-navy px-1.5 py-0.5 font-mono text-xs text-gold">{v.reg}</span></p></div>
                  <button className="btn-ghost btn-sm" onClick={() => setEdit(v)}><Pencil size={13} />Edit</button></div>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[['Engine', v.engine], ['Fuel', v.fuelType], ['Transmission', v.transmission], ['Odometer', `${num(v.odometer)} km`], ['VIN', v.vin], ['Purchased', `${fdate(v.purchaseDate)}`], ['Purchase price', kes(v.purchasePrice)], ['Market value', kes(v.marketValue)], ['Financing', v.financing], ['Loan balance', kes(v.loanBalance)]].map(([k, x]) => (
                    <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium">{x || '—'}</dd></div>))}
                </dl>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Financial performance (lifetime)">
              {[['Revenue', kes(life.revenue)], ['Total expenses', kes(life.totalExpenses)], ['Net profit', kes(life.netProfit)], ['Margin', pct(life.margin)], ['ROI on purchase price', pct(v.purchasePrice ? (life.netProfit / v.purchasePrice) * 100 : 0)], ['Revenue / booked day', kes(life.revenuePerDay)]].map(([k, x]) => <div key={k} className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">{k}</span><b>{x}</b></div>)}
              <p className="mt-2 text-xs text-slate-400">Depreciation is an estimate unless recorded manually.</p>
            </Section>
            <Section title="Insurance & compliance">
              <div className="flex items-center gap-2 text-sm"><ShieldCheck size={18} className={insDays != null && insDays < 30 ? 'text-bad' : 'text-good'} /><div><p className="font-medium">{v.insuranceProvider || '—'}</p><p className="text-xs text-slate-500">Policy {v.insurancePolicy || '—'}</p></div></div>
              <p className="mt-3 text-sm">Insurance expires <b>{fdate(v.insuranceExpiry)}</b> {insDays != null && <Badge tone={insDays < 0 ? 'red' : insDays < 30 ? 'amber' : 'green'}>{insDays < 0 ? 'Expired' : `${insDays} days`}</Badge>}</p>
              <p className="mt-2 text-sm">Inspection due <b>{fdate(v.inspectionDue)}</b></p>
            </Section>
            <Section title="Maintenance status">
              {alerts.length ? alerts.map((a) => <div key={a.id} className="flex items-center gap-2 py-1.5 text-sm"><AlertTriangle size={15} className={a.level === 'overdue' ? 'text-bad' : 'text-gold'} /><span>{a.title} <span className="text-xs text-slate-500">· {a.detail}</span></span></div>) : <p className="text-sm text-good">Everything is up to date.</p>}
            </Section>
          </div>
        </div>
      )}
      <FormModal open={!!edit} onClose={() => setEdit(null)} title="Edit vehicle" fields={fields} wide initial={edit ? toForm(edit) : {}} onSubmit={(x) => { updateVehicle(edit.id, fromForm(x)); toast('Vehicle updated'); }} />
      <FormModal open={add} onClose={() => setAdd(false)} title="Add vehicle" fields={fields} wide initial={{ fuelType: 'Petrol', transmission: 'Automatic', depRate: 0.15 }} onSubmit={(x) => { addVehicle(fromForm(x)); toast('Vehicle added'); }} />
    </>
  );
}
