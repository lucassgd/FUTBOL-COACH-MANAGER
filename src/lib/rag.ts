/**
 * Motor de recuperación (RAG local simulado) sobre la documentación médica cargada.
 * 1) Trocea cada documento en secciones (por encabezados) o, si no hay estructura (PDF), en párrafos.
 * 2) Clasifica cada fragmento: causas | alertas | ejercicios(fase) | alta | general.
 * 3) Puntúa por coincidencia de términos de la consulta (expandida con sinónimos) usando TF-IDF ligero.
 * 4) Sintetiza una respuesta: causas, alertas/prohibiciones y propuesta de sesión de readaptación.
 */
import type { MedDoc } from '../types';
import { norm } from './utils';

export type SectionKind = 'causas' | 'alertas' | 'ejercicios' | 'alta' | 'general';

export interface Chunk {
  docId: string;
  docTitle: string;
  heading: string;
  kind: SectionKind;
  phase: number | null;
  lines: string[];
  text: string;
}

export interface Proposal {
  name: string;
  dose: string;
  phase: number | null;
  docTitle: string;
}

export interface RagResult {
  query: string;
  matchedDocs: { id: string; title: string; score: number }[];
  causes: { text: string; doc: string }[];
  alerts: { text: string; doc: string; forbidden: boolean }[];
  phases: { phase: number; heading: string; exercises: Proposal[] }[];
  discharge: { text: string; doc: string }[];
  snippets: { heading: string; doc: string; text: string; score: number }[];
}

const SYNONYMS: Record<string, string[]> = {
  pubalgia: ['pubis', 'pubica', 'inguinal', 'groin', 'aductor', 'aductores', 'osteopatia', 'sinfisis'],
  pubis: ['pubalgia', 'inguinal'],
  ingle: ['inguinal', 'pubalgia', 'aductor'],
  aductor: ['aductores', 'pubalgia', 'inguinal'],
  isquio: ['isquiosurales', 'isquiotibiales', 'biceps', 'femoral', 'hamstring'],
  isquios: ['isquiosurales', 'isquiotibiales', 'biceps', 'femoral'],
  isquiotibiales: ['isquiosurales', 'biceps', 'femoral'],
  isquiosurales: ['isquiotibiales', 'biceps', 'femoral'],
  hamstring: ['isquiosurales', 'biceps'],
  tobillo: ['esguince', 'ligamento', 'peroneo', 'astragalino', 'inversion'],
  esguince: ['tobillo', 'ligamento', 'inversion'],
  ligamento: ['esguince'],
  rotura: ['lesion', 'fibrilar'],
  muscular: ['fibrilar', 'rotura'],
};

const STOP = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'con', 'por', 'para', 'un', 'una', 'que', 'se', 'al', 'o', 'es', 'lo', 'como', 'mas', 'su', 'sus', 'sin', 'tras', 'entre', 'hasta', 'grado', 'fase', 'lesion', 'jugador', 'futbol', 'futbolista', 'futbolistas']);

const tokens = (s: string) => norm(s).split(' ').filter((t) => t.length > 2 && !STOP.has(t));

export function classifyHeading(h: string): SectionKind {
  const n = norm(h);
  if (/fase\s*\d/.test(n)) return 'ejercicios';
  if (/(causa|factor|riesgo|mecanismo|etiolog|biomecan)/.test(n)) return 'causas';
  if (/(criterio de alta|criterios de alta|alta|vuelta|retorno)/.test(n)) return 'alta';
  if (/(alerta|control|contraindic|prohib|precauc|evitar)/.test(n)) return 'alertas';
  if (/(fase|ejercicio|readaptac|programa|protocolo de trabajo|progresion|tratamiento|preventivo)/.test(n)) return 'ejercicios';
  return 'general';
}

function classifyLine(l: string): SectionKind {
  const n = norm(l);
  if (/(prohibid|contraindic|evitar|no realizar|no progresar|alerta|precaucion)/.test(n)) return 'alertas';
  if (/(\d+\s*x\s*\d+|series|repeticiones|isometric|excentric|plancha|puente|sentadilla|copenhague|nordico)/.test(n)) return 'ejercicios';
  if (/(causa|factor de riesgo|riesgo|deficit|desequilibrio|debilidad|mecanismo|exceso|sobrecarga)/.test(n)) return 'causas';
  if (/(alta|vuelta al grupo|retorno|simetria)/.test(n)) return 'alta';
  return 'general';
}

const phaseOf = (h: string): number | null => {
  const m = norm(h).match(/fase\s*(\d+)/);
  return m ? Number(m[1]) : null;
};

export function chunkDoc(doc: MedDoc): Chunk[] {
  const lines = doc.content.split(/\r?\n/).map((l) => l.trim());
  const hasHeadings = lines.some((l) => /^#{1,4}\s/.test(l));
  const chunks: Chunk[] = [];

  if (hasHeadings) {
    let cur: Chunk | null = null;
    for (const l of lines) {
      if (!l) continue;
      const h = l.match(/^#{1,4}\s+(.*)$/);
      if (h) {
        if (cur) chunks.push(cur);
        const heading = h[1];
        cur = { docId: doc.id, docTitle: doc.title, heading, kind: classifyHeading(heading), phase: phaseOf(heading), lines: [], text: heading };
        continue;
      }
      if (!cur) cur = { docId: doc.id, docTitle: doc.title, heading: doc.title, kind: 'general', phase: null, lines: [], text: '' };
      const clean = l.replace(/^[-*•·]\s*/, '');
      cur.lines.push(clean);
      cur.text += '\n' + clean;
    }
    if (cur) chunks.push(cur);
    return chunks;
  }

  // Texto plano / PDF: dividir en frases y agrupar por tipo detectado
  const sentences = doc.content
    .replace(/\s+/g, ' ')
    .split(/(?<=[.;:])\s+|•|\s-\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  let group: Chunk | null = null;
  for (const s of sentences) {
    const kind = classifyLine(s);
    const phase = phaseOf(s);
    if (!group || group.kind !== kind || group.lines.length >= 8 || (phase && phase !== group.phase)) {
      if (group) chunks.push(group);
      group = { docId: doc.id, docTitle: doc.title, heading: phase ? `Fase ${phase}` : labelFor(kind), kind, phase, lines: [], text: '' };
    }
    group.lines.push(s);
    group.text += ' ' + s;
  }
  if (group) chunks.push(group);
  return chunks;
}

const labelFor = (k: SectionKind) =>
  ({ causas: 'Causas y factores de riesgo', alertas: 'Criterios y alertas', ejercicios: 'Ejercicios', alta: 'Criterios de alta', general: 'Información general' })[k];

export function expandQuery(q: string): string[] {
  const base = tokens(q);
  const out = new Set(base);
  for (const t of base) {
    for (const [k, syns] of Object.entries(SYNONYMS)) {
      if (t === k || t.startsWith(k) || k.startsWith(t)) syns.forEach((s) => out.add(s));
    }
  }
  return [...out];
}

/** Parsea "Nombre del ejercicio: 3 x 10" → {name, dose} */
export function parseExercise(line: string): { name: string; dose: string } {
  const m = line.match(/^(.*?)[:：]\s*(.+)$/);
  if (m) return { name: m[1].trim(), dose: m[2].trim() };
  const d = line.match(/(\d+\s*x\s*\d+[^,.;]*|\d+\s*min)/i);
  if (d) return { name: line.replace(d[0], '').replace(/[,;:\s]+$/, '').trim(), dose: d[0].trim() };
  return { name: line, dose: 'Según tolerancia' };
}

export function search(query: string, docs: MedDoc[]): RagResult {
  const terms = expandQuery(query);
  const allChunks = docs.flatMap(chunkDoc);
  const N = allChunks.length || 1;
  const df = new Map<string, number>();
  for (const t of terms) df.set(t, allChunks.filter((c) => norm(c.text).includes(t)).length);

  // Puntuación por documento: título + etiquetas + contenido
  const docScores = docs
    .map((d) => {
      const title = norm(d.title + ' ' + d.tags.join(' '));
      const body = norm(d.content);
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 6;
        const occ = body.split(t).length - 1;
        if (occ) score += Math.log(1 + occ) * Math.log(1 + N / (1 + (df.get(t) ?? 0)));
      }
      return { id: d.id, title: d.title, score: Math.round(score * 10) / 10 };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);

  const empty: RagResult = { query, matchedDocs: [], causes: [], alerts: [], phases: [], discharge: [], snippets: [] };
  if (!docScores.length) return empty;

  // Documentos relevantes: el mejor + los que tengan al menos 45% de su puntuación
  const top = docScores[0].score;
  const relevant = docScores.filter((d) => d.score >= top * 0.45);
  const relIds = new Set(relevant.map((d) => d.id));
  const chunks = allChunks.filter((c) => relIds.has(c.docId));

  const res: RagResult = { ...empty, matchedDocs: relevant };
  const phaseMap = new Map<number, { phase: number; heading: string; exercises: Proposal[] }>();

  for (const c of chunks) {
    if (c.kind === 'causas') c.lines.forEach((l) => res.causes.push({ text: l, doc: c.docTitle }));
    else if (c.kind === 'alertas') c.lines.forEach((l) => res.alerts.push({ text: l, doc: c.docTitle, forbidden: /prohib|contraindic|evitar|no progresar/i.test(norm(l)) }));
    else if (c.kind === 'alta') c.lines.forEach((l) => res.discharge.push({ text: l, doc: c.docTitle }));
    else if (c.kind === 'ejercicios') {
      const ph = c.phase ?? 0;
      if (!phaseMap.has(ph)) phaseMap.set(ph, { phase: ph, heading: c.heading, exercises: [] });
      c.lines.forEach((l) => {
        const { name, dose } = parseExercise(l);
        phaseMap.get(ph)!.exercises.push({ name, dose, phase: c.phase, docTitle: c.docTitle });
      });
    }
    // fragmentos con mayor relevancia para la vista "fuentes"
    const nt = norm(c.text);
    const s = terms.reduce((acc, t) => acc + (nt.includes(t) ? 1 : 0), 0);
    if (s > 0) res.snippets.push({ heading: c.heading, doc: c.docTitle, text: c.lines.slice(0, 3).join(' · '), score: s });
  }
  // Líneas sueltas de secciones generales que contengan alertas (útil para PDFs sin estructura)
  for (const c of chunks.filter((x) => x.kind === 'general')) {
    c.lines.forEach((l) => {
      const k = classifyLine(l);
      if (k === 'alertas') res.alerts.push({ text: l, doc: c.docTitle, forbidden: true });
      if (k === 'causas') res.causes.push({ text: l, doc: c.docTitle });
    });
  }
  res.phases = [...phaseMap.values()].sort((a, b) => a.phase - b.phase);
  res.snippets.sort((a, b) => b.score - a.score).splice(6);
  return res;
}

/** Elige la fase de la propuesta según la fase del jugador ("Fase 2") o la primera disponible. */
export function pickPhase(res: RagResult, playerPhase?: string) {
  if (!res.phases.length) return null;
  const n = playerPhase ? Number(norm(playerPhase).match(/(\d+)/)?.[1]) : NaN;
  return res.phases.find((p) => p.phase === n) ?? res.phases.find((p) => p.phase > 0) ?? res.phases[0];
}
