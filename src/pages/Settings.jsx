import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Plus, X } from 'lucide-react';
import { useApp, useAuth } from '../context';
import { download, fdt } from '../lib/format';
import { RENTAL_TYPES } from '../lib/finance';
import { ConfirmModal, FieldsForm, PageHeader, Section, useToast } from '../components/ui';

function Block({ title, fields, initial, onSave, note }) {
  const [v, setV] = useState(initial);
  const { toast } = useToast();
  return (
    <Section title={title}>
      <FieldsForm fields={fields} values={v} onChange={(k, x) => setV((p) => ({ ...p, [k]: x }))} />
      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
      <div className="mt-4 flex justify-end"><button className="btn-primary btn-sm" onClick={() => { onSave(v); toast('Settings saved'); }}>Save</button></div>
    </Section>
  );
}

export default function Settings() {
  const { state, updateSettings, removeDemo, resetDemo, hasDemo } = useApp();
  const { logout, changePassword } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const s = state.settings;
  const [pw, setPw] = useState({ cur: '', next: '' }), [cat, setCat] = useState(''), [confirm, setConfirm] = useState(null);
  const N = (o, keys) => { const r = { ...o }; keys.forEach((k) => { r[k] = Number(o[k]) || 0; }); return r; };

  return (
    <>
      <PageHeader title="Settings" subtitle="Business details, billing rules and preferences." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Block title="Business & owner" initial={{ businessName: s.businessName, ownerName: s.ownerName, ownerEmail: s.ownerEmail, currency: s.currency, financialYearStart: s.financialYearStart }} onSave={updateSettings}
          fields={[{ name: 'businessName', label: 'Business name' }, { name: 'ownerName', label: 'Owner name' }, { name: 'ownerEmail', label: 'Owner email', type: 'email' }, { name: 'currency', label: 'Currency', type: 'select', options: ['KES'] }, { name: 'financialYearStart', label: 'Financial year starts (MM-DD)' }]}
          note="Timezone is Africa/Nairobi. Logo upload arrives with the backend (file storage)." />
        <Block title="Default rental rates (KES)" initial={{ ...s.rates }} onSave={(v) => updateSettings({ rates: N(v, RENTAL_TYPES) })} fields={RENTAL_TYPES.map((t) => ({ name: t, label: `${t} rate`, type: 'number' }))} />
        <Block title="Billing rules" initial={{ minHours: s.minHours, hourlyGraceMinutes: s.hourlyGraceMinutes, graceMinutes: s.graceMinutes, overtimeRate: s.overtimeRate, defaultDeposit: s.defaultDeposit, taxRate: s.taxRate }} onSave={(v) => updateSettings(N(v, Object.keys(v)))}
          fields={[{ name: 'minHours', label: 'Minimum hourly rental (hrs)', type: 'number' }, { name: 'hourlyGraceMinutes', label: 'Hourly grace (min)', type: 'number' }, { name: 'graceMinutes', label: 'Daily+ grace period (min)', type: 'number' }, { name: 'overtimeRate', label: 'Overtime / late fee per hour', type: 'number' }, { name: 'defaultDeposit', label: 'Default security deposit', type: 'number' }, { name: 'taxRate', label: 'Tax on revenue (%)', type: 'number', step: '0.1' }]}
          note="Units = full periods + one more if the remainder exceeds the grace period (never an automatic round-up)." />
        <Block title="Targets" initial={{ revenueTarget: s.revenueTarget, profitTarget: s.profitTarget }} onSave={(v) => updateSettings(N(v, ['revenueTarget', 'profitTarget']))} fields={[{ name: 'revenueTarget', label: 'Monthly revenue target', type: 'number' }, { name: 'profitTarget', label: 'Monthly profit target', type: 'number' }]} />

        <Section title="Notification preferences">
          {[['bookings', 'Bookings & returns'], ['payments', 'Payments & invoices'], ['maintenance', 'Maintenance & insurance'], ['financial', 'Financial & targets']].map(([k, l]) => (
            <label key={k} className="flex items-center justify-between py-2 text-sm">{l}<input type="checkbox" className="h-4 w-4" checked={s.notify[k] !== false} onChange={(e) => updateSettings({ notify: { ...s.notify, [k]: e.target.checked } })} /></label>))}
        </Section>
        <Section title="Expense categories">
          <div className="flex flex-wrap gap-2">{s.categories.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs">{c}<button onClick={() => updateSettings({ categories: s.categories.filter((x) => x !== c) })} className="text-slate-400 hover:text-bad"><X size={12} /></button></span>)}</div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = cat.trim(); if (c && !s.categories.includes(c)) { updateSettings({ categories: [...s.categories, c] }); setCat(''); } }}><input className="input" placeholder="New category" value={cat} onChange={(e) => setCat(e.target.value)} /><button className="btn-ghost"><Plus size={16} /></button></form>
        </Section>
        <Section title="Password">
          <div className="grid gap-3 sm:grid-cols-2"><input type="password" className="input" placeholder="Current password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /><input type="password" className="input" placeholder="New password (8+ chars)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div className="mt-3 flex justify-end"><button className="btn-primary btn-sm" onClick={() => { const e = changePassword(pw.cur, pw.next); if (e) return toast(e, 'error'); toast('Password changed'); setPw({ cur: '', next: '' }); }}>Update password</button></div>
        </Section>
        <Section title="Data & demo">
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => download('vistaride-backup.json', JSON.stringify(state, null, 2), 'application/json')}><Download size={16} />Export all data (JSON)</button>
            {hasDemo && <button className="btn-ghost" onClick={() => setConfirm('demo')}>Remove demo data</button>}
            <button className="btn-ghost" onClick={() => setConfirm('reset')}>Reset to demo data</button>
            <button className="btn-danger" onClick={() => { logout(); nav('/login'); }}><LogOut size={16} />Sign out</button>
          </div>
        </Section>
        <Section title="Audit log" className="xl:col-span-2">
          {(state.logs || []).length ? <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm">{state.logs.slice(0, 20).map((l) => <li key={l.id} className="flex justify-between py-2"><span>{l.text}</span><span className="text-xs text-slate-400">{fdt(l.at)}</span></li>)}</ul> : <p className="text-sm text-slate-500">No activity recorded yet.</p>}
        </Section>
      </div>
      <ConfirmModal open={confirm === 'demo'} onClose={() => setConfirm(null)} label="Remove demo data" title="Remove demo data?" text="All records flagged as demo (bookings, customers, payments, expenses, fuel, maintenance) will be deleted. Your vehicle and settings stay." onConfirm={() => { removeDemo(); toast('Demo data removed'); }} />
      <ConfirmModal open={confirm === 'reset'} onClose={() => setConfirm(null)} label="Reset" title="Reset everything?" text="This replaces ALL current data with fresh demo data." onConfirm={() => { resetDemo(); toast('Demo data restored'); }} />
    </>
  );
}
