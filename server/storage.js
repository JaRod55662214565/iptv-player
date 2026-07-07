import fs from 'node:fs';

export function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.warn('[FS] Lecture impossible', file, e.message); return []; }
}

export function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[FS] Erreur ecriture', file, e.message); }
}

let writeLock = Promise.resolve();

export async function serializeWrite(fn) {
  writeLock = writeLock.then(fn, fn);
  return writeLock;
}
