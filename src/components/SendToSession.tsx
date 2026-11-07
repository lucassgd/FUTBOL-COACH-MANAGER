import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { SLOT_LABEL, useStore, type Slot } from '../store/store';
import { Btn, Field, Input, Sheet } from './ui';
import { addDays, fmtShort, mondayOf, todayISO } from '../lib/utils';
import type { Exercise } from '../types';

const SLOTS = Object.keys(SLOT_LABEL) as Slot[];

/** Hoja para enviar un ejercicio a un bloque concreto del microciclo. */
export default function SendToSession({ exercise, open, onClose }: { exercise: Exercise | null; open: boolean; onClose: () => void }) {
  const addTask = useStore((s) => s.addTask);
  const ensureWeek = useStore((s) => s.ensureWeek);
  const toast = useStore((s) => s.toast);
  const planWeek = useStore((s) => s.planWeek);
  const [week, setWeek] = useState(planWeek || mondayOf(todayISO()));
  const [slot, setSlot] = useState<Slot>(guessSlot(exercise));
  const [minutes, setMinutes] = useState(exercise ? Math.round(exercise.series * (exercise.workMin + exercise.restMin)) || 15 : 15);
  const [key, setKey] = useState(exercise?.id);
  if (exercise && key !== exercise.id) {
    setKey(exercise.id);
    setSlot(guessSlot(exercise));
    setMinutes(Math.round(exercise.series * (exercise.workMin + exercise.restMin)) || 15);
  }
  if (!exercise) return null;
  const ws = mondayOf(week);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Enviar a sesión del calendario"
      footer={
        <Btn
          className="w-full"
          onClick={() => {
            ensureWeek(ws);
            addTask(ws, slot, { exerciseId: exercise.id, title: exercise.name, minutes, notes: '' });
            toast(`Añadido a ${SLOT_LABEL[slot].split('·')[0].trim()} (${fmtShort(dayDate(ws, slot))})`);
            onClose();
          }}
        >
          <CalendarPlus size={16} /> Añadir a la sesión
        </Btn>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-950 p-3 text-sm font-semibold">{exercise.name}</div>
        <Field label="Semana (elige cualquier día)">
          <Input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          {[-7, 0, 7].map((d) => (
            <button key={d} onClick={() => setWeek(addDays(mondayOf(todayISO()), d))} className="flex-1 rounded-lg bg-slate-800 py-1.5 text-xs font-semibold text-slate-300">
              {d < 0 ? 'Semana pasada' : d === 0 ? 'Esta semana' : 'Próxima'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">Microciclo del lunes {fmtShort(ws)} al domingo {fmtShort(addDays(ws, 6))}</p>
        <Field label="Bloque de la sesión">
          <div className="space-y-1.5">
            {SLOTS.map((s) => (
              <button key={s} onClick={() => setSlot(s)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${slot === s ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 text-slate-300'}`}>
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Duración en la sesión (min)">
          <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
        </Field>
      </div>
    </Sheet>
  );
}

const dayDate = (ws: string, slot: Slot) => addDays(ws, slot.startsWith('monday') ? 0 : slot.startsWith('tuesday') ? 1 : 3);

function guessSlot(e: Exercise | null): Slot {
  if (!e) return 'tuesday.ssg';
  if (e.folderId === 'f_fuerza') return 'tuesday.strength';
  if (e.folderId === 'f_recup') return e.intensity === 'Alta' ? 'monday.under' : 'monday.over';
  if (e.folderId === 'f_plan') return 'thursday.tasks';
  return 'tuesday.ssg';
}
