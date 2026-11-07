import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Clock, Copy, Folder as FolderIcon, FolderPlus, Gauge, Pencil, PenTool, Plus, Ruler, Search, Trash2, Users, Wrench } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, Chip, ChipRow, Empty, Field, Input, SectionTitle, Select, Sheet, TextArea } from '../../components/ui';
import { BoardPreview } from '../../components/Pitch';
import SendToSession from '../../components/SendToSession';
import { emptyBoard } from '../../lib/board';
import { cx, norm, todayISO, uid } from '../../lib/utils';
import type { Exercise } from '../../types';

const INT_COLOR = { Baja: 'text-sky-300', Media: 'text-emerald-300', Alta: 'text-amber-300', Máxima: 'text-red-400' };

/** Búsqueda inteligente: texto libre en todos los campos + nº de jugadores + dimensiones. */
export function matchExercise(e: Exercise, q: string, folderName: string) {
  const nq = norm(q);
  if (!nq) return true;
  const hay = norm([e.name, e.objective, e.players, e.dimensions, e.material.join(' '), e.rules, e.variants.join(' '), e.intensity, folderName].join(' '));
  return nq.split(' ').every((tok) => {
    if (/^\d+$/.test(tok)) {
      const n = Number(tok);
      return e.playersCount === n || hay.includes(tok);
    }
    if (/^\d+x\d+$/.test(tok)) return norm(e.dimensions).replace(/\s/g, '').includes(tok);
    return hay.includes(tok) || (tok.length > 4 && hay.includes(tok.slice(0, -1)));
  });
}

export default function LibraryModule() {
  const { folders, exercises, pendingOpen } = useStore();
  const clearPending = useStore((s) => s.clearPending);
  const addFolder = useStore((s) => s.addFolder);
  const [folder, setFolder] = useState<string | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [manage, setManage] = useState(false);
  const [fname, setFname] = useState('');
  const [fcolor, setFcolor] = useState('#10b981');

  useEffect(() => {
    if (pendingOpen?.tab === 'library') {
      setOpen(pendingOpen.id);
      clearPending();
    }
  }, [pendingOpen, clearPending]);

  const fName = (id: string) => folders.find((f) => f.id === id)?.name ?? '';
  const list = useMemo(
    () => exercises.filter((e) => (folder === 'all' || e.folderId === folder) && matchExercise(e, q, fName(e.folderId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises, folder, q, folders],
  );

  return (
    <div className="px-4 pb-8 pt-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: rondo, presión, 10 jugadores, 30x20, conos…" className="pl-9" />
      </div>

      <SectionTitle
        right={
          <div className="flex gap-1.5">
            <Btn small tone="ghost" onClick={() => setManage(true)}>
              <Pencil size={13} />
            </Btn>
            <Btn small tone="subtle" onClick={() => setNewFolder(true)}>
              <FolderPlus size={14} /> Carpeta
            </Btn>
          </div>
        }
      >
        Carpetas
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {folders.map((f) => {
          const n = exercises.filter((e) => e.folderId === f.id).length;
          const active = folder === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFolder(active ? 'all' : f.id)}
              className={cx('flex items-center gap-2 rounded-2xl border p-2.5 text-left transition active:scale-95', active ? 'bg-slate-800' : 'border-slate-800 bg-slate-900')}
              style={active ? { borderColor: f.color } : undefined}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: f.color + '22', color: f.color }}>
                <FolderIcon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-xs font-bold leading-tight">{f.name}</span>
                <span className="text-[10px] text-slate-500">{n} ejercicios</span>
              </span>
            </button>
          );
        })}
      </div>

      <SectionTitle
        right={
          <Btn
            small
            onClick={() =>
              setEditing({
                id: uid('e'), folderId: folder === 'all' ? folders[0]?.id ?? '' : folder, name: '', objective: '', players: '', playersCount: 10, dimensions: '', material: [], rules: '', variants: [], series: 3, workMin: 4, restMin: 1, intensity: 'Media', board: emptyBoard('grid'), createdAt: todayISO(),
              })
            }
          >
            <Plus size={14} /> Ejercicio
          </Btn>
        }
      >
        {folder === 'all' ? 'Todos los ejercicios' : fName(folder)} · {list.length}
      </SectionTitle>
      {folder !== 'all' && (
        <ChipRow>
          <Chip onClick={() => setFolder('all')}>× Quitar filtro de carpeta</Chip>
        </ChipRow>
      )}
      {!list.length && <Empty icon={<Search />} title="Sin resultados" text="Prueba con otro término: objetivo, material, dimensiones o nº de jugadores." />}
      <div className="mt-2 space-y-2">
        {list.map((e) => {
          const f = folders.find((x) => x.id === e.folderId);
          return (
            <Card key={e.id} onClick={() => setOpen(e.id)} className="flex gap-3 !p-2">
              <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-emerald-900">{e.board && <BoardPreview board={e.board} className="h-full w-full" />}</div>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: f?.color }}>
                  {f?.name}
                </div>
                <div className="line-clamp-2 text-sm font-bold leading-tight">{e.name}</div>
                <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-slate-400">
                  <span className="flex items-center gap-0.5"><Users size={11} /> {e.players}</span>
                  <span className="flex items-center gap-0.5"><Ruler size={11} /> {e.dimensions}</span>
                  <span className={cx('flex items-center gap-0.5', INT_COLOR[e.intensity])}><Gauge size={11} /> {e.intensity}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <ExerciseSheet id={open} onClose={() => setOpen(null)} onEdit={(e) => setEditing(e)} />
      <ExerciseEditor exercise={editing} onClose={() => setEditing(null)} onSaved={(id) => setOpen(id)} />

      <Sheet
        open={newFolder}
        onClose={() => setNewFolder(false)}
        title="Nueva carpeta"
        footer={
          <Btn
            className="w-full"
            disabled={!fname.trim()}
            onClick={() => {
              addFolder(fname.trim(), fcolor);
              setFname('');
              setNewFolder(false);
            }}
          >
            Crear carpeta
          </Btn>
        }
      >
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={fname} onChange={(e) => setFname(e.target.value)} placeholder="Ej. Finalización" />
          </Field>
          <Field label="Color">
            <div className="flex gap-2">
              {['#10b981', '#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#22d3ee', '#f472b6', '#facc15'].map((c) => (
                <button key={c} onClick={() => setFcolor(c)} className={cx('h-8 w-8 rounded-full border-2', fcolor === c ? 'border-white' : 'border-transparent')} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </Field>
        </div>
      </Sheet>
      <FolderManager open={manage} onClose={() => setManage(false)} />
    </div>
  );
}

function FolderManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const folders = useStore((s) => s.folders);
  const renameFolder = useStore((s) => s.renameFolder);
  const deleteFolder = useStore((s) => s.deleteFolder);
  return (
    <Sheet open={open} onClose={onClose} title="Gestionar carpetas">
      <div className="space-y-2">
        {folders.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: f.color }} />
            <Input value={f.name} onChange={(e) => renameFolder(f.id, e.target.value)} />
            <button
              disabled={folders.length < 2}
              onClick={() => confirm(`¿Eliminar la carpeta «${f.name}»? Sus ejercicios se moverán a otra carpeta.`) && deleteFolder(f.id)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-800 text-slate-500 hover:text-red-400 disabled:opacity-30"
              aria-label="Eliminar carpeta"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function ExerciseSheet({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (e: Exercise) => void }) {
  const e = useStore((s) => s.exercises.find((x) => x.id === id));
  const folders = useStore((s) => s.folders);
  const loadBoard = useStore((s) => s.loadBoard);
  const upsertExercise = useStore((s) => s.upsertExercise);
  const deleteExercise = useStore((s) => s.deleteExercise);
  const toast = useStore((s) => s.toast);
  const [send, setSend] = useState(false);
  if (!e) return null;
  const f = folders.find((x) => x.id === e.folderId);
  return (
    <>
      <Sheet
        open={!!e && !send}
        onClose={onClose}
        title={
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: f?.color }}>{f?.name}</div>
            <div className="leading-tight">{e.name}</div>
          </div>
        }
        footer={
          <div className="flex gap-2">
            <Btn tone="ghost" onClick={() => { loadBoard(e.board ?? emptyBoard('grid'), e.id); onClose(); }}>
              <PenTool size={16} />
            </Btn>
            <Btn className="flex-1" onClick={() => setSend(true)}>
              <CalendarPlus size={16} /> Enviar a sesión del calendario
            </Btn>
          </div>
        }
      >
        <div className="overflow-hidden rounded-2xl bg-emerald-900">{e.board && <BoardPreview board={e.board} className="max-h-[46vh] w-full" />}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Info icon={<Users size={13} />} label="Jugadores" value={`${e.players} (${e.playersCount})`} />
          <Info icon={<Ruler size={13} />} label="Dimensiones" value={e.dimensions} />
          <Info icon={<Clock size={13} />} label="Series / tiempos" value={`${e.series} x ${e.workMin}′ · rec ${e.restMin}′`} />
          <Info icon={<Gauge size={13} />} label="Intensidad" value={<span className={INT_COLOR[e.intensity]}>{e.intensity}</span>} />
        </div>
        <SectionTitle>Objetivo</SectionTitle>
        <p className="text-sm text-slate-200">{e.objective}</p>
        <SectionTitle>Reglas y descripción</SectionTitle>
        <p className="whitespace-pre-line text-sm text-slate-300">{e.rules}</p>
        {e.variants.length > 0 && (
          <>
            <SectionTitle>Variantes</SectionTitle>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-300">{e.variants.map((v, i) => <li key={i}>{v}</li>)}</ul>
          </>
        )}
        <SectionTitle>Material</SectionTitle>
        <div className="flex flex-wrap gap-1.5">{e.material.map((m) => <span key={m} className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs"><Wrench size={11} /> {m}</span>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn small tone="subtle" onClick={() => onEdit(e)}><Pencil size={14} /> Editar ficha</Btn>
          <Btn small tone="subtle" onClick={() => { const c = { ...e, id: uid('e'), name: e.name + ' (copia)', board: e.board && JSON.parse(JSON.stringify(e.board)) }; upsertExercise(c); toast('Ejercicio duplicado'); }}>
            <Copy size={14} /> Duplicar
          </Btn>
          <Btn small tone="danger" onClick={() => { if (confirm('¿Eliminar este ejercicio?')) { deleteExercise(e.id); onClose(); } }}>
            <Trash2 size={14} /> Eliminar
          </Btn>
        </div>
      </Sheet>
      <SendToSession exercise={e} open={send} onClose={() => setSend(false)} />
    </>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">{icon} {label}</div>
      <div className="mt-0.5 font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function ExerciseEditor({ exercise, onClose, onSaved }: { exercise: Exercise | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const folders = useStore((s) => s.folders);
  const upsertExercise = useStore((s) => s.upsertExercise);
  const toast = useStore((s) => s.toast);
  const [d, setD] = useState<Exercise | null>(exercise);
  const [key, setKey] = useState(exercise?.id);
  const [mat, setMat] = useState(exercise?.material.join(', ') ?? '');
  const [vars, setVars] = useState(exercise?.variants.join('\n') ?? '');
  if (!exercise && key) setKey(undefined);
  if (exercise && key !== exercise.id) {
    setKey(exercise.id);
    setD(exercise);
    setMat(exercise.material.join(', '));
    setVars(exercise.variants.join('\n'));
  }
  if (!exercise || !d) return null;
  const set = (p: Partial<Exercise>) => setD({ ...d, ...p });
  return (
    <Sheet
      open={!!exercise}
      onClose={onClose}
      title={exercise.name ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      footer={
        <Btn
          className="w-full"
          disabled={!d.name.trim()}
          onClick={() => {
            upsertExercise({
              ...d,
              name: d.name.trim(),
              material: mat.split(',').map((x) => x.trim()).filter(Boolean),
              variants: vars.split('\n').map((x) => x.trim()).filter(Boolean),
            });
            toast('Ejercicio guardado en la biblioteca');
            onSaved?.(d.id);
            onClose();
          }}
        >
          Guardar ejercicio
        </Btn>
      }
    >
      <div className="space-y-3">
        {d.board && (
          <div className="overflow-hidden rounded-2xl bg-emerald-900">
            <BoardPreview board={d.board} className="max-h-48 w-full" />
          </div>
        )}
        <Field label="Nombre"><Input value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Carpeta"><Select value={d.folderId} onChange={(v) => set({ folderId: v })} options={folders.map((f) => ({ value: f.id, label: f.name }))} /></Field>
        <Field label="Objetivo táctico / físico"><TextArea rows={2} value={d.objective} onChange={(e) => set({ objective: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Formato (ej. 4v4+2)"><Input value={d.players} onChange={(e) => set({ players: e.target.value })} /></Field>
          <Field label="Nº jugadores"><Input type="number" value={d.playersCount} onChange={(e) => set({ playersCount: Number(e.target.value) || 0 })} /></Field>
          <Field label="Dimensiones"><Input value={d.dimensions} onChange={(e) => set({ dimensions: e.target.value })} placeholder="30x20 m" /></Field>
          <Field label="Intensidad"><Select value={d.intensity} onChange={(v) => set({ intensity: v as Exercise['intensity'] })} options={['Baja', 'Media', 'Alta', 'Máxima']} /></Field>
          <Field label="Series"><Input type="number" value={d.series} onChange={(e) => set({ series: Number(e.target.value) || 0 })} /></Field>
          <Field label="Trabajo (min)"><Input type="number" step="0.5" value={d.workMin} onChange={(e) => set({ workMin: Number(e.target.value) || 0 })} /></Field>
          <Field label="Recuperación (min)"><Input type="number" step="0.5" value={d.restMin} onChange={(e) => set({ restMin: Number(e.target.value) || 0 })} /></Field>
          <Field label="Material (coma)"><Input value={mat} onChange={(e) => setMat(e.target.value)} /></Field>
        </div>
        <Field label="Reglas"><TextArea rows={4} value={d.rules} onChange={(e) => set({ rules: e.target.value })} /></Field>
        <Field label="Variantes (una por línea)"><TextArea rows={3} value={vars} onChange={(e) => setVars(e.target.value)} /></Field>
      </div>
    </Sheet>
  );
}
