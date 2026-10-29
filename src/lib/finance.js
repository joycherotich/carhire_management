import {
  differenceInCalendarDays, endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth,
  startOfWeek, startOfYear, subMonths, eachDayOfInterval, eachMonthOfInterval, format,
} from 'date-fns';
import { sum } from './format';

export const RENTAL_TYPES = ['Hourly', 'Daily', 'Weekly', 'Monthly'];
export const BOOKING_STATUSES = ['Inquiry', 'Pending Confirmation', 'Confirmed', 'Active', 'Completed', 'Cancelled', 'No-show'];
export const PAY_METHODS = ['M-Pesa', 'Bank transfer', 'Cash', 'Card', 'Other'];
export const EXPENSE_CATEGORIES = [
  'Fuel', 'Car Wash', 'Servicing', 'Engine Oil', 'Tyres', 'Repairs', 'Insurance', 'Parking',
  'Vehicle Inspection', 'Driver Payments', 'Cleaning', 'Road Tolls', 'GPS Tracking', 'Marketing',
  'Vehicle Loan Interest', 'Loan Principal', 'Depreciation', 'Other',
];
// Not operating expenses: interest & depreciation have their own P&L lines; principal is cash-flow only.
export const NON_OPERATING = ['Vehicle Loan Interest', 'Loan Principal', 'Depreciation'];
export const EARNED = ['Active', 'Completed'];
export const BLOCKING = ['Confirmed', 'Active'];
export const BOOKED = ['Confirmed', 'Active', 'Completed'];

const PERIOD_MIN = { Hourly: 60, Daily: 1440, Weekly: 10080, Monthly: 43200 };

/** Rental pricing from actual timestamps + configurable billing rules. */
export function calcRental({ type, start, end, rate, settings }) {
  const minutes = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  const p = PERIOD_MIN[type] || 1440;
  const grace = type === 'Hourly' ? settings.hourlyGraceMinutes ?? 0 : settings.graceMinutes ?? 0;
  const min = type === 'Hourly' ? settings.minHours ?? 1 : 1;
  const full = Math.floor(minutes / p);
  const rem = minutes - full * p;
  const units = Math.max(min, full + (rem > grace ? 1 : 0));
  return { minutes, actualHours: minutes / 60, days: minutes / 1440, units, base: Math.round(units * (Number(rate) || 0)) };
}

export function calcOvertime({ end, actualReturn, settings }) {
  if (!actualReturn) return { minutes: 0, hours: 0, charge: 0 };
  const late = Math.round((new Date(actualReturn) - new Date(end)) / 60000);
  if (late <= (settings.graceMinutes || 0)) return { minutes: 0, hours: 0, charge: 0 };
  const hours = Math.ceil(late / 60);
  return { minutes: late, hours, charge: hours * (settings.overtimeRate || 0) };
}

export const bookingTotal = (b) =>
  Math.max(0, (b.base || 0) + (b.extras || 0) + (b.chauffeur || 0) + (b.overtime || 0) - (b.discount || 0));

export const paidFor = (id, payments) =>
  payments.reduce((s, p) => (p.bookingId !== id ? s : p.type === 'payment' ? s + p.amount : p.type === 'refund' ? s - p.amount : s), 0);

export const balanceFor = (b, payments) => bookingTotal(b) - paidFor(b.id, payments);

export const payStatus = (b, payments) => {
  const t = bookingTotal(b), p = paidFor(b.id, payments);
  return p >= t ? 'Paid' : p > 0 ? 'Partial' : 'Unpaid';
};

/** Refundable deposits are LIABILITIES, never revenue. */
export const depositsHeld = (payments, bookingId) =>
  payments.filter((p) => !bookingId || p.bookingId === bookingId)
    .reduce((s, p) => (p.type === 'deposit' ? s + p.amount : p.type === 'deposit_refund' ? s - p.amount : s), 0);

export function findConflicts(bookings, { vehicleId, start, end, excludeId }) {
  const s = +new Date(start), e = +new Date(end);
  return bookings.filter((b) => b.vehicleId === vehicleId && b.id !== excludeId && BLOCKING.includes(b.status) && +new Date(b.start) < e && +new Date(b.end) > s);
}

export function getRange(key, custom = {}) {
  const now = new Date();
  switch (key) {
    case 'today': return [startOfDay(now), endOfDay(now)];
    case 'week': return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })];
    case 'month': return [startOfMonth(now), endOfMonth(now)];
    case 'year': return [startOfYear(now), endOfYear(now)];
    default: return [
      custom.from ? startOfDay(new Date(custom.from)) : startOfMonth(now),
      custom.to ? endOfDay(new Date(custom.to)) : endOfDay(now),
    ];
  }
}

export const bookingProfit = (b, expenses) =>
  bookingTotal(b) - sum(expenses.filter((e) => e.bookingId === b.id), (e) => e.amount);

export function computeFinancials(data, from, to) {
  const { bookings, payments, expenses, vehicles, fuel = [], settings } = data;
  const f = +from, t = +to, now = Date.now();
  const inR = (d) => { const x = +new Date(d); return x >= f && x <= t; };

  const earned = bookings.filter((b) => EARNED.includes(b.status) && inR(b.start));
  const revenue = sum(earned, bookingTotal);
  const exp = expenses.filter((e) => inR(e.date));
  const opex = sum(exp.filter((e) => !NON_OPERATING.includes(e.category)), (e) => e.amount);
  const interest = sum(exp.filter((e) => e.category === 'Vehicle Loan Interest'), (e) => e.amount);
  const principal = sum(exp.filter((e) => e.category === 'Loan Principal'), (e) => e.amount);
  const manualDep = sum(exp.filter((e) => e.category === 'Depreciation'), (e) => e.amount);

  const effTo = Math.min(t, now);
  const days = Math.max(0, differenceInCalendarDays(new Date(effTo), new Date(f)) + 1);
  const estDep = sum(vehicles, (v) => (v.purchasePrice * (v.depRate || 0)) / 365) * days;
  const depreciation = manualDep > 0 ? manualDep : Math.round(estDep);
  const tax = Math.round((revenue * (settings.taxRate || 0)) / 100);

  const totalExpenses = opex + interest + depreciation + tax;
  const operatingProfit = revenue - opex;
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const cashInGross = sum(payments.filter((p) => p.type === 'payment' && inR(p.date)), (p) => p.amount);
  const refunds = sum(payments.filter((p) => p.type === 'refund' && inR(p.date)), (p) => p.amount);
  const cashIn = cashInGross - refunds;
  const cashOut = sum(exp.filter((e) => e.category !== 'Depreciation'), (e) => e.amount);

  const outstanding = sum(
    bookings.filter((b) => EARNED.includes(b.status) && +new Date(b.start) <= t),
    (b) => Math.max(0, bookingTotal(b) - paidFor(b.id, payments.filter((p) => +new Date(p.date) <= t)))
  );

  const avail = Math.max(0, effTo - f) * Math.max(1, vehicles.length);
  let booked = 0;
  bookings.filter((b) => BOOKED.includes(b.status)).forEach((b) => {
    const s = Math.max(+new Date(b.start), f), e = Math.min(+new Date(b.end), effTo);
    if (e > s) booked += e - s;
  });
  const utilization = avail ? Math.min(100, (booked / avail) * 100) : 0;

  const bookedDays = sum(earned, (b) => (new Date(b.end) - new Date(b.start)) / 86400000);
  const km = sum(fuel.filter((x) => inR(x.date)), (x) => Math.max(0, x.odoEnd - x.odoStart));
  const eligible = sum(exp.filter((e) => !NON_OPERATING.includes(e.category) && !['Marketing', 'Driver Payments'].includes(e.category)), (e) => e.amount);

  return {
    revenue, opex, interest, principal, depreciation, tax, totalExpenses, operatingProfit, netProfit, margin,
    outstanding, utilization, bookedDays, km,
    cash: { in: cashIn, out: cashOut, net: cashIn - cashOut },
    bookings: bookings.filter((b) => BOOKED.includes(b.status) && inR(b.start)).length,
    earnedCount: earned.length,
    revenuePerDay: bookedDays ? revenue / bookedDays : 0,
    profitPerBooking: earned.length ? netProfit / earned.length : 0,
    costPerKm: km ? eligible / km : 0,
    revenuePerKm: km ? revenue / km : 0,
    days,
  };
}

export function monthlySeries(data, n = 6) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const m = subMonths(now, n - 1 - i);
    const r = computeFinancials(data, startOfMonth(m), endOfMonth(m));
    return { label: format(m, 'MMM'), revenue: r.revenue, expenses: r.totalExpenses, profit: r.netProfit, bookings: r.bookings, utilization: Math.round(r.utilization) };
  });
}

export function rangeSeries(data, from, to) {
  const days = differenceInCalendarDays(to, from) + 1;
  const buckets = days <= 31
    ? eachDayOfInterval({ start: from, end: to }).map((d) => [startOfDay(d), endOfDay(d), format(d, 'dd MMM')])
    : eachMonthOfInterval({ start: from, end: to }).map((d) => [d < from ? from : startOfMonth(d), endOfMonth(d) > to ? to : endOfMonth(d), format(d, 'MMM')]);
  return buckets.map(([a, b, label]) => {
    const r = computeFinancials(data, a, b);
    return { label, revenue: r.revenue, expenses: r.totalExpenses, profit: r.netProfit };
  });
}

/** Days of hire needed so revenue covers costs (+ optional profit target). */
export function breakEven({ costs, rate, varPerDay = 0, target = 0 }) {
  const margin = rate - varPerDay;
  if (margin <= 0) return { days: Infinity, revenue: costs + target };
  return { days: Math.ceil((costs + target) / margin), revenue: costs + target };
}

export function vehicleStatus(vehicle, bookings, now = new Date()) {
  const mine = bookings.filter((b) => b.vehicleId === vehicle.id && BLOCKING.includes(b.status));
  if (mine.some((b) => new Date(b.start) <= now && new Date(b.end) >= now) || mine.some((b) => b.status === 'Active')) return 'On rent';
  const next = mine.filter((b) => new Date(b.start) > now).sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  return next ? 'Booked soon' : 'Available';
}
