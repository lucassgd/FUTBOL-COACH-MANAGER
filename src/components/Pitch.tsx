import { useId } from 'react';
import type { BoardBackground, BoardItem, BoardLine, BoardState } from '../types';
import { BG_SIZE, defaultControl } from '../lib/board';

export const LINE_COLORS = ['#facc15', '#22c55e', '#38bdf8', '#ef4444', '#f8fafc'];

const S = 9.4; // unidades por metro

function GoalEnd({ y0, dir, w }: { y0: number; dir: 1 | -1; w: number }) {
  const cxm = w / 2;
  const pa = 40.3 * S, pd = 16.5 * S, ga = 18.3 * S, gd = 5.5 * S;
  const spot = y0 + dir * 11 * S;
  const r = 9.15 * S;
  // arco del área: parte del círculo fuera del área
  const dy = pd - 11 * S;
  const ax = Math.sqrt(r * r - dy * dy);
  const ay = y0 + dir * pd;
  const rect = (x: number, y: number, ww: number, hh: number) => <rect x={x} y={dir === 1 ? y : y - hh} width={ww} height={hh} />;
  return (
    <g>
      {rect(cxm - pa / 2, y0, pa, pd)}
      {rect(cxm - ga / 2, y0, ga, gd)}
      <circle cx={cxm} cy={spot} r={3} fill="rgba(255,255,255,.7)" />
      <path d={`M ${cxm - ax} ${ay} A ${r} ${r} 0 0 ${dir === 1 ? 0 : 1} ${cxm + ax} ${ay}`} />
      {/* portería */}
      <rect x={cxm - 3.66 * S} y={dir === 1 ? y0 - 14 : y0} width={7.32 * S} height={14} strokeWidth={3} />
    </g>
  );
}

export function PitchBackground({ bg }: { bg: BoardBackground }) {
  const { w, h } = BG_SIZE[bg];
  const stripes = [];
  const n = bg === 'grid' ? 0 : 10;
  for (let i = 0; i < n; i++) stripes.push(<rect key={i} x={0} y={(h / n) * i} width={w} height={h / n} fill={i % 2 ? '#166534' : '#15803d'} />);
  const m = 20;
  return (
    <g>
      <rect width={w} height={h} fill={bg === 'grid' ? '#0f2a1d' : '#15803d'} />
      {stripes}
      <g fill="none" stroke="rgba(255,255,255,.75)" strokeWidth={2.5}>
        {bg === 'full' && (
          <>
            <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} />
            <line x1={m} y1={h / 2} x2={w - m} y2={h / 2} />
            <circle cx={w / 2} cy={h / 2} r={9.15 * S} />
            <circle cx={w / 2} cy={h / 2} r={3} fill="rgba(255,255,255,.7)" />
            <GoalEnd y0={m} dir={1} w={w} />
            <GoalEnd y0={h - m} dir={-1} w={w} />
          </>
        )}
        {bg === 'half' && (
          <>
            <rect x={m} y={m} width={w - 2 * m} height={h - m - 2} />
            <path d={`M ${w / 2 - 9.15 * S} ${h - 2} A ${9.15 * S} ${9.15 * S} 0 0 1 ${w / 2 + 9.15 * S} ${h - 2}`} />
            <GoalEnd y0={m} dir={1} w={w} />
          </>
        )}
        {bg === 'double' && (
          <>
            <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} />
            <line x1={m} y1={h / 2} x2={w - m} y2={h / 2} strokeDasharray="10 8" />
            <GoalEnd y0={m} dir={1} w={w} />
            <GoalEnd y0={h - m} dir={-1} w={w} />
          </>
        )}
        {bg === 'grid' && (
          <g stroke="rgba(255,255,255,.12)" strokeWidth={1}>
            {Array.from({ length: Math.floor(w / 50) + 1 }, (_, i) => (
              <line key={'v' + i} x1={i * 50} y1={0} x2={i * 50} y2={h} />
            ))}
            {Array.from({ length: Math.floor(h / 50) + 1 }, (_, i) => (
              <line key={'h' + i} x1={0} y1={i * 50} x2={w} y2={i * 50} />
            ))}
          </g>
        )}
      </g>
    </g>
  );
}

export function ItemShape({ item, selected }: { item: BoardItem; selected?: boolean }) {
  const { x, y, kind, label, rot = 0 } = item;
  const sel = selected ? <circle cx={x} cy={y} r={kind === 'goal' ? 46 : kind === 'ladder' ? 40 : 26} fill="none" stroke="#facc15" strokeWidth={3} strokeDasharray="6 4" /> : null;
  const tr = `rotate(${rot} ${x} ${y})`;
  let body: JSX.Element;
  switch (kind) {
    case 'own':
    case 'rival':
    case 'joker':
    case 'gk': {
      const fill = { own: '#2563eb', rival: '#dc2626', joker: '#facc15', gk: '#a855f7' }[kind];
      body = (
        <g>
          <circle cx={x} cy={y + 2} r={17} fill="rgba(0,0,0,.35)" />
          <circle cx={x} cy={y} r={17} fill={fill} stroke="#fff" strokeWidth={2.5} />
          {label && (
            <text x={x} y={y + 5.5} textAnchor="middle" fontSize={15} fontWeight={800} fill={kind === 'joker' ? '#111' : '#fff'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {label}
            </text>
          )}
        </g>
      );
      break;
    }
    case 'cone':
      body = <polygon points={`${x},${y - 12} ${x - 10},${y + 9} ${x + 10},${y + 9}`} fill="#f97316" stroke="#fff" strokeWidth={1.5} />;
      break;
    case 'pole':
      body = (
        <g>
          <ellipse cx={x} cy={y + 12} rx={8} ry={3} fill="rgba(0,0,0,.4)" />
          <rect x={x - 3} y={y - 22} width={6} height={34} rx={2} fill="#facc15" stroke="#111" strokeWidth={1} />
        </g>
      );
      break;
    case 'ladder':
      body = (
        <g transform={tr}>
          <rect x={x - 14} y={y - 50} width={28} height={100} fill="none" stroke="#fde047" strokeWidth={3} />
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={x - 14} x2={x + 14} y1={y - 50 + (i + 1) * (100 / 7)} y2={y - 50 + (i + 1) * (100 / 7)} stroke="#fde047" strokeWidth={2.5} />
          ))}
          <rect x={x - 18} y={y - 54} width={36} height={108} fill="transparent" />
        </g>
      );
      break;
    case 'minigoal':
      body = (
        <g transform={tr}>
          <rect x={x - 22} y={y - 8} width={44} height={16} fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth={3} />
          <path d={`M ${x - 22} ${y} H ${x + 22} M ${x - 11} ${y - 8} V ${y + 8} M ${x} ${y - 8} V ${y + 8} M ${x + 11} ${y - 8} V ${y + 8}`} stroke="rgba(255,255,255,.5)" strokeWidth={1} />
        </g>
      );
      break;
    case 'goal':
      body = (
        <g transform={tr}>
          <rect x={x - 36} y={y - 10} width={72} height={20} fill="rgba(255,255,255,.2)" stroke="#fff" strokeWidth={4} />
          <path d={`M ${x - 36} ${y} H ${x + 36} ${Array.from({ length: 7 }, (_, i) => `M ${x - 36 + (i + 1) * 9} ${y - 10} V ${y + 10}`).join(' ')}`} stroke="rgba(255,255,255,.5)" strokeWidth={1} />
        </g>
      );
      break;
    case 'ball':
    default:
      body = (
        <g>
          <circle cx={x} cy={y} r={9} fill="#fff" stroke="#111" strokeWidth={1.5} />
          <polygon points={`${x},${y - 4} ${x + 4},${y - 1} ${x + 2.5},${y + 4} ${x - 2.5},${y + 4} ${x - 4},${y - 1}`} fill="#111" />
        </g>
      );
  }
  return (
    <g>
      {sel}
      {body}
    </g>
  );
}

export function LineShape({ line, markerPrefix, selected }: { line: BoardLine; markerPrefix: string; selected?: boolean }) {
  const { kind, x1, y1, x2, y2, color } = line;
  const mk = `url(#${markerPrefix}-${color.slice(1)})`;
  const glow = selected ? { filter: 'drop-shadow(0 0 4px #facc15)' } : undefined;
  if (kind === 'zone') {
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    return <rect x={x} y={y} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} rx={10} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2.5} strokeDasharray="10 6" style={glow} />;
  }
  if (kind === 'curve') {
    const c = line.cx !== undefined && line.cy !== undefined ? { cx: line.cx, cy: line.cy } : defaultControl(x1, y1, x2, y2);
    return <path d={`M ${x1} ${y1} Q ${c.cx} ${c.cy} ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={4} markerEnd={mk} strokeLinecap="round" style={glow} />;
  }
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeDasharray={kind === 'pass' ? '12 9' : undefined} markerEnd={mk} strokeLinecap="round" style={glow} />;
}

export function Markers({ prefix }: { prefix: string }) {
  return (
    <defs>
      {LINE_COLORS.map((c) => (
        <marker key={c} id={`${prefix}-${c.slice(1)}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
        </marker>
      ))}
    </defs>
  );
}

/** Vista previa estática de una pizarra (biblioteca, fichas). */
export function BoardPreview({ board, className }: { board: BoardState; className?: string }) {
  const id = useId().replace(/:/g, '');
  const { w, h } = BG_SIZE[board.background];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="xMidYMid meet">
      <Markers prefix={id} />
      <PitchBackground bg={board.background} />
      {board.lines.filter((l) => l.kind === 'zone').map((l) => <LineShape key={l.id} line={l} markerPrefix={id} />)}
      {board.lines.filter((l) => l.kind !== 'zone').map((l) => <LineShape key={l.id} line={l} markerPrefix={id} />)}
      {board.items.map((i) => <ItemShape key={i.id} item={i} />)}
    </svg>
  );
}
