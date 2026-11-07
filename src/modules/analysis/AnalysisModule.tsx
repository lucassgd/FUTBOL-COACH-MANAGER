import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Crosshair, Download, Film, FileVideo, Link2, Plus, ShieldOff, Sparkles, Trash2, Undo2, Users, Zap } from 'lucide-react';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { useStore } from '../../store/store';
import { Btn, Card, Chip, ChipRow, Empty, Field, Input, Segmented, Sheet } from '../../components/ui';
import VideoPlayer, { type PlayerHandle } from '../../components/VideoPlayer';
import { cx, fmtShort, fmtTime, todayISO, uid } from '../../lib/utils';
import type { Analysis, TagType } from '../../types';
import { isPlayableUrl, youtubeId } from '../../lib/youtube';

export const TAGS: { type: TagType; label: string; short: string; color: string; icon: typeof Zap; sign: 1 | -1 }[] = [
  { type: 'ocasion_gen', label: 'Ocasión Ganada / Generada', short: 'Oc. generada', color: '#10b981', icon: Sparkles, sign: 1 },
  { type: 'ocasion_con', label: 'Ocasión Perdida / Concedida', short: 'Oc. concedida', color: '#ef4444', icon: ShieldOff, sign: -1 },
  { type: 'recuperado', label: 'Balón Recuperado', short: 'Recuperación', color: '#38bdf8', icon: Crosshair, sign: 1 },
  { type: 'perdido', label: 'Balón Perdido', short: 'Pérdida', color: '#f59e0b', icon: Zap, sign: -1 },
];
const TAG = Object.fromEntries(TAGS.map((t) => [t.type, t])) as Record<TagType, (typeof TAGS)[number]>;

export default function AnalysisModule() {
  const analyses = useStore((s) => s.analyses);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const a = analyses.find((x) => x.id === open);
  if (a) return <Tagger analysis={a} onBack={() => setOpen(null)} />;

  return (
    <div className="px-4 pb-8 pt-3">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
          <Film size={18} /> Tagging estadístico en 1 clic
        </div>
        <p className="mt-1 text-xs text-slate-400">Carga el vídeo bruto del partido (YouTube, MP4 local o URL) o usa el partido de prueba, y etiqueta acciones vinculadas a jugadores o al bloque.</p>
        <Btn className="mt-3 w-full" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nuevo análisis
        </Btn>
      </Card>
      <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Análisis guardados</h3>
      {!analyses.length && <Empty icon={<Film />} title="Sin análisis" text="Crea el primero con el partido de prueba." />}
      <div className="space-y-2">
        {analyses.map((x) => {
          const pos = x.tags.filter((t) => TAG[t.type].sign > 0).length;
          return (
            <Card key={x.id} onClick={() => setOpen(x.id)} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-emerald-400">
                {x.source === 'demo' ? <Sparkles size={18} /> : x.source === 'local' ? <FileVideo size={18} /> : <Link2 size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{x.title}</div>
                <div className="text-[11px] text-slate-500">
                  {fmtShort(x.createdAt)} · {x.tags.length} etiquetas · {x.source === 'demo' ? 'Partido de prueba' : x.source === 'local' ? x.fileName : youtubeId(x.url) ? 'YouTube' : 'URL'}
                </div>
              </div>
              <div className="flex gap-1">
                {TAGS.map((t) => (
                  <span key={t.type} className="h-6 w-1.5 rounded-full" style={{ background: t.color, opacity: x.tags.some((g) => g.type === t.type) ? 1 : 0.2 }} />
                ))}
              </div>
              <span className="sr-only">{pos}</span>
            </Card>
          );
        })}
      </div>
      <NewAnalysis open={creating} onClose={() => setCreating(false)} onCreated={setOpen} />
    </div>
  );
}

function NewAnalysis({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const upsertAnalysis = useStore((s) => s.upsertAnalysis);
  const toast = useStore((s) => s.toast);
  const [src, setSrc] = useState<'demo' | 'local' | 'url'>('demo');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = title.trim() && (src === 'demo' || (src === 'url' && isPlayableUrl(url)) || (src === 'local' && file));

  const create = async () => {
    setBusy(true);
    const id = uid('an');
    const a: Analysis = { id, title: title.trim(), source: src, duration: 2700, tags: [], createdAt: todayISO() };
    if (src === 'url') a.url = url.trim();
    if (src === 'local' && file) {
      try {
        const key = `video_${id}`;
        await idbSet(key, file);
        a.fileKey = key;
        a.fileName = file.name;
      } catch {
        toast('No se pudo guardar el vídeo en el dispositivo', 'warn');
        setBusy(false);
        return;
      }
    }
    upsertAnalysis(a);
    setBusy(false);
    setTitle('');
    setFile(null);
    onClose();
    onCreated(id);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo análisis de vídeo"
      footer={
        <Btn className="w-full" disabled={!ok || busy} onClick={create}>
          {busy ? 'Guardando vídeo…' : 'Empezar a etiquetar'}
        </Btn>
      }
    >
      <div className="space-y-3">
        <Field label="Título">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. J7 vs SD Ribera · 2ª parte" />
        </Field>
        <Segmented
          value={src}
          onChange={setSrc}
          options={[
            { value: 'demo', label: 'Partido de prueba' },
            { value: 'local', label: 'Vídeo local' },
            { value: 'url', label: 'YouTube / URL' },
          ]}
        />
        {src === 'demo' && <p className="text-xs text-slate-400">Reproductor simulado de 45 minutos con animación táctica (funciona sin conexión).</p>}
        {src === 'local' && (
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-700 p-5 text-center">
            <FileVideo className="text-emerald-400" />
            <span className="mt-1 text-sm font-semibold">{file ? file.name : 'Seleccionar MP4 / MOV / WEBM'}</span>
            <span className="text-[11px] text-slate-500">{file ? `${Math.round(file.size / 1024 / 1024)} MB · se guarda en IndexedDB` : 'Se guarda en este dispositivo'}</span>
            <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
        {src === 'url' && (
          <div className="space-y-1">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/… o https://…/partido.mp4" />
            <p className="text-[11px] text-slate-500">
              {youtubeId(url) ? '✓ Vídeo de YouTube detectado' : 'Pega el enlace de YouTube (público o «no listado») o de un MP4.'}
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Tagger({ analysis, onBack }: { analysis: Analysis; onBack: () => void }) {
  const players = useStore((s) => s.players);
  const addTag = useStore((s) => s.addTag);
  const removeTag = useStore((s) => s.removeTag);
  const upsertAnalysis = useStore((s) => s.upsertAnalysis);
  const deleteAnalysis = useStore((s) => s.deleteAnalysis);
  const toast = useStore((s) => s.toast);
  const ref = useRef<PlayerHandle>(null);
  const added = useRef<string[]>([]);
  const [who, setWho] = useState<string | null>(null);
  const [sticky, setSticky] = useState(false);
  const [view, setView] = useState<'timeline' | 'tabla'>('timeline');
  const [filter, setFilter] = useState<TagType | 'all'>('all');
  const [src, setSrc] = useState<string | undefined>(analysis.source === 'url' ? analysis.url : undefined);
  const [flash, setFlash] = useState<TagType | null>(null);
  const sorted = [...players].sort((a, b) => a.number - b.number);
  const pName = (id: string | null) => (id ? players.find((p) => p.id === id)?.name ?? '¿?' : 'Bloque / Equipo');

  useEffect(() => {
    let url: string | undefined;
    if (analysis.source === 'local' && analysis.fileKey) {
      idbGet(analysis.fileKey).then((blob: Blob | undefined) => {
        if (blob) {
          url = URL.createObjectURL(blob);
          setSrc(url);
        } else toast('El vídeo local no está disponible en este dispositivo', 'warn');
      });
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [analysis.fileKey, analysis.source, toast]);

  const tag = (type: TagType) => {
    const t = Math.round((ref.current?.time() ?? 0) * 10) / 10;
    added.current.push(addTag(analysis.id, { t, type, playerId: who, note: '' }));
    setFlash(type);
    setTimeout(() => setFlash(null), 250);
    if (!sticky) setWho(null);
  };
  const undo = () => {
    const id = added.current.pop();
    if (id && analysis.tags.some((t) => t.id === id)) return removeTag(analysis.id, id);
    const latest = [...analysis.tags].sort((a, b) => b.t - a.t)[0];
    if (latest) removeTag(analysis.id, latest.id);
  };

  const counts = useMemo(() => Object.fromEntries(TAGS.map((t) => [t.type, analysis.tags.filter((g) => g.type === t.type).length])) as Record<TagType, number>, [analysis.tags]);

  const table = useMemo(() => {
    const rows = new Map<string, Record<TagType, number>>();
    for (const t of analysis.tags) {
      const k = t.playerId ?? '_team';
      if (!rows.has(k)) rows.set(k, { ocasion_gen: 0, ocasion_con: 0, recuperado: 0, perdido: 0 });
      rows.get(k)![t.type]++;
    }
    return [...rows.entries()]
      .map(([k, c]) => ({ k, c, bal: c.ocasion_gen + c.recuperado - c.ocasion_con - c.perdido }))
      .sort((a, b) => (a.k === '_team' ? 1 : b.k === '_team' ? -1 : b.bal - a.bal));
  }, [analysis.tags]);

  const exportCSV = () => {
    const lines = ['tiempo;accion;jugador'];
    analysis.tags.forEach((t) => lines.push(`${fmtTime(t.t)};${TAG[t.type].label};${pName(t.playerId)}`));
    lines.push('', 'jugador;oc_generadas;oc_concedidas;recuperaciones;perdidas;balance');
    table.forEach((r) => lines.push(`${r.k === '_team' ? 'Bloque' : pName(r.k)};${r.c.ocasion_gen};${r.c.ocasion_con};${r.c.recuperado};${r.c.perdido};${r.bal}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
    a.download = `${analysis.title.replace(/[^\w-]+/g, '_')}.csv`;
    a.click();
  };

  const filtered = analysis.tags.filter((t) => filter === 'all' || t.type === filter);

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 px-4 pt-3">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800" aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <input value={analysis.title} onChange={(e) => upsertAnalysis({ ...analysis, title: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" />
        <button
          onClick={() => {
            if (confirm('¿Eliminar este análisis y sus etiquetas?')) {
              if (analysis.fileKey) idbDel(analysis.fileKey).catch(() => undefined);
              deleteAnalysis(analysis.id);
              onBack();
            }
          }}
          className="text-slate-600 hover:text-red-400"
          aria-label="Eliminar análisis"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="sticky top-0 z-10 bg-slate-950 px-4 pb-2 pt-2">
        <VideoPlayer
          ref={ref}
          src={src}
          duration={analysis.duration}
          seed={3}
          label={analysis.source === 'demo' ? 'Partido de prueba' : analysis.fileName}
          markers={analysis.tags.map((t) => ({ id: t.id, t: t.t, color: TAG[t.type].color }))}
          onDuration={(d) => Math.abs(d - analysis.duration) > 1 && upsertAnalysis({ ...analysis, duration: Math.round(d) })}
        />
      </div>

      <div className="px-4">
        {/* Selector de jugador */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-400">
            <Users size={13} /> Vincular a: <span className="normal-case text-emerald-300">{pName(who)}</span>
          </span>
          <button onClick={() => setSticky(!sticky)} className={cx('rounded-full border px-2 py-0.5 text-[10px] font-bold', sticky ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-500')}>
            {sticky ? 'Fijado' : 'Fijar jugador'}
          </button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
          <button onClick={() => setWho(null)} className={cx('shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-bold', who === null ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-300')}>
            Bloque
          </button>
          {sorted.map((p) => (
            <button key={p.id} onClick={() => setWho(p.id)} className={cx('shrink-0 rounded-xl border px-2 py-1 text-center', who === p.id ? 'border-emerald-500 bg-emerald-500/15' : 'border-slate-800 bg-slate-900')}>
              <div className="font-mono text-xs font-black text-emerald-300">{p.number}</div>
              <div className="max-w-[64px] truncate text-[9px] text-slate-400">{p.name.split(' ')[0]}</div>
            </button>
          ))}
        </div>

        {/* Botonera de tagging */}
        <div className="grid grid-cols-2 gap-2">
          {TAGS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                onClick={() => tag(t.type)}
                className={cx('relative flex items-center gap-2 rounded-2xl border-2 p-3 text-left transition active:scale-95', flash === t.type && 'scale-95')}
                style={{ borderColor: t.color + '88', background: flash === t.type ? t.color + '55' : t.color + '18' }}
              >
                <Icon size={22} style={{ color: t.color }} />
                <span className="flex-1 text-xs font-bold leading-tight">{t.label}</span>
                <span className="font-mono text-xl font-black" style={{ color: t.color }}>
                  {counts[t.type]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <Btn small tone="subtle" onClick={undo} disabled={!analysis.tags.length}>
            <Undo2 size={14} /> Deshacer última
          </Btn>
          <Btn small tone="subtle" onClick={exportCSV} disabled={!analysis.tags.length}>
            <Download size={14} /> CSV
          </Btn>
        </div>

        <div className="mt-4">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'timeline', label: `Línea de tiempo (${analysis.tags.length})` },
              { value: 'tabla', label: 'Balance por jugador' },
            ]}
          />
        </div>

        {view === 'timeline' && (
          <div className="mt-3">
            <ChipRow>
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
                Todas
              </Chip>
              {TAGS.map((t) => (
                <Chip key={t.type} active={filter === t.type} color={t.color} onClick={() => setFilter(t.type)}>
                  {t.short}
                </Chip>
              ))}
            </ChipRow>
            {/* Mini línea de tiempo */}
            <div className="relative mt-3 h-10 rounded-xl border border-slate-800 bg-slate-900">
              {[0.25, 0.5, 0.75].map((f) => (
                <span key={f} className="absolute top-0 h-full w-px bg-slate-800" style={{ left: `${f * 100}%` }} />
              ))}
              {filtered.map((t) => (
                <button key={t.id} onClick={() => ref.current?.seek(Math.max(0, t.t - 5))} className="absolute top-1.5 h-7 w-2 -translate-x-1/2 rounded-full" style={{ left: `${(t.t / analysis.duration) * 100}%`, background: TAG[t.type].color }} aria-label={`Ir a ${fmtTime(t.t)}`} />
              ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-600">
              <span>00:00</span>
              <span>{fmtTime(analysis.duration / 2)}</span>
              <span>{fmtTime(analysis.duration)}</span>
            </div>
            <div className="mt-2 space-y-1">
              {!filtered.length && <p className="py-4 text-center text-xs text-slate-500">Sin etiquetas. Reproduce el vídeo y pulsa los botones.</p>}
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5">
                  <button onClick={() => ref.current?.seek(Math.max(0, t.t - 5))} className="rounded-md px-1.5 py-0.5 font-mono text-xs font-bold" style={{ background: TAG[t.type].color + '25', color: TAG[t.type].color }}>
                    {fmtTime(t.t)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{TAG[t.type].label}</div>
                    <input
                      value={t.note}
                      onChange={(e) => upsertAnalysis({ ...analysis, tags: analysis.tags.map((x) => (x.id === t.id ? { ...x, note: e.target.value } : x)) })}
                      placeholder={pName(t.playerId) + ' · añadir nota'}
                      className="w-full bg-transparent text-[11px] text-slate-400 outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <span className="max-w-[90px] truncate text-[10px] text-slate-500">{t.playerId ? `#${players.find((p) => p.id === t.playerId)?.number ?? '?'}` : 'Bloque'}</span>
                  <button onClick={() => removeTag(analysis.id, t.id)} className="text-slate-600 hover:text-red-400" aria-label="Eliminar etiqueta">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'tabla' && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="px-2 py-2 text-left">Jugador</th>
                  {TAGS.map((t) => (
                    <th key={t.type} className="px-1 py-2 text-center" style={{ color: t.color }}>
                      {t.short.split(' ')[0].slice(0, 5)}
                      {t.type.startsWith('ocasion') && (t.sign > 0 ? '+' : '−')}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">Bal.</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.k} className={cx('border-t border-slate-800', r.k === '_team' && 'bg-slate-900/60')}>
                    <td className="max-w-[120px] truncate px-2 py-1.5 font-semibold">{r.k === '_team' ? 'Bloque / Equipo' : pName(r.k)}</td>
                    {TAGS.map((t) => (
                      <td key={t.type} className="text-center font-mono">
                        {r.c[t.type] || '·'}
                      </td>
                    ))}
                    <td className={cx('text-center font-mono font-bold', r.bal > 0 ? 'text-emerald-400' : r.bal < 0 ? 'text-red-400' : 'text-slate-400')}>{r.bal > 0 ? `+${r.bal}` : r.bal}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-700 bg-slate-900 font-bold">
                  <td className="px-2 py-2">TOTAL EQUIPO</td>
                  {TAGS.map((t) => (
                    <td key={t.type} className="text-center font-mono" style={{ color: t.color }}>
                      {counts[t.type]}
                    </td>
                  ))}
                  <td className="text-center font-mono">{counts.ocasion_gen + counts.recuperado - counts.ocasion_con - counts.perdido}</td>
                </tr>
              </tbody>
            </table>
            {!table.length && <p className="py-4 text-center text-xs text-slate-500">Sin datos todavía.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
