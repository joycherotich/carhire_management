import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, CalendarCheck, CalendarDays, Car, ChevronDown, FileBarChart, Fuel, LayoutDashboard, LogOut, Menu, Plus, Receipt, Settings, TrendingUp, Users, Wallet, Wrench, X } from 'lucide-react';
import { useApp, useAuth } from '../context';

const NAV = [
  ['/', 'Dashboard', LayoutDashboard], ['/bookings', 'Bookings', CalendarCheck], ['/calendar', 'Calendar', CalendarDays],
  ['/vehicles', 'My Vehicles', Car], ['/payments', 'Income & Payments', Wallet], ['/expenses', 'Expenses', Receipt],
  ['/profitability', 'Profitability', TrendingUp], ['/fuel', 'Fuel & Mileage', Fuel], ['/maintenance', 'Maintenance', Wrench],
  ['/customers', 'Customers', Users], ['/reports', 'Reports', FileBarChart], ['/notifications', 'Notifications', Bell], ['/settings', 'Settings', Settings],
];

export const Logo = ({ dark }) => (
  <div className="flex items-center gap-2.5">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-royal to-navy ring-1 ring-gold/60"><Car size={18} className="text-gold" /></div>
    <span className={`font-heading text-lg font-semibold ${dark ? 'text-white' : 'text-navy'}`}>Bridge<span className="text-gold">Link</span></span>
  </div>
);

function Sidebar({ onNavigate, unread }) {
  return (
    <div className="flex h-full flex-col bg-midnight">
      <div className="px-6 py-6"><Logo dark /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
            className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-white/10 text-white before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:rounded before:bg-gold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon size={18} />{label}
            {label === 'Notifications' && unread > 0 && <span className="ml-auto rounded-full bg-gold px-1.5 text-[10px] font-semibold text-midnight">{unread}</span>}
          </NavLink>
        ))}
      </nav>
      <p className="px-6 py-4 text-[11px] text-slate-500">SMART CAR HIRE MANAGEMENT</p>
    </div>
  );
}

export default function Layout() {
  const { state, vehicleFilter, setVehicleFilter, notifications, unread, markRead, markAllRead, hasDemo } = useApp();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [bell, setBell] = useState(false);
  const [prof, setProf] = useState(false);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 print:hidden lg:block"><Sidebar unread={unread} /></aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-midnight/60" onClick={() => setDrawer(false)} />
          <div className="relative h-full w-72 animate-pop"><Sidebar unread={unread} onNavigate={() => setDrawer(false)} />
            <button className="absolute right-3 top-5 text-slate-400" onClick={() => setDrawer(false)}><X size={20} /></button></div>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur print:hidden sm:px-8">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)}><Menu size={20} /></button>
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input !w-auto max-w-[11rem] !py-2">
            <option value="all">All vehicles</option>
            {state.vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.reg}</option>)}
          </select>
          {hasDemo && <span className="hidden rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-[#8a6d2b] md:inline">Demo data</span>}
          <span className="ml-auto hidden text-sm text-slate-500 md:block">{format(new Date(), 'EEE, dd MMM yyyy')}</span>
          <button onClick={() => nav('/bookings?new=1')} className="btn-primary !py-2"><Plus size={16} /><span className="hidden sm:inline">Quick Add Booking</span></button>

          <div className="relative">
            <button onClick={() => { setBell(!bell); setProf(false); }} className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
              <Bell size={17} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-semibold text-white">{unread}</span>}
            </button>
            {bell && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBell(false)} />
                <div className="absolute right-0 z-40 mt-2 w-80 animate-pop overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b px-4 py-3"><b className="text-sm">Notifications</b><button className="text-xs text-royal" onClick={markAllRead}>Mark all read</button></div>
                  <div className="max-h-80 divide-y overflow-y-auto">
                    {notifications.slice(0, 6).map((n) => (
                      <Link key={n.id} to={n.link} onClick={() => { markRead(n.id); setBell(false); }} className={`block px-4 py-3 text-sm hover:bg-slate-50 ${n.read ? 'opacity-60' : ''}`}>
                        <p className="font-medium text-navy">{n.title}</p><p className="text-xs text-slate-500">{n.text}</p>
                      </Link>
                    ))}
                    {!notifications.length && <p className="p-6 text-center text-sm text-slate-500">You're all caught up.</p>}
                  </div>
                  <Link to="/notifications" onClick={() => setBell(false)} className="block border-t px-4 py-2.5 text-center text-xs font-medium text-royal">View all</Link>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setProf(!prof); setBell(false); }} className="flex items-center gap-2 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-2.5 hover:bg-slate-50">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-sm font-semibold text-gold">{(user?.name || 'J')[0]}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {prof && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProf(false)} />
                <div className="absolute right-0 z-40 mt-2 w-56 animate-pop rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="px-3 py-2"><p className="text-sm font-medium">{user?.name}</p><p className="text-xs text-slate-500">{user?.email}</p></div>
                  <Link to="/settings" onClick={() => setProf(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Settings size={15} />Settings</Link>
                  <button onClick={() => { logout(); nav('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-bad hover:bg-bad/5"><LogOut size={15} />Sign out</button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] animate-fadeUp px-4 py-6 print:p-0 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
