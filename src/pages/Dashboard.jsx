import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, CalendarCheck, CircleDollarSign, Clock, Gauge, Percent, PiggyBank, Plus, TrendingUp, Wallet, AlertTriangle } from 'lucide-react';
import { useApp, useAuth } from '../context';
import { BOOKED, EARNED, balanceFor, bookingTotal, computeFinancials, getRange, monthlySeries, rangeSeries, RENTAL_TYPES } from '../lib/finance';
import { maintenanceAlerts } from '../lib/alerts';
import { fdt, fdate, greeting, kes, pct, short, sum } from '../lib/format';
import { Badge, EmptyState, KPI, RangeFilter, Section, Skeleton, StatusBadge, useLoading } from '../components/ui';

const COLORS = ['#0D2149', '#1B4D89', '#C8A45D', '#168568', '#DC4C55', '#7C93B8', '#94A3B8', '#B08A3E'];
const delta = (c, p) => (p ? ((c - p) / Math.abs(p)) * 100 : null);
const tip = { formatter: (v) => kes(v), contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 } };
const axis = { tick: { fontSize: 11, fill: '#64748b' }, axisLine: false, tickLine: false };

const ChartCard = ({ title, children, className = '' }) => (
  <Section title={title} className={className}><div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></Section>
);

export default function Dashboard() {
  const { scoped: data, state, custName } = useApp();
  const { user } = useAuth();
  const nav = useNavigate();
  const loading = useLoading();
  const [range, setRange] = useState({ key: 'month' });
  const [from, to] = getRange(range.key, range);
  const k = `${+from}-${+to}`;

  const cur = useMemo(() => computeFinancials(data, from, to), [data, k]); // eslint-disable-line
  const prev = useMemo(() => computeFinancials(data, new Date(+from - (+to - +from + 1)), new Date(+from - 1)), [data, k]); // eslint-disable-line
  const series = useMemo(() => rangeSeries(data, from, to), [data, k]); // eslint-disable-line
  const months = useMemo(() => monthlySeries(data, 6), [data]);

  const inR = (d) => +new Date(d) >= +from && +new Date(d) <= +to;
  const byType = RENTAL_TYPES.map((t) => ({ name: t, value: sum(data.bookings.filter((b) => EARNED.includes(b.status) && b.type === t && inR(b.start)), bookingTotal) })).filter((x) => x.value > 0);
  const cats = [...new Set(data.expenses.filter((e) => inR(e.date)).map((e) => e.category))]
    .map((c) => ({ name: c, value: sum(data.expenses.filter((e) => e.category === c && inR(e.date)), (e) => e.amount) })).sort((a, b) => b.value - a.value);

  const recent = [...data.payments].filter((p) => p.type === 'payment' || p.type === 'refund').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const upcoming = data.bookings.filter((b) => ['Confirmed', 'Pending Confirmation'].includes(b.status) && new Date(b.start) > new Date()).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 5);
  const alerts = maintenanceAlerts(data).slice(0, 5);
  const owing = data.bookings.filter((b) => EARNED.includes(b.status) && balanceFor(b, data.payments) > 0).map((b) => ({ b, bal: balanceFor(b, data.payments) })).sort((a, b) => b.bal - a.bal).slice(0, 5);
  const bookRef = (id) => state.bookings.find((b) => b.id === id)?.ref;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {state.settings.ownerName || user?.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Here's how your car hire business is performing today. · {format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <button className="btn-primary" onClick={() => nav('/bookings?new=1')}><Plus size={16} />Add Booking</button>
      </div>
      <RangeFilter value={range} onChange={setRange} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPI icon={CircleDollarSign} label="Total Revenue" value={kes(cur.revenue)} delta={delta(cur.revenue, prev.revenue)} hint="Gross rental income earned" />
            <KPI icon={Wallet} label="Total Expenses" value={kes(cur.totalExpenses)} delta={delta(cur.totalExpenses, prev.totalExpenses)} invert hint="Operating + depreciation + interest" />
            <KPI icon={TrendingUp} label="Net Profit" value={kes(cur.netProfit)} delta={delta(cur.netProfit, prev.netProfit)} hint="Revenue − expenses" />
            <KPI icon={Percent} label="Profit Margin" value={pct(cur.margin)} delta={cur.margin - prev.margin} hint="Change in points vs previous" />
            <KPI icon={Banknote} label="Outstanding Payments" value={kes(cur.outstanding)} delta={delta(cur.outstanding, prev.outstanding)} invert hint="Still owed by customers" />
            <KPI icon={PiggyBank} label="Available Cash" value={kes(cur.cash.net)} delta={delta(cur.cash.net, prev.cash.net)} hint="Received − expenses paid" />
            <KPI icon={CalendarCheck} label="Total Bookings" value={cur.bookings} delta={delta(cur.bookings, prev.bookings)} hint="Confirmed rental activity" />
            <KPI icon={Gauge} label="Utilization Rate" value={pct(cur.utilization)} delta={cur.utilization - prev.utilization} hint="Booked ÷ available time" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Revenue vs Expenses" className="xl:col-span-2">
              <LineChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} tickFormatter={short} width={40} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1B4D89" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="expenses" name="Expenses" stroke="#DC4C55" strokeWidth={2.5} dot={false} /></LineChart>
            </ChartCard>
            <ChartCard title="Expense Categories">
              {cats.length ? <PieChart><Pie data={cats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart> : <BarChart data={[]} />}
            </ChartCard>
            <ChartCard title="Monthly Profit (last 6 months)">
              <BarChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} tickFormatter={short} width={40} /><Tooltip {...tip} />
                <Bar dataKey="profit" name="Net profit" radius={[8, 8, 0, 0]}>{months.map((m, i) => <Cell key={i} fill={m.profit >= 0 ? '#168568' : '#DC4C55'} />)}</Bar></BarChart>
            </ChartCard>
            <ChartCard title="Revenue by Rental Type">
              <BarChart data={byType} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} /><XAxis type="number" {...axis} tickFormatter={short} /><YAxis type="category" dataKey="name" {...axis} width={70} /><Tooltip {...tip} />
                <Bar dataKey="value" name="Revenue" fill="#0D2149" radius={[0, 8, 8, 0]} /></BarChart>
            </ChartCard>
            <ChartCard title="Booking Trends">
              <AreaChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} allowDecimals={false} width={30} /><Tooltip contentStyle={tip.contentStyle} />
                <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#C8A45D" fill="#C8A45D33" strokeWidth={2.5} /></AreaChart>
            </ChartCard>
            <ChartCard title="Vehicle Utilization %" className="xl:col-span-3">
              <LineChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} domain={[0, 100]} width={34} /><Tooltip formatter={(v) => `${v}%`} contentStyle={tip.contentStyle} />
                <Line type="monotone" dataKey="utilization" name="Utilization" stroke="#0D2149" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Section title="Recent Transactions" action={<Link to="/payments" className="text-xs text-royal">View all</Link>}>
              {recent.length ? <ul className="divide-y divide-slate-100">{recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm"><div><p className="font-medium">{bookRef(p.bookingId)}</p><p className="text-xs text-slate-500">{p.method} · {fdate(p.date)}</p></div>
                  <span className={p.type === 'refund' ? 'text-bad' : 'font-medium text-good'}>{p.type === 'refund' ? '−' : '+'}{kes(p.amount)}</span></li>))}</ul> : <EmptyState title="No transactions yet" />}
            </Section>
            <Section title="Upcoming Bookings" action={<Link to="/bookings" className="text-xs text-royal">View all</Link>}>
              {upcoming.length ? <ul className="divide-y divide-slate-100">{upcoming.map((b) => (
                <li key={b.id}><Link to={`/bookings/${b.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-royal"><div><p className="font-medium">{custName(b.customerId)} · {b.type}</p><p className="flex items-center gap-1 text-xs text-slate-500"><Clock size={12} />{fdt(b.start)}</p></div><StatusBadge s={b.status} /></Link></li>))}</ul> : <EmptyState title="No upcoming bookings" />}
            </Section>
            <Section title="Maintenance Alerts" action={<Link to="/maintenance" className="text-xs text-royal">Manage</Link>}>
              {alerts.length ? <ul className="divide-y divide-slate-100">{alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm"><div className="flex items-center gap-2"><AlertTriangle size={16} className={a.level === 'overdue' ? 'text-bad' : 'text-gold'} /><div><p className="font-medium">{a.title}</p><p className="text-xs text-slate-500">{a.detail}</p></div></div><Badge tone={a.level === 'overdue' ? 'red' : 'amber'}>{a.level === 'overdue' ? 'Overdue' : 'Soon'}</Badge></li>))}</ul> : <EmptyState title="All good" text="No maintenance due." />}
            </Section>
            <Section title="Outstanding Customer Balances" action={<Link to="/payments" className="text-xs text-royal">View all</Link>}>
              {owing.length ? <ul className="divide-y divide-slate-100">{owing.map(({ b, bal }) => (
                <li key={b.id}><Link to={`/bookings/${b.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-royal"><div><p className="font-medium">{custName(b.customerId)}</p><p className="text-xs text-slate-500">{b.ref}</p></div><span className="font-medium text-bad">{kes(bal)}</span></Link></li>))}</ul> : <EmptyState title="Nobody owes you" />}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
