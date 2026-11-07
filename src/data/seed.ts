import type { Analysis, Exercise, Folder, Match, MatchVideo, MedDoc, Player, Season, SessionTask, Team, Week } from '../types';
import { diagram, type DiagramTemplate } from '../lib/board';
import { addDays } from '../lib/utils';
import { SEED_DOCS } from './docs';

// ============================ PLANTILLA 2026/2027 ============================
const ROSTER: [number, string, boolean?][] = [
  [1, 'Adrián Serrano', true],
  [13, 'Carlos García', true],
  [2, 'César Sánchez'],
  [3, 'Rodrigo García'],
  [4, 'Roberto Puchi'],
  [5, 'Marcos Calvo'],
  [6, 'Jorge Romero'],
  [7, 'Alejandro Voltas'],
  [8, 'Mikel Salaverria'],
  [10, 'Pablo Azores'],
  [11, 'Álvaro Rueda'],
  [12, 'Íñigo Sustacha'],
  [14, 'Juan Carlos López'],
  [15, 'Alejandro Puebla'],
  [17, 'David Lopesino'],
  [19, 'David Villoria'],
  [20, 'Skyler Figueroa'],
  [21, 'Daniel Aberturas'],
  [22, 'Jairo Gallana'],
  [23, 'Jhoan Arciniegas'],
  [24, 'Andy Hu'],
  [29, 'Miguel Ángel Cuadros'],
  [30, 'Shravan Suraj'],
  [33, 'Josué Acebedo'],
];

/** Minutos acumulados en J1–J3 (antes de los partidos con microciclo registrado). */
const BASE_MIN: Record<number, number> = {
  1: 270, 13: 0, 2: 245, 3: 180, 4: 270, 5: 160, 6: 210, 7: 270, 8: 235, 10: 190, 11: 150, 12: 225,
  14: 120, 15: 95, 17: 200, 19: 60, 20: 140, 21: 75, 22: 30, 23: 110, 24: 45, 29: 20, 30: 0, 33: 15,
};

export const pid = (n: number) => `p${String(n).padStart(2, '0')}`;

export function seedPlayers(): Player[] {
  return ROSTER.map(([number, name, gk]) => {
    const p: Player = {
      id: pid(number),
      number,
      name,
      posMain: gk ? 'Portero (POR)' : 'Sin definir (Editable)',
      posSecondary: 'Sin definir (Editable)',
      status: 'Disponible',
      baseMinutes: BASE_MIN[number] ?? 0,
    };
    if (number === 5) {
      p.status = 'Lesionado';
      p.injury = {
        diagnosis: 'Pubalgia (osteopatía dinámica de pubis)',
        since: '2026-10-12',
        expectedReturn: '2026-11-23',
        phase: 'Fase 2',
        notes: 'Dolor en inserción de aductor largo izquierdo al golpeo y en cambios de dirección. Squeeze test 6/10.',
      };
    }
    if (number === 12) {
      p.status = 'Readaptación';
      p.injury = {
        diagnosis: 'Esguince de tobillo grado II (LPAA)',
        since: '2026-10-19',
        expectedReturn: '2026-11-16',
        phase: 'Fase 3',
        notes: 'Sin dolor en apoyo monopodal. Pendiente de test Y-Balance (>90% simetría) antes de alta.',
      };
    }
    return p;
  });
}

// ============================ EQUIPOS Y TEMPORADAS ============================
export const SEED_TEAMS: Team[] = [
  { id: 't_metro', name: 'CD Atlético Metropolitano', category: 'Senior A · Preferente', current: true },
  { id: 't_sur', name: 'AD Unión Deportiva Sur', category: 'Juvenil División de Honor', current: false },
  { id: 't_rayo', name: 'CF Rayo del Norte', category: 'Cadete A', current: false },
];

export const SEED_SEASONS: Season[] = [
  { id: 's_2627', teamId: 't_metro', label: '2026/2027', active: true },
  { id: 's_2526', teamId: 't_metro', label: '2025/2026', active: false },
  { id: 's_2324', teamId: 't_sur', label: '2023/2024', active: false },
  { id: 's_2223', teamId: 't_sur', label: '2022/2023', active: false },
  { id: 's_2122', teamId: 't_rayo', label: '2021/2022', active: false },
];

// ============================ BIBLIOTECA ============================
export const SEED_FOLDERS: Folder[] = [
  { id: 'f_rondos', name: 'Rondos Posicionales', color: '#10b981' },
  { id: 'f_fuerza', name: 'Fuerza y Prevención', color: '#f59e0b' },
  { id: 'f_ssg', name: 'Espacios Reducidos (SSG)', color: '#ef4444' },
  { id: 'f_oleadas', name: 'Oleadas y Transiciones', color: '#38bdf8' },
  { id: 'f_plan', name: 'Plan de Partido', color: '#a78bfa' },
  { id: 'f_recup', name: 'Compensación/Recuperación', color: '#22d3ee' },
];

type ExSeed = [
  id: string, folder: string, name: string, objective: string, players: string, count: number, dims: string,
  material: string[], rules: string, variants: string[], series: number, work: number, rest: number,
  intensity: Exercise['intensity'], tpl: DiagramTemplate,
];

const EX: ExSeed[] = [
  // Rondos
  ['e_r1', 'f_rondos', 'Rondo 6v2 + comodín interior', 'Circulación rápida a 1-2 toques, perfiles corporales y pase entre líneas', '6v2+1', 9, '12x12 m', ['Conos', 'Balones', 'Petos'], 'Máximo 2 toques. Si el comodín interior recibe y devuelve, cuenta doble. Al robar, sale quien perdió el balón.', ['Limitar a 1 toque', 'Añadir segundo comodín', 'Obligatorio pase por dentro cada 4 pases'], 4, 3, 1, 'Media', 'rondo'],
  ['e_r2', 'f_rondos', 'Rondo posicional 4v2+3 por zonas', 'Atraer y superar línea de presión, tercer hombre', '4v2+3', 9, '20x20 m', ['Conos', 'Balones', 'Petos x3 colores'], 'Dos zonas de 10x20. Punto al cambiar de zona mediante pase al comodín central. Defensores no pueden cambiar de zona.', ['Robo y transición a miniportería', 'Defensor extra al cambiar de zona'], 5, 3, 1, 'Media', 'rondo2'],
  ['e_r3', 'f_rondos', 'Rondo de activación 4v1', 'Activación neuromuscular y precisión de pase', '4v1', 5, '8x8 m', ['Conos', 'Balones'], 'Libre de toques. Cambio de defensor cada 45 s.', ['Pierna no dominante', 'Toque único'], 3, 2, 0.5, 'Baja', 'rondo'],
  // Fuerza
  ['e_f1', 'f_fuerza', 'Circuito de fuerza preventiva: Nórdicos + Copenhague', 'Prevención de lesión de isquiosurales y aductores', 'Individual / parejas', 24, 'Gimnasio o banda', ['Colchonetas', 'Bandas elásticas'], 'Nórdico 3x6 con control excéntrico 4 s. Copenhague corto 3x8 por lado. Puente de glúteo unilateral 3x10.', ['Copenhague largo en fase avanzada', 'Nórdico asistido con banda'], 3, 12, 2, 'Media', 'strength'],
  ['e_f2', 'f_fuerza', 'Fuerza estructural en campo: core + estabilidad', 'Estabilidad lumbo-pélvica y control de tronco', 'Grupos de 4', 24, 'Mitad de campo', ['Colchonetas', 'Fitballs', 'Mini-bands'], 'Plancha frontal 30 s, Pallof press 10/lado, dead bug 10, monster walk 15 m. Sin pausa entre estaciones.', ['Plancha con perturbaciones del compañero', 'Añadir lastre'], 3, 10, 2, 'Media', 'strength'],
  ['e_f3', 'f_fuerza', 'Coordinación + aceleración con escalera', 'Frecuencia de apoyos, aceleración y cambio de dirección', 'Filas de 4', 24, '30 m lineales', ['Escalera de coordinación', 'Picas', 'Conos'], 'Escalera (2 apoyos), slalom entre picas, aceleración 10 m y finalización con pase.', ['Estímulo visual de salida', 'Reacción por parejas'], 4, 6, 2, 'Alta', 'ladder'],
  ['e_f4', 'f_fuerza', 'Pliometría y aterrizajes (prevención tobillo/rodilla)', 'Control de aterrizaje, rigidez de tobillo y valgo dinámico', 'Individual', 24, 'Zona de césped', ['Vallas bajas', 'Conos'], 'Saltos a cajón 3x5, saltos laterales con estabilización 3 s, hop test monopodal 3x6/lado.', ['Inestabilidad con BOSU', 'Doble tarea cognitiva'], 3, 8, 2, 'Media', 'strength'],
  // SSG
  ['e_s1', 'f_ssg', 'SSG 4v4 + 2 comodines a miniporterías', 'Alta densidad de acciones: duelos, aceleraciones y finalización', '4v4+2', 10, '30x20 m', ['Miniporterías x2', 'Petos', 'Balones'], 'Comodines exteriores a 1 toque. Gol tras robo en <5 s vale doble. Reposición rápida de balón por el entrenador.', ['3v3+2 en 25x18', 'Sin comodines (máxima intensidad)'], 4, 4, 2, 'Máxima', 'ssg'],
  ['e_s2', 'f_ssg', 'SSG 5v5 + porteros área a área', 'Juego directo-combinativo, finalización y repliegue intensivo', '5v5+2POR', 12, '40x30 m', ['Porterías grandes x2', 'Petos', 'Balones'], 'Fuera de juego a partir de 20 m. Gol solo si todo el equipo ha pasado de medio campo.', ['Limitar 3 toques', 'Superioridad 6v5 rotativa'], 4, 5, 2, 'Alta', 'ssg2'],
  ['e_s3', 'f_ssg', 'SSG 3v3 duelos con conducción a línea', 'Intensidad máxima en 1v1 y 2v2, desborde', '3v3', 6, '20x15 m', ['Conos', 'Balones'], 'Punto al conducir el balón más allá de la línea rival. Duración corta, recuperación completa.', ['Línea con 2 miniporterías', 'Comodín neutro'], 6, 1.5, 1.5, 'Máxima', 'ssg'],
  // Oleadas
  ['e_o1', 'f_oleadas', 'Oleadas 3v2 + recuperación 2v1', 'Ataque en superioridad y transición defensiva inmediata', '3v2 → 2v1', 10, 'Medio campo', ['Portería grande', 'Conos', 'Balones'], 'El 3v2 ataca la portería; al finalizar, los 2 defensores salen 2v1 contra el último atacante hacia conos.', ['4v3 + retorno 3v2', 'Tiempo máximo 8 s'], 4, 5, 1.5, 'Alta', 'waves'],
  ['e_o2', 'f_oleadas', 'Transición tras pérdida 4v3 + miniporterías', 'Reacción tras pérdida (5 segundos) y contraataque', '4v3+POR', 8, '40x35 m', ['Miniporterías x2', 'Portería grande', 'Petos'], 'Si el equipo atacante pierde, tiene 5 s para recuperar. El equipo defensor contraataca a miniporterías.', ['Salida desde portero', 'Comodín de transición'], 4, 4, 2, 'Alta', 'transition'],
  ['e_o3', 'f_oleadas', 'Ataque rápido 2v1 + finalización', 'Velocidad de decisión y finalización', '2v1', 6, '30x25 m', ['Portería grande', 'Balones', 'Conos'], 'Salida simultánea tras estímulo visual. 6 s para finalizar.', ['3v2', 'Defensor desde detrás'], 5, 3, 1, 'Alta', 'waves'],
  // Plan de partido
  ['e_p1', 'f_plan', 'Salida de balón 11v11 vs presión 4-4-2', 'Fijar a la primera línea rival, salida por tercer hombre y fijación del lateral', '11v11', 22, 'Campo completo', ['Petos', 'Balones', 'Conos para zonas'], 'Inicia el portero. El equipo rival simula la presión del próximo rival. Punto al superar la primera línea con pase interior.', ['Salida con 3 (mediocentro incrustado)', 'Presión alta rival en bloque'], 3, 10, 2, 'Media', 'buildup'],
  ['e_p2', 'f_plan', 'Presión tras pérdida en campo rival', 'Bloque alto, orientación de la presión a banda y trampa', '10v10+POR', 21, '2/3 de campo', ['Petos', 'Balones'], 'Rival inicia desde su portero. Si recuperamos en zona de presión (sombreada) y finalizamos en <10 s, gol doble.', ['Presión con línea de 5', 'Cambio de orientación al lado débil'], 3, 8, 2, 'Alta', 'press'],
  ['e_p3', 'f_plan', 'ABP ofensivo: córner al primer palo', 'Bloqueos, desmarque de ruptura al primer palo y segunda jugada', '7v7', 14, 'Área', ['Balones', 'Petos', 'Maniquíes'], 'Tres variantes ensayadas (código 1-2-3). Bloqueo sobre el marcador del rematador principal.', ['Córner en corto', 'Lanzamiento al segundo palo'], 1, 15, 0, 'Baja', 'abp'],
  ['e_p4', 'f_plan', 'ABP defensivo: zona mixta', 'Organización defensiva en córners y faltas laterales', '8v8', 16, 'Área', ['Balones', 'Petos'], 'Zona de 4 + 3 marcajes individuales + 1 rechace. Corrección por vídeo del rival.', ['Falta lateral', 'Saque de banda largo'], 1, 12, 0, 'Baja', 'abp'],
  // Recuperación
  ['e_c1', 'f_recup', 'Regeneración: carrera continua + movilidad', 'Recuperación activa post-partido (jugadores >60 min)', 'Grupo', 12, 'Perímetro del campo', ['Rodillos de espuma', 'Colchonetas'], 'Carrera regenerativa 12 min al 60% FCmáx, movilidad articular 10 min, foam roller 8 min.', ['Bicicleta estática', 'Piscina si disponible'], 1, 30, 0, 'Baja', 'recovery'],
  ['e_c2', 'f_recup', 'Compensación: intermitente 15-15 + SSG 3v3', 'Igualar carga de jugadores con <60 min', 'Grupo', 10, '30x20 m', ['Conos', 'Miniporterías', 'Balones'], '2 bloques de 6 min de 15" al 100% / 15" pausa. Después 4x2 min de 3v3.', ['Carrera con balón', 'Cambios de dirección 180º'], 2, 6, 3, 'Alta', 'ssg'],
  ['e_c3', 'f_recup', 'Descarga: rondo lúdico + estiramientos', 'Disfrute, contacto con balón con carga mínima', 'Grupo', 12, '10x10 m', ['Balones', 'Conos'], 'Rondo libre 2 bloques de 5 min y estiramientos guiados.', ['Fútbol-tenis'], 2, 5, 1, 'Baja', 'rondo'],
];

export function seedExercises(): Exercise[] {
  return EX.map(([id, folderId, name, objective, players, playersCount, dimensions, material, rules, variants, series, workMin, restMin, intensity, tpl]) => ({
    id, folderId, name, objective, players, playersCount, dimensions, material, rules, variants, series, workMin, restMin, intensity,
    board: diagram(tpl),
    createdAt: '2026-08-01',
  }));
}

// ============================ PARTIDOS ============================
const chapters = (list: [number, string, string][]) => list.map(([t, label, note], i) => ({ id: `ch${i}_${t}`, t, label, note }));

const videosFor = (rival: string, seed: number): MatchVideo[] => [
  {
    id: `v_sal_${seed}`,
    title: `${rival} · Salida de balón`,
    kind: 'salida',
    duration: 420,
    chapters: chapters([
      [12, 'Salida en 3 con pivote incrustado', 'El 6 baja entre centrales; laterales muy altos.'],
      [95, 'Pase largo al 9 tras presión', 'Si saltamos con 2, buscan en largo al 9 (fuerte en duelo aéreo).'],
      [210, 'Pérdida en zona interior', 'Su mediocentro recibe de espaldas: zona trampa para robar.'],
      [330, 'Cambio de orientación al lateral', 'Tardan 3-4 pases: tiempo para bascular.'],
    ]),
  },
  {
    id: `v_abp_${seed}`,
    title: `${rival} · Balón parado`,
    kind: 'abp',
    duration: 300,
    chapters: chapters([
      [20, 'Córner ofensivo: bloqueo al primer palo', 'Bloquean al marcador del primer palo, remate del central zurdo.'],
      [120, 'Falta lateral al segundo palo', 'Lanzamiento cerrado con rosca, 3 atacantes al segundo palo.'],
      [230, 'Córner defensivo en zona', 'Defienden en zona pura de 6: debilidad en el borde del área.'],
    ]),
  },
];

interface MatchSeed { r: number; rival: string; home: boolean; gf: number | null; ga: number | null; date: string; plan?: string; weak?: string; video?: boolean }

const PLAN_DEFAULT = (rival: string) =>
  `Sistema 1-4-3-3. Ante ${rival} buscamos salir en corto atrayendo su presión y atacar la espalda de sus laterales. Presión alta tras pérdida en los 5 primeros segundos; si se supera, bloque medio en 1-4-4-2. ABP: zona mixta en defensa, variante "2" en córner ofensivo.`;

const M2627: MatchSeed[] = [
  { r: 1, rival: 'CD Puerta del Sol', home: true, gf: 3, ga: 0, date: '2026-09-27' },
  { r: 2, rival: 'AD Parque Oeste', home: false, gf: 1, ga: 2, date: '2026-10-04' },
  { r: 3, rival: 'CF Valle Alto', home: true, gf: 2, ga: 2, date: '2026-10-11' },
  {
    r: 4, rival: 'Real Sporting Villa', home: true, gf: 2, ga: 1, date: '2026-10-18', video: true,
    plan: 'Rival en 1-4-2-3-1 con salida en 3. Plan: presión con 9 + 10 orientando hacia su central izquierdo (perfil derecho, incómodo). Bloque medio-alto, línea defensiva a 35 m. En ataque, atacar el carril entre su lateral derecho y central (lateral muy ofensivo). Balón parado: su punto fuerte es el córner al primer palo — marcaje individual a su #4 y #5.',
    weak: 'Lateral derecho muy ofensivo: espacio a su espalda en transición. Central izquierdo lento en giro. Concede en segundas jugadas tras ABP defensivo.',
  },
  {
    r: 5, rival: 'CD Ciudad Deportiva', home: false, gf: 1, ga: 1, date: '2026-10-25', video: true,
    plan: 'Rival en bloque bajo 1-5-3-2. Paciencia en circulación, fijar carrileros con nuestros extremos abiertos y llegada de interiores al área. Cuidado con su contraataque por su 9 rápido: vigilancias con central + pivote. ABP ofensivo como vía principal de gol.',
    weak: 'Defienden el área con 5 pero dejan la frontal libre: llegada de segunda línea y disparo. Carrileros fatigados a partir del minuto 60.',
  },
  {
    r: 6, rival: 'UD San Fernando', home: false, gf: 2, ga: 0, date: '2026-11-01', video: true,
    plan: 'Rival con presión alta agresiva hombre a hombre. Salida en largo dirigida al 9 + segunda jugada con interiores cerca. Superar presión con portero como jugador libre. Defensa: bloque medio y robos en banda con trampa a su extremo derecho.',
    weak: 'INFORME PUNTOS DÉBILES: 1) Su central derecho pierde muchos duelos aéreos. 2) Tras presión fallida quedan 3v3 atrás. 3) Portero débil en balones laterales. 4) Su lateral izquierdo no repliega tras ataques: atacar ese carril en transición.',
  },
  { r: 7, rival: 'SD Ribera del Manzanares', home: true, gf: null, ga: null, date: '2026-11-08', plan: PLAN_DEFAULT('SD Ribera del Manzanares'), weak: 'Pendiente de análisis de vídeo. Primeras notas: equipo muy vertical, juega con dos puntas.' },
];

const M2526: MatchSeed[] = [
  { r: 10, rival: 'CF Valle Alto', home: false, gf: 0, ga: 1, date: '2025-11-23' },
  { r: 11, rival: 'CD Puerta del Sol', home: true, gf: 2, ga: 0, date: '2025-11-30' },
  { r: 12, rival: 'AD Parque Oeste', home: true, gf: 3, ga: 1, date: '2025-12-07' },
  { r: 13, rival: 'Real Sporting Villa', home: false, gf: 1, ga: 1, date: '2025-12-14' },
];
const M2324: MatchSeed[] = [
  { r: 8, rival: 'Rayo Majadahonda Juvenil', home: true, gf: 2, ga: 3, date: '2023-11-05' },
  { r: 9, rival: 'CD Leganés Juvenil A', home: false, gf: 1, ga: 0, date: '2023-11-12' },
  { r: 10, rival: 'AD Alcorcón Juvenil', home: true, gf: 2, ga: 2, date: '2023-11-19' },
];
const M2223: MatchSeed[] = [
  { r: 14, rival: 'CF Fuenlabrada Juvenil', home: false, gf: 0, ga: 2, date: '2023-01-15' },
  { r: 15, rival: 'Getafe CF Juvenil B', home: true, gf: 1, ga: 1, date: '2023-01-22' },
];
const M2122: MatchSeed[] = [
  { r: 3, rival: 'EF Ciudad Lineal', home: false, gf: 0, ga: 0, date: '2021-10-10' },
  {
    r: 4, rival: 'Real Sporting Villa', home: true, gf: 2, ga: 1, date: '2021-10-17', video: true,
    plan: 'Cadete A en 1-4-4-2 rombo. Objetivo formativo: salida en corto aunque haya riesgo. Presión tras pérdida con los 4 más cercanos. Atacar banda izquierda (lateral rival lento).',
    weak: 'Mediocentro rival muy expuesto cuando su equipo pierde el balón. Les cuesta defender centros laterales rasos.',
  },
  {
    r: 5, rival: 'CD Ciudad Deportiva', home: false, gf: 1, ga: 1, date: '2021-10-24', video: true,
    plan: 'Campo pequeño y de césped artificial muy rápido: juego a 1-2 toques, amplitud máxima. Vigilar transiciones: su extremo izquierdo es el mejor jugador de la liga.',
    weak: 'Defienden en 4-4-2 plano con mucha distancia entre líneas: recepciones del mediapunta a la espalda de su medio campo.',
  },
  {
    r: 6, rival: 'UD San Fernando', home: false, gf: 2, ga: 0, date: '2021-10-31', video: true,
    plan: 'Rival que presiona alto. Salida en largo al delantero y juego de segundas. Bloque medio y salir rápido al robo.',
    weak: 'INFORME PUNTOS DÉBILES: espalda de sus centrales muy expuesta, su portero no sale de puerta, lateral derecho muy ofensivo.',
  },
];

function buildMatches(seasonId: string, list: MatchSeed[]): Match[] {
  return list.map((m, i) => ({
    id: `m_${seasonId}_${m.r}`,
    seasonId,
    round: m.r,
    rival: m.rival,
    home: m.home,
    goalsFor: m.gf,
    goalsAgainst: m.ga,
    date: m.date,
    weekStart: addDays(m.date, -6),
    plan: m.plan ?? PLAN_DEFAULT(m.rival),
    weaknesses: m.weak ?? 'Sin informe detallado. Ver notas del plan de partido.',
    videos: m.video ? videosFor(m.rival, i + m.r * 7 + seasonId.length) : [],
  }));
}

export function seedMatches(): Match[] {
  return [
    ...buildMatches('s_2627', M2627),
    ...buildMatches('s_2526', M2526),
    ...buildMatches('s_2324', M2324),
    ...buildMatches('s_2223', M2223),
    ...buildMatches('s_2122', M2122),
  ];
}

// ============================ MICROCICLOS ============================
let tk = 0;
const task = (exerciseId: string | undefined, title: string, minutes: number, notes = ''): SessionTask => ({ id: `tk_${++tk}`, exerciseId, title, minutes, notes });

const ROT: Record<string, string[]> = {
  ssg: ['e_s1', 'e_s2', 'e_s3'],
  thu: ['e_p1', 'e_p2'],
  str: ['e_f1', 'e_f2', 'e_f4'],
};

function makeWeek(weekStart: string, teamId: string, rival: string, home: boolean, idx: number, minutes: Record<string, number> = {}, closed = true, squad: string[] = []): Week {
  const exName = (id: string) => EX.find((e) => e[0] === id)?.[2] ?? id;
  const ssg = ROT.ssg[idx % 3];
  const str = ROT.str[idx % 3];
  const thu = ROT.thu[idx % 2];
  return {
    weekStart,
    teamId,
    monday: {
      over: [task('e_c1', exName('e_c1'), 30, 'FC < 140 ppm'), task('e_c3', exName('e_c3'), 15)],
      under: [task('e_c2', exName('e_c2'), 25, 'Objetivo: igualar distancia HSR del partido'), task('e_s3', exName('e_s3'), 15)],
    },
    tuesday: {
      strength: [task(str, exName(str), 20, 'Bloque obligatorio de fuerza'), task('e_f3', exName('e_f3'), 12)],
      ssg: [task('e_r1', exName('e_r1'), 12, 'Activación'), task(ssg, exName(ssg), 24, 'Carga principal del microciclo')],
    },
    thursday: {
      tasks: [
        task('e_r2', exName('e_r2'), 15),
        task(thu, exName(thu), 25, `Ajustes específicos vs ${rival}`),
        task(idx % 2 ? 'e_p4' : 'e_p3', exName(idx % 2 ? 'e_p4' : 'e_p3'), 15, 'ABP'),
      ],
    },
    sunday: {
      rival,
      home,
      kit: home ? 'Negra / Negro / Negro' : 'Blanca / Blanco / Blanco',
      callTime: '12:30',
      kickoff: '14:00',
      venue: home ? 'Campo Municipal Metropolitano' : `Campo de ${rival}`,
      squad: squad.length ? squad : Object.keys(minutes),
      minutes,
      closed,
    },
    extras: [],
    notes: '',
  };
}

const P = pid;
/** Minutos J4, J5 y J6 de la temporada 2026/2027 */
const MIN_J4: Record<string, number> = {
  [P(1)]: 90, [P(2)]: 90, [P(3)]: 90, [P(4)]: 90, [P(6)]: 90, [P(7)]: 78, [P(8)]: 90, [P(10)]: 65, [P(11)]: 70, [P(12)]: 90, [P(17)]: 90,
  [P(14)]: 25, [P(15)]: 20, [P(20)]: 12, [P(23)]: 12, [P(19)]: 0, [P(13)]: 0, [P(21)]: 0,
};
const MIN_J5: Record<string, number> = {
  [P(1)]: 90, [P(2)]: 90, [P(3)]: 90, [P(4)]: 90, [P(6)]: 72, [P(7)]: 90, [P(8)]: 90, [P(10)]: 90, [P(11)]: 61, [P(14)]: 90, [P(17)]: 90,
  [P(15)]: 29, [P(20)]: 18, [P(23)]: 0, [P(19)]: 10, [P(24)]: 0, [P(13)]: 0, [P(21)]: 0,
};
const MIN_J6: Record<string, number> = {
  [P(1)]: 90, [P(2)]: 90, [P(3)]: 90, [P(4)]: 90, [P(6)]: 90, [P(7)]: 64, [P(8)]: 90, [P(10)]: 75, [P(11)]: 58, [P(14)]: 90, [P(17)]: 82,
  [P(15)]: 32, [P(20)]: 26, [P(23)]: 15, [P(19)]: 8, [P(21)]: 0, [P(13)]: 0, [P(24)]: 0,
};

export function seedWeeks(): Week[] {
  tk = 0;
  const weeks: Week[] = [];
  const bySeason: [string, string, MatchSeed[]][] = [
    ['s_2627', 't_metro', M2627],
    ['s_2526', 't_metro', M2526],
    ['s_2324', 't_sur', M2324],
    ['s_2223', 't_sur', M2223],
    ['s_2122', 't_rayo', M2122],
  ];
  for (const [season, team, list] of bySeason) {
    list.forEach((m, i) => {
      const ws = addDays(m.date, -6);
      if (season === 's_2627' && m.r < 4) return; // J1-J3 sin microciclo registrado (minutos en baseMinutes)
      let minutes: Record<string, number> = {};
      if (season === 's_2627') minutes = m.r === 4 ? MIN_J4 : m.r === 5 ? MIN_J5 : m.r === 6 ? MIN_J6 : {};
      const pending = m.gf === null;
      const squad = pending
        ? [1, 13, 2, 3, 4, 6, 7, 8, 10, 11, 14, 15, 17, 19, 20, 21, 23, 24].map(P)
        : [];
      const w = makeWeek(ws, team, m.rival, m.home, i, minutes, !pending, squad);
      if (season === 's_2627' && m.r === 7) {
        w.notes = 'Semana de carga normal. Marcos Calvo continúa con protocolo de pubalgia (fase 2). Íñigo Sustacha se integra parcialmente el jueves.';
        w.extras.push({
          id: 'x_seed1', day: 'M', kind: 'readaptacion', title: 'Readaptación tobillo — Íñigo Sustacha', playerId: P(12),
          items: [
            { name: 'Equilibrio monopodal en superficie inestable', dose: '3 x 45 s/pierna' },
            { name: 'Saltos laterales con estabilización', dose: '3 x 8' },
            { name: 'Cambios de dirección progresivos 45º-90º', dose: '6 x 20 m' },
          ],
        });
      }
      weeks.push(w);
    });
  }
  return weeks;
}

// ============================ ANÁLISIS DE VÍDEO (DEMO) ============================
export function seedAnalyses(): Analysis[] {
  const tags: [number, Analysis['tags'][number]['type'], string | null, string][] = [
    [95, 'recuperado', P(8), 'Robo tras presión en banda'],
    [140, 'ocasion_gen', P(10), 'Disparo desde frontal'],
    [260, 'perdido', P(6), 'Pérdida en salida'],
    [300, 'ocasion_con', null, 'Contra tras pérdida'],
    [455, 'recuperado', P(4), 'Anticipación'],
    [610, 'ocasion_gen', P(17), 'Remate de cabeza tras córner'],
    [760, 'perdido', P(11), 'Regate fallido en 1v1'],
    [905, 'recuperado', P(14), 'Segunda jugada'],
    [1040, 'ocasion_gen', P(7), 'Gol 0-1'],
  ];
  return [
    {
      id: 'an_demo',
      title: 'J6 · UD San Fernando 0-2 CD Atlético Metropolitano (1ª parte)',
      source: 'demo',
      duration: 2700,
      createdAt: '2026-11-02',
      tags: tags.map(([t, type, playerId, note], i) => ({ id: `tg${i}`, t, type, playerId, note })),
    },
  ];
}

export function seedDocs(): MedDoc[] {
  return SEED_DOCS.map((d) => ({ ...d }));
}
