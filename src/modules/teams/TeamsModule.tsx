import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Shield, Star, Swords, Trophy } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, Chip, ChipRow, Empty, Field, Input, Segmented, Select, Sheet, Stat } from '../../components/ui';
import { addDays, cx, fmtShort, mondayOf, uid } from '../../lib/utils';
import type { Match } from '../../types';
import MatchSheet from './MatchSheet';
import Roster from './Roster';
import Infirmary from './Infirmary';

type Sub = 'rivales' | 'plantilla' | 'enfermeria';

export const resultOf = (m: Match) => {
  if (m.goalsFor === null || m.goalsAgainst === null) return 'P';
  return m.goalsFor > m.goalsAgainst ? 'V' : m.goalsFor < m.goalsAgainst ? 'D' : 'E';
};
const RES_STYLE = { V: 'bg-emerald-500 text-slate-950', E: 'bg-amber-400 text-slate-950', D: 'bg-red-500 text-white', P: 'bg-slate-700 text-slate-200' };
const RES_LABEL = { V: 'Victoria', E: 'Empate', D: 'Derrota', P: 'Pendiente' };

export default function TeamsModule() {
  const { teams, seasons, matches, activeTeamId, players } = useStore();
  const setCurrentTeam = useStore((s) => s.setCurrentTeam);
  const [teamId, setTeamId] = useState(activeTeamId);
  const teamSeasons = seasons.filter((s) => s.teamId === teamId).sort((a, b) => b.label.localeCompare(a.label));
  const [seasonId, setSeasonId] = useState(teamSeasons[0]?.id);
  const [sub, setSub] = useState<Sub>('rivales');
  const [openMatch, setOpenMatch] = useState<string | null>(null);
  const [addTeam, setAddTeam] = useState(false);
  const [addSeason, setAddSeason] = useState(false);
  const [newMatch, setNewMatch] = useState(false);

  const team = teams.find((t) => t.id === teamId)!;
  const season = seasons.find((s) => s.id === seasonId && s.teamId === teamId) ?? teamSeasons[0];
  const seasonMatches = useMemo(() => matches.filter((m) => m.seasonId === season?.id).sort((a, b) => a.round - b.round), [matches, season]);
  const stats = useMemo(() => {
    const r = { V: 0, E: 0, D: 0, gf: 0, ga: 0 };
    seasonMatches.forEach((m) => {
      const k = resultOf(m);
      if (k !== 'P') {
        r[k]++;
        r.gf += m.goalsFor!;
        r.ga += m.goalsAgainst!;
      }
    });
    return r;
  }, [seasonMatches]);
  const injured = players.filter((p) => p.status !== 'Disponible').length;
  const isCurrent = teamId === activeTeamId;

  const pickTeam = (id: string) => {
    setTeamId(id);
    const ss = seasons.filter((s) => s.teamId === id).sort((a, b) => b.label.localeCompare(a.label));
    setSeasonId(ss[0]?.id);
    if (id !== activeTeamId) setSub('rivales');
  };

  return (
    <div className="px-4 pb-8 pt-3">
      {/* Selector de equipo */}
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => pickTeam(t.id)}
            className={cx('w-[210px] shrink-0 rounded-2xl border p-3 text-left transition active:scale-95', t.id === teamId ? 'border-emerald-500/60 bg-gradient-to-br from-emerald-500/20 to-slate-900' : 'border-slate-800 bg-slate-900')}
          >
            <div className="flex items-center gap-2">
              <Shield size={18} className={t.id === teamId ? 'text-emerald-400' : 'text-slate-500'} />
              {t.current && <span className="rounded-full bg-emerald-500 px-1.5 text-[9px] font-black uppercase text-slate-950">Actual</span>}
            </div>
            <div className="mt-1.5 line-clamp-1 text-sm font-bold">{t.name}</div>
            <div className="line-clamp-1 text-[11px] text-slate-400">{t.category}</div>
          </button>
        ))}
        <button onClick={() => setAddTeam(true)} className="grid w-16 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-700 text-slate-500" aria-label="Añadir equipo">
          <Plus />
        </button>
      </div>

      {!isCurrent && (
        <button onClick={() => setCurrentTeam(teamId)} className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-400">
          <Star size={13} /> Marcar «{team.name}» como equipo actual
        </button>
      )}

      {/* Temporadas */}
      <div className="mt-2 flex items-center gap-2">
        <ChipRow>
          {teamSeasons.map((s) => (
            <Chip key={s.id} active={s.id === season?.id} onClick={() => setSeasonId(s.id)}>
              {s.label.replace(/20(\d\d)\/20(\d\d)/, '$1/$2')}
              {s.active && ' · activa'}
            </Chip>
          ))}
          <Chip onClick={() => setAddSeason(true)}>
            <Plus size={12} className="inline" /> Temporada
          </Chip>
        </ChipRow>
      </div>

      {isCurrent && (
        <div className="mt-3">
          <Segmented<Sub>
            value={sub}
            onChange={setSub}
            options={[
              { value: 'rivales', label: 'Rivales' },
              { value: 'plantilla', label: `Plantilla (${players.length})` },
              { value: 'enfermeria', label: `Enfermería (${injured})` },
            ]}
          />
        </div>
      )}

      {(sub === 'rivales' || !isCurrent) && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Stat label="Victorias" value={stats.V} tone="text-emerald-400" />
            <Stat label="Empates" value={stats.E} tone="text-amber-300" />
            <Stat label="Derrotas" value={stats.D} tone="text-red-400" />
            <Stat label="Goles" value={`${stats.gf}-${stats.ga}`} />
          </div>
          <div className="mb-2 mt-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Temporada {season?.label} · Rivales enfrentados
            </h3>
            <Btn small tone="subtle" onClick={() => setNewMatch(true)}>
              <Plus size={14} /> Jornada
            </Btn>
          </div>
          {!seasonMatches.length && <Empty icon={<Swords />} title="Sin partidos en esta temporada" text="Añade la primera jornada para empezar el historial." />}
          <div className="space-y-2">
            {seasonMatches.map((m) => {
              const r = resultOf(m);
              return (
                <Card key={m.id} onClick={() => setOpenMatch(m.id)} className="flex items-center gap-3">
                  <div className="w-10 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-500">J{m.round}</div>
                    <div className="text-[10px] text-slate-500">{fmtShort(m.date)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">vs. {m.rival}</div>
                    <div className="text-[11px] text-slate-400">
                      {m.home ? 'Local' : 'Visitante'} · {m.videos.length} vídeo{m.videos.length !== 1 && 's'} · {RES_LABEL[r]}
                    </div>
                  </div>
                  <span className={cx('rounded-lg px-2 py-1 font-mono text-sm font-black', RES_STYLE[r])}>{r === 'P' ? '—' : m.home ? `${m.goalsFor}-${m.goalsAgainst}` : `${m.goalsAgainst}-${m.goalsFor}`}</span>
                  <ChevronRight size={16} className="text-slate-600" />
                </Card>
              );
            })}
          </div>
        </>
      )}
      {isCurrent && sub === 'plantilla' && <Roster />}
      {isCurrent && sub === 'enfermeria' && <Infirmary />}

      <MatchSheet matchId={openMatch} onClose={() => setOpenMatch(null)} />
      <AddTeamSheet open={addTeam} onClose={() => setAddTeam(false)} onCreated={pickTeam} />
      <AddSeasonSheet open={addSeason} onClose={() => setAddSeason(false)} teamId={teamId} onCreated={setSeasonId} />
      {season && <NewMatchSheet open={newMatch} onClose={() => setNewMatch(false)} seasonId={season.id} nextRound={(seasonMatches.at(-1)?.round ?? 0) + 1} lastDate={seasonMatches.at(-1)?.date} onCreated={setOpenMatch} />}
    </div>
  );
}

function AddTeamSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const addTeam = useStore((s) => s.addTeam);
  const addSeason = useStore((s) => s.addSeason);
  const [name, setName] = useState('');
  const [cat, setCat] = useState('');
  const [label, setLabel] = useState('2026/2027');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo equipo"
      footer={
        <Btn
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            const id = addTeam(name.trim(), cat.trim() || 'Sin categoría');
            addSeason(id, label);
            onCreated(id);
            setName('');
            setCat('');
            onClose();
          }}
        >
          Crear equipo
        </Btn>
      }
    >
      <div className="space-y-3">
        <Field label="Nombre del club">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. CD Juventud Oeste" />
        </Field>
        <Field label="Categoría">
          <Input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Ej. Juvenil A · Liga Nacional" />
        </Field>
        <Field label="Primera temporada">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function AddSeasonSheet({ open, onClose, teamId, onCreated }: { open: boolean; onClose: () => void; teamId: string; onCreated: (id: string) => void }) {
  const addSeason = useStore((s) => s.addSeason);
  const [label, setLabel] = useState('2024/2025');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva temporada"
      footer={
        <Btn
          className="w-full"
          disabled={!/^\d{4}\/\d{4}$/.test(label)}
          onClick={() => {
            onCreated(addSeason(teamId, label));
            onClose();
          }}
        >
          Añadir temporada
        </Btn>
      }
    >
      <Field label="Temporada (aaaa/aaaa)">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
    </Sheet>
  );
}

function NewMatchSheet({ open, onClose, seasonId, nextRound, lastDate, onCreated }: { open: boolean; onClose: () => void; seasonId: string; nextRound: number; lastDate?: string; onCreated: (id: string) => void }) {
  const upsertMatch = useStore((s) => s.upsertMatch);
  const [rival, setRival] = useState('');
  const [home, setHome] = useState('Local');
  const [date, setDate] = useState(lastDate ? addDays(lastDate, 7) : '');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Nueva jornada · J${nextRound}`}
      footer={
        <Btn
          className="w-full"
          disabled={!rival.trim() || !date}
          onClick={() => {
            const id = uid('m');
            upsertMatch({ id, seasonId, round: nextRound, rival: rival.trim(), home: home === 'Local', goalsFor: null, goalsAgainst: null, date, weekStart: mondayOf(date), plan: '', weaknesses: '', videos: [] });
            onCreated(id);
            setRival('');
            onClose();
          }}
        >
          <Trophy size={16} /> Crear jornada
        </Btn>
      }
    >
      <div className="space-y-3">
        <Field label="Rival">
          <Input value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Nombre del rival" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Condición">
            <Select value={home} onChange={setHome} options={['Local', 'Visitante']} />
          </Field>
          <Field label="Fecha del partido">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
