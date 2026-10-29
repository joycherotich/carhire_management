import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, eachYearOfInterval, endOfDay, endOfMonth, endOfWeek, endOfYear, format, startOfDay } from 'date-fns';
import { BOOKED, EARNED, bookingProfit, bookingTotal, computeFinancials, depositsHeld, paidFor } from './finance';
import { fdate, sum } from './format';

export const REPORTS = ['Daily Earnings', 'Weekly Earnings', 'Monthly Earnings', 'Annual Revenue', 'Profit and Loss', 'Cash Flow', 'Expense Breakdown', 'Booking Performance', 'Vehicle Performance', 'Outstanding Payments', 'Maintenance Costs', 'Mileage and Fuel', 'Customer Revenue'];
const r0 = (n) => Math.round(n);

function grouped(data, from, to, unit) {
  const opts = { weekStartsOn: 1 };
  const defs = {
    day: [() => eachDayOfInterval({ start: from, end: to }), endOfDay, 'dd MMM yyyy'],
    week: [() => eachWeekOfInterval({ start: from, end: to }, opts), (d) => endOfWeek(d, opts), "'Week of' dd MMM"],
    month: [() => eachMonthOfInterval({ start: from, end: to }), endOfMonth, 'MMMM yyyy'],
    year: [() => eachYearOfInterval({ start: from, end: to }), endOfYear, 'yyyy'],
  }[unit];
  return {
    columns: ['Period', 'Bookings', 'Revenue (KES)', 'Expenses (KES)', 'Net profit (KES)', 'Cash received (KES)'],
    rows: defs[0]().map((d) => {
      const a = d < from ? from : startOfDay(d), b = defs[1](d) > to ? to : defs[1](d);
      const r = computeFinancials(data, a, b);
      return [format(d, defs[2]), r.earnedCount, r0(r.revenue), r0(r.totalExpenses), r0(r.netProfit), r0(r.cash.in)];
    }),
  };
}

export function buildReport(name, data, customers, from, to) {
  const { bookings, payments, expenses, fuel, maintenance, vehicles } = data;
  const inR = (d) => +new Date(d) >= +from && +new Date(d) <= +to;
  const cust = (id) => customers.find((c) => c.id === id)?.name || '—';
  const fin = computeFinancials(data, from, to);
  switch (name) {
    case 'Daily Earnings': return grouped(data, from, to, 'day');
    case 'Weekly Earnings': return grouped(data, from, to, 'week');
    case 'Monthly Earnings': return grouped(data, from, to, 'month');
    case 'Annual Revenue': return grouped(data, from, to, 'year');
    case 'Profit and Loss': return {
      columns: ['Line', 'Amount (KES)'],
      rows: [['Gross rental revenue', r0(fin.revenue)], ['Operating expenses', -r0(fin.opex)], ['Operating profit', r0(fin.operatingProfit)], ['Depreciation (estimate unless recorded)', -r0(fin.depreciation)], ['Vehicle loan interest', -r0(fin.interest)], ['Taxes', -r0(fin.tax)], ['Net profit', r0(fin.netProfit)], ['Profit margin %', fin.margin.toFixed(1)]],
    };
    case 'Cash Flow': return {
      columns: ['Line', 'Amount (KES)'],
      rows: [['Rental payments received (net of refunds)', r0(fin.cash.in)], ['Cash expenses paid (incl. loan principal)', -r0(fin.cash.out)], ['Net cash flow', r0(fin.cash.net)], ['— of which loan principal repaid', -r0(fin.principal)], ['Memo: security deposits held (liability)', r0(depositsHeld(payments))]],
    };
    case 'Expense Breakdown': {
      const ex = expenses.filter((e) => inR(e.date)), total = sum(ex, (e) => e.amount);
      const cats = [...new Set(ex.map((e) => e.category))];
      return { columns: ['Category', 'Entries', 'Total (KES)', '% of total'], rows: cats.map((c) => { const l = ex.filter((e) => e.category === c); const t = sum(l, (e) => e.amount); return [c, l.length, r0(t), total ? ((t / total) * 100).toFixed(1) : 0]; }).sort((a, b) => b[2] - a[2]) };
    }
    case 'Booking Performance': return {
      columns: ['Ref', 'Customer', 'Type', 'Pickup', 'Status', 'Revenue (KES)', 'Linked costs (KES)', 'Profit (KES)'],
      rows: bookings.filter((b) => BOOKED.includes(b.status) && inR(b.start)).map((b) => [b.ref, cust(b.customerId), b.type, fdate(b.start), b.status, bookingTotal(b), r0(bookingTotal(b) - bookingProfit(b, expenses)), r0(bookingProfit(b, expenses))]),
    };
    case 'Vehicle Performance': return {
      columns: ['Vehicle', 'Revenue (KES)', 'Expenses (KES)', 'Net profit (KES)', 'Utilization %', 'Revenue / booked day'],
      rows: vehicles.map((v) => { const d = { ...data, vehicles: [v], bookings: bookings.filter((b) => b.vehicleId === v.id), expenses: expenses.filter((e) => e.vehicleId === v.id), fuel: fuel.filter((f) => f.vehicleId === v.id) }; const r = computeFinancials(d, from, to); return [`${v.make} ${v.model} (${v.reg})`, r0(r.revenue), r0(r.totalExpenses), r0(r.netProfit), r.utilization.toFixed(1), r0(r.revenuePerDay)]; }),
    };
    case 'Outstanding Payments': return {
      columns: ['Ref', 'Customer', 'Pickup', 'Invoice (KES)', 'Paid (KES)', 'Balance (KES)'],
      rows: bookings.filter((b) => EARNED.includes(b.status)).map((b) => [b.ref, cust(b.customerId), fdate(b.start), bookingTotal(b), r0(paidFor(b.id, payments)), r0(bookingTotal(b) - paidFor(b.id, payments))]).filter((r) => r[5] > 0),
    };
    case 'Maintenance Costs': return { columns: ['Date', 'Type', 'Supplier', 'Cost (KES)', 'Notes'], rows: maintenance.filter((m) => inR(m.date)).map((m) => [fdate(m.date), m.type, m.supplier, m.cost, m.notes]) };
    case 'Mileage and Fuel': return {
      columns: ['Date', 'Odo start', 'Odo end', 'Km', 'Litres', 'Price/L', 'Cost (KES)', 'Km/L'],
      rows: fuel.filter((f) => inR(f.date)).map((f) => { const km = f.odoEnd - f.odoStart; return [fdate(f.date), f.odoStart, f.odoEnd, km, f.litres, f.price, r0(f.litres * f.price), (km / f.litres).toFixed(1)]; }),
    };
    case 'Customer Revenue': return {
      columns: ['Customer', 'Bookings', 'Revenue (KES)', 'Paid (KES)', 'Balance (KES)'],
      rows: customers.map((c) => { const bs = bookings.filter((b) => b.customerId === c.id && EARNED.includes(b.status) && inR(b.start)); const t = sum(bs, bookingTotal), p = sum(bs, (b) => paidFor(b.id, payments)); return [c.name, bs.length, r0(t), r0(p), r0(t - p)]; }).filter((r) => r[1] > 0).sort((a, b) => b[2] - a[2]),
    };
    default: return { columns: [], rows: [] };
  }
}
