/** Utilidades para reproducir vídeos de YouTube con la IFrame Player API. */

/** Devuelve el ID de un vídeo de YouTube a partir de cualquier enlace habitual, o null. */
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const s = url.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
    if (host === 'youtu.be') return valid(u.pathname.slice(1).split('/')[0]);
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return valid(u.searchParams.get('v')!);
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* no es una URL */
  }
  return null;
}
const valid = (id: string) => (/^[\w-]{11}$/.test(id) ? id : null);

/** Segundo de inicio indicado en el enlace (?t=90 o ?t=1m30s), o 0. */
export function youtubeStart(url?: string): number {
  if (!url) return 0;
  try {
    const t = new URL(url.trim()).searchParams.get('t') ?? new URL(url.trim()).searchParams.get('start');
    if (!t) return 0;
    if (/^\d+$/.test(t)) return +t;
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    return m ? (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0) : 0;
  } catch {
    return 0;
  }
}

export const isPlayableUrl = (url: string) => !!youtubeId(url) || /^https?:\/\//.test(url.trim());

// ---- Carga única del script de la API ----
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<any> | null = null;
export function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error('No se pudo cargar YouTube'));
    };
    document.head.appendChild(s);
  });
  return loading;
}
