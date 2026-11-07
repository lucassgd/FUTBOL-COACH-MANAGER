import { useState } from 'react';
import { BrainCircuit, Trash2 } from 'lucide-react';
import { lastClosedWeek, matchesPlayed, totalMinutes, useStore } from '../../store/store';
import { Btn, Field, Input, Select, Sheet, Stat, TextArea } from '../../components/ui';
import { POSITIONS, type Injury, type Player, type PlayerStatus } from '../../types';
import { addDays, todayISO } from '../../lib/utils';
import ProtocolChecklist from './ProtocolChecklist';

const STATUSES: PlayerStatus[] = ['Disponible', 'Sobrecarga', 'Lesionado', 'Readaptación'];

export default function PlayerSheet({ playerId, onClose }: { playerId: string | null; onClose: () => void }) {
  const p = useStore((s) => s.players.find((x) => x.id === playerId));
  const weeks = useStore((s) => s.weeks);
  const activeTeamId = useStore((s) => s.activeTeamId);
  const updatePlayer = useStore((s) => s.updatePlayer);
  const deletePlayer = useStore((s) => s.deletePlayer);
  const setLastSundayMinutes = useStore((s) => s.setLastSundayMinutes);
  const openIn = useStore((s) => s.openIn);
  const [confirmDel, setConfirmDel] = useState(false);
  if (!p) return null;
  const last = lastClosedWeek({ weeks, activeTeamId });
  const set = (patch: Partial<Player>) => updatePlayer(p.id, patch);
  const setInj = (patch: Partial<Injury>) =>
    set({ injury: { diagnosis: '', since: todayISO(), expectedReturn: addDays(todayISO(), 14), phase: 'Fase 1', notes: '', ...p.injury, ...patch } });
  const medical = p.status !== 'Disponible';

  return (
    <Sheet open={!!p} onClose={onClose} title={`#${String(p.number).padStart(2, '0')} ${p.name}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Últ. domingo" value={`${last?.sunday.minutes[p.id] ?? 0}′`} />
          <Stat label="Minutos temp." value={totalMinutes(p, weeks, activeTeamId)} tone="text-emerald-400" />
          <Stat label="Partidos" value={matchesPlayed(p, weeks, activeTeamId)} />
        </div>
        <div className="grid grid-cols-[90px_1fr] gap-2">
          <Field label="Dorsal">
            <Input inputMode="numeric" value={p.number} onChange={(e) => set({ number: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0 })} />
          </Field>
          <Field label="Nombre">
            <Input value={p.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
        <Field label="Posición principal">
          <Select value={p.posMain} onChange={(v) => set({ posMain: v as Player['posMain'] })} options={[...POSITIONS]} />
        </Field>
        <Field label="Posición secundaria">
          <Select value={p.posSecondary} onChange={(v) => set({ posSecondary: v as Player['posSecondary'] })} options={[...POSITIONS]} />
        </Field>
        <Field label={`Minutos del último domingo ${last ? `(vs ${last.sunday.rival})` : ''}`}>
          <Input type="number" min={0} max={120} value={last?.sunday.minutes[p.id] ?? 0} onChange={(e) => setLastSundayMinutes(p.id, Math.max(0, Math.min(120, Number(e.target.value) || 0)))} />
        </Field>
        <Field label="Estado físico">
          <div className="grid grid-cols-4 gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => set({ status: s, ...(s === 'Disponible' ? { injury: undefined } : {}) })}
                className={`rounded-xl border px-1 py-2 text-[11px] font-bold ${p.status === s ? (s === 'Disponible' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : s === 'Sobrecarga' ? 'border-amber-500 bg-amber-500/20 text-amber-300' : s === 'Lesionado' ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-sky-500 bg-sky-500/20 text-sky-300') : 'border-slate-800 text-slate-400'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        {medical && (
          <div className="space-y-2.5 rounded-2xl border border-red-500/30 bg-red-500/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-red-300">Ficha médica</div>
            <Field label="Diagnóstico">
              <Input value={p.injury?.diagnosis ?? ''} onChange={(e) => setInj({ diagnosis: e.target.value })} placeholder="Ej. Sobrecarga isquiosural" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Desde">
                <Input type="date" value={p.injury?.since ?? ''} onChange={(e) => setInj({ since: e.target.value })} />
              </Field>
              <Field label="Vuelta estimada">
                <Input type="date" value={p.injury?.expectedReturn ?? ''} onChange={(e) => setInj({ expectedReturn: e.target.value })} />
              </Field>
            </div>
            <Field label="Fase actual">
              <Select value={p.injury?.phase ?? 'Fase 1'} onChange={(v) => setInj({ phase: v })} options={['Fase 1', 'Fase 2', 'Fase 3', 'Vuelta al grupo']} />
            </Field>
            <Field label="Notas clínicas">
              <TextArea value={p.injury?.notes ?? ''} onChange={(e) => setInj({ notes: e.target.value })} />
            </Field>
            {p.injury?.protocol && <ProtocolChecklist player={p} />}
            <Btn
              tone="ghost"
              className="w-full"
              onClick={() => {
                openIn('medical', p.id);
                onClose();
              }}
            >
              <BrainCircuit size={16} /> {p.injury?.protocol ? 'Revisar protocolo con el asistente IA' : 'Buscar protocolo con el asistente IA'}
            </Btn>
          </div>
        )}

        {!confirmDel ? (
          <Btn tone="danger" small onClick={() => setConfirmDel(true)}>
            <Trash2 size={14} /> Dar de baja
          </Btn>
        ) : (
          <div className="flex gap-2">
            <Btn tone="ghost" small onClick={() => setConfirmDel(false)}>
              Cancelar
            </Btn>
            <Btn
              tone="danger"
              small
              onClick={() => {
                deletePlayer(p.id);
                onClose();
              }}
            >
              Confirmar baja de {p.name}
            </Btn>
          </div>
        )}
      </div>
    </Sheet>
  );
}
