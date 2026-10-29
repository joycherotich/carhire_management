import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context';
import { getRange } from '../lib/finance';
import { REPORTS, buildReport } from '../lib/reports';
import { download, fdate, num, toCSV } from '../lib/format';
import { EmptyState, PageHeader, RangeFilter, Table } from '../components/ui';

export default function Reports() {
  const { scoped, state } = useApp();
  const [name, setName] = useState(REPORTS[0]);
  const [range, setRange] = useState({ key: 'month' });
  const [from, to] = getRange(range.key, range);
  const rep = useMemo(() => buildReport(name, scoped, state.customers, from, to), [name, scoped, state.customers, +from, +to]); // eslint-disable-line
  const fmt = (c) => (typeof c === 'number' ? num(c, Number.isInteger(c) ? 0 : 1) : c);

  return (
    <>
      <PageHeader title="Reports Center" subtitle="Real figures from your records, for the date range you choose." actions={<>
        <button className="btn-ghost" onClick={() => download(`${name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyyMMdd')}.csv`, toCSV(rep.columns, rep.rows))}><Download size={16} />Export Excel (CSV)</button>
        <button className="btn-primary" onClick={() => window.print()}><Printer size={16} />Export PDF</button></>} />
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden"><select className="input !w-auto" value={name} onChange={(e) => setName(e.target.value)}>{REPORTS.map((r) => <option key={r}>{r}</option>)}</select><RangeFilter value={range} onChange={setRange} /></div>
      <div className="card print:border-0 print:shadow-none">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-semibold">{name}</h2><p className="text-xs text-slate-500">{state.settings.businessName} · {fdate(from)} – {fdate(to)} · Amounts in KES</p></div>
        <Table head={rep.columns} empty={!rep.rows.length && <EmptyState title="No data for this range" text="Try a wider date range." />}>
          {rep.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`td ${j === 0 ? 'font-medium' : ''} ${typeof c === 'number' && c < 0 ? 'text-bad' : ''}`}>{fmt(c)}</td>)}</tr>)}
        </Table>
      </div>
      <p className="mt-3 text-xs text-slate-500 print:hidden">PDF uses your browser's print dialog (choose “Save as PDF”). CSV opens directly in Excel.</p>
    </>
  );
}
