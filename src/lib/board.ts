import type { BoardBackground, BoardItem, BoardLine, BoardState, ItemKind, LineKind } from '../types';
import { uid } from './utils';

/** Tamaño del lienzo (unidades SVG) para cada fondo. 10 unidades = 1 metro aprox. */
export const BG_SIZE: Record<BoardBackground, { w: number; h: number; label: string }> = {
  full: { w: 680, h: 1050, label: 'Campo completo' },
  half: { w: 680, h: 540, label: 'Medio campo' },
  double: { w: 680, h: 760, label: 'Doble área' },
  grid: { w: 600, h: 600, label: 'Cuadrícula libre' },
};

export const ITEM_META: Record<ItemKind, { label: string; r: number }> = {
  own: { label: 'Propio', r: 17 },
  rival: { label: 'Rival', r: 17 },
  joker: { label: 'Comodín', r: 17 },
  gk: { label: 'Portero', r: 17 },
  cone: { label: 'Cono', r: 11 },
  pole: { label: 'Pica', r: 9 },
  ladder: { label: 'Escalera', r: 30 },
  minigoal: { label: 'Miniportería', r: 22 },
  goal: { label: 'Portería', r: 40 },
  ball: { label: 'Balón', r: 9 },
};

export const LINE_META: Record<LineKind, { label: string }> = {
  run: { label: 'Conducción' },
  pass: { label: 'Pase / sin balón' },
  curve: { label: 'Flecha curva' },
  zone: { label: 'Zona presión' },
};

export const emptyBoard = (background: BoardBackground = 'full'): BoardState => ({ background, items: [], lines: [] });

export const it = (kind: ItemKind, x: number, y: number, label?: string, rot?: number): BoardItem => ({
  id: uid('it'),
  kind,
  x,
  y,
  label,
  rot,
});
export const ln = (kind: LineKind, x1: number, y1: number, x2: number, y2: number, color = '#facc15', c?: [number, number]): BoardLine => ({
  id: uid('ln'),
  kind,
  x1,
  y1,
  x2,
  y2,
  color,
  cx: c?.[0],
  cy: c?.[1],
});

/** Control por defecto para flecha curva: desplazamiento perpendicular al 25% de la longitud. */
export const defaultControl = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  return { cx: mx - dy * 0.25, cy: my + dx * 0.25 };
};

// ----------------- Plantillas de diagrama para los ejercicios precargados -----------------
export type DiagramTemplate = 'rondo' | 'rondo2' | 'strength' | 'ladder' | 'ssg' | 'ssg2' | 'waves' | 'transition' | 'buildup' | 'press' | 'abp' | 'recovery';

export function diagram(t: DiagramTemplate): BoardState {
  switch (t) {
    case 'rondo': {
      const items: BoardItem[] = [];
      const cx = 300, cy = 300, r = 150;
      for (let i = 0; i < 4; i++) items.push(it('cone', cx + Math.cos((i * Math.PI) / 2 + Math.PI / 4) * r * 1.3, cy + Math.sin((i * Math.PI) / 2 + Math.PI / 4) * r * 1.3));
      for (let i = 0; i < 6; i++) items.push(it('own', cx + Math.cos((i * Math.PI) / 3) * r, cy + Math.sin((i * Math.PI) / 3) * r, String(i + 2)));
      items.push(it('rival', cx - 30, cy, '1'), it('rival', cx + 30, cy + 10, '2'), it('joker', cx, cy - 60, 'C'), it('ball', cx + r - 25, cy));
      return { background: 'grid', items, lines: [ln('pass', cx + r, cy, cx + Math.cos(Math.PI / 3 * 2) * r, cy + Math.sin(Math.PI / 3 * 2) * r), ln('zone', cx - 70, cy - 50, cx + 70, cy + 60, '#ef4444')] };
    }
    case 'rondo2': {
      const items: BoardItem[] = [it('cone', 120, 140), it('cone', 480, 140), it('cone', 120, 460), it('cone', 480, 460), it('cone', 300, 140), it('cone', 300, 460)];
      [[180, 200], [240, 380], [380, 220], [420, 400]].forEach(([x, y], i) => items.push(it('own', x, y, String(i + 6))));
      [[200, 300], [400, 300]].forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 1))));
      items.push(it('joker', 300, 300, 'C'), it('joker', 120, 300, 'C'), it('joker', 480, 300, 'C'), it('ball', 190, 215));
      return { background: 'grid', items, lines: [ln('pass', 180, 200, 300, 290), ln('pass', 300, 300, 420, 390), ln('curve', 420, 400, 480, 310, '#38bdf8', [490, 380])] };
    }
    case 'strength': {
      const items: BoardItem[] = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) items.push(it('cone', 120 + i * 120, 140 + j * 160));
      for (let i = 0; i < 4; i++) items.push(it('own', 120 + i * 120, 200, String(i + 2)));
      return { background: 'grid', items, lines: [ln('run', 120, 220, 120, 440, '#22c55e'), ln('run', 240, 220, 240, 440, '#22c55e'), ln('pass', 360, 220, 360, 440), ln('pass', 480, 220, 480, 440)] };
    }
    case 'ladder': {
      const items = [it('ladder', 200, 300, undefined, 90), it('pole', 360, 160), it('pole', 360, 260), it('pole', 360, 360), it('pole', 360, 460), it('cone', 480, 300), it('own', 100, 300, '8'), it('ball', 520, 300)];
      return { background: 'grid', items, lines: [ln('run', 100, 300, 300, 300, '#22c55e'), ln('curve', 340, 160, 380, 460, '#38bdf8', [440, 310]), ln('pass', 380, 460, 480, 310)] };
    }
    case 'ssg': {
      const items: BoardItem[] = [it('minigoal', 300, 70), it('minigoal', 300, 530, undefined, 180)];
      [[200, 200], [400, 220], [300, 330], [180, 420]].forEach(([x, y], i) => items.push(it('own', x, y, String(i + 4))));
      [[260, 160], [420, 330], [220, 300], [360, 460]].forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 14))));
      items.push(it('joker', 60, 300, 'C'), it('joker', 540, 300, 'C'), it('ball', 300, 345));
      return { background: 'grid', items, lines: [ln('pass', 300, 330, 400, 230), ln('run', 400, 220, 330, 100, '#22c55e'), ln('zone', 160, 120, 460, 260, '#ef4444')] };
    }
    case 'ssg2': {
      const items: BoardItem[] = [it('goal', 340, 40), it('goal', 340, 720, undefined, 180), it('gk', 340, 70, '1'), it('gk', 340, 690, '13')];
      [[200, 250], [480, 260], [340, 380], [220, 520], [460, 520]].forEach(([x, y], i) => items.push(it('own', x, y, String(i + 2))));
      [[260, 200], [420, 330], [260, 430], [470, 430], [340, 580]].forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 7))));
      items.push(it('ball', 340, 400));
      return { background: 'double', items, lines: [ln('pass', 340, 380, 200, 260), ln('curve', 200, 250, 300, 110, '#22c55e', [180, 150])] };
    }
    case 'waves': {
      const items: BoardItem[] = [it('goal', 340, 40), it('gk', 340, 70, '1')];
      [[200, 420], [340, 440], [480, 420]].forEach(([x, y], i) => items.push(it('own', x, y, String(i + 9))));
      [[260, 260], [420, 260]].forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 4))));
      items.push(it('cone', 120, 480), it('cone', 560, 480), it('ball', 340, 465));
      return { background: 'half', items, lines: [ln('run', 340, 440, 340, 320, '#22c55e'), ln('pass', 340, 320, 480, 230), ln('curve', 200, 420, 260, 140, '#38bdf8', [140, 260])] };
    }
    case 'transition': {
      const items: BoardItem[] = [it('minigoal', 120, 40), it('minigoal', 560, 40), it('goal', 340, 520, undefined, 180), it('gk', 340, 495, '13')];
      [[220, 220], [340, 250], [460, 220], [340, 140]].forEach(([x, y], i) => items.push(it('own', x, y, String(i + 6))));
      [[260, 330], [420, 330], [340, 380]].forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 2))));
      items.push(it('ball', 340, 270));
      return { background: 'half', items, lines: [ln('zone', 200, 180, 480, 300, '#ef4444'), ln('pass', 340, 250, 120, 60), ln('run', 460, 220, 540, 70, '#22c55e')] };
    }
    case 'buildup': {
      const items: BoardItem[] = [it('goal', 340, 1010, undefined, 180), it('gk', 340, 990, '1')];
      const own: [number, number, string][] = [[200, 900, '4'], [480, 900, '5'], [80, 780, '2'], [600, 780, '3'], [340, 800, '6'], [240, 640, '8'], [440, 640, '10'], [100, 480, '7'], [580, 480, '11'], [340, 420, '9']];
      own.forEach(([x, y, l]) => items.push(it('own', x, y, l)));
      const riv: [number, number][] = [[260, 820], [420, 820], [340, 720], [160, 700], [520, 700], [340, 560]];
      riv.forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 7))));
      items.push(it('ball', 340, 965));
      return { background: 'full', items, lines: [ln('pass', 340, 985, 200, 905), ln('pass', 200, 900, 340, 805), ln('curve', 340, 800, 600, 780, '#38bdf8', [470, 720]), ln('run', 600, 780, 600, 560, '#22c55e')] };
    }
    case 'press': {
      const items: BoardItem[] = [it('goal', 340, 30), it('gk', 340, 60, '1')];
      const riv: [number, number][] = [[200, 150], [480, 150], [80, 260], [600, 260], [340, 230]];
      riv.forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 2))));
      const own: [number, number, string][] = [[340, 120, '9'], [230, 200, '10'], [520, 230, '7'], [140, 300, '11'], [340, 320, '8']];
      own.forEach(([x, y, l]) => items.push(it('own', x, y, l)));
      items.push(it('ball', 470, 170));
      return { background: 'half', items, lines: [ln('zone', 380, 90, 660, 320, '#ef4444'), ln('run', 340, 120, 455, 155, '#22c55e'), ln('run', 520, 230, 490, 175, '#22c55e'), ln('pass', 340, 320, 560, 280)] };
    }
    case 'abp': {
      const items: BoardItem[] = [it('goal', 340, 30), it('gk', 340, 55, '13')];
      const own: [number, number, string][] = [[300, 140, '4'], [380, 150, '5'], [250, 190, '9'], [430, 200, '6'], [340, 260, '8']];
      own.forEach(([x, y, l]) => items.push(it('own', x, y, l)));
      const riv: [number, number][] = [[290, 110], [360, 105], [420, 120], [250, 140], [460, 170], [340, 180]];
      riv.forEach(([x, y], i) => items.push(it('rival', x, y, String(i + 2))));
      items.push(it('own', 660, 20, '10'), it('ball', 650, 30));
      return { background: 'half', items, lines: [ln('curve', 650, 30, 330, 110, '#facc15', [520, 160]), ln('run', 430, 200, 380, 100, '#22c55e'), ln('run', 250, 190, 300, 90, '#22c55e')] };
    }
    case 'recovery':
    default: {
      const items: BoardItem[] = [];
      for (let i = 0; i < 6; i++) items.push(it('cone', 100 + i * 80, 120), it('cone', 100 + i * 80, 480));
      for (let i = 0; i < 5; i++) items.push(it('own', 140 + i * 80, 300, String(i + 14)));
      return { background: 'grid', items, lines: [ln('pass', 100, 140, 500, 140, '#38bdf8'), ln('pass', 500, 460, 100, 460, '#38bdf8')] };
    }
  }
}
