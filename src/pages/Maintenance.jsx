import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context';
import { maintenanceAlerts } from '../lib/alerts';
import { fdate, kes, num, sum, toDateInput } from '../lib/format';
import { Badge, ConfirmModal, EmptyState, FormModal, PageHeader, Section, Table, useToast } from '../components/ui';

export const MAINT_TYPES = ['Oil change', 'General servicing', 'Brake servicing', 'Tyre replacement', 'Battery replacement', 'Mechanical repair', 'Insurance renewal', 'Scheduled inspection'];

export default function Maintenance() {
  const { scoped, state, addMaintenance, removeMaintenance } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false), [del, setDel] = useState(null);
  const alerts = maintenanceAlerts(scoped);
  const rows = [...scoped.maintenance].sort((a, b) => new Date(b.date) - new Date(a.date));
  const fields = [
    { name: 'vehicleId', label: 'Vehicle', type: 'select', options: state.vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model}` })) }, { name: 'type', label: 'Type', type: 'select', options: MAINT_TYPES },
    { name: 'date', label: 'Date done', type: 'date', required: true }, { name: 'cost', label: 'Cost (KES)', type: 'number', required: true },
    { name: 'supplier', label: 'Supplier / garage' }, { name: 'nextDueDate', label: 'Next due date', type: 'date' }, { name: 'nextDueKm', label: 'Next due at (km)', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];
  return (
    <>
      <PageHeader title="Maintenance" subtitle="Reminders trigger on date or mileage — whichever comes first." actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Log Maintenance</button>} />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Section title="Alerts" className="lg:col-span-2">
          {alerts.length ? alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"><div className="flex items-center gap-3"><AlertTriangle size={18} className={a.level === 'overdue' ? 'text-bad' : 'text-gold'} /><div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-slate-500">{a.detail}</p></div></div><Badge tone={a.level === 'overdue' ? 'red' : 'amber'}>{a.level === 'overdue' ? 'Overdue' : 'Due soon'}</Badge></div>
          )) : <div className="flex items-center gap-2 py-6 text-sm text-good"><CheckCircle2 size={18} />Nothing due — the car is in good shape.</div>}
        </Section>
        <Section title="Maintenance spend"><p className="font-heading text-2xl font-semibold">{kes(sum(scoped.maintenance, (m) => m.cost))}</p><p className="text-xs text-slate-500">{scoped.maintenance.length} records · odometer {num(scoped.vehicles[0]?.odometer)} km</p></Section>
      </div>
      <div className="card">
        <Table head={['Date', 'Type', 'Supplier', 'Cost', 'Next due', '']} empty={!rows.length && <EmptyState title="No maintenance records" />}>
          {rows.map((m) => (
            <tr key={m.id}><td className="td">{fdate(m.date)}</td><td className="td font-medium">{m.type}</td><td className="td">{m.supplier || '—'}</td><td className="td">{kes(m.cost)}</td>
              <td className="td text-slate-600">{[m.nextDueDate && fdate(m.nextDueDate), m.nextDueKm && `${num(m.nextDueKm)} km`].filter(Boolean).join(' / ') || '—'}</td>
              <td className="td"><button onClick={() => setDel(m)} className="text-slate-400 hover:text-bad"><Trash2 size={15} /></button></td></tr>))}
        </Table>
      </div>
      <FormModal open={open} onClose={() => setOpen(false)} title="Log maintenance" fields={fields} wide initial={{ vehicleId: state.vehicles[0]?.id, type: 'Oil change', date: toDateInput(new Date()), cost: '', supplier: '', nextDueDate: '', nextDueKm: '', notes: '' }}
        onSubmit={(v) => { addMaintenance({ ...v, cost: Number(v.cost), date: new Date(v.date).toISOString(), nextDueDate: v.nextDueDate ? new Date(v.nextDueDate).toISOString() : '', nextDueKm: Number(v.nextDueKm) || 0 }); toast('Maintenance logged (and added to expenses)'); }} />
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Delete record?" text="The linked expense will also be removed." onConfirm={() => { removeMaintenance(del.id); toast('Record deleted'); }} />
    </>
  );
}
