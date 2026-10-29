import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addMonths, addWeeks, addYears } from 'date-fns';
import { buildSeed } from './lib/seed';
import { buildNotifications } from './lib/alerts';
import { depositsHeld } from './lib/finance';
import { store, uid } from './lib/format';

/* ---------------- Auth (mock — swap for real API later) ---------------- */
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
const AUTH_KEY = 'vistaride:auth', PW_KEY = 'vistaride:pw';
export const DEMO_EMAIL = 'joy@vistaride.co.ke', DEMO_PASSWORD = 'vistaride123';

export function AuthProvider({ children, initialUser }) {
  const [user, setUser] = useState(() => initialUser || store.get(AUTH_KEY) || (typeof sessionStorage !== 'undefined' ? JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null') : null));
  const login = (email, password, remember) => new Promise((res, rej) => setTimeout(() => {
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== (store.get(PW_KEY) || DEMO_PASSWORD)) return rej(new Error('Invalid email or password'));
    const u = { name: 'Joy', email: DEMO_EMAIL, role: 'Owner' };
    if (remember) store.set(AUTH_KEY, u); else sessionStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u); res(u);
  }, 700));
  const logout = () => { store.del(AUTH_KEY); try { sessionStorage.removeItem(AUTH_KEY); } catch { /* */ } setUser(null); };
  const changePassword = (cur, next) => {
    if (cur !== (store.get(PW_KEY) || DEMO_PASSWORD)) return 'Current password is incorrect';
    if (next.length < 8) return 'New password must be at least 8 characters';
    store.set(PW_KEY, next); return null;
  };
  return <AuthCtx.Provider value={{ user, login, logout, changePassword }}>{children}</AuthCtx.Provider>;
}

/* ---------------- App data ---------------- */
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const KEY = 'vistaride:data:v1', READ_KEY = 'vistaride:read';

export function AppProvider({ children }) {
  const [state, setState] = useState(() => store.get(KEY) || buildSeed());
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [read, setRead] = useState(() => store.get(READ_KEY, []));
  useEffect(() => { store.set(KEY, state); }, [state]);
  useEffect(() => { store.set(READ_KEY, read); }, [read]);

  const mut = (fn, msg) => setState((s) => ({ ...fn(s), logs: [{ id: uid('log'), at: new Date().toISOString(), text: msg }, ...(s.logs || [])].slice(0, 100) }));
  const addTo = (key, item, msg) => mut((s) => ({ ...s, [key]: [...s[key], item] }), msg);
  const patch = (key, id, p, msg) => mut((s) => ({ ...s, [key]: s[key].map((x) => (x.id === id ? { ...x, ...p } : x)) }), msg);

  const actions = {
    addBooking({ booking, newCustomer, payment, deposit }) {
      mut((s) => {
        let customers = s.customers, customerId = booking.customerId;
        if (newCustomer) { customerId = uid('cus'); customers = [...customers, { id: customerId, ...newCustomer, notes: '', idVerified: 'Unverified' }]; }
        const b = { ...booking, customerId };
        const pays = [];
        if (payment?.amount > 0) pays.push({ id: uid('pay'), bookingId: b.id, type: 'payment', date: new Date().toISOString(), ...payment });
        if (deposit && b.deposit > 0) pays.push({ id: uid('pay'), bookingId: b.id, type: 'deposit', amount: b.deposit, method: payment?.method || 'M-Pesa', reference: '', date: new Date().toISOString() });
        return { ...s, customers, bookings: [...s.bookings, b], payments: [...s.payments, ...pays] };
      }, `Booking ${booking.ref} created`);
    },
    updateBooking: (id, p) => patch('bookings', id, p, 'Booking updated'),
    nextRef: () => { let n = state.bookings.length + 1; const y = new Date().getFullYear(); while (state.bookings.some((b) => b.ref === `VR-${y}-${String(n).padStart(4, '0')}`)) n++; return `VR-${y}-${String(n).padStart(4, '0')}`; },
    addPayment(p) {
      const dup = state.payments.find((x) => (p.reference && x.reference && x.reference.toLowerCase() === p.reference.toLowerCase()) ||
        (x.bookingId === p.bookingId && x.type === p.type && x.amount === p.amount && x.method === p.method && x.date.slice(0, 10) === p.date.slice(0, 10)));
      if (dup) return 'Duplicate payment: the same reference (or an identical entry) already exists.';
      addTo('payments', { id: uid('pay'), ...p }, `Payment ${p.type} recorded`);
      return null;
    },
    removePayment: (id) => mut((s) => ({ ...s, payments: s.payments.filter((p) => p.id !== id) }), 'Payment removed'),
    addExpense: (e) => addTo('expenses', { id: uid('exp'), ...e }, `Expense added: ${e.category}`),
    removeExpense: (id) => mut((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }), 'Expense removed'),
    addFuel(f) {
      const fid = uid('fuel');
      mut((s) => ({
        ...s, fuel: [...s.fuel, { id: fid, ...f }],
        expenses: [...s.expenses, { id: uid('exp'), category: 'Fuel', description: `Fuel — ${f.litres} L`, amount: Math.round(f.litres * f.price), date: f.date, vehicleId: f.vehicleId, vendor: '', method: 'M-Pesa', recurring: 'none', bookingId: f.bookingId || '', notes: '', fuelId: fid }],
        vehicles: s.vehicles.map((v) => (v.id === f.vehicleId && f.odoEnd > v.odometer ? { ...v, odometer: f.odoEnd } : v)),
      }), 'Fuel entry added');
    },
    removeFuel: (id) => mut((s) => ({ ...s, fuel: s.fuel.filter((f) => f.id !== id), expenses: s.expenses.filter((e) => e.fuelId !== id) }), 'Fuel entry removed'),
    addMaintenance(m) {
      const mid = uid('mnt');
      const cat = { 'Oil change': 'Engine Oil', 'General servicing': 'Servicing', 'Tyre replacement': 'Tyres', 'Insurance renewal': 'Insurance', 'Scheduled inspection': 'Vehicle Inspection' }[m.type] || 'Repairs';
      mut((s) => ({
        ...s, maintenance: [...s.maintenance, { id: mid, ...m }],
        expenses: m.cost > 0 ? [...s.expenses, { id: uid('exp'), category: cat, description: m.type, amount: m.cost, date: m.date, vehicleId: m.vehicleId, vendor: m.supplier, method: 'M-Pesa', recurring: 'none', bookingId: '', notes: m.notes, maintId: mid }] : s.expenses,
      }), `Maintenance logged: ${m.type}`);
    },
    removeMaintenance: (id) => mut((s) => ({ ...s, maintenance: s.maintenance.filter((m) => m.id !== id), expenses: s.expenses.filter((e) => e.maintId !== id) }), 'Maintenance removed'),
    addCustomer: (c) => { const id = uid('cus'); addTo('customers', { id, idVerified: 'Unverified', notes: '', ...c }, `Customer added: ${c.name}`); return id; },
    updateCustomer: (id, p) => patch('customers', id, p, 'Customer updated'),
    addVehicle: (v) => addTo('vehicles', { id: uid('veh'), image: '', ...v }, `Vehicle added: ${v.make} ${v.model}`),
    updateVehicle: (id, p) => patch('vehicles', id, p, 'Vehicle updated'),
    updateSettings: (p) => mut((s) => ({ ...s, settings: { ...s.settings, ...p } }), 'Settings updated'),
    postRecurring() {
      const adv = { monthly: addMonths, weekly: addWeeks, yearly: addYears };
      const latest = {};
      state.expenses.filter((e) => e.recurring && e.recurring !== 'none').forEach((e) => {
        const k = `${e.category}|${e.description}|${e.vehicleId}`;
        if (!latest[k] || new Date(e.date) > new Date(latest[k].date)) latest[k] = e;
      });
      const added = [];
      Object.values(latest).forEach((e) => {
        let d = adv[e.recurring](new Date(e.date), 1);
        while (d <= new Date()) { added.push({ ...e, id: uid('exp'), date: d.toISOString(), demo: false }); d = adv[e.recurring](d, 1); }
      });
      if (added.length) mut((s) => ({ ...s, expenses: [...s.expenses, ...added] }), `Posted ${added.length} recurring expense(s)`);
      return added.length;
    },
    removeDemo: () => mut((s) => ({
      ...s,
      bookings: s.bookings.filter((x) => !x.demo), customers: s.customers.filter((x) => !x.demo), payments: s.payments.filter((x) => !x.demo),
      expenses: s.expenses.filter((x) => !x.demo), fuel: s.fuel.filter((x) => !x.demo), maintenance: s.maintenance.filter((x) => !x.demo),
    }), 'Demo data removed'),
    resetDemo: () => setState(buildSeed()),
  };

  const scoped = useMemo(() => {
    const all = vehicleFilter === 'all';
    const bookings = all ? state.bookings : state.bookings.filter((b) => b.vehicleId === vehicleFilter);
    const ids = new Set(bookings.map((b) => b.id));
    return {
      settings: state.settings, bookings,
      vehicles: all ? state.vehicles : state.vehicles.filter((v) => v.id === vehicleFilter),
      payments: all ? state.payments : state.payments.filter((p) => ids.has(p.bookingId)),
      expenses: all ? state.expenses : state.expenses.filter((e) => e.vehicleId === vehicleFilter),
      fuel: all ? state.fuel : state.fuel.filter((f) => f.vehicleId === vehicleFilter),
      maintenance: all ? state.maintenance : state.maintenance.filter((m) => m.vehicleId === vehicleFilter),
    };
  }, [state, vehicleFilter]);

  const notifications = useMemo(() => buildNotifications(scoped, state.customers).map((n) => ({ ...n, read: read.includes(n.id) })), [scoped, state.customers, read]);
  const hasDemo = [state.bookings, state.customers, state.payments, state.expenses, state.fuel, state.maintenance].some((a) => a.some((x) => x.demo));

  const value = {
    state, scoped, vehicleFilter, setVehicleFilter, notifications, hasDemo,
    unread: notifications.filter((n) => !n.read).length,
    markRead: (id) => setRead((r) => (r.includes(id) ? r : [...r, id])),
    markAllRead: () => setRead((r) => [...new Set([...r, ...notifications.map((n) => n.id)])]),
    custName: (id) => state.customers.find((c) => c.id === id)?.name || '—',
    depositsHeld: (bid) => depositsHeld(state.payments, bid),
    ...actions,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
