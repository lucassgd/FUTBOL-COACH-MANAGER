import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, ClipboardCopy, Clock, HeartPulse, Lock, Shirt, Trash2, Unlock, Users } from 'lucide-react';
import { MONDAY_CUT, mondaySplit, useStore } from '../../store/store';
import { Btn, Card, Empty, Field, Input, Num, Select, StatusBadge, TextArea } from '../../components/ui';
import { addDays, cx, fmtShort, mondayOf, todayISO } from '../../lib/utils';
import type { Week } from '../../types';
import TaskList from './TaskList';

type DayTab = 'L' | 'M' | 'J' | 'D' | 'R';
const DAYS: { k: DayTab; name: string; md: string; color: string }[] = [
  { k: 'L', name: 'Lunes', md: 'MD+1', color: '#38bdf8' },
  { k: 'M', name: 'Martes', md: 'MD-5', color: '#f59e0b' },
  { k: 'J', name: 'Jueves', md: 'MD-3', color: '#a78bfa' },
  { k: 'D', name: 'Domingo', md: 'MD', color: '#10b981' },
  { k: 'R', name: 'Readapt.', md: 'Extra', color: '#ef4444' },
];
const DAY_NAME: Record<string, string> = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };

export default function PlanningModule() {
  const planWeek = useStore((s) => s.planWeek);
  const setPlanWeek = useStore((s) => s.setPlanWeek);
  const week = useStore((s) => s.weeks[planWeek]);
  const weeks = useStore((s) => s.weeks);
  const ensureWeek = useStore((s) => s.ensureWeek);
  const updateWeek = useStore((s) => s.updateWeek);
  const toast = useStore((s) => s.toast);
  const [day, setDay] = useState<DayTab>(() => {
    const dow = (new Date().getDay() + 6) % 7;
    return dow === 0 ? 'L' : dow <= 2 ? 'M' : dow <= 4 ? 'J' : 'D';
  });

  useEffect(() => {
    ensureWeek(planWeek);
  }, [planWeek, ensureWeek]);

  const go = (n: number) => setPlanWeek(addDays(planWeek, n * 7));
  const isCurrent = planWeek === mondayOf(todayISO());

  const load = useMemo(() => {
    if (!week) return [0, 0, 0, 0];
    const sum = (l: { minutes: number }[]) => l.reduce((a, t) => a + t.minutes, 0);
    return [Math.max(sum(week.monday.over), sum(week.monday.under)), sum(week.tuesday.strength) + sum(week.tuesday.ssg), sum(week.thursday.tasks), 90];
  }, [week]);

  const prev = weeks[addDays(planWeek, -7)];
  const isEmpty = week && !week.monday.over.length && !week.monday.under.length && !week.tuesday.strength.length && !week.tuesday.ssg.length && !week.thursday.tasks.length;

  const copyPrev = () => {
    if (!prev) return;
    const clone = <T,>(l: T[]) => l.map((t) => ({ ...t, id: `tk_${Math.random().toString(36).slice(2, 9)}` }));
    updateWeek(planWeek, (w) => ({
      ...w,
      monday: { over: clone(prev.monday.over), under: clone(prev.monday.under) },
      tuesday: { strength: clone(prev.tuesday.strength), ssg: clone(prev.tuesday.ssg) },
      thursday: { tasks: clone(prev.thursday.tasks) },
    }));
    toast('Estructura de sesiones copiada de la semana anterior');
  };

  if (!week) return null;

  return (
    <div className="pb-8">
      {/* Navegador de semana */}
      <div className="sticky top-0 z-10 border-b border-slate-900 bg-slate-950/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button onClick={() => go(-1)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800" aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-extrabold">
              {fmtShort(planWeek)} – {fmtShort(addDays(planWeek, 6))} {planWeek.slice(0, 4)}
            </div>
            <div className="truncate text-[11px] text-slate-400">
              {week.sunday.rival ? `Domingo vs ${week.sunday.rival} (${week.sunday.home ? 'L' : 'V'})` : 'Sin rival asignado'}
              {isCurrent && <span className="ml-1 rounded bg-emerald-500 px-1 text-[9px] font-black text-slate-950">ESTA SEMANA</span>}
            </div>
          </div>
          <button onClick={() => go(1)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800" aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
        {!isCurrent && (
          <button onClick={() => setPlanWeek(mondayOf(todayISO()))} className="mx-auto mt-1 block text-[11px] font-semibold text-emerald-400">
            Volver a la semana actual
          </button>
        )}
        {/* Pestañas de día con barra de carga */}
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {DAYS.map((d, i) => (
            <button key={d.k} onClick={() => setDay(d.k)} className={cx('rounded-xl border px-1 py-1.5 text-center transition', day === d.k ? 'bg-slate-800' : 'border-slate-800 bg-slate-900')} style={day === d.k ? { borderColor: d.color } : undefined}>
              <div className="text-xs font-extrabold" style={{ color: day === d.k ? d.color : undefined }}>
                {d.name}
              </div>
              <div className="text-[9px] font-bold text-slate-500">{d.k === 'R' ? `${week.extras.length} ses.` : d.md}</div>
              {i < 4 && (
                <div className="mx-auto mt-1 h-1 w-10 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (load[i] / 90) * 100)}%`, background: d.color }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        {isEmpty && day !== 'D' && day !== 'R' && (
          <Card className="mb-3 flex items-center gap-3 border-dashed">
            <div className="flex-1 text-xs text-slate-400">Semana sin sesiones planificadas.</div>
            {prev && (
              <Btn small tone="subtle" onClick={copyPrev}>
                <ClipboardCopy size={14} /> Copiar semana anterior
              </Btn>
            )}
          </Card>
        )}
        {day === 'L' && <Monday week={week} />}
        {day === 'M' && <Tuesday week={week} />}
        {day === 'J' && <Thursday week={week} />}
        {day === 'D' && <Sunday week={week} />}
        {day === 'R' && <Extras week={week} />}
        {day !== 'R' && (
          <div className="mt-4">
            <Field label="Notas de la semana">
              <TextArea rows={2} value={week.notes} onChange={(e) => updateWeek(week.weekStart, (w) => ({ ...w, notes: e.target.value }))} placeholder="Incidencias, objetivos del microciclo…" />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function DayHeader({ title, md, color, children }: { title: string; md: string; color: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-extrabold" style={{ color }}>
          {title}
        </h2>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-black text-slate-300">{md}</span>
      </div>
      {children && <p className="text-xs text-slate-400">{children}</p>}
    </div>
  );
}

function Block({ title, subtitle, color, children }: { title: string; subtitle?: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="mb-2">
        <div className="text-sm font-bold">{title}</div>
        {subtitle && <div className="text-[11px] text-slate-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Monday({ week }: { week: Week }) {
  const players = useStore((s) => s.players);
  const weeks = useStore((s) => s.weeks);
  const setPlanWeek = useStore((s) => s.setPlanWeek);
  const split = mondaySplit(week.weekStart, players, weeks);
  const src = split.source;
  return (
    <>
      <DayHeader title="Lunes · Post-partido" md="MD+1" color="#38bdf8">
        División automática según los minutos del domingo anterior (corte en {MONDAY_CUT}′).
      </DayHeader>
      <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-400">
        {src && Object.keys(src.sunday.minutes).length ? (
          <>
            Fuente: domingo {fmtShort(addDays(src.weekStart, 6))} vs <b className="text-slate-200">{src.sunday.rival || '—'}</b>
            {!src.sunday.closed && <span className="ml-1 text-amber-300">(partido sin cerrar)</span>}
          </>
        ) : (
          <>
            No hay minutos registrados del domingo anterior: todos los disponibles van al grupo de compensación.{' '}
            <button className="font-semibold text-emerald-400" onClick={() => setPlanWeek(addDays(week.weekStart, -7))}>
              Registrar minutos →
            </button>
          </>
        )}
      </div>

      <Block title={`Grupo >${MONDAY_CUT}′ · Regeneración (${split.over.length})`} subtitle="Movilidad, descarga y recuperación activa" color="#38bdf8">
        <PlayerChips list={split.over} minutes={split.minutes} />
        <div className="mt-2.5">
          <TaskList weekStart={week.weekStart} slot="monday.over" tasks={week.monday.over} accent="#38bdf8" suggestFolder="f_recup" />
        </div>
      </Block>
      <Block title={`Grupo <${MONDAY_CUT}′ · Compensación (${split.under.length})`} subtitle="Alta intensidad y espacios reducidos para igualar carga" color="#f59e0b">
        <PlayerChips list={split.under} minutes={split.minutes} />
        <div className="mt-2.5">
          <TaskList weekStart={week.weekStart} slot="monday.under" tasks={week.monday.under} accent="#f59e0b" suggestFolder="f_ssg" />
        </div>
      </Block>
      {split.medical.length > 0 && (
        <Block title={`Enfermería / Readaptación (${split.medical.length})`} subtitle="Trabajo individualizado con servicios médicos" color="#ef4444">
          <div className="space-y-1">
            {split.medical.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-400">#{p.number}</span>
                <span className="flex-1 font-semibold">{p.name}</span>
                <span className="truncate text-slate-500">{p.injury?.diagnosis}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Block>
      )}
    </>
  );
}

function PlayerChips({ list, minutes }: { list: { id: string; number: number; name: string; status: string }[]; minutes: Record<string, number> }) {
  if (!list.length) return <p className="text-xs italic text-slate-500">Ningún jugador en este grupo.</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((p) => (
        <span key={p.id} className={cx('flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px]', p.status === 'Sobrecarga' ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-700 bg-slate-950')}>
          <b className="font-mono text-slate-400">{p.number}</b> {p.name.split(' ')[0]} {p.name.split(' ')[1]?.[0]}.<span className="font-mono text-slate-500">{minutes[p.id] ?? 0}′</span>
        </span>
      ))}
    </div>
  );
}

function Tuesday({ week }: { week: Week }) {
  return (
    <>
      <DayHeader title="Martes · Fuerza + SSG" md="MD-5" color="#f59e0b">
        Día de mayor carga neuromuscular del microciclo.
      </DayHeader>
      <Block title="Bloque 1 · Fuerza preventiva / estructural" subtitle="Obligatorio · campo o gimnasio" color="#f59e0b">
        {!week.tuesday.strength.length && <p className="mb-1 text-xs text-amber-300">⚠ El bloque de fuerza es obligatorio en el MD-5.</p>}
        <TaskList weekStart={week.weekStart} slot="tuesday.strength" tasks={week.tuesday.strength} accent="#f59e0b" suggestFolder="f_fuerza" />
      </Block>
      <Block title="Bloque 2 · Espacios Reducidos (SSG)" subtitle="Alta densidad e intensidad" color="#ef4444">
        <TaskList weekStart={week.weekStart} slot="tuesday.ssg" tasks={week.tuesday.ssg} accent="#ef4444" suggestFolder="f_ssg" />
      </Block>
    </>
  );
}

function Thursday({ week }: { week: Week }) {
  const match = useStore((s) => s.matches.find((m) => m.weekStart === week.weekStart));
  return (
    <>
      <DayHeader title="Jueves · Plan de partido" md="MD-3" color="#a78bfa">
        11v11, ajustes sobre el rival, salida de balón, presión y ABP.
      </DayHeader>
      {match && (
        <Card className="mb-3 border-violet-500/30">
          <div className="text-[11px] font-bold uppercase text-violet-300">Plan vs {match.rival}</div>
          <p className="mt-1 line-clamp-5 text-xs text-slate-300">{match.plan}</p>
          {match.weaknesses && <p className="mt-1.5 line-clamp-3 text-xs text-slate-500">🎯 {match.weaknesses}</p>}
        </Card>
      )}
      <Block title="Tareas tácticas" subtitle="Modelo de juego aplicado al rival" color="#a78bfa">
        <TaskList weekStart={week.weekStart} slot="thursday.tasks" tasks={week.thursday.tasks} accent="#a78bfa" suggestFolder="f_plan" />
      </Block>
    </>
  );
}

function Sunday({ week }: { week: Week }) {
  const players = useStore((s) => s.players);
  const updateWeek = useStore((s) => s.updateWeek);
  const setPlanWeek = useStore((s) => s.setPlanWeek);
  const toast = useStore((s) => s.toast);
  const sun = week.sunday;
  const set = (p: Partial<Week['sunday']>) => updateWeek(week.weekStart, (w) => ({ ...w, sunday: { ...w.sunday, ...p } }));
  const sorted = [...players].sort((a, b) => a.number - b.number);
  const toggleSquad = (id: string) => {
    if (sun.closed) return;
    const inSquad = sun.squad.includes(id);
    if (!inSquad && sun.squad.length >= 18) {
      toast('Máximo 18 convocados', 'warn');
      return;
    }
    const minutes = { ...sun.minutes };
    if (inSquad) delete minutes[id];
    set({ squad: inSquad ? sun.squad.filter((x) => x !== id) : [...sun.squad, id], minutes });
  };
  const squad = sorted.filter((p) => sun.squad.includes(p.id));
  const totalMin = squad.reduce((a, p) => a + (sun.minutes[p.id] ?? 0), 0);

  return (
    <>
      <DayHeader title="Domingo · Día de partido" md="MD" color="#10b981">
        Los minutos registrados alimentan automáticamente la división del lunes siguiente.
      </DayHeader>
      <Card className="space-y-2.5">
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <Field label="Rival">
            <Input value={sun.rival} onChange={(e) => set({ rival: e.target.value })} placeholder="Rival" />
          </Field>
          <Field label="Condición">
            <Select value={sun.home ? 'Local' : 'Visitante'} onChange={(v) => set({ home: v === 'Local' })} options={['Local', 'Visitante']} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Hora de citación">
            <Input type="time" value={sun.callTime} onChange={(e) => set({ callTime: e.target.value })} />
          </Field>
          <Field label="Inicio del partido">
            <Input type="time" value={sun.kickoff} onChange={(e) => set({ kickoff: e.target.value })} />
          </Field>
        </div>
        <Field label="Equipación (camiseta / pantalón / medias)">
          <div className="flex gap-2">
            <Shirt size={18} className="mt-2.5 shrink-0 text-slate-400" />
            <Input value={sun.kit} onChange={(e) => set({ kit: e.target.value })} />
          </div>
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {['Negra / Negro / Negro', 'Blanca / Blanco / Blanco', 'Verde / Negro / Verde'].map((k) => (
            <button key={k} onClick={() => set({ kit: k })} className={cx('rounded-full border px-2 py-0.5 text-[10px]', sun.kit === k ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400')}>
              {k}
            </button>
          ))}
        </div>
        <Field label="Campo">
          <Input value={sun.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Instalación" />
        </Field>
      </Card>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Users size={14} /> Convocatoria ({sun.squad.length}/18)
        </h3>
        {!sun.closed && (
          <button
            className="text-[11px] font-semibold text-emerald-400"
            onClick={() => set({ squad: sorted.filter((p) => p.status === 'Disponible' || p.status === 'Sobrecarga').slice(0, 18).map((p) => p.id) })}
          >
            Autoconvocar disponibles
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map((p) => {
          const inS = sun.squad.includes(p.id);
          const out = p.status === 'Lesionado';
          return (
            <button
              key={p.id}
              onClick={() => toggleSquad(p.id)}
              className={cx('flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-xs transition', inS ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 bg-slate-900', out && !inS && 'opacity-50')}
            >
              <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md border', inS ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-600')}>{inS && <Check size={12} />}</span>
              <span className="font-mono text-slate-400">{p.number}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              {p.status !== 'Disponible' && <HeartPulse size={12} className={p.status === 'Sobrecarga' ? 'text-amber-400' : 'text-red-400'} />}
            </button>
          );
        })}
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Clock size={14} /> Registro de minutos
        </h3>
        <span className="font-mono text-[11px] text-slate-500">Σ {totalMin}′ (máx. teórico 990′)</span>
      </div>
      {!squad.length ? (
        <Empty icon={<Users />} title="Sin convocados" text="Selecciona la convocatoria para registrar minutos." />
      ) : (
        <div className="space-y-1.5">
          {squad.map((p) => {
            const m = sun.minutes[p.id] ?? 0;
            return (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1.5">
                <Num n={p.number} className="!h-8 !w-8 text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                {!sun.closed && (
                  <div className="flex gap-1">
                    {[0, 45, 90].map((v) => (
                      <button key={v} onClick={() => set({ minutes: { ...sun.minutes, [p.id]: v } })} className={cx('rounded-md px-1.5 py-1 font-mono text-[10px] font-bold', m === v ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400')}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  inputMode="numeric"
                  disabled={sun.closed}
                  value={m}
                  onChange={(e) => set({ minutes: { ...sun.minutes, [p.id]: Math.min(120, Number(e.target.value.replace(/\D/g, '')) || 0) } })}
                  className={cx('w-12 rounded-lg border bg-slate-950 py-1 text-center font-mono text-sm font-bold outline-none', m >= MONDAY_CUT ? 'border-sky-500/50 text-sky-300' : 'border-amber-500/40 text-amber-300')}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {sun.closed ? (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <Lock size={16} /> Partido cerrado: minutos aplicados al acumulado y al lunes siguiente.
            </div>
            <div className="flex gap-2">
              <Btn tone="ghost" className="flex-1" onClick={() => set({ closed: false })}>
                <Unlock size={15} /> Reabrir
              </Btn>
              <Btn className="flex-1" onClick={() => setPlanWeek(addDays(week.weekStart, 7))}>
                Ver lunes siguiente <ArrowRight size={15} />
              </Btn>
            </div>
          </>
        ) : (
          <Btn
            className="w-full"
            disabled={!squad.length}
            onClick={() => {
              if (!totalMin && !confirm('No hay minutos registrados. ¿Cerrar el partido igualmente? Todos irán al grupo de compensación del lunes.')) return;
              set({ closed: true });
              toast('Partido cerrado · minutos registrados');
            }}
          >
            <Lock size={16} /> Cerrar partido y aplicar minutos
          </Btn>
        )}
      </div>
    </>
  );
}

function Extras({ week }: { week: Week }) {
  const players = useStore((s) => s.players);
  const removeExtra = useStore((s) => s.removeExtra);
  const openIn = useStore((s) => s.openIn);
  const order = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const list = [...week.extras].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  return (
    <>
      <DayHeader title="Sesiones de readaptación" md="Extra" color="#ef4444">
        Sesiones individuales generadas por el asistente médico o añadidas manualmente.
      </DayHeader>
      {!list.length && (
        <Empty
          icon={<HeartPulse />}
          title="Sin sesiones de readaptación esta semana"
          text="Genera una propuesta desde Readaptación IA y pulsa «Crear sesión en calendario»."
          action={<Btn small onClick={() => openIn('medical', '')}>Ir a Readaptación IA</Btn>}
        />
      )}
      <div className="space-y-2.5">
        {list.map((x) => {
          const p = players.find((pp) => pp.id === x.playerId);
          return (
            <Card key={x.id} className="border-red-500/30">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-[11px] font-bold uppercase text-red-300">
                    {DAY_NAME[x.day]} · {fmtShort(addDays(week.weekStart, order.indexOf(x.day)))}
                  </div>
                  <div className="text-sm font-bold">{x.title}</div>
                  {p && <div className="text-[11px] text-slate-400">#{p.number} {p.name} · {p.injury?.diagnosis ?? p.status}</div>}
                </div>
                <button onClick={() => removeExtra(week.weekStart, x.id)} className="text-slate-600 hover:text-red-400" aria-label="Eliminar sesión">
                  <Trash2 size={15} />
                </button>
              </div>
              <ol className="mt-2 space-y-1">
                {x.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="w-4 font-mono text-slate-500">{i + 1}.</span>
                    <span className="flex-1">{it.name}</span>
                    <span className="font-mono text-slate-400">{it.dose}</span>
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </div>
    </>
  );
}
