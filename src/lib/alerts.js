import { differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns';
import { BLOCKING, EARNED, NON_OPERATING, balanceFor, computeFinancials } from './finance';
import { kes, sum } from './format';

export function maintenanceAlerts({ maintenance, vehicles }, now = new Date()) {
  const out = [];
  vehicles.forEach((v) => {
    const latest = {};
    maintenance.filter((m) => m.vehicleId === v.id).forEach((m) => {
      if (!latest[m.type] || new Date(m.date) > new Date(latest[m.type].date)) latest[m.type] = m;
    });
    Object.values(latest).forEach((m) => {
      const dDays = m.nextDueDate ? differenceInCalendarDays(new Date(m.nextDueDate), now) : null;
      const dKm = m.nextDueKm ? m.nextDueKm - v.odometer : null;
      const over = (dDays != null && dDays < 0) || (dKm != null && dKm < 0);
      const soon = (dDays != null && dDays <= 14) || (dKm != null && dKm <= 500);
      if (over || soon) {
        out.push({
          id: `m_${m.id}`, vehicleId: v.id, level: over ? 'overdue' : 'soon', title: `${m.type} ${over ? 'overdue' : 'due soon'}`,
          detail: [dDays != null && (dDays < 0 ? `${-dDays} days overdue` : `in ${dDays} days`), dKm != null && (dKm < 0 ? `${-dKm} km over` : `${dKm} km left`)].filter(Boolean).join(' · '),
        });
      }
    });
    [['insuranceExpiry', 'Insurance'], ['inspectionDue', 'Inspection']].forEach(([k, label]) => {
      if (!v[k]) return;
      const d = differenceInCalendarDays(new Date(v[k]), now);
      if (d <= 30) out.push({ id: `v_${v.id}_${k}`, vehicleId: v.id, level: d < 0 ? 'overdue' : 'soon', title: `${label} ${d < 0 ? 'expired' : 'expiring'}`, detail: d < 0 ? `${-d} days ago` : `in ${d} days` });
    });
  });
  return out;
}

export function buildNotifications(data, customers, now = new Date()) {
  const { bookings, payments, expenses, settings } = data;
  const n = [];
  const name = (b) => customers.find((c) => c.id === b.customerId)?.name || 'Customer';
  const hrs = (d) => (new Date(d) - now) / 36e5;

  bookings.forEach((b) => {
    if (b.status === 'Confirmed' && hrs(b.start) > 0 && hrs(b.start) <= 48) n.push({ id: `up_${b.id}`, cat: 'bookings', level: 'info', title: 'Upcoming booking', text: `${b.ref} · ${name(b)} picks up within 48 hours`, link: `/bookings/${b.id}` });
    if (b.status === 'Active' && hrs(b.end) >= 0 && hrs(b.end) <= 24) n.push({ id: `due_${b.id}`, cat: 'bookings', level: 'warn', title: 'Return due soon', text: `${b.ref} · ${name(b)} due back within 24 hours`, link: `/bookings/${b.id}` });
    if (b.status === 'Active' && hrs(b.end) < 0) n.push({ id: `over_${b.id}`, cat: 'bookings', level: 'danger', title: 'Vehicle overdue', text: `${b.ref} · ${name(b)} is past the return time`, link: `/bookings/${b.id}` });
    if (EARNED.includes(b.status) && b.status === 'Completed' && balanceFor(b, payments) > 0) n.push({ id: `unpaid_${b.id}`, cat: 'payments', level: 'warn', title: 'Unpaid invoice', text: `${b.ref} · ${name(b)} owes ${kes(balanceFor(b, payments))}`, link: `/bookings/${b.id}` });
  });
  payments.filter((p) => p.method === 'M-Pesa' && p.type === 'payment' && !p.reference).forEach((p) =>
    n.push({ id: `ref_${p.id}`, cat: 'payments', level: 'warn', title: 'Missing payment confirmation', text: `M-Pesa payment of ${kes(p.amount)} has no reference`, link: '/payments' }));
  maintenanceAlerts(data, now).forEach((a) => n.push({ id: a.id, cat: 'maintenance', level: a.level === 'overdue' ? 'danger' : 'warn', title: a.title, text: a.detail, link: a.title.startsWith('Insurance') || a.title.startsWith('Inspection') ? '/vehicles' : '/maintenance' }));

  const mStart = startOfMonth(now), mEnd = endOfMonth(now);
  const ops = expenses.filter((e) => !NON_OPERATING.includes(e.category) && e.category !== 'Insurance');
  const avg = ops.length ? sum(ops, (e) => e.amount) / ops.length : 0;
  ops.filter((e) => new Date(e.date) >= mStart && e.amount > Math.max(10000, avg * 3)).forEach((e) =>
    n.push({ id: `hi_${e.id}`, cat: 'financial', level: 'warn', title: 'Unusually high expense', text: `${e.category}: ${kes(e.amount)} — ${e.description}`, link: '/expenses' }));
  const fin = computeFinancials(data, mStart, mEnd);
  const tp = settings.revenueTarget ? (fin.revenue / settings.revenueTarget) * 100 : 0;
  if (tp >= 100) n.push({ id: `target_${mStart.getMonth()}`, cat: 'financial', level: 'info', title: 'Monthly target reached', text: `Revenue is ${tp.toFixed(0)}% of target`, link: '/profitability' });
  else if (now.getDate() >= 20 && tp < 60) n.push({ id: `lowtarget_${mStart.getMonth()}`, cat: 'financial', level: 'warn', title: 'Behind revenue target', text: `Only ${tp.toFixed(0)}% of the monthly target so far`, link: '/profitability' });
  if (fin.revenue > 0 && fin.margin < 10) n.push({ id: `margin_${mStart.getMonth()}`, cat: 'financial', level: 'warn', title: 'Low profitability', text: `Profit margin is ${fin.margin.toFixed(1)}% this month`, link: '/profitability' });

  return n.filter((x) => settings.notify?.[x.cat] !== false);
}
