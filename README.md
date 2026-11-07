# COACH SPACE

PWA **mobile-first** para el día a día del entrenador de fútbol: plantilla, historial de rivales, biblioteca de ejercicios, pizarra táctica táctil, microciclo semanal L-M-J-D, asistente de readaptación sobre documentación científica y tagging de vídeo.

Todo funciona en el navegador, sin servidor: los datos se guardan automáticamente en `localStorage` (y los vídeos locales en IndexedDB).

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173 (también accesible en la red local para probar en el móvil)
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ (activa el service worker / modo offline)
```

Para la vista móvil en escritorio: DevTools → modo dispositivo (iPhone / Pixel).

## Módulos (barra de navegación inferior)

| Pestaña | Qué hace |
|---|---|
| **Equipos** | Selector de equipo y temporada · rivales con resultado · ficha de semana de partido (plan, sesiones L/M/J, vídeos con marcas de tiempo, informe de puntos débiles) · plantilla con buscador y filtros · enfermería con diagnóstico, fecha de vuelta y checklist del protocolo |
| **Biblioteca** | Carpetas personalizables · búsqueda por nombre, objetivo, material, nº de jugadores (`10`) o dimensiones (`30x20`) · ficha con diagrama · «Enviar a sesión del calendario» · editar diagrama en la pizarra |
| **Pizarra** | SVG táctil (Pointer Events): 4 fondos, jugadores propios/rivales/comodines/porteros, conos, picas, escalera, miniporterías, porterías, balón · conducción, pase, flecha curva (con punto de control), zona de presión · deshacer, rotar, exportar PNG · guardar como ejercicio o asociarlo a un día |
| **Plan** | Microciclo semanal. **Lunes (MD+1)**: división automática por minutos del domingo anterior (corte 60′) · **Martes (MD-5)**: fuerza obligatoria + SSG · **Jueves (MD-3)**: plan de partido con el rival · **Domingo (MD)**: convocatoria (máx. 18), equipación, citación y minutos; al cerrar el partido alimentan el lunes siguiente y los minutos acumulados · sesiones de readaptación |
| **Readapt. IA** | RAG local: sube PDF/TXT (texto extraído con pdf.js en el dispositivo) o pega protocolos. El motor trocea, clasifica (causas / alertas / fases de ejercicios / alta) y puntúa con TF-IDF + sinónimos. Devuelve causas, prohibiciones y una sesión propuesta según la fase del jugador → «Asignar protocolo» o «Crear sesión en calendario» |
| **Análisis** | Vídeo MP4 local, URL o partido de prueba simulado · 4 botones de tagging en 1 clic vinculados a jugador o bloque · línea de tiempo, balance por jugador/equipo y exportación CSV |

**Ajustes** (icono superior derecho): exportar/importar copia JSON y **restaurar datos de fábrica**.

## Datos precargados

- Plantilla 2026/2027 (24 jugadores; porteros fijos, resto «Sin definir»). Marcos Calvo: pubalgia fase 2. Íñigo Sustacha: readaptación de esguince G2.
- CD Atlético Metropolitano (26/27 activa, 25/26), AD Unión Deportiva Sur (23/24, 22/23), CF Rayo del Norte (21/22), con jornadas 4-6 detalladas (sesiones, plan, vídeos, informe).
- 20 ejercicios con diagrama en 6 carpetas, microciclos de cada semana de partido y 3 documentos médicos (pubalgia, isquiosurales, tobillo).

## Estructura

```
src/
  types.ts              modelo de dominio
  data/seed.ts, docs.ts datos de fábrica
  store/store.ts        Zustand + persist (localStorage), selectores derivados (minutos, división del lunes)
  lib/                  rag.ts (motor de búsqueda clínica), board.ts, pdf.ts, utils.ts
  components/           UI, Pitch (render SVG del campo), VideoPlayer, SendToSession
  modules/              teams · library · board · planning · medical · analysis
```

Stack: React 18 · TypeScript · Vite · Tailwind CSS · Zustand · lucide-react · idb-keyval · pdfjs-dist.
