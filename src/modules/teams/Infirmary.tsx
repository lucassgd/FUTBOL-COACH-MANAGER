import { useState } from 'react';
import { Activity, BrainCircuit, CalendarClock, HeartPulse } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, Empty, Num, StatusBadge } from '../../components/ui';
import { cx, daysBetween, fmtDate, todayISO } from '../../lib/utils';
import PlayerSheet from './PlayerSheet';
import ProtocolChecklist from './ProtocolChecklist';

export default function Infirmary() {
  const players = useStore((s) => s.players);
  const openIn = useStore((s) => s.openIn);
  const [open, setOpen] = useState<string | null>(null);
  const list = players
    .filter((p) => p.status !== 'Disponible')
    .sort((a, b) => ['Lesionado', 'Readaptación', 'Sobrecarga'].indexOf(a.status) - ['Lesionado', 'Readaptación', 'Sobrecarga'].indexOf(b.status));
  const today = todayISO();

  return (
    <div className="mt-3 space-y-2.5">
      <div className="grid grid-cols-3 gap-2 text-center">
        {(['Lesionado', 'Readaptación', 'Sobrecarga'] as const).map((s) => (
          <div key={s} className="rounded-xl border border-slate-800 bg-slate-900 py-2">
            <div className={cx('text-xl font-black', s === 'Lesionado' ? 'text-red-400' : s === 'Readaptación' ? 'text-sky-300' : 'text-amber-300')}>{players.filter((p) => p.status === s).length}</div>
            <div className="text-[10px] font-bold uppercase text-slate-500">{s}</div>
          </div>
        ))}
      </div>
      {!list.length && <Empty icon={<HeartPulse />} title="Enfermería vacía" text="Toda la plantilla está disponible." />}
      {list.map((p) => {
        const left = p.injury?.expectedReturn ? daysBetween(today, p.injury.expectedReturn) : null;
        const total = p.injury ? Math.max(1, daysBetween(p.injury.since, p.injury.expectedReturn)) : 1;
        const elapsed = p.injury ? daysBetween(p.injury.since, today) : 0;
        return (
          <Card key={p.id} className={cx(p.status === 'Lesionado' ? 'border-red-500/30' : p.status === 'Readaptación' ? 'border-sky-500/30' : 'border-amber-500/30')}>
            <div className="flex items-center gap-3" onClick={() => setOpen(p.id)}>
              <Num n={p.number} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.name}</div>
                <div className="truncate text-xs text-slate-300">{p.injury?.diagnosis || 'Sin diagnóstico (toca para editar)'}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            {p.injury && (
              <>
                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><Activity size={12} /> {p.injury.phase}</span>
                  <span className="flex items-center gap-1"><CalendarClock size={12} /> Vuelta: {fmtDate(p.injury.expectedReturn)}</span>
                  <span className={cx('ml-auto font-bold', left !== null && left <= 0 ? 'text-emerald-400' : 'text-amber-300')}>{left === null ? '' : left > 0 ? `${left} días` : 'Alta prevista'}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" style={{ width: `${Math.min(100, Math.max(0, (elapsed / total) * 100))}%` }} />
                </div>
                {p.injury.notes && <p className="mt-2 text-xs text-slate-400">{p.injury.notes}</p>}
                <div className="mt-2">{p.injury.protocol ? <ProtocolChecklist player={p} /> : <p className="text-[11px] italic text-slate-500">Sin protocolo de readaptación asignado.</p>}</div>
              </>
            )}
            <div className="mt-2.5 flex gap-2">
              <Btn small tone="subtle" className="flex-1" onClick={() => setOpen(p.id)}>Editar ficha</Btn>
              <Btn small className="flex-1" onClick={() => openIn('medical', p.id)}>
                <BrainCircuit size={14} /> {p.injury?.protocol ? 'Ver protocolo IA' : 'Generar protocolo IA'}
              </Btn>
            </div>
          </Card>
        );
      })}
      <PlayerSheet playerId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
