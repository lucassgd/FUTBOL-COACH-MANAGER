export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Normaliza texto para búsquedas: minúsculas, sin tildes, sin signos. */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s+.x-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------- Fechas (siempre en hora local, formato ISO yyyy-mm-dd) ----------------
export const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const mondayOf = (iso: string) => {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return toISO(d);
};
export const todayISO = () => toISO(new Date());

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtShort = (iso: string) => {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const daysBetween = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Interpreta un tiempo escrito por el entrenador: "12:34" (min:seg), "1:02:03" (h:min:seg),
 * "12" o "12,5" (minutos), "12m30s". Devuelve segundos o null si no se entiende.
 */
export const parseTime = (raw: string): number | null => {
  const s = raw.trim().toLowerCase().replace(',', '.').replace(/[’'′]/g, ':').replace(/["″]/g, '');
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 60);
  const parts = s.split(':');
  if (parts.length >= 2 && parts.length <= 3 && parts.every((p) => /^\d+$/.test(p))) {
    const n = parts.map(Number);
    if (n.slice(1).some((x) => x >= 60)) return null;
    return n.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2];
  }
  const m = s.match(/^(?:(\d+)h)?\s*(?:(\d+)m(?:in)?)?\s*(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) return +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0);
  return null;
};
