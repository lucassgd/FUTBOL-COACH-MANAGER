// ===================== TIPOS DE DOMINIO — COACH SPACE =====================

export type PlayerStatus = 'Disponible' | 'Sobrecarga' | 'Lesionado' | 'Readaptación';

export const POSITIONS = [
  'Sin definir (Editable)',
  'Portero (POR)',
  'Lateral derecho (LD)',
  'Lateral izquierdo (LI)',
  'Central (DFC)',
  'Mediocentro defensivo (MCD)',
  'Mediocentro (MC)',
  'Mediapunta (MCO)',
  'Extremo derecho (ED)',
  'Extremo izquierdo (EI)',
  'Delantero centro (DC)',
] as const;
export type Position = (typeof POSITIONS)[number];

export interface ProtocolItem {
  id: string;
  name: string;
  dose: string;
  done: boolean;
}

export interface Protocol {
  title: string;
  sourceDocs: string[];
  phase: string;
  alerts: string[];
  items: ProtocolItem[];
  assignedAt: string;
}

export interface Injury {
  diagnosis: string;
  since: string; // ISO date
  expectedReturn: string; // ISO date
  phase: string;
  notes: string;
  protocol?: Protocol;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  posMain: Position;
  posSecondary: Position;
  status: PlayerStatus;
  baseMinutes: number; // minutos acumulados previos a los partidos registrados en la app
  injury?: Injury;
}

// --------- Equipos / Temporadas / Rivales ---------
export type MatchResult = 'V' | 'E' | 'D' | 'P'; // victoria, empate, derrota, pendiente

export interface VideoChapter {
  id: string;
  t: number; // segundos
  label: string;
  note: string;
}

export interface MatchVideo {
  id: string;
  title: string;
  kind: 'salida' | 'abp' | 'tactico' | 'otro';
  url?: string; // mp4 externo opcional; si no, reproductor de análisis simulado
  duration: number; // segundos
  chapters: VideoChapter[];
}

export interface Match {
  id: string;
  seasonId: string;
  round: number;
  rival: string;
  home: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  date: string; // ISO (domingo)
  weekStart: string; // lunes de la semana de partido
  plan: string;
  weaknesses: string;
  videos: MatchVideo[];
}

export interface Season {
  id: string;
  teamId: string;
  label: string; // "2026/2027"
  active: boolean;
}

export interface Team {
  id: string;
  name: string;
  category: string;
  current: boolean;
}

// --------- Pizarra ---------
export type BoardBackground = 'full' | 'half' | 'double' | 'grid';
export type ItemKind = 'own' | 'rival' | 'joker' | 'gk' | 'cone' | 'pole' | 'ladder' | 'minigoal' | 'goal' | 'ball';
export interface BoardItem {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  label?: string;
  rot?: number;
}
export type LineKind = 'run' | 'pass' | 'curve' | 'zone';
export interface BoardLine {
  id: string;
  kind: LineKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx?: number;
  cy?: number;
  color: string;
}
export interface BoardState {
  background: BoardBackground;
  items: BoardItem[];
  lines: BoardLine[];
}

// --------- Biblioteca ---------
export interface Folder {
  id: string;
  name: string;
  color: string;
}

export interface Exercise {
  id: string;
  folderId: string;
  name: string;
  objective: string;
  players: string; // "4v4+3"
  playersCount: number;
  dimensions: string;
  material: string[];
  rules: string;
  variants: string[];
  series: number;
  workMin: number;
  restMin: number;
  intensity: 'Baja' | 'Media' | 'Alta' | 'Máxima';
  board?: BoardState;
  createdAt: string;
}

// --------- Planificación ---------
export interface SessionTask {
  id: string;
  exerciseId?: string;
  title: string;
  minutes: number;
  notes: string;
}

export type DayKey = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';

export interface ExtraSession {
  id: string;
  day: DayKey;
  title: string;
  playerId?: string;
  kind: 'readaptacion' | 'extra';
  items: { name: string; dose: string }[];
}

export interface Week {
  weekStart: string; // ISO lunes
  teamId: string;
  monday: { over: SessionTask[]; under: SessionTask[] };
  tuesday: { strength: SessionTask[]; ssg: SessionTask[] };
  thursday: { tasks: SessionTask[] };
  sunday: {
    rival: string;
    home: boolean;
    kit: string;
    callTime: string;
    kickoff: string;
    venue: string;
    squad: string[];
    minutes: Record<string, number>;
    closed: boolean;
  };
  extras: ExtraSession[];
  notes: string;
}

// --------- Médico / RAG ---------
export interface MedDoc {
  id: string;
  title: string;
  source: string;
  type: 'pdf' | 'texto' | 'precargado';
  tags: string[];
  content: string;
  createdAt: string;
}

// --------- Análisis de vídeo ---------
export type TagType = 'ocasion_gen' | 'ocasion_con' | 'recuperado' | 'perdido';
export interface VideoTag {
  id: string;
  t: number;
  type: TagType;
  playerId: string | null; // null => bloque/equipo
  note: string;
}
/** Recorte de una acción: [a - pre, b + post] segundos. */
export interface VideoClip {
  id: string;
  title: string;
  a: number; // inicio de la acción
  b: number; // final de la acción
  pre: number; // margen antes (s)
  post: number; // margen después (s)
}
export interface Analysis {
  id: string;
  title: string;
  source: 'demo' | 'local' | 'url';
  url?: string;
  fileKey?: string; // clave IndexedDB del vídeo local
  fileName?: string;
  duration: number;
  tags: VideoTag[];
  clips?: VideoClip[];
  createdAt: string;
}
