/** Extracción de texto de PDFs en el navegador (pdf.js, carga diferida). */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let txt = '';
    for (const it of tc.items) {
      if ('str' in it) {
        txt += it.str;
        txt += it.hasEOL ? '\n' : ' ';
      }
    }
    pages.push(txt);
  }
  return structureText(pages.join('\n'));
}

const HEADING = /^(fase\s*\d|causas?|factores|mecanismo|etiolog|criterios?|contraindicac|ejercicios?|protocolo|programa|alta|vuelta|retorno|prevenci|tratamiento|definici|alertas?)/i;

/** Convierte líneas cortas con aspecto de título en encabezados Markdown para el motor de búsqueda. */
export function structureText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((l) => {
      if (/^#/.test(l)) return l;
      const clean = l.replace(/^\d+[.)]\s*/, '');
      if (clean.length < 80 && HEADING.test(clean) && !/[.;]$/.test(clean) && !/\d+\s*x\s*\d+/i.test(clean)) return `## ${clean}`;
      if (/^[•●▪◦·*]\s*/.test(l)) return '- ' + l.replace(/^[•●▪◦·*]\s*/, '');
      return l;
    })
    .join('\n');
}
