import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, endOfDay, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context';
import { PageHeader } from '../components/ui';

const CHIP = { Inquiry: 'bg-slate-100 text-slate-600', 'Pending Confirmation': 'bg-amber-100 text-amber-700', Confirmed: 'bg-royal/10 text-royal', Active: 'bg-good/15 text-good', Completed: 'bg-gold/20 text-[#8a6d2b]' };

export default function Calendar() {
  const { scoped, custName } = useApp();
  const nav = useNavigate();
  const [m, setM] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(m), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(m), { weekStartsOn: 1 }) });
  const on = (d) => scoped.bookings.filter((b) => CHIP[b.status] && new Date(b.start) <= endOfDay(d) && new Date(b.end) >= startOfDay(d));
  return (
    <>
      <PageHeader title="Calendar" subtitle="See availability at a glance. Click a booking to open it."
        actions={<><button className="btn-ghost !p-2.5" onClick={() => setM(addMonths(m, -1))}><ChevronLeft size={16} /></button><span className="min-w-[8rem] text-center font-heading font-medium">{format(m, 'MMMM yyyy')}</span><button className="btn-ghost !p-2.5" onClick={() => setM(addMonths(m, 1))}><ChevronRight size={16} /></button><button className="btn-ghost" onClick={() => setM(new Date())}>Today</button></>} />
      <div className="card overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium uppercase text-slate-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-3">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const bs = on(d);
              return (
                <div key={+d} className={`min-h-[104px] border-b border-r border-slate-100 p-1.5 ${isSameMonth(d, m) ? '' : 'bg-slate-50/60 text-slate-400'}`}>
                  <span className={`mb-1 inline-grid h-6 w-6 place-items-center rounded-full text-xs ${isToday(d) ? 'bg-navy font-semibold text-gold' : ''}`}>{format(d, 'd')}</span>
                  {bs.slice(0, 3).map((b) => <button key={b.id} onClick={() => nav(`/bookings/${b.id}`)} className={`mb-0.5 block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${CHIP[b.status]}`}>{custName(b.customerId).split(' ')[0]} · {b.type[0]}</button>)}
                  {bs.length > 3 && <p className="text-[10px] text-slate-500">+{bs.length - 3} more</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">{Object.entries(CHIP).map(([k, c]) => <span key={k} className={`rounded-full px-3 py-1 ${c}`}>{k}</span>)}</div>
    </>
  );
}
