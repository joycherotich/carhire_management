import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { endOfMonth, startOfMonth, startOfYear, endOfYear, getDaysInMonth, subMonths } from 'date-fns';
import { Calculator, Percent, Target, TrendingUp, Wallet, Coins, Route, Gauge } from 'lucide-react';
import { useApp } from '../context';
import { BOOKED, bookingProfit, bookingTotal, breakEven, computeFinancials, monthlySeries } from '../lib/finance';
import { kes, num, pct, sum } from '../lib/format';
import { Badge, KPI, PageHeader, Section, Table } from '../components/ui';

const Line = ({ k, v, bold, tag }) => <div className={`flex items-center justify-between py-2 text-sm ${bold ? 'border-t border-slate-200 font-semibold text-navy' : ''}`}><span className="text-slate-600">{k} {tag && <Badge tone="amber">Estimate</Badge>}</span><span className={v < 0 ? 'text-bad' : ''}>{typeof v === 'number' ? kes(v) : v}</span></div>;

export default function Profitability() {
  const { scoped: data, state, custName } = useApp();
  const [period, setPeriod] = useState('month');
  const now = new Date();
  const [from, to] = period === 'month' ? [startOfMonth(now), endOfMonth(now)] : period === 'year' ? [startOfYear(now), endOfYear(now)] : [new Date('2000-01-01'), endOfYear(now)];
  const r = useMemo(() => computeFinancials(data, from, to), [data, period]); // eslint-disable-line
  const month = useMemo(() => computeFinancials(data, startOfMonth(now), endOfMonth(now)), [data]); // eslint-disable-line
  const ytd = useMemo(() => computeFinancials(data, startOfYear(now), now), [data]); // eslint-disable-line
  const life = useMemo(() => computeFinancials(data, new Date('2000-01-01'), now), [data]); // eslint-disable-line
  const last3 = useMemo(() => monthlySeries(data, 4).slice(0, 3), [data]);
  const baseCost = Math.round(sum(last3, (m) => m.expenses) / 3);
  const avgRate = Math.round(life.revenuePerDay || data.settings.rates.Daily);
  const be = breakEven({ costs: baseCost, rate: avgRate });

  const [calc, setCalc] = useState({ costs: null, rate: null, varDay: 0, target: null });
  const costs = calc.costs ?? baseCost, rate = calc.rate ?? avgRate, target = calc.target ?? data.settings.profitTarget;
  const bd = breakEven({ costs, rate, varPerDay: Number(calc.varDay) || 0 });
  const bt = breakEven({ costs, rate, varPerDay: Number(calc.varDay) || 0, target });
  const daysInMonth = getDaysInMonth(now);
  const profits = data.bookings.filter((b) => BOOKED.includes(b.status) && b.status !== 'Confirmed').map((b) => ({ b, p: bookingProfit(b, data.expenses) })).sort((a, b) => b.p - a.p);
  const periodOpen = +to >= Date.now();
  const tp = data.settings.profitTarget ? (month.netProfit / data.settings.profitTarget) * 100 : 0;
  const Num = (k, label, v) => <div><label className="label">{label}</label><input type="number" min="0" className="input" value={v} onChange={(e) => setCalc({ ...calc, costs, rate, target, [k]: e.target.value })} /></div>;

  return (
    <>
      <PageHeader title="Profitability" subtitle="Is the Mazda CX-5 genuinely making money?" actions={
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">{[['month', 'This month'], ['year', 'This year'], ['all', 'Lifetime']].map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${period === k ? 'bg-navy text-white' : 'text-slate-600'}`}>{l}</button>)}</div>} />
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500"><Badge tone={periodOpen ? 'amber' : 'green'}>{periodOpen ? 'Period still open — figures are estimates' : 'Finalized period'}</Badge></div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI icon={TrendingUp} label="Net profit" value={kes(r.netProfit)} hint="After depreciation, interest & tax" />
        <KPI icon={Coins} label="Operating profit" value={kes(r.operatingProfit)} hint="Revenue − operating expenses" />
        <KPI icon={Percent} label="Profit margin" value={pct(r.margin)} />
        <KPI icon={Wallet} label="Net cash flow" value={kes(r.cash.net)} hint="Separate from accounting profit" />
        <KPI icon={Gauge} label="Revenue / booked day" value={kes(r.revenuePerDay)} />
        <KPI icon={Route} label="Cost per km" value={r.km ? `KES ${r.costPerKm.toFixed(1)}` : '—'} hint={r.km ? `${num(r.km)} km driven` : 'Add fuel records'} />
        <KPI icon={Coins} label="Avg profit / booking" value={kes(r.profitPerBooking)} hint={`${r.earnedCount} bookings`} />
        <KPI icon={Target} label="Target achievement" value={pct(tp, 0)} hint={`${kes(month.netProfit)} of ${kes(data.settings.profitTarget)} (this month)`} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Section title="Profit & Loss (accounting)">
          <Line k="Gross rental revenue" v={r.revenue} /><Line k="Operating expenses" v={-r.opex} />
          <Line k="Operating profit" v={r.operatingProfit} bold /><Line k="Depreciation" v={-r.depreciation} tag />
          <Line k="Loan interest" v={-r.interest} /><Line k="Taxes" v={-r.tax} tag={r.tax > 0} /><Line k="Net profit" v={r.netProfit} bold />
        </Section>
        <Section title="Cash flow (separate from profit)">
          <Line k="Rental payments received" v={r.cash.in} /><Line k="Expenses paid" v={-(r.cash.out - r.principal)} />
          <Line k="Loan principal repaid" v={-r.principal} /><Line k="Net cash flow" v={r.cash.net} bold />
          <p className="mt-3 text-xs text-slate-500">Loan principal reduces cash and debt but is <b>not</b> an operating expense. Refundable deposits are liabilities and excluded from both.</p>
        </Section>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {[['Year-to-date earnings', kes(ytd.revenue)], ['Lifetime earnings', kes(life.revenue)], ['Lifetime net profit', kes(life.netProfit)], ['Return on investment', pct(data.vehicles[0]?.purchasePrice ? (life.netProfit / sum(data.vehicles, (v) => v.purchasePrice)) * 100 : 0)],
          ['Profit / day (period)', kes(r.netProfit / Math.max(1, r.days))], ['Vehicle depreciation (est. total)', kes(sum(data.vehicles, (v) => v.purchasePrice - v.marketValue))]].map(([k, v]) => <div key={k} className="card p-5"><p className="text-xs uppercase tracking-wide text-slate-500">{k}</p><p className="mt-1 font-heading text-xl font-semibold">{v}</p></div>)}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden bg-navy p-6 text-white">
          <div className="flex items-center gap-2 text-gold"><Calculator size={18} /><h3 className="font-heading font-semibold !text-white">Break-even calculator</h3></div>
          <p className="mt-1 text-sm text-slate-300">How many days must the CX-5 be hired this month to cover all expenses and start making profit?</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-slate-800">{Num('costs', 'Monthly cost base (KES)', costs)}{Num('rate', 'Revenue per hire day (KES)', rate)}{Num('varDay', 'Variable cost per hire day', calc.varDay)}{Num('target', 'Profit target (KES)', target)}</div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-300">Break-even</p><p className="font-heading text-3xl font-semibold text-gold">{Number.isFinite(bd.days) ? bd.days : '∞'}<span className="text-sm text-white"> days</span></p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-300">To hit profit target</p><p className="font-heading text-3xl font-semibold text-gold">{Number.isFinite(bt.days) ? bt.days : '∞'}<span className="text-sm text-white"> days</span></p></div>
          </div>
          <p className="mt-4 text-xs text-slate-300">{Number.isFinite(bd.days) && bd.days <= daysInMonth ? `Achievable: ${bd.days} of ${daysInMonth} days this month. ` : 'Not achievable at this rate in one month. '}Booked so far this month: ~{month.bookedDays.toFixed(1)} days. Cost base defaults to your last 3-month average ({kes(baseCost)}).</p>
        </div>
        <Section title="Break-even summary">
          <Line k="Break-even revenue / month" v={be.revenue} tag /><Line k="Break-even rental days / month" v={Number.isFinite(be.days) ? `${be.days} days` : '—'} tag />
          <Line k="Avg revenue per booked day" v={avgRate} /><Line k="Monthly profit target" v={data.settings.profitTarget} /><Line k="Utilization this month" v={pct(month.utilization)} />
        </Section>
      </div>

      <div className="card">
        <div className="border-b border-slate-100 p-4"><h3 className="text-sm font-semibold">Profit by booking</h3><p className="text-xs text-slate-500">Revenue minus expenses linked to the booking (e.g. fuel, driver).</p></div>
        <Table head={['Booking', 'Customer', 'Revenue', 'Profit']}>
          {[...profits.slice(0, 3), ...(profits.length > 6 ? profits.slice(-3) : [])].map(({ b, p }, i) => (
            <tr key={b.id + i}><td className="td"><Link to={`/bookings/${b.id}`} className="text-royal hover:underline">{b.ref}</Link> {i === 0 && <Badge tone="green">Most profitable</Badge>}{i === profits.slice(0, 3).length + 2 && profits.length > 6 && <Badge tone="red">Least profitable</Badge>}</td><td className="td">{custName(b.customerId)}</td><td className="td">{kes(bookingTotal(b))}</td><td className={`td font-medium ${p < 0 ? 'text-bad' : ''}`}>{kes(p)}</td></tr>))}
        </Table>
      </div>
    </>
  );
}
