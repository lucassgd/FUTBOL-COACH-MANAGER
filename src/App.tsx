import { useRef, useState } from 'react';
import { Activity, BookOpen, CalendarDays, Download, HeartPulse, PenTool, RotateCcw, Settings, Shield, Upload, Video } from 'lucide-react';
import { useStore, type TabKey } from './store/store';
import { Btn, Sheet } from './components/ui';
import { cx } from './lib/utils';
import TeamsModule from './modules/teams/TeamsModule';
import LibraryModule from './modules/library/LibraryModule';
import BoardModule from './modules/board/BoardModule';
import PlanningModule from './modules/planning/PlanningModule';
import MedicalModule from './modules/medical/MedicalModule';
import AnalysisModule from './modules/analysis/AnalysisModule';

const TABS: { key: TabKey; label: string; icon: typeof Shield; title: string }[] = [
  { key: 'teams', label: 'Equipos', icon: Shield, title: 'Mis Equipos' },
  { key: 'library', label: 'Biblioteca', icon: BookOpen, title: 'Biblioteca' },
  { key: 'board', label: 'Pizarra', icon: PenTool, title: 'Pizarra Táctica' },
  { key: 'planning', label: 'Plan', icon: CalendarDays, title: 'Microciclo' },
  { key: 'medical', label: 'Readapt. IA', icon: HeartPulse, title: 'Readaptación IA' },
  { key: 'analysis', label: 'Análisis', icon: Video, title: 'Análisis de Vídeo' },
];

export default function App() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const teams = useStore((s) => s.teams);
  const activeTeamId = useStore((s) => s.activeTeamId);
  const toasts = useStore((s) => s.toasts);
  const [settings, setSettings] = useState(false);
  const current = TABS.find((t) => t.key === tab)!;
  const team = teams.find((t) => t.id === activeTeamId);

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[640px] flex-col bg-slate-950 shadow-2xl shadow-black sm:border-x sm:border-slate-900">
      {/* Cabecera contextual */}
      <header className="z-20 flex items-center gap-3 border-b border-slate-900 bg-slate-950/95 px-4 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Activity size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight">{current.title}</h1>
          <p className="truncate text-[11px] text-slate-500">
            COACH SPACE · {team?.name} · {team?.category}
          </p>
        </div>
        <button onClick={() => setSettings(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200" aria-label="Ajustes">
          <Settings size={18} />
        </button>
      </header>

      <main className={cx('relative flex-1', tab === 'board' ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain')}>
        {tab === 'teams' && <TeamsModule />}
        {tab === 'library' && <LibraryModule />}
        {tab === 'board' && <BoardModule />}
        {tab === 'planning' && <PlanningModule />}
        {tab === 'medical' && <MedicalModule />}
        {tab === 'analysis' && <AnalysisModule />}
      </main>

      {/* Bottom Navigation */}
      <nav className="z-20 grid grid-cols-6 border-t border-slate-900 bg-slate-950/95 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)} className="flex flex-col items-center gap-0.5 py-1.5 active:scale-90">
              <span className={cx('grid h-8 w-12 place-items-center rounded-full transition', active ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500')}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={cx('text-[10px] font-semibold', active ? 'text-emerald-400' : 'text-slate-500')}>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={cx('animate-pop rounded-xl border px-4 py-2 text-sm font-semibold shadow-lg', t.tone === 'ok' ? 'border-emerald-500/40 bg-emerald-950 text-emerald-200' : 'border-amber-500/40 bg-amber-950 text-amber-200')}>
            {t.text}
          </div>
        ))}
      </div>

      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const resetFactory = useStore((s) => s.resetFactory);
  const importData = useStore((s) => s.importData);
  const toast = useStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState(false);

  const exportJSON = () => {
    const s = useStore.getState();
    const data = { teams: s.teams, seasons: s.seasons, matches: s.matches, players: s.players, folders: s.folders, exercises: s.exercises, weeks: s.weeks, docs: s.docs, analyses: s.analyses, board: s.board, activeTeamId: s.activeTeamId };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `coach-space-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Copia de seguridad descargada');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ajustes y datos">
      <div className="space-y-3 pt-1">
        <p className="text-sm text-slate-400">Todos los datos se guardan automáticamente en este dispositivo (localStorage + IndexedDB para vídeos).</p>
        <Btn tone="subtle" className="w-full" onClick={exportJSON}>
          <Download size={16} /> Exportar copia de seguridad (JSON)
        </Btn>
        <Btn tone="subtle" className="w-full" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Importar copia de seguridad
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const d = JSON.parse(await f.text());
              if (!d.players || !d.weeks) throw new Error('Formato no válido');
              importData(d);
              toast('Datos importados');
              onClose();
            } catch {
              toast('Archivo no válido', 'warn');
            }
            e.target.value = '';
          }}
        />
        {!confirm ? (
          <Btn tone="danger" className="w-full" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} /> Restaurar datos de fábrica
          </Btn>
        ) : (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3">
            <p className="mb-2 text-sm text-red-200">Se borrarán todos tus cambios y se recargará la plantilla, biblioteca y microciclos iniciales. ¿Continuar?</p>
            <div className="flex gap-2">
              <Btn tone="ghost" className="flex-1" onClick={() => setConfirm(false)}>
                Cancelar
              </Btn>
              <Btn
                tone="danger"
                className="flex-1"
                onClick={() => {
                  resetFactory();
                  setConfirm(false);
                  onClose();
                  toast('Datos de fábrica restaurados');
                }}
              >
                Restaurar
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
