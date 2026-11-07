import { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Clock, Plus, Search, Trash2 } from 'lucide-react';
import { useStore, type Slot } from '../../store/store';
import { Btn, Input, Sheet } from '../../components/ui';
import { BoardPreview } from '../../components/Pitch';
import { matchExercise } from '../library/LibraryModule';
import type { SessionTask } from '../../types';

export default function TaskList({ weekStart, slot, tasks, accent, suggestFolder }: { weekStart: string; slot: Slot; tasks: SessionTask[]; accent: string; suggestFolder?: string }) {
  const exercises = useStore((s) => s.exercises);
  const removeTask = useStore((s) => s.removeTask);
  const moveTask = useStore((s) => s.moveTask);
  const updateWeek = useStore((s) => s.updateWeek);
  const openIn = useStore((s) => s.openIn);
  const [picker, setPicker] = useState(false);
  const total = tasks.reduce((a, t) => a + t.minutes, 0);

  const setMinutes = (id: string, minutes: number) =>
    updateWeek(weekStart, (w) => {
      const [d, k] = slot.split('.') as [string, string];
      const day = (w as unknown as Record<string, Record<string, SessionTask[]>>)[d];
      return { ...w, [d]: { ...day, [k]: day[k].map((t) => (t.id === id ? { ...t, minutes } : t)) } };
    });

  return (
    <div>
      <div className="space-y-1.5">
        {tasks.map((t, i) => {
          const ex = exercises.find((e) => e.id === t.exerciseId);
          return (
            <div key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1.5">
              <button onClick={() => ex && openIn('library', ex.id)} className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-emerald-950">
                {ex?.board ? <BoardPreview board={ex.board} className="h-full w-full" /> : <BookOpen size={16} className="m-auto text-slate-600" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold leading-tight">{t.title}</div>
                {t.notes && <div className="truncate text-[11px] text-slate-500">{t.notes}</div>}
                {ex && <div className="truncate text-[10px] text-slate-500">{ex.players} · {ex.dimensions} · {ex.intensity}</div>}
              </div>
              <div className="flex items-center gap-0.5">
                <Clock size={11} className="text-slate-500" />
                <input
                  inputMode="numeric"
                  value={t.minutes}
                  onChange={(e) => setMinutes(t.id, Number(e.target.value.replace(/\D/g, '')) || 0)}
                  className="w-8 rounded bg-slate-900 text-center font-mono text-xs text-slate-200 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => moveTask(weekStart, slot, t.id, -1)} className="text-slate-500 disabled:opacity-20" aria-label="Subir"><ArrowUp size={13} /></button>
                <button disabled={i === tasks.length - 1} onClick={() => moveTask(weekStart, slot, t.id, 1)} className="text-slate-500 disabled:opacity-20" aria-label="Bajar"><ArrowDown size={13} /></button>
              </div>
              <button onClick={() => removeTask(weekStart, slot, t.id)} className="px-1 text-slate-600 hover:text-red-400" aria-label="Quitar tarea"><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <button onClick={() => setPicker(true)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
          <Plus size={14} /> Añadir tarea
        </button>
        <span className="font-mono text-[11px] text-slate-500">{total}′</span>
      </div>
      <TaskPicker open={picker} onClose={() => setPicker(false)} weekStart={weekStart} slot={slot} suggestFolder={suggestFolder} exercisesCount={exercises.length} />
    </div>
  );
}

function TaskPicker({ open, onClose, weekStart, slot, suggestFolder }: { open: boolean; onClose: () => void; weekStart: string; slot: Slot; suggestFolder?: string; exercisesCount: number }) {
  const exercises = useStore((s) => s.exercises);
  const folders = useStore((s) => s.folders);
  const addTask = useStore((s) => s.addTask);
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState('');
  const [mins, setMins] = useState(15);
  const fName = (id: string) => folders.find((f) => f.id === id)?.name ?? '';
  const list = exercises
    .filter((e) => matchExercise(e, q, fName(e.folderId)))
    .sort((a, b) => Number(b.folderId === suggestFolder) - Number(a.folderId === suggestFolder));
  return (
    <Sheet open={open} onClose={onClose} title="Añadir tarea a la sesión">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Tarea libre (ej. Calentamiento FIFA 11+)" />
          <Input type="number" value={mins} onChange={(e) => setMins(Number(e.target.value) || 1)} className="!w-16" />
          <Btn
            disabled={!custom.trim()}
            onClick={() => {
              addTask(weekStart, slot, { title: custom.trim(), minutes: mins, notes: '' });
              setCustom('');
              onClose();
            }}
          >
            <Plus size={16} />
          </Btn>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la biblioteca…" className="pl-9" />
        </div>
        <div className="space-y-1.5">
          {list.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                addTask(weekStart, slot, { exerciseId: e.id, title: e.name, minutes: Math.round(e.series * (e.workMin + e.restMin)) || 15, notes: '' });
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1.5 text-left hover:border-emerald-500/50"
            >
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">{e.board && <BoardPreview board={e.board} className="h-full w-full" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{e.name}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {fName(e.folderId)} · {e.players} · {Math.round(e.series * (e.workMin + e.restMin))}′
                </span>
              </span>
              <Plus size={16} className="text-emerald-400" />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
