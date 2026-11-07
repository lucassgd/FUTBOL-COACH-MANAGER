import { Check } from 'lucide-react';
import { useStore } from '../../store/store';
import type { Player } from '../../types';
import { cx, fmtShort } from '../../lib/utils';

export default function ProtocolChecklist({ player }: { player: Player }) {
  const updatePlayer = useStore((s) => s.updatePlayer);
  const inj = player.injury;
  const pr = inj?.protocol;
  if (!pr || !inj) return null;
  const done = pr.items.filter((i) => i.done).length;
  const toggle = (id: string) =>
    updatePlayer(player.id, {
      injury: { ...inj, protocol: { ...pr, items: pr.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) } },
    });
  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-sky-200">{pr.title}</div>
        <div className="font-mono text-[11px] text-sky-300">{done}/{pr.items.length}</div>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-sky-400 transition-all" style={{ width: `${(done / (pr.items.length || 1)) * 100}%` }} />
      </div>
      <div className="mt-2 space-y-1">
        {pr.items.map((i) => (
          <button key={i.id} onClick={() => toggle(i.id)} className="flex w-full items-center gap-2 text-left text-xs">
            <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded border', i.done ? 'border-sky-400 bg-sky-400 text-slate-950' : 'border-slate-600')}>{i.done && <Check size={11} />}</span>
            <span className={cx('flex-1', i.done && 'text-slate-500 line-through')}>{i.name}</span>
            <span className="font-mono text-[10px] text-slate-400">{i.dose}</span>
          </button>
        ))}
      </div>
      {pr.alerts.length > 0 && (
        <div className="mt-2 rounded-lg bg-red-500/10 p-2 text-[11px] text-red-200">
          <b>Prohibido / alertas:</b> {pr.alerts.slice(0, 3).join(' · ')}
        </div>
      )}
      <div className="mt-1 text-[10px] text-slate-500">Asignado el {fmtShort(pr.assignedAt)} · Fuente: {pr.sourceDocs.join(', ')}</div>
    </div>
  );
}
