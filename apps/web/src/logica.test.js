import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { COLORES, color } from './datos/colores.js';
import { DEPORTES } from './datos/modalidades.js';
import { aIso, dia } from './fechas.js';

// El front dice tener "las mismas listas que la API": este test lo garantiza.
const require = createRequire(import.meta.url);
const coloresApi = require('../../api/src/colores.js');
const modalidadesApi = require('../../api/src/modalidades.js');

describe('listas compartidas con la API', () => {
  it('colores de camiseta', () => {
    expect(COLORES.map((c) => c.id)).toEqual(coloresApi);
    expect(color('rojo').hex).toBe('#d62828');
  });
  it('modalidades y su cupo', () => {
    const front = new Map(DEPORTES.flatMap((d) => d.modalidades.map((m) => [m.nombre, m.cupo])));
    expect(front).toEqual(modalidadesApi);
  });
});

describe('fechas', () => {
  it('fecha y hora locales a ISO con zona, y vuelta', () => {
    const iso = aIso('2026-10-23', '19:30');
    expect(new Date(iso).getHours()).toBe(19);
    expect(dia(iso)).toMatch(/^Viernes, 23 de octubre$/);
  });
});
