import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FastForward, Pause, Play, Rewind } from 'lucide-react';
import { clamp, cx, fmtTime } from '../lib/utils';

export interface PlayerHandle {
  seek: (t: number) => void;
  time: () => number;
  pause: () => void;
}

export interface Marker {
  t: number;
  color: string;
  id: string;
}

interface Props {
  src?: string;
  duration: number;
  markers?: Marker[];
  onTime?: (t: number) => void;
  onDuration?: (d: number) => void;
  label?: string;
  seed?: number;
}

/**
 * Reproductor unificado: vídeo real (MP4 / archivo local) o "partido simulado" (animación táctica
 * generada en SVG, sirve de vídeo de prueba sin conexión).
 */
const VideoPlayer = forwardRef<PlayerHandle, Props>(function VideoPlayer({ src, duration, markers = [], onTime, onDuration, label, seed = 1 }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [dur, setDur] = useState(duration);
  const raf = useRef<number>();
  const last = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => setDur(duration), [duration]);
  useEffect(() => {
    setT(0);
    tRef.current = 0;
    setPlaying(false);
  }, [src]);

  const update = useCallback(
    (nt: number) => {
      tRef.current = nt;
      setT(nt);
      onTime?.(nt);
    },
    [onTime],
  );

  // reloj simulado
  useEffect(() => {
    if (src || !playing) return;
    last.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      const nt = Math.min(dur, tRef.current + dt * speed);
      update(nt);
      if (nt >= dur) setPlaying(false);
      else raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, speed, src, dur, update]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  const seek = useCallback(
    (nt: number) => {
      const v = clamp(nt, 0, dur);
      if (src && videoRef.current) videoRef.current.currentTime = v;
      update(v);
    },
    [src, dur, update],
  );

  const toggle = () => {
    if (src && videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => undefined);
      else videoRef.current.pause();
    } else {
      if (tRef.current >= dur) seek(0);
      setPlaying((p) => !p);
    }
  };

  useImperativeHandle(ref, () => ({
    seek,
    time: () => tRef.current,
    pause: () => {
      videoRef.current?.pause();
      setPlaying(false);
    },
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
      <div className="relative aspect-video w-full" onClick={toggle}>
        {src ? (
          <video
            ref={videoRef}
            src={src}
            playsInline
            className="h-full w-full bg-black object-contain"
            onTimeUpdate={(e) => update(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDur(e.currentTarget.duration);
              onDuration?.(e.currentTarget.duration);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <SimulatedMatch t={t} seed={seed} />
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex gap-1.5">
          <span className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-300">{fmtTime(t)}</span>
          {label && <span className="max-w-[220px] truncate rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-slate-200">{label}</span>}
          {!src && <span className="rounded bg-amber-500/80 px-1.5 py-0.5 text-[10px] font-bold text-black">SIMULADO</span>}
        </div>
        {!playing && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white">
              <Play size={26} />
            </span>
          </div>
        )}
      </div>
      {/* barra de tiempo con marcadores */}
      <div className="px-3 pt-2">
        <div
          className="relative h-6 cursor-pointer touch-none"
          onPointerDown={(e) => {
            const el = e.currentTarget;
            el.setPointerCapture(e.pointerId);
            const r = el.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * dur);
          }}
          onPointerMove={(e) => {
            if (!e.buttons) return;
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * dur);
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-800" />
          <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-500" style={{ width: `${(t / (dur || 1)) * 100}%` }} />
          {markers.map((m) => (
            <span key={m.id} className="absolute top-0 h-6 w-1 -translate-x-1/2 rounded-full" style={{ left: `${(m.t / (dur || 1)) * 100}%`, background: m.color }} />
          ))}
          <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-white" style={{ left: `${(t / (dur || 1)) * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
        <button className="text-slate-300" onClick={() => seek(t - 5)} aria-label="-5s">
          <Rewind size={18} />
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-slate-950" onClick={toggle} aria-label="Play/Pausa">
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="text-slate-300" onClick={() => seek(t + 5)} aria-label="+5s">
          <FastForward size={18} />
        </button>
        <span className="font-mono text-xs text-slate-400">
          {fmtTime(t)} / {fmtTime(dur)}
        </span>
        <div className="ml-auto flex gap-1">
          {[1, 2, 4, 8].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', speed === s ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400')}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;

/** Animación procedural de un partido (22 jugadores + balón) en función del tiempo. */
function SimulatedMatch({ t, seed }: { t: number; seed: number }) {
  const W = 1050, H = 680;
  const base = [
    [60, 340], [200, 120], [190, 270], [190, 410], [200, 560], [360, 200], [340, 340], [360, 480], [520, 140], [540, 340], [520, 540],
  ];
  const phase = Math.sin(t / 23 + seed) * 120; // bascula atacando / defendiendo
  const ball = {
    x: W / 2 + Math.sin(t / 7 + seed) * 330 + Math.sin(t / 2.3) * 60,
    y: H / 2 + Math.cos(t / 5.3 + seed * 2) * 230 + Math.sin(t / 1.7) * 30,
  };
  const pl = (team: 0 | 1) =>
    base.map(([bx, by], i) => {
      const k = i + team * 11 + seed;
      const x0 = team === 0 ? bx + (i ? phase : 0) : W - bx + (i ? phase : 0);
      const pull = i ? 0.18 : 0.05;
      const x = x0 + (ball.x - x0) * pull + Math.sin(t / (3 + (k % 5)) + k) * 18;
      const y = by + (ball.y - by) * pull + Math.cos(t / (2.5 + (k % 4)) + k) * 16;
      return { x, y, n: [1, 2, 4, 5, 3, 6, 8, 10, 7, 9, 11][i] };
    });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <rect width={W} height={H} fill="#166534" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={(W / 12) * i} width={W / 12} height={H} fill={i % 2 ? '#15803d' : '#166534'} />
      ))}
      <g fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={3}>
        <rect x={15} y={15} width={W - 30} height={H - 30} />
        <line x1={W / 2} y1={15} x2={W / 2} y2={H - 15} />
        <circle cx={W / 2} cy={H / 2} r={86} />
        <rect x={15} y={H / 2 - 190} width={155} height={380} />
        <rect x={W - 170} y={H / 2 - 190} width={155} height={380} />
        <rect x={15} y={H / 2 - 86} width={52} height={172} />
        <rect x={W - 67} y={H / 2 - 86} width={52} height={172} />
      </g>
      {pl(0).map((p, i) => (
        <g key={'a' + i}>
          <circle cx={p.x} cy={p.y} r={15} fill={i === 0 ? '#a855f7' : '#111827'} stroke="#10b981" strokeWidth={3} />
          <text x={p.x} y={p.y + 5} fontSize={13} fontWeight={800} textAnchor="middle" fill="#fff">
            {p.n}
          </text>
        </g>
      ))}
      {pl(1).map((p, i) => (
        <circle key={'b' + i} cx={p.x} cy={p.y} r={15} fill={i === 0 ? '#f59e0b' : '#dc2626'} stroke="#fff" strokeWidth={2} />
      ))}
      <circle cx={ball.x} cy={ball.y} r={8} fill="#fff" stroke="#000" strokeWidth={2} />
    </svg>
  );
}
