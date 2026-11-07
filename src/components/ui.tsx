import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../lib/utils';

export function Chip({ active, onClick, children, color }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95',
        active ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500',
      )}
      style={active && color ? { borderColor: color, color, background: color + '22' } : undefined}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">{children}</div>;
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('rounded-2xl border border-slate-800 bg-slate-900/80 p-3', onClick && 'cursor-pointer transition active:scale-[0.99] hover:border-slate-700', className)}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-4 flex items-center justify-between">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{children}</h3>
      {right}
    </div>
  );
}

type BtnTone = 'primary' | 'ghost' | 'danger' | 'subtle';
export function Btn({ children, onClick, tone = 'primary', className, disabled, type = 'button', small }: { children: ReactNode; onClick?: () => void; tone?: BtnTone; className?: string; disabled?: boolean; type?: 'button' | 'submit'; small?: boolean }) {
  const tones: Record<BtnTone, string> = {
    primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    ghost: 'border border-slate-700 text-slate-200 hover:bg-slate-800',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25',
    subtle: 'bg-slate-800 text-slate-200 hover:bg-slate-700',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-95 disabled:opacity-40', small ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2.5 text-sm', tones[tone], className)}
    >
      {children}
    </button>
  );
}

export function IconBtn({ children, onClick, label, active, className }: { children: ReactNode; onClick?: () => void; label: string; active?: boolean; className?: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition active:scale-90', active ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800', className)}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(inputCls, 'resize-y', props.className)} />;
}
export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'appearance-none', className)}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

/** Bottom sheet deslizable: arrastrar el asa hacia abajo para cerrar. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!open) setDy(0);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div
        className="relative flex max-h-[92dvh] w-full max-w-[640px] flex-col rounded-t-3xl border-t border-slate-800 bg-slate-900 shadow-2xl animate-sheet"
        style={{ transform: `translateY(${dy}px)`, transition: start.current === null ? 'transform .2s' : 'none' }}
      >
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-2"
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDy(Math.max(0, e.clientY - start.current))}
          onPointerUp={() => {
            if (dy > 120) onClose();
            start.current = null;
            setDy(0);
          }}
        >
          <div className="h-1.5 w-12 rounded-full bg-slate-700" />
          <div className="flex w-full items-center justify-between px-4 pb-2 pt-3">
            <div className="min-w-0 flex-1 text-base font-bold text-slate-100">{title}</div>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-300" aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && <div className="border-t border-slate-800 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx('flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition', value === o.value ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center">
      <div className="mb-2 text-slate-500">{icon}</div>
      <p className="font-semibold text-slate-300">{title}</p>
      {text && <p className="mt-1 text-xs text-slate-500">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  Disponible: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Sobrecarga: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Lesionado: 'bg-red-500/15 text-red-300 border-red-500/30',
  Readaptación: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={cx('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', STATUS_STYLE[status])}>{status}</span>;
}

export function Num({ n, className }: { n: number | string; className?: string }) {
  return <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 font-mono text-sm font-bold text-emerald-300', className)}>{typeof n === 'number' ? String(n).padStart(2, '0') : n}</span>;
}

export function Stat({ label, value, tone = 'text-slate-100' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <div className={cx('text-lg font-bold leading-tight', tone)}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
