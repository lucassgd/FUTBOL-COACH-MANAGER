import { useState, type RefObject } from 'react';
import { Check, Clock, Copy, ListVideo, Pencil, Play, Plus, Scissors, Share2, Square, Trash2, X } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Input } from '../../components/ui';
import type { PlayerHandle } from '../../components/VideoPlayer';
import { cx, fmtTime, parseTime, uid } from '../../lib/utils';
import type { Analysis, VideoClip } from '../../types';

const DEF_PRE = 5;
const DEF_POST = 5;

/** Tramo final que se reproduce: acción + márgenes, dentro de la duración del vídeo. */
export const clipRange = (c: VideoClip, duration: number) => ({
  start: Math.max(0, c.a - c.pre),
  end: Math.min(duration || Infinity, c.b + c.post),
});

/** Enlace de YouTube que reproduce solo ese tramo (sirve para enviarlo por WhatsApp). */
export const clipLink = (ytId: string, c: VideoClip, duration: number) => {
  const r = clipRange(c, duration);
  return `https://www.youtube.com/embed/${ytId}?start=${Math.floor(r.start)}&end=${Math.ceil(r.end)}&autoplay=1&rel=0`;
};

interface Props {
  analysis: Analysis;
  player: RefObject<PlayerHandle>;
  ytId: string | null;
}

export default function Clips({ analysis, player, ytId }: Props) {
  const upsertAnalysis = useStore((s) => s.upsertAnalysis);
  const toast = useStore((s) => s.toast);
  const clips = analysis.clips ?? [];
  const dur = analysis.duration;

  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [aTxt, setATxt] = useState('');
  const [bTxt, setBTxt] = useState('');
  const [pre, setPre] = useState(DEF_PRE);
  const [post, setPost] = useState(DEF_POST);
  const [playing, setPlaying] = useState<string | null>(null);
  const [queue, setQueue] = useState(false);

  const a = parseTime(aTxt);
  const bRaw = bTxt.trim() ? parseTime(bTxt) : a; // sin final => acción puntual
  const b = bRaw;
  const err =
    aTxt.trim() && a === null
      ? 'No entiendo el inicio. Escribe por ejemplo 12:34'
      : bTxt.trim() && b === null
        ? 'No entiendo el final. Escribe por ejemplo 12:50'
        : a !== null && b !== null && b < a
          ? 'El final no puede ser anterior al inicio'
          : a !== null && dur && a > dur
            ? `El vídeo dura ${fmtTime(dur)}`
            : null;
  const valid = a !== null && b !== null && !err;
  const preview = valid ? clipRange({ id: '', title: '', a: a!, b: b!, pre, post }, dur) : null;

  const save = (list: VideoClip[]) => upsertAnalysis({ ...analysis, clips: [...list].sort((x, y) => x.a - y.a) });

  const reset = () => {
    setEditing(null);
    setTitle('');
    setATxt('');
    setBTxt('');
  };

  const submit = () => {
    if (!valid) return;
    const name = title.trim() || `Acción ${fmtTime(a!)}`;
    if (editing) save(clips.map((c) => (c.id === editing ? { ...c, title: name, a: a!, b: b!, pre, post } : c)));
    else save([...clips, { id: uid('clip'), title: name, a: a!, b: b!, pre, post }]);
    toast(editing ? 'Clip actualizado' : 'Clip creado');
    reset();
  };

  const edit = (c: VideoClip) => {
    setEditing(c.id);
    setTitle(c.title);
    setATxt(fmtTime(c.a));
    setBTxt(c.b !== c.a ? fmtTime(c.b) : '');
    setPre(c.pre);
    setPost(c.post);
  };

  const stop = () => {
    player.current?.clearRange();
    player.current?.pause();
    setPlaying(null);
    setQueue(false);
  };

  const playOne = (c: VideoClip, then?: () => void) => {
    const r = clipRange(c, dur);
    setPlaying(c.id);
    player.current?.playRange(r.start, r.end, () => {
      setPlaying(null);
      then?.();
    });
  };

  const playAll = (from = 0) => {
    if (from >= clips.length) {
      setQueue(false);
      toast('Fin de los clips');
      return;
    }
    setQueue(true);
    playOne(clips[from], () => playAll(from + 1));
  };

  const fromTags = () => {
    const have = new Set(clips.map((c) => Math.round(c.a)));
    const extra = analysis.tags
      .filter((t) => !have.has(Math.round(t.t)))
      .map((t) => ({ id: uid('clip'), title: `Etiqueta ${fmtTime(t.t)}${t.note ? ' · ' + t.note : ''}`, a: t.t, b: t.t, pre, post }));
    if (!extra.length) return toast('Las etiquetas ya tienen clip', 'warn');
    save([...clips, ...extra]);
    toast(`${extra.length} clips creados desde las etiquetas`);
  };

  const share = async (text: string, what: string) => {
    try {
      if (navigator.share) await navigator.share({ title: analysis.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast(`${what} copiado`);
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        toast(`${what} copiado`);
      } catch {
        prompt('Copia el texto:', text);
      }
    }
  };

  const listText = () =>
    [
      `🎬 ${analysis.title}`,
      ...clips.map((c, i) => {
        const r = clipRange(c, dur);
        return `${i + 1}. ${c.title} (${fmtTime(r.start)}–${fmtTime(r.end)})${ytId ? '\n' + clipLink(ytId, c, dur) : ''}`;
      }),
    ].join('\n');

  const setNow = (which: 'a' | 'b') => {
    const t = Math.round(player.current?.time() ?? 0);
    (which === 'a' ? setATxt : setBTxt)(fmtTime(t));
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Formulario */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-sky-300">
          <Scissors size={14} /> {editing ? 'Editar clip' : 'Nuevo clip'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TimeField label="Inicio acción" value={aTxt} onChange={setATxt} onNow={() => setNow('a')} placeholder="12:34" />
          <TimeField label="Final acción" value={bTxt} onChange={setBTxt} onNow={() => setNow('b')} placeholder="12:50" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stepper label="Antes" value={pre} onChange={setPre} />
          <Stepper label="Después" value={post} onChange={setPost} />
        </div>
        <Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre (opcional): Gol de córner, pérdida en salida…" />
        <p className={cx('mt-2 text-[11px]', err ? 'text-amber-400' : 'text-slate-400')}>
          {err ??
            (preview ? (
              <>
                Se cortará de <b className="font-mono text-sky-300">{fmtTime(preview.start)}</b> a <b className="font-mono text-sky-300">{fmtTime(preview.end)}</b> ({Math.round(preview.end - preview.start)} s)
              </>
            ) : (
              'Escribe el minuto (12:34) o pulsa «Ahora» mientras ves el vídeo. Si no pones final, se usa el mismo momento.'
            ))}
        </p>
        <div className="mt-2 flex gap-2">
          {preview && (
            <Btn small tone="subtle" onClick={() => player.current?.playRange(preview.start, preview.end)}>
              <Play size={14} /> Probar
            </Btn>
          )}
          <Btn small className="flex-1" disabled={!valid} onClick={submit}>
            {editing ? <Check size={14} /> : <Plus size={14} />} {editing ? 'Guardar cambios' : 'Crear clip'}
          </Btn>
          {editing && (
            <Btn small tone="subtle" onClick={reset}>
              <X size={14} />
            </Btn>
          )}
        </div>
      </div>

      {/* Acciones de lista */}
      <div className="flex flex-wrap gap-2">
        {queue ? (
          <Btn small tone="danger" onClick={stop}>
            <Square size={14} /> Detener
          </Btn>
        ) : (
          <Btn small onClick={() => playAll()} disabled={!clips.length}>
            <ListVideo size={14} /> Ver todos seguidos
          </Btn>
        )}
        <Btn small tone="subtle" onClick={() => share(listText(), 'Listado')} disabled={!clips.length}>
          <Share2 size={14} /> Compartir
        </Btn>
        <Btn small tone="subtle" onClick={fromTags} disabled={!analysis.tags.length}>
          <Clock size={14} /> Desde etiquetas
        </Btn>
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {!clips.length && <p className="py-4 text-center text-xs text-slate-500">Sin clips. Crea el primero arriba.</p>}
        {clips.map((c, i) => {
          const r = clipRange(c, dur);
          return (
            <div key={c.id} className={cx('flex items-center gap-2 rounded-xl border bg-slate-900 px-2 py-1.5', playing === c.id ? 'border-sky-400' : 'border-slate-800', editing === c.id && 'border-emerald-500')}>
              <button
                onClick={() => (playing === c.id ? stop() : playOne(c))}
                className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', playing === c.id ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-sky-300')}
                aria-label={playing === c.id ? 'Parar clip' : 'Reproducir clip'}
              >
                {playing === c.id ? <Square size={14} /> : <Play size={16} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  <span className="text-slate-500">{i + 1}.</span> {c.title}
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  {fmtTime(r.start)} → {fmtTime(r.end)} · {Math.round(r.end - r.start)} s
                  <span className="text-slate-600">
                    {' '}
                    (−{c.pre}/+{c.post})
                  </span>
                </div>
              </div>
              {ytId && (
                <button onClick={() => share(`${c.title}\n${clipLink(ytId, c, dur)}`, 'Enlace')} className="p-1 text-slate-500 hover:text-sky-300" aria-label="Copiar enlace del clip">
                  <Copy size={14} />
                </button>
              )}
              <button onClick={() => edit(c)} className="p-1 text-slate-500 hover:text-emerald-300" aria-label="Editar clip">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  if (editing === c.id) reset();
                  save(clips.filter((x) => x.id !== c.id));
                }}
                className="p-1 text-slate-600 hover:text-red-400"
                aria-label="Eliminar clip"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
      {ytId && clips.length > 0 && <p className="text-[10px] text-slate-500">Los enlaces abren el vídeo de YouTube solo en ese tramo. El vídeo original no se modifica.</p>}
    </div>
  );
}

function TimeField({ label, value, onChange, onNow, placeholder }: { label: string; value: string; onChange: (v: string) => void; onNow: () => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">{label}</span>
      <div className="flex gap-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="text" className="min-w-0 font-mono" aria-label={label} />
        <button type="button" onClick={onNow} className="shrink-0 rounded-xl border border-slate-700 px-2 text-[10px] font-bold text-sky-300">
          Ahora
        </button>
      </div>
    </label>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-2 py-1">
      <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold" aria-label={`${label} menos`}>
          −
        </button>
        <span className="w-9 text-center font-mono text-xs font-bold">{value} s</span>
        <button type="button" onClick={() => onChange(Math.min(60, value + 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold" aria-label={`${label} más`}>
          +
        </button>
      </div>
    </div>
  );
}
