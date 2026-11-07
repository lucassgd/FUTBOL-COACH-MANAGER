import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock, Film, Link2, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, Empty, Field, Input, Segmented, Select, Sheet, TextArea } from '../../components/ui';
import VideoPlayer, { type PlayerHandle } from '../../components/VideoPlayer';
import { cx, fmtDate, fmtTime, uid } from '../../lib/utils';
import type { Match, MatchVideo, SessionTask } from '../../types';
import { resultOf } from './TeamsModule';

type Tab = 'plan' | 'sesiones' | 'videos' | 'informe';

export default function MatchSheet({ matchId, onClose }: { matchId: string | null; onClose: () => void }) {
  const match = useStore((s) => s.matches.find((m) => m.id === matchId));
  const upsertMatch = useStore((s) => s.upsertMatch);
  const deleteMatch = useStore((s) => s.deleteMatch);
  const [tab, setTab] = useState<Tab>('plan');
  useEffect(() => setTab('plan'), [matchId]);
  if (!match) return null;
  const set = (patch: Partial<Match>) => upsertMatch({ ...match, ...patch });
  const r = resultOf(match);

  return (
    <Sheet
      open={!!match}
      onClose={onClose}
      title={
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
            Jornada {match.round} · {fmtDate(match.date)}
          </div>
          <div className="truncate">vs. {match.rival}</div>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
        <div className="flex-1 text-center">
          <div className="text-[11px] text-slate-400">{match.home ? 'Nosotros' : match.rival}</div>
          <ScoreInput value={match.home ? match.goalsFor : match.goalsAgainst} onChange={(v) => set(match.home ? { goalsFor: v } : { goalsAgainst: v })} />
        </div>
        <div className={cx('rounded-lg px-2 py-1 text-[10px] font-black uppercase', r === 'V' ? 'bg-emerald-500 text-slate-950' : r === 'E' ? 'bg-amber-400 text-slate-950' : r === 'D' ? 'bg-red-500' : 'bg-slate-700')}>
          {{ V: 'Victoria', E: 'Empate', D: 'Derrota', P: 'Pendiente' }[r]}
        </div>
        <div className="flex-1 text-center">
          <div className="text-[11px] text-slate-400">{match.home ? match.rival : 'Nosotros'}</div>
          <ScoreInput value={match.home ? match.goalsAgainst : match.goalsFor} onChange={(v) => set(match.home ? { goalsAgainst: v } : { goalsFor: v })} />
        </div>
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'plan', label: 'Plan' },
          { value: 'sesiones', label: 'Sesiones' },
          { value: 'videos', label: `Vídeos (${match.videos.length})` },
          { value: 'informe', label: 'Informe' },
        ]}
      />

      <div className="mt-3">
        {tab === 'plan' && (
          <div className="space-y-3">
            <Field label="Plan de partido táctico">
              <TextArea rows={8} value={match.plan} onChange={(e) => set({ plan: e.target.value })} placeholder="Sistema, salida de balón, presión, ABP…" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rival">
                <Input value={match.rival} onChange={(e) => set({ rival: e.target.value })} />
              </Field>
              <Field label="Condición">
                <Select value={match.home ? 'Local' : 'Visitante'} onChange={(v) => set({ home: v === 'Local' })} options={['Local', 'Visitante']} />
              </Field>
            </div>
            <Btn
              tone="danger"
              small
              onClick={() => {
                if (confirm('¿Eliminar esta jornada del historial?')) {
                  deleteMatch(match.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={14} /> Eliminar jornada
            </Btn>
          </div>
        )}
        {tab === 'sesiones' && <WeekSessions match={match} onClose={onClose} />}
        {tab === 'videos' && <Videos match={match} set={set} />}
        {tab === 'informe' && (
          <Field label="Informe de puntos débiles del rival">
            <TextArea rows={10} value={match.weaknesses} onChange={(e) => set({ weaknesses: e.target.value })} />
          </Field>
        )}
      </div>
    </Sheet>
  );
}

function ScoreInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      inputMode="numeric"
      value={value ?? ''}
      placeholder="–"
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, '');
        onChange(v === '' ? null : Math.min(30, Number(v)));
      }}
      className="w-full bg-transparent text-center font-mono text-3xl font-black text-slate-100 outline-none"
    />
  );
}

function WeekSessions({ match, onClose }: { match: Match; onClose: () => void }) {
  const week = useStore((s) => s.weeks[match.weekStart]);
  const exercises = useStore((s) => s.exercises);
  const setPlanWeek = useStore((s) => s.setPlanWeek);
  const setTab = useStore((s) => s.setTab);
  const ensureWeek = useStore((s) => s.ensureWeek);
  const openIn = useStore((s) => s.openIn);

  const goPlan = () => {
    ensureWeek(match.weekStart);
    setPlanWeek(match.weekStart);
    setTab('planning');
    onClose();
  };

  if (!week)
    return (
      <Empty icon={<CalendarDays />} title="Semana sin sesiones registradas" text="Crea el microciclo de esta semana desde Planificación." action={<Btn onClick={goPlan}>Crear microciclo</Btn>} />
    );

  const blocks: { day: string; tag: string; color: string; groups: { label: string; tasks: SessionTask[] }[] }[] = [
    { day: 'Lunes', tag: 'MD+1', color: 'text-sky-300', groups: [{ label: 'Grupo >60′ · Regeneración', tasks: week.monday.over }, { label: 'Grupo <60′ · Compensación', tasks: week.monday.under }] },
    { day: 'Martes', tag: 'MD-5', color: 'text-amber-300', groups: [{ label: 'Bloque 1 · Fuerza', tasks: week.tuesday.strength }, { label: 'Bloque 2 · SSG', tasks: week.tuesday.ssg }] },
    { day: 'Jueves', tag: 'MD-3', color: 'text-violet-300', groups: [{ label: 'Plan de partido', tasks: week.thursday.tasks }] },
  ];
  return (
    <div className="space-y-2.5">
      {blocks.map((b) => (
        <Card key={b.day}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className={cx('text-sm font-extrabold', b.color)}>{b.day}</span>
            <span className="rounded bg-slate-800 px-1.5 text-[10px] font-bold text-slate-400">{b.tag}</span>
            <span className="ml-auto text-[11px] text-slate-500">{b.groups.reduce((a, g) => a + g.tasks.reduce((x, t) => x + t.minutes, 0), 0)}′ totales</span>
          </div>
          {b.groups.map((g) => (
            <div key={g.label} className="mb-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{g.label}</div>
              {g.tasks.length === 0 && <div className="text-xs text-slate-600">Sin tareas</div>}
              {g.tasks.map((t) => {
                const ex = exercises.find((e) => e.id === t.exerciseId);
                return (
                  <button key={t.id} onClick={() => ex && (openIn('library', ex.id), onClose())} className="flex w-full items-center gap-2 py-1 text-left text-sm">
                    <Clock size={12} className="shrink-0 text-slate-500" />
                    <span className="w-8 shrink-0 font-mono text-xs text-slate-400">{t.minutes}′</span>
                    <span className={cx('flex-1 truncate', ex && 'text-emerald-200 underline decoration-emerald-500/40 underline-offset-2')}>{t.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </Card>
      ))}
      <Btn tone="ghost" className="w-full" onClick={goPlan}>
        <CalendarDays size={16} /> Abrir semana en Planificación
      </Btn>
    </div>
  );
}

function Videos({ match, set }: { match: Match; set: (p: Partial<Match>) => void }) {
  const [sel, setSel] = useState<string | null>(match.videos[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<MatchVideo['kind']>('tactico');
  const [note, setNote] = useState('');
  const [label, setLabel] = useState('');
  const player = useRef<PlayerHandle>(null);
  const video = match.videos.find((v) => v.id === sel);

  const updateVideo = (v: MatchVideo) => set({ videos: match.videos.map((x) => (x.id === v.id ? v : x)) });

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {match.videos.map((v) => (
          <button key={v.id} onClick={() => setSel(v.id)} className={cx('flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold', v.id === sel ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-300')}>
            <Film size={13} /> {v.title.split('·').pop()?.trim()}
          </button>
        ))}
        <button onClick={() => setAdding(true)} className="flex shrink-0 items-center gap-1 rounded-xl border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400">
          <Plus size={13} /> Vídeo
        </button>
      </div>

      {adding && (
        <Card className="space-y-2">
          <Input placeholder="Título (ej. Salida de balón rival)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Enlace YouTube o MP4 (opcional; vacío = vídeo simulado)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Select value={kind} onChange={(v) => setKind(v as MatchVideo['kind'])} options={[{ value: 'salida', label: 'Salida de balón' }, { value: 'abp', label: 'Balón parado' }, { value: 'tactico', label: 'Táctico' }, { value: 'otro', label: 'Otro' }]} />
          <div className="flex gap-2">
            <Btn tone="ghost" className="flex-1" onClick={() => setAdding(false)}>
              Cancelar
            </Btn>
            <Btn
              className="flex-1"
              disabled={!title.trim()}
              onClick={() => {
                const v: MatchVideo = { id: uid('v'), title: `${match.rival} · ${title.trim()}`, kind, url: url.trim() || undefined, duration: 300, chapters: [] };
                set({ videos: [...match.videos, v] });
                setSel(v.id);
                setAdding(false);
                setTitle('');
                setUrl('');
              }}
            >
              Añadir
            </Btn>
          </div>
        </Card>
      )}

      {!video && !adding && <Empty icon={<Film />} title="Sin vídeos del rival" text="Añade vídeos explicativos con marcas de tiempo y notas." />}

      {video && (
        <>
          <div className="flex items-center gap-2">
            <Link2 size={14} className="shrink-0 text-slate-500" />
            <Input
              key={video.id}
              defaultValue={video.url ?? ''}
              placeholder="Pega aquí un enlace de YouTube o MP4"
              onBlur={(e) => {
                const u = e.target.value.trim() || undefined;
                if (u !== video.url) updateVideo({ ...video, url: u });
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </div>
          <VideoPlayer
            ref={player}
            src={video.url}
            duration={video.duration}
            label={video.title}
            seed={video.id.length + match.round}
            markers={video.chapters.map((c) => ({ id: c.id, t: c.t, color: '#facc15' }))}
            onDuration={(d) => Math.abs(d - video.duration) > 1 && updateVideo({ ...video, duration: Math.round(d) })}
          />
          <div className="space-y-1.5">
            {video.chapters.map((c) => (
              <div key={c.id} className="flex gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                <button onClick={() => player.current?.seek(c.t)} className="h-fit rounded-md bg-amber-400/20 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                  {fmtTime(c.t)}
                </button>
                <button onClick={() => player.current?.seek(c.t)} className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-xs text-slate-400">{c.note}</div>
                </button>
                <button onClick={() => updateVideo({ ...video, chapters: video.chapters.filter((x) => x.id !== c.id) })} className="text-slate-600 hover:text-red-400" aria-label="Eliminar marca">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <Card className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Nueva marca en el tiempo actual</div>
            <Input placeholder="Etiqueta (ej. Presión tras pérdida)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Input placeholder="Nota" value={note} onChange={(e) => setNote(e.target.value)} />
            <Btn
              small
              disabled={!label.trim()}
              onClick={() => {
                const t = Math.round(player.current?.time() ?? 0);
                updateVideo({ ...video, chapters: [...video.chapters, { id: uid('ch'), t, label: label.trim(), note: note.trim() }].sort((a, b) => a.t - b.t) });
                setLabel('');
                setNote('');
              }}
            >
              <Plus size={14} /> Añadir marca
            </Btn>
          </Card>
          <Btn tone="danger" small onClick={() => set({ videos: match.videos.filter((v) => v.id !== video.id) })}>
            <Trash2 size={14} /> Eliminar vídeo
          </Btn>
        </>
      )}
    </div>
  );
}
