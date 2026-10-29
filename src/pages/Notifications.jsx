import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, CheckCheck, Info, OctagonAlert } from 'lucide-react';
import { useApp } from '../context';
import { EmptyState, PageHeader } from '../components/ui';

const ICON = { info: [Info, 'text-royal bg-royal/10'], warn: [AlertTriangle, 'text-amber-600 bg-amber-100'], danger: [OctagonAlert, 'text-bad bg-bad/10'] };
const CATS = [['', 'All'], ['bookings', 'Bookings'], ['payments', 'Payments'], ['maintenance', 'Maintenance'], ['financial', 'Financial']];

export default function Notifications() {
  const { notifications, markRead, markAllRead } = useApp();
  const [cat, setCat] = useState('');
  const list = notifications.filter((n) => !cat || n.cat === cat);
  return (
    <>
      <PageHeader title="Notifications" subtitle="Smart alerts generated from your live data." actions={<button className="btn-ghost" onClick={markAllRead}><CheckCheck size={16} />Mark all read</button>} />
      <div className="mb-4 flex flex-wrap gap-2">{CATS.map(([k, l]) => <button key={k} onClick={() => setCat(k)} className={`rounded-full px-4 py-1.5 text-sm ${cat === k ? 'bg-navy text-white' : 'border border-slate-200 bg-white'}`}>{l}</button>)}</div>
      <div className="card divide-y divide-slate-100">
        {list.map((n) => { const [Icon, cls] = ICON[n.level]; return (
          <Link key={n.id} to={n.link} onClick={() => markRead(n.id)} className={`flex items-start gap-4 p-4 transition hover:bg-slate-50 ${n.read ? 'opacity-60' : ''}`}>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cls}`}><Icon size={18} /></div>
            <div className="flex-1"><p className="text-sm font-medium text-navy">{n.title}</p><p className="text-sm text-slate-500">{n.text}</p></div>
            {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-gold" />}
          </Link>); })}
        {!list.length && <EmptyState title="You're all caught up" text="New alerts will appear here." />}
      </div>
    </>
  );
}
