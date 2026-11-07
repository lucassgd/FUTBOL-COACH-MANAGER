import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Analysis, BoardState, Exercise, ExtraSession, Folder, Match, MedDoc, Player, Season, SessionTask, Team, VideoTag, Week,
} from '../types';
import {
  SEED_FOLDERS, SEED_SEASONS, SEED_TEAMS, seedAnalyses, seedDocs, seedExercises, seedMatches, seedPlayers, seedWeeks,
} from '../data/seed';
import { emptyBoard } from '../lib/board';
import { addDays, mondayOf, todayISO, uid } from '../lib/utils';

export type TabKey = 'teams' | 'library' | 'board' | 'planning' | 'medical' | 'analysis';

/** Ubicación de una tarea dentro del microciclo */
export type Slot = 'monday.over' | 'monday.under' | 'tuesday.strength' | 'tuesday.ssg' | 'thursday.tasks';
export const SLOT_LABEL: Record<Slot, string> = {
  'monday.over': 'Lunes · Grupo >60′ (Regeneración)',
  'monday.under': 'Lunes · Grupo <60′ (Compensación)',
  'tuesday.strength': 'Martes · Bloque 1 Fuerza',
  'tuesday.ssg': 'Martes · Bloque 2 SSG',
  'thursday.tasks': 'Jueves · Plan de partido',
};

interface Toast { id: string; text: string; tone: 'ok' | 'warn' }

interface Data {
  teams: Team[];
  seasons: Season[];
  matches: Match[];
  players: Player[];
  folders: Folder[];
  exercises: Exercise[];
  weeks: Record<string, Week>;
  docs: MedDoc[];
  analyses: Analysis[];
  board: BoardState;
  boardMeta: { editingExerciseId?: string };
  activeTeamId: string;
}

interface UI {
  tab: TabKey;
  planWeek: string;
  toasts: Toast[];
  pendingOpen?: { tab: TabKey; id: string };
}

interface Actions {
  setTab: (t: TabKey) => void;
  setPlanWeek: (w: string) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  openIn: (tab: TabKey, id: string) => void;
  clearPending: () => void;
  resetFactory: () => void;
  importData: (d: Partial<Data>) => void;

  // equipos
  addTeam: (name: string, category: string) => string;
  setCurrentTeam: (id: string) => void;
  addSeason: (teamId: string, label: string) => string;
  upsertMatch: (m: Match) => void;
  deleteMatch: (id: string) => void;

  // jugadores
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  addPlayer: (name: string, number: number) => void;
  deletePlayer: (id: string) => void;
  setLastSundayMinutes: (playerId: string, min: number) => void;

  // biblioteca
  addFolder: (name: string, color: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  upsertExercise: (e: Exercise) => void;
  deleteExercise: (id: string) => void;

  // pizarra
  setBoard: (b: BoardState | ((b: BoardState) => BoardState)) => void;
  loadBoard: (b: BoardState, exerciseId?: string) => void;

  // planificación
  ensureWeek: (weekStart: string) => Week;
  updateWeek: (weekStart: string, fn: (w: Week) => Week) => void;
  addTask: (weekStart: string, slot: Slot, t: Omit<SessionTask, 'id'>) => void;
  removeTask: (weekStart: string, slot: Slot, id: string) => void;
  moveTask: (weekStart: string, slot: Slot, id: string, dir: -1 | 1) => void;
  addExtra: (weekStart: string, x: Omit<ExtraSession, 'id'>) => void;
  removeExtra: (weekStart: string, id: string) => void;

  // médico
  addDoc: (d: Omit<MedDoc, 'id' | 'createdAt'>) => void;
  deleteDoc: (id: string) => void;

  // análisis
  upsertAnalysis: (a: Analysis) => void;
  deleteAnalysis: (id: string) => void;
  addTag: (analysisId: string, tag: Omit<VideoTag, 'id'>) => string;
  removeTag: (analysisId: string, tagId: string) => void;
}

export type Store = Data & UI & Actions;

const seedData = (): Data => ({
  teams: SEED_TEAMS.map((t) => ({ ...t })),
  seasons: SEED_SEASONS.map((s) => ({ ...s })),
  matches: seedMatches(),
  players: seedPlayers(),
  folders: SEED_FOLDERS.map((f) => ({ ...f })),
  exercises: seedExercises(),
  weeks: Object.fromEntries(seedWeeks().map((w) => [w.weekStart, w])),
  docs: seedDocs(),
  analyses: seedAnalyses(),
  board: emptyBoard('full'),
  boardMeta: {},
  activeTeamId: 't_metro',
});

export const blankWeek = (weekStart: string, teamId: string): Week => ({
  weekStart,
  teamId,
  monday: { over: [], under: [] },
  tuesday: { strength: [], ssg: [] },
  thursday: { tasks: [] },
  sunday: { rival: '', home: true, kit: 'Negra / Negro / Negro', callTime: '12:30', kickoff: '14:00', venue: '', squad: [], minutes: {}, closed: false },
  extras: [],
  notes: '',
});

const getSlot = (w: Week, slot: Slot): SessionTask[] => {
  const [d, k] = slot.split('.') as [keyof Week, string];
  return (w[d] as unknown as Record<string, SessionTask[]>)[k];
};
const setSlot = (w: Week, slot: Slot, list: SessionTask[]): Week => {
  const [d, k] = slot.split('.') as [keyof Week, string];
  return { ...w, [d]: { ...(w[d] as object), [k]: list } };
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seedData(),
      tab: 'teams',
      planWeek: mondayOf(todayISO()),
      toasts: [],

      setTab: (tab) => set({ tab }),
      setPlanWeek: (planWeek) => set({ planWeek }),
      toast: (text, tone = 'ok') => {
        const id = uid('t');
        set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
        setTimeout(() => get().dismissToast(id), 2600);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      openIn: (tab, id) => set({ tab, pendingOpen: { tab, id } }),
      clearPending: () => set({ pendingOpen: undefined }),
      resetFactory: () => set({ ...seedData(), tab: 'teams', planWeek: mondayOf(todayISO()) }),
      importData: (d) => set({ ...d }),

      addTeam: (name, category) => {
        const id = uid('t');
        set((s) => ({ teams: [...s.teams, { id, name, category, current: false }] }));
        return id;
      },
      setCurrentTeam: (id) => set((s) => ({ activeTeamId: id, teams: s.teams.map((t) => ({ ...t, current: t.id === id })) })),
      addSeason: (teamId, label) => {
        const id = uid('s');
        set((s) => ({ seasons: [...s.seasons, { id, teamId, label, active: false }] }));
        return id;
      },
      upsertMatch: (m) => set((s) => ({ matches: s.matches.some((x) => x.id === m.id) ? s.matches.map((x) => (x.id === m.id ? m : x)) : [...s.matches, m] })),
      deleteMatch: (id) => set((s) => ({ matches: s.matches.filter((m) => m.id !== id) })),

      updatePlayer: (id, patch) => set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      addPlayer: (name, number) =>
        set((s) => ({
          players: [...s.players, { id: uid('p'), name, number, posMain: 'Sin definir (Editable)', posSecondary: 'Sin definir (Editable)', status: 'Disponible', baseMinutes: 0 }],
        })),
      deletePlayer: (id) => set((s) => ({ players: s.players.filter((p) => p.id !== id) })),
      setLastSundayMinutes: (playerId, min) => {
        const w = lastClosedWeek(get());
        if (!w) {
          get().toast('No hay un domingo cerrado al que asignar minutos', 'warn');
          return;
        }
        get().updateWeek(w.weekStart, (wk) => ({
          ...wk,
          sunday: {
            ...wk.sunday,
            squad: wk.sunday.squad.includes(playerId) ? wk.sunday.squad : [...wk.sunday.squad, playerId],
            minutes: { ...wk.sunday.minutes, [playerId]: min },
          },
        }));
      },

      addFolder: (name, color) => set((s) => ({ folders: [...s.folders, { id: uid('f'), name, color }] })),
      renameFolder: (id, name) => set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) })),
      deleteFolder: (id) =>
        set((s) => {
          const fallback = s.folders.find((f) => f.id !== id)?.id;
          return {
            folders: s.folders.filter((f) => f.id !== id),
            exercises: fallback ? s.exercises.map((e) => (e.folderId === id ? { ...e, folderId: fallback } : e)) : s.exercises,
          };
        }),
      upsertExercise: (e) => set((s) => ({ exercises: s.exercises.some((x) => x.id === e.id) ? s.exercises.map((x) => (x.id === e.id ? e : x)) : [e, ...s.exercises] })),
      deleteExercise: (id) => set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),

      setBoard: (b) => set((s) => ({ board: typeof b === 'function' ? b(s.board) : b })),
      loadBoard: (b, exerciseId) => set({ board: JSON.parse(JSON.stringify(b)), boardMeta: { editingExerciseId: exerciseId }, tab: 'board' }),

      ensureWeek: (weekStart) => {
        const s = get();
        if (s.weeks[weekStart]) return s.weeks[weekStart];
        const w = blankWeek(weekStart, s.activeTeamId);
        // Pre-rellenar rival desde el calendario de partidos si existe
        const m = s.matches.find((x) => x.weekStart === weekStart);
        if (m) {
          w.sunday.rival = m.rival;
          w.sunday.home = m.home;
        }
        set((st) => ({ weeks: { ...st.weeks, [weekStart]: w } }));
        return w;
      },
      updateWeek: (weekStart, fn) =>
        set((s) => {
          const w = s.weeks[weekStart] ?? blankWeek(weekStart, s.activeTeamId);
          return { weeks: { ...s.weeks, [weekStart]: fn(w) } };
        }),
      addTask: (weekStart, slot, t) => get().updateWeek(weekStart, (w) => setSlot(w, slot, [...getSlot(w, slot), { ...t, id: uid('tk') }])),
      removeTask: (weekStart, slot, id) => get().updateWeek(weekStart, (w) => setSlot(w, slot, getSlot(w, slot).filter((t) => t.id !== id))),
      moveTask: (weekStart, slot, id, dir) =>
        get().updateWeek(weekStart, (w) => {
          const list = [...getSlot(w, slot)];
          const i = list.findIndex((t) => t.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return w;
          [list[i], list[j]] = [list[j], list[i]];
          return setSlot(w, slot, list);
        }),
      addExtra: (weekStart, x) => get().updateWeek(weekStart, (w) => ({ ...w, extras: [...w.extras, { ...x, id: uid('x') }] })),
      removeExtra: (weekStart, id) => get().updateWeek(weekStart, (w) => ({ ...w, extras: w.extras.filter((x) => x.id !== id) })),

      addDoc: (d) => set((s) => ({ docs: [{ ...d, id: uid('doc'), createdAt: todayISO() }, ...s.docs] })),
      deleteDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),

      upsertAnalysis: (a) => set((s) => ({ analyses: s.analyses.some((x) => x.id === a.id) ? s.analyses.map((x) => (x.id === a.id ? a : x)) : [a, ...s.analyses] })),
      deleteAnalysis: (id) => set((s) => ({ analyses: s.analyses.filter((a) => a.id !== id) })),
      addTag: (analysisId, tag) => {
        const id = uid('tg');
        set((s) => ({
          analyses: s.analyses.map((a) => (a.id === analysisId ? { ...a, tags: [...a.tags, { ...tag, id }].sort((x, y) => x.t - y.t) } : a)),
        }));
        return id;
      },
      removeTag: (analysisId, tagId) => set((s) => ({ analyses: s.analyses.map((a) => (a.id === analysisId ? { ...a, tags: a.tags.filter((t) => t.id !== tagId) } : a)) })),
    }),
    {
      name: 'coach-space-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { toasts: _t, pendingOpen: _p, ...rest } = s;
        void _t;
        void _p;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Partial<Store>;
      },
    },
  ),
);

// ============================ SELECTORES DERIVADOS ============================

/** Semana cerrada más reciente cuyo domingo ya se ha jugado (= "último domingo"). */
export function lastClosedWeek(s: Pick<Data, 'weeks' | 'activeTeamId'>): Week | undefined {
  const today = todayISO();
  return Object.values(s.weeks)
    .filter((w) => w.teamId === s.activeTeamId && w.sunday.closed && addDays(w.weekStart, 6) <= today)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
}

export function totalMinutes(p: Player, weeks: Record<string, Week>, teamId: string) {
  let t = p.baseMinutes;
  for (const w of Object.values(weeks)) if (w.teamId === teamId && w.sunday.closed) t += w.sunday.minutes[p.id] ?? 0;
  return t;
}

export function matchesPlayed(p: Player, weeks: Record<string, Week>, teamId: string) {
  return Object.values(weeks).filter((w) => w.teamId === teamId && w.sunday.closed && (w.sunday.minutes[p.id] ?? 0) > 0).length;
}

export const MONDAY_CUT = 60;

/** División automática del lunes: usa los minutos del domingo anterior a la semana. */
export function mondaySplit(weekStart: string, players: Player[], weeks: Record<string, Week>) {
  const prev = weeks[addDays(weekStart, -7)];
  const minutes = prev?.sunday.minutes ?? {};
  const over: Player[] = [];
  const under: Player[] = [];
  const medical: Player[] = [];
  for (const p of players) {
    if (p.status === 'Lesionado' || p.status === 'Readaptación') {
      medical.push(p);
      continue;
    }
    if ((minutes[p.id] ?? 0) >= MONDAY_CUT) over.push(p);
    else under.push(p);
  }
  const byMin = (a: Player, b: Player) => (minutes[b.id] ?? 0) - (minutes[a.id] ?? 0) || a.number - b.number;
  return { over: over.sort(byMin), under: under.sort(byMin), medical, minutes, source: prev };
}
