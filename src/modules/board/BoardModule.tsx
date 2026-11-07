import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Download, Eraser, Hand, MoveUpRight, RotateCw, Save, Spline, Square, Trash2, Undo2 } from 'lucide-react';
import { useStore } from '../../store/store';
import { BG_SIZE, defaultControl, ITEM_META } from '../../lib/board';
import { ItemShape, LINE_COLORS, LineShape, Markers, PitchBackground } from '../../components/Pitch';
import { Btn, Field, IconBtn, Input, Select, Sheet, TextArea } from '../../components/ui';
import SendToSession from '../../components/SendToSession';
import { clamp, cx, todayISO, uid } from '../../lib/utils';
import type { BoardBackground, BoardItem, BoardLine, BoardState, Exercise, ItemKind, LineKind } from '../../types';

type Tool = { t: 'select' } | { t: 'place'; kind: ItemKind } | { t: 'draw'; kind: LineKind };

type Drag =
  | { type: 'item'; id: string; dx: number; dy: number }
  | { type: 'line'; id: string; sx: number; sy: number; orig: BoardLine }
  | { type: 'handle'; id: string; h: 'p1' | 'p2' | 'c' }
  | { type: 'draw'; id: string }
  | null;

const PALETTE: ItemKind[] = ['own', 'rival', 'joker', 'gk', 'ball', 'cone', 'pole', 'ladder', 'minigoal', 'goal'];

export default function BoardModule() {
  const storeBoard = useStore((s) => s.board);
  const setStoreBoard = useStore((s) => s.setBoard);
  const meta = useStore((s) => s.boardMeta);
  const [board, setLocal] = useState<BoardState>(storeBoard);
  const [tool, setTool] = useState<Tool>({ t: 'select' });
  const [color, setColor] = useState(LINE_COLORS[0]);
  const [sel, setSel] = useState<{ kind: 'item' | 'line'; id: string } | null>(null);
  const [history, setHistory] = useState<BoardState[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag>(null);
  const mk = useId().replace(/:/g, '');

  useEffect(() => setLocal(storeBoard), [storeBoard]);
  const boardRef = useRef(board);
  boardRef.current = board;

  const { w, h } = BG_SIZE[board.background];

  const pushHistory = () => setHistory((hh) => [...hh.slice(-49), board]);
  const commit = (b: BoardState) => {
    setLocal(b);
    setStoreBoard(b);
  };
  const change = (fn: (b: BoardState) => BoardState) => {
    pushHistory();
    commit(fn(board));
  };

  const pt = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const r = p.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: clamp(r.x, 0, w), y: clamp(r.y, 0, h) };
  };

  const nextLabel = (kind: ItemKind) => {
    if (!['own', 'rival', 'gk'].includes(kind)) return kind === 'joker' ? 'C' : undefined;
    if (kind === 'gk') return '1';
    const used = board.items.filter((i) => i.kind === kind).map((i) => Number(i.label) || 0);
    let n = 2;
    while (used.includes(n)) n++;
    return String(n);
  };

  const onBgDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = pt(e);
    if (tool.t === 'place') {
      const item: BoardItem = { id: uid('it'), kind: tool.kind, x: p.x, y: p.y, label: nextLabel(tool.kind), rot: 0 };
      change((b) => ({ ...b, items: [...b.items, item] }));
      setSel({ kind: 'item', id: item.id });
      drag.current = { type: 'item', id: item.id, dx: 0, dy: 0 };
      return;
    }
    if (tool.t === 'draw') {
      pushHistory();
      const line: BoardLine = { id: uid('ln'), kind: tool.kind, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color };
      setLocal((b) => ({ ...b, lines: [...b.lines, line] }));
      drag.current = { type: 'draw', id: line.id };
      setSel({ kind: 'line', id: line.id });
      return;
    }
    setSel(null);
  };

  const onItemDown = (e: React.PointerEvent, it: BoardItem) => {
    if (tool.t === 'draw') return; // permite dibujar empezando sobre un jugador
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = pt(e);
    pushHistory();
    setSel({ kind: 'item', id: it.id });
    drag.current = { type: 'item', id: it.id, dx: p.x - it.x, dy: p.y - it.y };
  };

  const onLineDown = (e: React.PointerEvent, l: BoardLine) => {
    if (tool.t !== 'select') return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = pt(e);
    pushHistory();
    setSel({ kind: 'line', id: l.id });
    drag.current = { type: 'line', id: l.id, sx: p.x, sy: p.y, orig: { ...l } };
  };

  const onHandleDown = (e: React.PointerEvent, id: string, hnd: 'p1' | 'p2' | 'c') => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    pushHistory();
    drag.current = { type: 'handle', id, h: hnd };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = pt(e);
    setLocal((b) => {
      if (d.type === 'item') return { ...b, items: b.items.map((i) => (i.id === d.id ? { ...i, x: clamp(p.x - d.dx, 0, w), y: clamp(p.y - d.dy, 0, h) } : i)) };
      if (d.type === 'draw') return { ...b, lines: b.lines.map((l) => (l.id === d.id ? { ...l, x2: p.x, y2: p.y } : l)) };
      if (d.type === 'line') {
        const dx = p.x - d.sx, dy = p.y - d.sy, o = d.orig;
        return { ...b, lines: b.lines.map((l) => (l.id === d.id ? { ...l, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy, cx: o.cx !== undefined ? o.cx + dx : undefined, cy: o.cy !== undefined ? o.cy + dy : undefined } : l)) };
      }
      return {
        ...b,
        lines: b.lines.map((l) => {
          if (l.id !== d.id) return l;
          if (d.h === 'p1') return { ...l, x1: p.x, y1: p.y };
          if (d.h === 'p2') return { ...l, x2: p.x, y2: p.y };
          return { ...l, cx: p.x, cy: p.y };
        }),
      };
    });
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const b = boardRef.current;
    let nb = b;
    if (d.type === 'draw') {
      const l = b.lines.find((x) => x.id === d.id);
      if (l && Math.hypot(l.x2 - l.x1, l.y2 - l.y1) < 14) {
        nb = { ...b, lines: b.lines.filter((x) => x.id !== d.id) };
        setSel(null);
      } else if (l && l.kind === 'curve') {
        const c = defaultControl(l.x1, l.y1, l.x2, l.y2);
        nb = { ...b, lines: b.lines.map((x) => (x.id === d.id ? { ...x, ...c } : x)) };
      }
    }
    commit(nb);
  };

  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((hh) => hh.slice(0, -1));
    commit(prev);
    setSel(null);
  };
  const del = () => {
    if (!sel) return;
    change((b) => (sel.kind === 'item' ? { ...b, items: b.items.filter((i) => i.id !== sel.id) } : { ...b, lines: b.lines.filter((l) => l.id !== sel.id) }));
    setSel(null);
  };
  const rotate = () => sel?.kind === 'item' && change((b) => ({ ...b, items: b.items.map((i) => (i.id === sel.id ? { ...i, rot: ((i.rot ?? 0) + 45) % 360 } : i)) }));
  const setBg = (bg: BoardBackground) => {
    const { w: nw, h: nh } = BG_SIZE[bg];
    change((b) => ({
      background: bg,
      items: b.items.map((i) => ({ ...i, x: clamp(i.x, 10, nw - 10), y: clamp(i.y, 10, nh - 10) })),
      lines: b.lines,
    }));
  };

  const selItem = sel?.kind === 'item' ? board.items.find((i) => i.id === sel.id) : undefined;
  const selLine = sel?.kind === 'line' ? board.lines.find((l) => l.id === sel.id) : undefined;

  const exportPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-ui]').forEach((n) => n.remove());
    clone.setAttribute('width', String(w * 2));
    clone.setAttribute('height', String(h * 2));
    const src = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w * 2;
      c.height = h * 2;
      c.getContext('2d')!.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `pizarra-${todayISO()}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  };

  const toolBtn = (tl: Tool, icon: React.ReactNode, label: string) => {
    const active = tool.t === tl.t && (tl.t === 'select' || (tool as { kind: string }).kind === (tl as { kind: string }).kind);
    return (
      <IconBtn label={label} active={active} onClick={() => setTool(tl)}>
        {icon}
      </IconBtn>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Fondo */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pt-2">
        {(Object.keys(BG_SIZE) as BoardBackground[]).map((bg) => (
          <button key={bg} onClick={() => setBg(bg)} className={cx('shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold', board.background === bg ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-800 text-slate-400')}>
            {BG_SIZE[bg].label}
          </button>
        ))}
      </div>
      {/* Herramientas */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 py-2">
        {toolBtn({ t: 'select' }, <Hand size={17} />, 'Mover / seleccionar')}
        <span className="mx-0.5 h-6 w-px bg-slate-800" />
        {toolBtn({ t: 'draw', kind: 'run' }, <MoveUpRight size={17} />, 'Conducción (línea continua)')}
        {toolBtn({ t: 'draw', kind: 'pass' }, <ArrowUpRight size={17} strokeDasharray="3 3" />, 'Pase / desplazamiento (discontinua)')}
        {toolBtn({ t: 'draw', kind: 'curve' }, <Spline size={17} />, 'Flecha curva')}
        {toolBtn({ t: 'draw', kind: 'zone' }, <Square size={17} />, 'Zona de presión')}
        <div className="flex gap-1 rounded-xl border border-slate-800 p-1">
          {LINE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (selLine) change((b) => ({ ...b, lines: b.lines.map((l) => (l.id === selLine.id ? { ...l, color: c } : l)) }));
              }}
              className={cx('h-5 w-5 rounded-full border-2', color === c ? 'border-white' : 'border-transparent')}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <span className="mx-0.5 h-6 w-px bg-slate-800" />
        <IconBtn label="Deshacer" onClick={undo}>
          <Undo2 size={17} />
        </IconBtn>
        <IconBtn label="Rotar seleccionado" onClick={rotate}>
          <RotateCw size={17} />
        </IconBtn>
        <IconBtn label="Eliminar seleccionado" onClick={del}>
          <Eraser size={17} />
        </IconBtn>
        <IconBtn
          label="Limpiar pizarra"
          onClick={() => {
            if (confirm('¿Vaciar la pizarra?')) {
              change((b) => ({ ...b, items: [], lines: [] }));
              setSel(null);
            }
          }}
        >
          <Trash2 size={17} />
        </IconBtn>
        <IconBtn label="Descargar PNG" onClick={exportPNG}>
          <Download size={17} />
        </IconBtn>
      </div>
      {/* Paleta de elementos */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2">
        {PALETTE.map((k) => {
          const active = tool.t === 'place' && tool.kind === k;
          return (
            <button
              key={k}
              onClick={() => setTool(active ? { t: 'select' } : { t: 'place', kind: k })}
              className={cx('flex shrink-0 items-center gap-1.5 rounded-xl border px-2 py-1', active ? 'border-emerald-500 bg-emerald-500/15' : 'border-slate-800 bg-slate-900')}
            >
              <svg viewBox="-30 -30 60 60" className="h-6 w-6">
                <g transform={k === 'ladder' ? 'scale(.45)' : k === 'goal' ? 'scale(.6)' : undefined}>
                  <ItemShape item={{ id: 'p', kind: k, x: 0, y: 0, label: k === 'joker' ? 'C' : k === 'own' || k === 'rival' || k === 'gk' ? '' : undefined }} />
                </g>
              </svg>
              <span className={cx('text-[11px] font-semibold', active ? 'text-emerald-300' : 'text-slate-300')}>{ITEM_META[k].label}</span>
            </button>
          );
        })}
      </div>

      {/* Lienzo */}
      <div className="relative min-h-0 flex-1 px-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none select-none"
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <Markers prefix={mk} />
          <g onPointerDown={onBgDown}>
            <PitchBackground bg={board.background} />
          </g>
          {[...board.lines.filter((l) => l.kind === 'zone'), ...board.lines.filter((l) => l.kind !== 'zone')].map((l) => (
            <g key={l.id} onPointerDown={(e) => (tool.t === 'select' ? onLineDown(e, l) : onBgDown(e))} style={{ cursor: tool.t === 'select' ? 'move' : 'crosshair' }}>
              <LineShape line={l} markerPrefix={mk} selected={sel?.id === l.id} />
              {l.kind !== 'zone' && (
                <path
                  d={l.kind === 'curve' ? `M ${l.x1} ${l.y1} Q ${l.cx ?? defaultControl(l.x1, l.y1, l.x2, l.y2).cx} ${l.cy ?? defaultControl(l.x1, l.y1, l.x2, l.y2).cy} ${l.x2} ${l.y2}` : `M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
                  stroke="transparent"
                  strokeWidth={26}
                  fill="none"
                  data-ui
                />
              )}
            </g>
          ))}
          {board.items.map((it) => (
            <g key={it.id} onPointerDown={(e) => (tool.t === 'draw' ? onBgDown(e) : onItemDown(e, it))} style={{ cursor: 'grab' }}>
              <ItemShape item={it} selected={sel?.id === it.id} />
              <circle cx={it.x} cy={it.y} r={Math.max(22, ITEM_META[it.kind].r)} fill="transparent" data-ui />
            </g>
          ))}
          {selLine && tool.t === 'select' && (
            <g data-ui>
              {(['p1', 'p2', ...(selLine.kind === 'curve' ? ['c'] : [])] as ('p1' | 'p2' | 'c')[]).map((hh) => {
                const c = hh === 'c' ? { x: selLine.cx ?? defaultControl(selLine.x1, selLine.y1, selLine.x2, selLine.y2).cx, y: selLine.cy ?? defaultControl(selLine.x1, selLine.y1, selLine.x2, selLine.y2).cy } : hh === 'p1' ? { x: selLine.x1, y: selLine.y1 } : { x: selLine.x2, y: selLine.y2 };
                return <circle key={hh} cx={c.x} cy={c.y} r={hh === 'c' ? 13 : 11} fill={hh === 'c' ? '#facc15' : '#fff'} stroke="#0f172a" strokeWidth={3} onPointerDown={(e) => onHandleDown(e, selLine.id, hh)} style={{ cursor: 'pointer' }} />;
              })}
            </g>
          )}
        </svg>
        {tool.t !== 'select' && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            {tool.t === 'place' ? `Toca el campo para colocar: ${ITEM_META[tool.kind].label}` : 'Arrastra sobre el campo para dibujar'}
          </div>
        )}
      </div>

      {/* Barra inferior: propiedades + guardar */}
      <div className="flex items-center gap-2 border-t border-slate-900 px-3 py-2">
        {selItem && ['own', 'rival', 'joker', 'gk'].includes(selItem.kind) ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Dorsal</span>
            <input
              value={selItem.label ?? ''}
              onChange={(e) => commit({ ...board, items: board.items.map((i) => (i.id === selItem.id ? { ...i, label: e.target.value.slice(0, 2) } : i)) })}
              className="w-12 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
            />
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">
            {board.items.length} elementos · {board.lines.length} trazos{meta.editingExerciseId ? ' · editando ejercicio' : ''}
          </span>
        )}
        <Btn className="ml-auto" small onClick={() => setSaveOpen(true)}>
          <Save size={15} /> Guardar
        </Btn>
      </div>

      <SaveBoardSheet open={saveOpen} onClose={() => setSaveOpen(false)} board={board} />
    </div>
  );
}

function SaveBoardSheet({ open, onClose, board }: { open: boolean; onClose: () => void; board: BoardState }) {
  const folders = useStore((s) => s.folders);
  const exercises = useStore((s) => s.exercises);
  const meta = useStore((s) => s.boardMeta);
  const upsertExercise = useStore((s) => s.upsertExercise);
  const toast = useStore((s) => s.toast);
  const editing = exercises.find((e) => e.id === meta.editingExerciseId);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState(folders[0]?.id ?? '');
  const [objective, setObjective] = useState('');
  const [dims, setDims] = useState('');
  const [sendEx, setSendEx] = useState<Exercise | null>(null);

  const playersCount = board.items.filter((i) => ['own', 'rival', 'joker', 'gk'].includes(i.kind)).length;
  const own = board.items.filter((i) => i.kind === 'own').length;
  const riv = board.items.filter((i) => i.kind === 'rival').length;
  const jok = board.items.filter((i) => i.kind === 'joker').length;
  const material = [
    board.items.some((i) => i.kind === 'cone') && 'Conos',
    board.items.some((i) => i.kind === 'pole') && 'Picas',
    board.items.some((i) => i.kind === 'ladder') && 'Escalera de coordinación',
    board.items.some((i) => i.kind === 'minigoal') && 'Miniporterías',
    board.items.some((i) => i.kind === 'goal') && 'Porterías',
    board.items.some((i) => i.kind === 'ball') && 'Balones',
    (own || riv) && 'Petos',
  ].filter(Boolean) as string[];

  const build = (): Exercise => ({
    id: uid('e'),
    folderId,
    name: name.trim(),
    objective: objective.trim() || 'Diseñado en la pizarra táctica',
    players: `${own}v${riv}${jok ? `+${jok}` : ''}`,
    playersCount,
    dimensions: dims.trim() || BG_SIZE[board.background].label,
    material,
    rules: '',
    variants: [],
    series: 3,
    workMin: 4,
    restMin: 1,
    intensity: 'Media',
    board: JSON.parse(JSON.stringify(board)),
    createdAt: todayISO(),
  });

  const save = (thenSend: boolean) => {
    const ex = build();
    upsertExercise(ex);
    toast('Guardado como nuevo ejercicio en la Biblioteca');
    setName('');
    if (thenSend) setSendEx(ex);
    else onClose();
  };

  return (
    <>
      <Sheet
        open={open && !sendEx}
        onClose={onClose}
        title="Guardar diseño"
        footer={
          <div className="space-y-2">
            {editing && (
              <Btn
                tone="subtle"
                className="w-full"
                onClick={() => {
                  upsertExercise({ ...editing, board: JSON.parse(JSON.stringify(board)) });
                  toast(`Diagrama actualizado: ${editing.name}`);
                  onClose();
                }}
              >
                Actualizar «{editing.name}»
              </Btn>
            )}
            <div className="flex gap-2">
              <Btn tone="ghost" className="flex-1" disabled={!name.trim()} onClick={() => save(true)}>
                Guardar + asociar a día
              </Btn>
              <Btn className="flex-1" disabled={!name.trim()} onClick={() => save(false)}>
                Guardar en Biblioteca
              </Btn>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Detectado: {playersCount} jugadores ({own} propios, {riv} rivales{jok ? `, ${jok} comodines` : ''}) · Material: {material.join(', ') || '—'}
          </p>
          <Field label="Nombre del ejercicio">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Salida de balón vs presión 4-4-2" />
          </Field>
          <Field label="Carpeta">
            <Select value={folderId} onChange={setFolderId} options={folders.map((f) => ({ value: f.id, label: f.name }))} />
          </Field>
          <Field label="Objetivo">
            <TextArea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </Field>
          <Field label="Dimensiones">
            <Input value={dims} onChange={(e) => setDims(e.target.value)} placeholder="Ej. 40x30 m" />
          </Field>
        </div>
      </Sheet>
      <SendToSession
        exercise={sendEx}
        open={!!sendEx}
        onClose={() => {
          setSendEx(null);
          onClose();
        }}
      />
    </>
  );
}
