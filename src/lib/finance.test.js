import { describe, expect, it } from 'vitest';
import { bookingTotal, calcOvertime, calcRental, computeFinancials, depositsHeld, findConflicts, paidFor, breakEven } from './finance';

const settings = { graceMinutes: 60, hourlyGraceMinutes: 10, minHours: 3, overtimeRate: 1500, taxRate: 0 };

describe('rental pricing', () => {
  it('applies the minimum hourly rental', () => {
    const r = calcRental({ type: 'Hourly', start: '2026-01-01T08:00', end: '2026-01-01T09:00', rate: 1500, settings });
    expect(r.units).toBe(3); expect(r.base).toBe(4500);
  });
  it('does not round up inside the grace period', () => {
    expect(calcRental({ type: 'Hourly', start: '2026-01-01T08:00', end: '2026-01-01T11:05', rate: 1500, settings }).units).toBe(3);
    expect(calcRental({ type: 'Hourly', start: '2026-01-01T08:00', end: '2026-01-01T11:20', rate: 1500, settings }).units).toBe(4);
  });
  it('charges daily rentals by chargeable days with grace', () => {
    expect(calcRental({ type: 'Daily', start: '2026-01-01T09:00', end: '2026-01-03T09:30', rate: 9000, settings }).base).toBe(18000);
    expect(calcRental({ type: 'Daily', start: '2026-01-01T09:00', end: '2026-01-03T10:30', rate: 9000, settings }).base).toBe(27000);
  });
  it('charges overtime only after grace', () => {
    expect(calcOvertime({ end: '2026-01-01T10:00', actualReturn: '2026-01-01T10:30', settings }).charge).toBe(0);
    expect(calcOvertime({ end: '2026-01-01T10:00', actualReturn: '2026-01-01T12:10', settings }).charge).toBe(4500);
  });
});

describe('payments & balances', () => {
  const b = { id: 'b1', base: 10000, extras: 500, chauffeur: 0, overtime: 0, discount: 500 };
  const payments = [
    { bookingId: 'b1', type: 'payment', amount: 6000 }, { bookingId: 'b1', type: 'refund', amount: 1000 },
    { bookingId: 'b1', type: 'deposit', amount: 20000 }, { bookingId: 'b1', type: 'deposit_refund', amount: 5000 },
  ];
  it('computes totals and balances', () => { expect(bookingTotal(b)).toBe(10000); expect(paidFor('b1', payments)).toBe(5000); });
  it('keeps deposits as a liability, outside paid amounts', () => expect(depositsHeld(payments, 'b1')).toBe(15000));
});

describe('conflicts', () => {
  const bookings = [{ id: 'a', vehicleId: 'v', status: 'Confirmed', start: '2026-01-05T09:00', end: '2026-01-07T09:00' }];
  it('detects overlaps and ignores adjacent bookings', () => {
    expect(findConflicts(bookings, { vehicleId: 'v', start: '2026-01-06T09:00', end: '2026-01-08T09:00' })).toHaveLength(1);
    expect(findConflicts(bookings, { vehicleId: 'v', start: '2026-01-07T09:00', end: '2026-01-08T09:00' })).toHaveLength(0);
  });
});

describe('financials', () => {
  const data = {
    settings, vehicles: [{ id: 'v', purchasePrice: 0, depRate: 0 }], fuel: [],
    bookings: [{ id: 'b', vehicleId: 'v', status: 'Completed', start: '2026-01-10T09:00', end: '2026-01-11T09:00', base: 9000 }],
    payments: [{ bookingId: 'b', type: 'payment', amount: 9000, date: '2026-01-11T09:00' }, { bookingId: 'b', type: 'deposit', amount: 20000, date: '2026-01-10T09:00' }],
    expenses: [
      { category: 'Fuel', amount: 2000, date: '2026-01-10T12:00' }, { category: 'Loan Principal', amount: 58000, date: '2026-01-12T12:00' },
      { category: 'Vehicle Loan Interest', amount: 3000, date: '2026-01-12T12:00' },
    ],
  };
  const r = computeFinancials(data, new Date('2026-01-01'), new Date('2026-01-31T23:59'));
  it('excludes loan principal from operating expenses but includes it in cash flow', () => { expect(r.opex).toBe(2000); expect(r.cash.out).toBe(63000); });
  it('computes net profit and margin', () => { expect(r.netProfit).toBe(9000 - 2000 - 3000); expect(r.margin).toBeCloseTo((4000 / 9000) * 100); });
  it('does not count deposits as income', () => expect(r.cash.in).toBe(9000));
  it('computes break-even days', () => { expect(breakEven({ costs: 90000, rate: 9000 }).days).toBe(10); expect(breakEven({ costs: 90000, rate: 9000, varPerDay: 1000 }).days).toBe(12); });
});
