import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BrainCircuit, CalendarPlus, Check, FileText, FileUp, Loader2, Microscope, Search, ShieldAlert, Sparkles, Trash2, UserCheck } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, Chip, ChipRow, Empty, Field, Input, Segmented, Select, Sheet, TextArea } from '../../components/ui';
import { pickPhase, search, type RagResult } from '../../lib/rag';
import { extractPdfText, structureText } from '../../lib/pdf';
import { addDays, cx, fmtShort, mondayOf, todayISO, uid } from '../../lib/utils';
import type { DayKey } from '../../types';

type Tab = 'consultor' | 'docs';
const QUICK = ['Pubalgia', 'Isquiosurales', 'Esguince de tobillo', 'Dolor inguinal aductores', 'Prevención sprint'];
const STEPS = ['Indexando documentación…', 'Recuperando fragmentos relevantes…', 'Clasificando causas, alertas y ejercicios…', 'Generando propuesta de sesión…'];

export default function MedicalModule() {
  const [tab, setTab] = useState<Tab>('consultor');
  const docs = useStore((s) => s.docs);
  return (
    <div className="px-4 pb-8 pt-3">
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'consultor', label: 'Consultor clínico IA' },
          { value: 'docs', label: `Documentos (${docs.length})` },
        ]}
      />
      {tab === 'consultor' ? <Consultor goDocs={() => setTab('docs')} /> : <Docs />}
    </div>
  );
}

function Consultor({ goDocs }: { goDocs: () => void }) {
  const docs = useStore((s) => s.docs);
  const players = useStore((s) => s.players);
  const pendingOpen = useStore((s) => s.pendingOpen);
  const clearPending = useStore((s) => s.clearPending);
  const [q, setQ] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [res, setRes] = useState<RagResult | null>(null);
  const [step, setStep] = useState(-1);
  const [runId, setRunId] = useState(0);
  const timer = useRef<number>();
  const injured = players.filter((p) => p.status !== 'Disponible');

  const run = (query: string, pid = playerId) => {
    if (!query.trim()) return;
    setQ(query);
    setRes(null);
    setStep(0);
    window.clearInterval(timer.current);
    let i = 0;
    timer.current = window.setInterval(() => {
      i++;
      if (i >= STEPS.length) {
        window.clearInterval(timer.current);
        setStep(-1);
        setRes(search(query, docs));
        setRunId((r) => r + 1);
        void pid;
      } else setStep(i);
    }, 320);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);

  // Apertura desde Enfermería / ficha de jugador
  useEffect(() => {
    if (pendingOpen?.tab === 'medical') {
      const p = players.find((x) => x.id === pendingOpen.id);
      clearPending();
      if (p) {
        setPlayerId(p.id);
        run(p.injury?.diagnosis || 'lesión', p.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen]);

  const player = players.find((p) => p.id === playerId);

  return (
    <div className="mt-3">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
          <BrainCircuit size={18} /> Asistente de diagnóstico funcional
        </div>
        <p className="mt-1 text-xs text-slate-400">Consulta una patología. El motor analiza los {docs.length} documentos cargados y sintetiza causas, alertas y una propuesta de readaptación.</p>
        <form
          className="relative mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. Pubalgia, rotura isquios, esguince…" className="pl-9 pr-20" />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950">
            Analizar
          </button>
        </form>
        <div className="mt-2">
          <ChipRow>
            {QUICK.map((k) => (
              <Chip key={k} active={q === k} onClick={() => run(k)}>
                {k}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <div className="mt-2">
          <Field label="Jugador (opcional, para asignar el protocolo)">
            <Select
              value={playerId}
              onChange={(v) => {
                setPlayerId(v);
                const p = players.find((x) => x.id === v);
                if (p?.injury?.diagnosis) run(p.injury.diagnosis, v);
              }}
              options={[{ value: '', label: '— Sin jugador —' }, ...injured.map((p) => ({ value: p.id, label: `#${p.number} ${p.name} · ${p.injury?.diagnosis ?? p.status}` })), ...players.filter((p) => p.status === 'Disponible').map((p) => ({ value: p.id, label: `#${p.number} ${p.name}` }))]}
            />
          </Field>
        </div>
      </Card>

      {step >= 0 && (
        <Card className="mt-3 space-y-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={cx('flex items-center gap-2 text-xs', i < step ? 'text-emerald-300' : i === step ? 'text-slate-100' : 'text-slate-600')}>
              {i < step ? <Check size={14} /> : i === step ? <Loader2 size={14} className="animate-spin" /> : <span className="w-3.5" />} {s}
            </div>
          ))}
        </Card>
      )}

      {res && !res.matchedDocs.length && (
        <div className="mt-3">
          <Empty icon={<Microscope />} title={`Sin documentación sobre «${res.query}»`} text="Sube un PDF o texto con el protocolo para que el asistente pueda analizarlo." action={<Btn small onClick={goDocs}><FileUp size={14} /> Subir documento</Btn>} />
        </div>
      )}
      {res && res.matchedDocs.length > 0 && <Results key={runId + playerId} res={res} player={player} />}
    </div>
  );
}

function Results({ res, player }: { res: RagResult; player?: ReturnType<typeof useStore.getState>['players'][number] }) {
  const updatePlayer = useStore((s) => s.updatePlayer);
  const addExtra = useStore((s) => s.addExtra);
  const ensureWeek = useStore((s) => s.ensureWeek);
  const toast = useStore((s) => s.toast);
  const setPlanWeek = useStore((s) => s.setPlanWeek);
  const setTab = useStore((s) => s.setTab);
  const initial = pickPhase(res, player?.injury?.phase);
  const [phase, setPhase] = useState<number | null>(initial?.phase ?? null);
  const ph = res.phases.find((p) => p.phase === phase);
  const [items, setItems] = useState(() => (initial?.exercises ?? []).map((e) => ({ ...e, id: uid('pi'), on: true })));
  const [cal, setCal] = useState(false);
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (ph) setItems(ph.exercises.map((e) => ({ ...e, id: uid('pi'), on: true })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const chosen = items.filter((i) => i.on);
  const forbidden = res.alerts.filter((a) => a.forbidden);
  const phaseLabel = ph ? (ph.phase ? `Fase ${ph.phase}` : ph.heading) : 'Propuesta';
  const title = `${phaseLabel} · ${res.matchedDocs[0].title.replace(/^Protocolo de |^Prevención y |^Readaptación de /, '')}`;

  const assign = () => {
    if (!player) return;
    updatePlayer(player.id, {
      status: player.status === 'Disponible' ? 'Readaptación' : player.status,
      injury: {
        diagnosis: player.injury?.diagnosis || res.query,
        since: player.injury?.since || todayISO(),
        expectedReturn: player.injury?.expectedReturn || addDays(todayISO(), 21),
        notes: player.injury?.notes || '',
        phase: ph?.phase ? `Fase ${ph.phase}` : player.injury?.phase || 'Fase 1',
        protocol: {
          title,
          sourceDocs: res.matchedDocs.map((d) => d.title),
          phase: phaseLabel,
          alerts: forbidden.map((a) => a.text.replace(/^PROHIBIDO( en [^:]+)?:\s*/i, '')),
          items: chosen.map((c) => ({ id: uid('pr'), name: c.name, dose: c.dose, done: false })),
          assignedAt: todayISO(),
        },
      },
    });
    toast(`Protocolo asignado a ${player.name}`);
  };

  const createSession = () => {
    const ws = mondayOf(date);
    const dow = (new Date(date + 'T12:00').getDay() + 6) % 7;
    const day = (['L', 'M', 'X', 'J', 'V', 'S', 'D'] as DayKey[])[dow];
    ensureWeek(ws);
    addExtra(ws, {
      day,
      kind: 'readaptacion',
      title: `Readaptación ${phaseLabel}${player ? ` — ${player.name}` : ''}`,
      playerId: player?.id,
      items: chosen.map((c) => ({ name: c.name, dose: c.dose })),
    });
    toast(`Sesión creada el ${fmtShort(date)}`);
    setCal(false);
    setPlanWeek(ws);
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="text-[11px] text-slate-500">
        Documentos analizados:{' '}
        {res.matchedDocs.map((d) => (
          <span key={d.id} className="mr-1 inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
            <FileText size={10} /> {d.title} <b className="text-emerald-400">{d.score}</b>
          </span>
        ))}
      </div>

      <Card>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
          <Microscope size={16} /> 1. Causas biomecánicas y factores de riesgo
        </div>
        {res.causes.length ? (
          <ul className="space-y-1.5">
            {res.causes.map((c, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> {c.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">No se han identificado causas en la documentación.</p>
        )}
      </Card>

      <Card className="border-red-500/30">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-300">
          <ShieldAlert size={16} /> 2. Criterios de control y alertas
        </div>
        <ul className="space-y-1.5">
          {res.alerts.map((a, i) => (
            <li key={i} className={cx('flex gap-2 rounded-lg px-2 py-1.5 text-xs', a.forbidden ? 'bg-red-500/10 text-red-200' : 'text-slate-300')}>
              {a.forbidden ? <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-400" /> : <Check size={13} className="mt-0.5 shrink-0 text-slate-500" />}
              {a.text}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-emerald-500/30">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300">
          <Sparkles size={16} /> 3. Propuesta automática de sesión de readaptación
        </div>
        {player && <p className="mb-2 text-[11px] text-slate-400">Para #{player.number} {player.name} · {player.injury?.phase ?? 'sin fase registrada'} (se propone la fase correspondiente)</p>}
        {res.phases.length > 1 && (
          <ChipRow>
            {res.phases.map((p) => (
              <Chip key={p.phase} active={p.phase === phase} onClick={() => setPhase(p.phase)}>
                {p.phase ? `Fase ${p.phase}` : p.heading}
              </Chip>
            ))}
          </ChipRow>
        )}
        {ph && <div className="mb-1 mt-2 text-[11px] font-semibold text-slate-400">{ph.heading}</div>}
        <div className="space-y-1">
          {items.map((it) => (
            <div key={it.id} className={cx('flex items-center gap-2 rounded-lg border px-2 py-1.5', it.on ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 opacity-50')}>
              <button onClick={() => setItems(items.map((x) => (x.id === it.id ? { ...x, on: !x.on } : x)))} className={cx('grid h-5 w-5 shrink-0 place-items-center rounded border', it.on ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-600')} aria-label="Incluir">
                {it.on && <Check size={12} />}
              </button>
              <span className="min-w-0 flex-1 text-xs">{it.name}</span>
              <input value={it.dose} onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, dose: e.target.value } : x)))} className="w-28 rounded bg-slate-950 px-1.5 py-0.5 text-right font-mono text-[11px] text-slate-300 outline-none" />
            </div>
          ))}
          {!items.length && <p className="text-xs text-slate-500">La documentación no incluye ejercicios para esta fase.</p>}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <Btn disabled={!player || !chosen.length} onClick={assign}>
            <UserCheck size={16} /> Asignar protocolo al jugador lesionado
          </Btn>
          {!player && <p className="-mt-1 text-center text-[10px] text-slate-500">Selecciona un jugador arriba para asignar el protocolo.</p>}
          <Btn tone="ghost" disabled={!chosen.length} onClick={() => setCal(true)}>
            <CalendarPlus size={16} /> Crear sesión de readaptación en calendario
          </Btn>
        </div>
      </Card>

      {res.discharge.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-bold text-sky-300">Criterios de alta / vuelta al grupo</div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
            {res.discharge.map((d, i) => (
              <li key={i}>{d.text}</li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-center text-[10px] text-slate-600">Herramienta de apoyo: las decisiones clínicas corresponden a los servicios médicos.</p>

      <Sheet
        open={cal}
        onClose={() => setCal(false)}
        title="Crear sesión de readaptación"
        footer={
          <div className="flex gap-2">
            <Btn tone="ghost" className="flex-1" onClick={() => { createSession(); setTab('planning'); }}>
              Crear y abrir plan
            </Btn>
            <Btn className="flex-1" onClick={createSession}>
              Crear sesión
            </Btn>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Día de la sesión">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            {[0, 1, 2].map((d) => (
              <button key={d} onClick={() => setDate(addDays(todayISO(), d))} className="flex-1 rounded-lg bg-slate-800 py-1.5 text-xs font-semibold">
                {d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'Pasado'}
              </button>
            ))}
          </div>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-300">
            {chosen.map((c) => (
              <li key={c.id}>
                {c.name} — <span className="font-mono text-slate-400">{c.dose}</span>
              </li>
            ))}
          </ol>
        </div>
      </Sheet>
    </div>
  );
}

function Docs() {
  const docs = useStore((s) => s.docs);
  const addDoc = useStore((s) => s.addDoc);
  const deleteDoc = useStore((s) => s.deleteDoc);
  const toast = useStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const doc = docs.find((d) => d.id === view);
  const totalKB = useMemo(() => Math.round(docs.reduce((a, d) => a + d.content.length, 0) / 1024), [docs]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      try {
        const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        const content = isPdf ? await extractPdfText(f) : structureText(await f.text());
        if (content.trim().length < 20) throw new Error('vacío');
        const name = f.name.replace(/\.(pdf|txt|md)$/i, '');
        addDoc({ title: name, source: f.name, type: isPdf ? 'pdf' : 'texto', tags: name.toLowerCase().split(/[\s_-]+/).filter((t) => t.length > 3), content });
        toast(`«${name}» indexado (${Math.round(content.length / 1024)} KB de texto)`);
      } catch {
        toast(`No se pudo leer texto de ${f.name}`, 'warn');
      }
    }
    setBusy(false);
  };

  return (
    <div className="mt-3 space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-6 text-center"
      >
        {busy ? <Loader2 className="animate-spin text-emerald-400" /> : <FileUp className="text-emerald-400" />}
        <p className="mt-2 text-sm font-semibold">{busy ? 'Extrayendo texto…' : 'Subir artículos científicos (PDF, TXT, MD)'}</p>
        <p className="text-[11px] text-slate-500">El texto se extrae en el dispositivo y se indexa para el consultor.</p>
        <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,application/pdf,text/plain" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
      </div>
      <Btn tone="subtle" small onClick={() => setPaste(true)}>
        <FileText size={14} /> Pegar texto de un protocolo
      </Btn>
      <div className="text-[11px] text-slate-500">{docs.length} documentos · {totalKB} KB indexados</div>
      {docs.map((d) => (
        <Card key={d.id} onClick={() => setView(d.id)} className="flex items-center gap-3">
          <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-black', d.type === 'pdf' ? 'bg-red-500/20 text-red-300' : d.type === 'texto' ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300')}>
            {d.type === 'pdf' ? 'PDF' : d.type === 'texto' ? 'TXT' : 'BASE'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{d.title}</div>
            <div className="truncate text-[11px] text-slate-500">
              {d.source} · {fmtShort(d.createdAt)} · {Math.round(d.content.length / 100) / 10} KB
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`¿Eliminar «${d.title}»?`)) deleteDoc(d.id);
            }}
            className="text-slate-600 hover:text-red-400"
            aria-label="Eliminar documento"
          >
            <Trash2 size={15} />
          </button>
        </Card>
      ))}
      <Sheet open={!!doc} onClose={() => setView(null)} title={doc?.title}>
        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">{doc?.content}</pre>
      </Sheet>
      <Sheet
        open={paste}
        onClose={() => setPaste(false)}
        title="Nuevo documento de texto"
        footer={
          <Btn
            className="w-full"
            disabled={!title.trim() || text.trim().length < 20}
            onClick={() => {
              addDoc({ title: title.trim(), source: 'Texto pegado', type: 'texto', tags: title.toLowerCase().split(/\s+/).filter((t) => t.length > 3), content: structureText(text) });
              setTitle('');
              setText('');
              setPaste(false);
              toast('Documento indexado');
            }}
          >
            Indexar documento
          </Btn>
        }
      >
        <div className="space-y-3">
          <Field label="Título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Protocolo rotura gemelo" />
          </Field>
          <Field label="Contenido (usa títulos como «Causas», «Criterios», «Fase 1»… y líneas «Ejercicio: 3 x 10»)">
            <TextArea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
