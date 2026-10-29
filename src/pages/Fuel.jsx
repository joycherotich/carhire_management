import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Droplets, Fuel as FuelIcon, Plus, Route, Trash2, AlertTriangle, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context';
import { computeFinancials } from '../lib/finance';
import { fdate, kes, num, sum, toDateInput } from '../lib/format';
import { Badge, ConfirmModal, EmptyState, FormModal, KPI, PageHeader, Section, Table, useToast } from '../components/ui';

export default function Fuel() {
  const { scoped, state, addFuel, removeFuel } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false), [del, setDel] = useState(null);
  const asc = [...scoped.fuel].sort((a, b) => new Date(a.date) - new Date(b.date));
  const avgEff = (() => { const k = sum(asc, (f) => f.odoEnd - f.odoStart), l = sum(asc, (f) => f.litres); return l ? k / l : 0; })();
  const rows = asc.map((f, i) => {
    const km = f.odoEnd - f.odoStart, eff = f.litres ? km / f.litres : 0;
    const flags = [];
    if (avgEff && (eff < avgEff * 0.7 || eff > avgEff * 1.4)) flags.push('Unusual consumption');
    if (i > 0 && f.odoStart < asc[i - 1].odoEnd) flags.push('Odometer overlap');
    if (km <= 0) flags.push('Invalid odometer');
    return { ...f, km, eff, cost: f.litres * f.price, flags };
  });
  const totalKm = sum(rows, (r) => Math.max(0, r.km)), totalCost = sum(rows, (r) => r.cost);
  const fin = computeFinancials(scoped, new Date('2000-01-01'), new Date());
  const veh = state.vehicles[0];
  const fields = [
    { name: 'vehicleId', label: 'Vehicle', type: 'select', options: state.vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model}` })) },
    { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'odoStart', label: 'Starting odometer (km)', type: 'number', required: true }, { name: 'odoEnd', label: 'Ending odometer (km)', type: 'number', required: true },
    { name: 'litres', label: 'Litres purchased', type: 'number', required: true, step: '0.1' }, { name: 'price', label: 'Price per litre (KES)', type: 'number', required: true, step: '0.01' },
    { name: 'bookingId', label: 'Assign to booking (optional)', type: 'select', options: [{ value: '', label: '— None —' }, ...state.bookings.map((b) => ({ value: b.id, label: b.ref }))], full: true },
  ];

  return (
    <>
      <PageHeader title="Fuel & Mileage" subtitle="Know your real cost per kilometre." actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add Fuel Entry</button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI icon={FuelIcon} label="Total fuel cost" value={kes(totalCost)} /><KPI icon={Route} label="Distance logged" value={`${num(totalKm)} km`} />
        <KPI icon={Droplets} label="Avg efficiency" value={`${avgEff.toFixed(1)} km/L`} /><KPI icon={Coins} label="Cost / revenue per km" value={totalKm ? `${(totalCost / totalKm).toFixed(1)} / ${(fin.revenue / totalKm).toFixed(1)}` : '—'} hint="Fuel cost vs revenue (KES)" />
      </div>
      <Section title="Efficiency trend (km/L)" className="mb-6">
        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows.map((r) => ({ label: format(new Date(r.date), 'dd MMM'), eff: +r.eff.toFixed(1) }))}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} /><Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} /><Line type="monotone" dataKey="eff" name="km/L" stroke="#1B4D89" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
      </Section>
      <div className="card">
        <Table head={['Date', 'Odometer', 'Km', 'Litres', 'Price/L', 'Cost', 'Km/L', 'Cost/km', 'Flags', '']} empty={!rows.length && <EmptyState title="No fuel entries" />}>
          {[...rows].reverse().map((r) => (
            <tr key={r.id}><td className="td">{fdate(r.date)}</td><td className="td">{num(r.odoStart)} → {num(r.odoEnd)}</td><td className="td">{num(r.km)}</td><td className="td">{r.litres}</td><td className="td">{r.price}</td><td className="td font-medium">{kes(r.cost)}</td>
              <td className="td">{r.eff.toFixed(1)}</td><td className="td">{r.km > 0 ? (r.cost / r.km).toFixed(1) : '—'}</td>
              <td className="td">{r.flags.length ? r.flags.map((f) => <Badge key={f} tone="red"><AlertTriangle size={11} className="mr-1" />{f}</Badge>) : <Badge tone="green">OK</Badge>}</td>
              <td className="td"><button onClick={() => setDel(r)} className="text-slate-400 hover:text-bad"><Trash2 size={15} /></button></td></tr>))}
        </Table>
      </div>
      <FormModal open={open} onClose={() => setOpen(false)} title="Add fuel entry" fields={fields} initial={{ vehicleId: veh?.id, date: toDateInput(new Date()), odoStart: veh?.odometer, odoEnd: '', litres: '', price: '', bookingId: '' }}
        onSubmit={(v) => {
          const s = Number(v.odoStart), e = Number(v.odoEnd);
          if (e <= s) return 'Ending odometer must be greater than starting odometer.';
          const veh2 = state.vehicles.find((x) => x.id === v.vehicleId);
          if (veh2 && s < veh2.odometer - 1) return `Starting odometer (${s}) is below the vehicle's last reading (${veh2.odometer}).`;
          addFuel({ vehicleId: v.vehicleId, date: new Date(v.date).toISOString(), odoStart: s, odoEnd: e, litres: Number(v.litres), price: Number(v.price), bookingId: v.bookingId });
          toast('Fuel entry added (and logged as an expense)');
        }} />
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Delete fuel entry?" text="The linked fuel expense will also be removed." onConfirm={() => { removeFuel(del.id); toast('Fuel entry deleted'); }} />
    </>
  );
}
