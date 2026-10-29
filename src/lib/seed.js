import { addDays, addHours, addMonths, startOfDay } from 'date-fns';
import { EXPENSE_CATEGORIES, bookingTotal, calcRental } from './finance';

export const DEFAULT_SETTINGS = {
  businessName: 'VistaRide', ownerName: 'Joy', ownerEmail: 'joy@vistaride.co.ke', currency: 'KES', timezone: 'Africa/Nairobi',
  rates: { Hourly: 1500, Daily: 9000, Weekly: 55000, Monthly: 200000 },
  minHours: 3, hourlyGraceMinutes: 10, graceMinutes: 60, overtimeRate: 1500, defaultDeposit: 20000,
  taxRate: 0, financialYearStart: '01-01', revenueTarget: 250000, profitTarget: 100000,
  notify: { bookings: true, payments: true, maintenance: true, financial: true },
  categories: [...EXPENSE_CATEGORIES],
};

export function buildSeed() {
  const today = startOfDay(new Date());
  const at = (off, h = 9) => { const x = addDays(today, off); x.setHours(h, 0, 0, 0); return x; };
  const iso = (d) => new Date(d).toISOString();
  const settings = { ...DEFAULT_SETTINGS };
  const V = 'veh_1';
  let n = 0;
  const id = (p) => `${p}_${++n}`;

  const vehicles = [{
    id: V, make: 'Mazda', model: 'CX-5', color: 'Navy Blue', reg: 'KDX 123A', year: 2022, vin: 'JM3KFBDM0N0000000',
    engine: '2.0L SkyActiv-G (1998cc)', fuelType: 'Petrol', transmission: 'Automatic', purchasePrice: 3650000,
    purchaseDate: iso(at(-420)), marketValue: 3300000, odometer: 0, depRate: 0.15,
    insuranceProvider: 'Comprehensive cover (edit me)', insurancePolicy: 'POL-000000', insuranceExpiry: iso(at(25)), inspectionDue: iso(at(60)),
    financing: 'Bank loan', loanBalance: 2100000, image: '/mazda.jpeg', demo: false,
  }];

  const people = [['Brian Otieno', '0712 000 101'], ['Faith Wanjiru', '0722 000 102'], ['Kevin Mwangi', '0733 000 103'], ['Amina Hassan', '0711 000 104'], ['Peter Odhiambo', '0700 000 105'], ['Grace Achieng', '0723 000 106'], ['Samuel Kiptoo', '0734 000 107'], ['Mercy Njeri', '0701 000 108']];
  const customers = people.map(([name, phone], i) => ({
    id: `cus_${i + 1}`, name, phone, email: `${name.split(' ')[0].toLowerCase()}@example.com`, notes: '',
    idVerified: i % 4 === 3 ? 'Pending' : 'Verified', demo: true,
  }));

  // [offsetDays, hour, type, durationHours, rate, customerIdx, status, opts]
  const specs = [
    [-88, 9, 'Daily', 72, 9000, 0, 'Completed', { dep: 1 }], [-84, 8, 'Hourly', 6, 1500, 1, 'Completed'],
    [-80, 9, 'Daily', 48, 9000, 2, 'Completed', { dep: 1 }], [-75, 10, 'Weekly', 168, 55000, 3, 'Completed', { dep: 1 }],
    [-66, 9, 'Daily', 24, 9000, 4, 'Completed'], [-62, 14, 'Hourly', 5, 1500, 5, 'Completed'],
    [-58, 8, 'Daily', 96, 9000, 6, 'Completed', { chauffeur: 12000, dep: 1 }], [-52, 10, 'Weekly', 168, 55000, 7, 'Completed', { dep: 1 }],
    [-42, 9, 'Daily', 72, 8500, 0, 'Completed', { dep: 1, discount: 1500 }], [-36, 9, 'Hourly', 8, 1500, 1, 'Completed'],
    [-33, 9, 'Daily', 48, 9000, 2, 'Completed', { extras: 1500 }], [-28, 9, 'Daily', 120, 9000, 3, 'Completed', { dep: 1 }],
    [-21, 15, 'Hourly', 4, 1500, 5, 'Completed'], [-19, 9, 'Daily', 72, 9000, 6, 'Completed', { dep: 1, held: 1 }],
    [-14, 9, 'Weekly', 168, 55000, 7, 'Completed', { dep: 1, held: 1, paid: 0.7 }], [-5, 9, 'Daily', 48, 9000, 4, 'Completed', { paid: 0 }],
    [-1, 10, 'Hourly', 6, 1500, 1, 'Completed', { paid: 0.5 }],
    [-1, 18, 'Daily', 48, 9000, 0, 'Active', { dep: 1, paid: 0.5 }],
    [3, 9, 'Daily', 72, 9000, 2, 'Confirmed', { dep: 1, depPaid: 1 }], [9, 10, 'Hourly', 8, 1500, 3, 'Confirmed'],
    [12, 9, 'Weekly', 168, 55000, 6, 'Confirmed', { dep: 1, depPaid: 1 }], [25, 9, 'Daily', 48, 9000, 5, 'Pending Confirmation'],
    [-45, 9, 'Daily', 24, 9000, 4, 'Cancelled'], [-10, 9, 'Daily', 24, 9000, 7, 'No-show'],
  ];
  const methods = ['M-Pesa', 'M-Pesa', 'Cash', 'Bank transfer'];
  const bookings = [], payments = [];
  specs.forEach(([off, h, type, dur, rate, ci, status, o = {}], i) => {
    const start = at(off, h), end = addHours(start, dur);
    const c = calcRental({ type, start, end, rate, settings });
    const b = {
      id: `bk_${i + 1}`, ref: `VR-${start.getFullYear()}-${String(i + 1).padStart(4, '0')}`, customerId: customers[ci].id, vehicleId: V, type,
      start: iso(start), end: iso(end), pickup: 'Kisumu CBD', dropoff: 'Kisumu CBD', rate, units: c.units, base: c.base,
      discount: o.discount || 0, extras: o.extras || 0, chauffeur: o.chauffeur || 0, overtime: 0, deposit: o.dep ? settings.defaultDeposit : 0,
      status, notes: '', createdAt: iso(addDays(start, -2)), demo: true,
    };
    bookings.push(b);
    const total = bookingTotal(b);
    if (status === 'Completed' || status === 'Active') {
      const amt = Math.round(total * (o.paid ?? 1));
      if (amt > 0) payments.push({ id: `pay_${payments.length + 1}`, bookingId: b.id, type: 'payment', amount: amt, method: methods[i % 4], reference: methods[i % 4] === 'M-Pesa' ? `SJK${4000 + i * 37}XQ` : '', date: status === 'Completed' ? b.end : b.start, demo: true });
    }
    if (b.deposit && (status === 'Completed' || status === 'Active' || o.depPaid)) {
      payments.push({ id: `pay_${payments.length + 1}`, bookingId: b.id, type: 'deposit', amount: b.deposit, method: 'M-Pesa', reference: `DEP${700 + i}ZK`, date: b.start, demo: true });
      if (status === 'Completed' && !o.held) payments.push({ id: `pay_${payments.length + 1}`, bookingId: b.id, type: 'deposit_refund', amount: b.deposit, method: 'M-Pesa', reference: `RFD${700 + i}ZK`, date: b.end, demo: true });
    }
  });

  const expenses = [];
  const addE = (category, description, amount, off, x = {}) => expenses.push({ id: id('exp'), category, description, amount, date: iso(at(off, 12)), vehicleId: V, vendor: '', method: 'M-Pesa', recurring: 'none', bookingId: '', notes: '', demo: true, ...x });
  for (let w = 12; w >= 0; w--) addE('Car Wash', 'Exterior & interior wash', 700, -w * 7 - 2, { vendor: 'Lakeside Car Wash', method: 'Cash' });
  [-75, -45, -15].forEach((o) => {
    addE('Insurance', 'Monthly insurance allocation', 12500, o, { recurring: 'monthly', vendor: 'Insurer' });
    addE('GPS Tracking', 'GPS tracker subscription', 1200, o, { recurring: 'monthly', vendor: 'TrackCo' });
    addE('Vehicle Loan Interest', 'Loan interest', 31500, o, { recurring: 'monthly', vendor: 'Bank', method: 'Bank transfer' });
    addE('Loan Principal', 'Loan principal repayment', 58000, o, { recurring: 'monthly', vendor: 'Bank', method: 'Bank transfer' });
  });
  [-70, -50, -30, -12].forEach((o, i) => addE('Parking', 'Parking fees', 500 + i * 200, o, { method: 'Cash' }));
  [-60, -35, -8].forEach((o) => addE('Cleaning', 'Interior detailing', 2000, o, { vendor: 'Detail Pros' }));
  addE('Driver Payments', 'Chauffeur — VR booking', 3000, -58, { bookingId: 'bk_7', method: 'Cash' });
  addE('Marketing', 'Social media boost', 5000, -40);
  addE('Road Tolls', 'Toll fees', 400, -28, { method: 'Cash' });

  let odo = 32400;
  const fuel = [];
  [[-86, 410, 36], [-77, 520, 45], [-70, 380, 33], [-61, 640, 56], [-53, 450, 39], [-45, 500, 43], [-38, 420, 70], [-30, 560, 49], [-22, 470, 41], [-14, 610, 53], [-6, 390, 34]].forEach(([off, km, l], i) => {
    const price = 181 + (i % 4);
    const fid = `fuel_${i + 1}`;
    fuel.push({ id: fid, vehicleId: V, date: iso(at(off, 11)), litres: l, price, odoStart: odo, odoEnd: odo + km, bookingId: '', demo: true });
    addE('Fuel', `Fuel — ${l} L`, Math.round(l * price), off, { fuelId: fid, vendor: 'Fuel station' });
    odo += km;
  });
  vehicles[0].odometer = odo;

  const maintenance = [
    { id: 'mnt_1', vehicleId: V, type: 'Oil change', date: iso(at(-40)), cost: 6500, supplier: 'Mazda Service Centre', notes: 'Synthetic 0W-20', nextDueDate: iso(at(120)), nextDueKm: odo + 240, demo: true },
    { id: 'mnt_2', vehicleId: V, type: 'General servicing', date: iso(at(-40)), cost: 18500, supplier: 'Mazda Service Centre', notes: '', nextDueDate: iso(at(140)), nextDueKm: odo + 4800, demo: true },
    { id: 'mnt_3', vehicleId: V, type: 'Brake servicing', date: iso(at(-20)), cost: 14000, supplier: 'AutoFix', notes: 'Front pads', nextDueDate: iso(at(300)), nextDueKm: odo + 25000, demo: true },
  ];
  maintenance.forEach((m) => addE(m.type === 'Oil change' ? 'Engine Oil' : m.type === 'General servicing' ? 'Servicing' : 'Repairs', m.type, m.cost, Math.round((new Date(m.date) - today) / 864e5), { maintId: m.id, vendor: m.supplier }));

  return { settings, vehicles, customers, bookings, payments, expenses, fuel, maintenance, logs: [] };
}
