import { useMemo, useState } from 'react';
import { Plus, Search, UserPlus } from 'lucide-react';
import { lastClosedWeek, matchesPlayed, totalMinutes, useStore } from '../../store/store';
import { Btn, Card, Chip, ChipRow, Field, Input, Num, Sheet, StatusBadge } from '../../components/ui';
import { cx, fmtShort, norm, addDays } from '../../lib/utils';
import PlayerSheet from './PlayerSheet';

type Filter = 'todos' | 'POR' | 'Disponible' | 'Sobrecarga' | 'medico' | 'sinpos';

export default function Roster() {
  const players = useStore((s) => s.players);
  const weeks = useStore((s) => s.weeks);
  const activeTeamId = useStore((s) => s.activeTeamId);
  const addPlayer = useStore((s) => s.addPlayer);
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('todos');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nn, setNn] = useState('');
  const [num, setNum] = useState('');
  const last = lastClosedWeek({ weeks, activeTeamId });

  const list = useMemo(() => {
    const nq = norm(q);
    return players
      .filter((p) => !nq || norm(`${p.name} ${p.number} ${p.posMain} ${p.posSecondary}`).includes(nq))
      .filter((p) => {
        if (f === 'POR') return p.posMain === 'Portero (POR)';
        if (f === 'Disponible' || f === 'Sobrecarga') return p.status === f;
        if (f === 'medico') return p.status === 'Lesionado' || p.status === 'Readaptación';
        if (f === 'sinpos') return p.posMain.startsWith('Sin definir');
        return true;
      })
      .sort((a, b) => a.number - b.number);
  }, [players, q, f]);

  return (
    <div className="mt-3">
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador, dorsal o posición…" className="pl-9" />
      </div>
      <ChipRow>
        {(
          [
            ['todos', 'Todos'],
            ['POR', 'Porteros'],
            ['Disponible', 'Disponibles'],
            ['Sobrecarga', 'Sobrecarga'],
            ['medico', 'Lesionados / Readapt.'],
            ['sinpos', 'Sin posición'],
          ] as [Filter, string][]
        ).map(([k, l]) => (
          <Chip key={k} active={f === k} onClick={() => setF(k)}>
            {l}
          </Chip>
        ))}
      </ChipRow>
      <div className="mb-2 mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {list.length} jugadores · Último domingo: {last ? `${fmtShort(addDays(last.weekStart, 6))} vs ${last.sunday.rival}` : '—'}
        </span>
        <Btn small tone="subtle" onClick={() => setAdding(true)}>
          <UserPlus size={14} /> Alta
        </Btn>
      </div>
      <div className="space-y-1.5">
        {list.map((p) => {
          const lm = last?.sunday.minutes[p.id];
          return (
            <Card key={p.id} onClick={() => setOpen(p.id)} className="flex items-center gap-3 !py-2.5">
              <Num n={p.number} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{p.name}</span>
                </div>
                <div className={cx('truncate text-[11px]', p.posMain.startsWith('Sin') ? 'italic text-slate-500' : 'text-slate-400')}>
                  {p.posMain}
                  {!p.posSecondary.startsWith('Sin') && ` · ${p.posSecondary.replace(/ \(.*\)/, '')}`}
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={p.status} />
                <div className="mt-1 font-mono text-[11px] text-slate-400">
                  <span className={cx(lm !== undefined && lm >= 60 ? 'text-sky-300' : 'text-amber-300')}>{lm ?? 0}′</span> · {totalMinutes(p, weeks, activeTeamId)}′ · {matchesPlayed(p, weeks, activeTeamId)}PJ
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-600">Minutos: último domingo · acumulados temporada · partidos con minutos registrados</p>

      <PlayerSheet playerId={open} onClose={() => setOpen(null)} />
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Alta de jugador"
        footer={
          <Btn
            className="w-full"
            disabled={!nn.trim() || !num}
            onClick={() => {
              addPlayer(nn.trim(), Number(num));
              setNn('');
              setNum('');
              setAdding(false);
            }}
          >
            <Plus size={16} /> Añadir a la plantilla
          </Btn>
        }
      >
        <div className="grid grid-cols-[90px_1fr] gap-2">
          <Field label="Dorsal">
            <Input inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </Field>
          <Field label="Nombre">
            <Input value={nn} onChange={(e) => setNn(e.target.value)} />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
