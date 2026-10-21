const test = require('node:test');
const assert = require('node:assert');
const { nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir, ErrorValidacion } = require('../src/validar');

const ahora = new Date('2026-10-21T12:00:00Z');
const valida = { deporte: 'Fútbol 7', empieza_en: '2026-10-23T19:00:00Z', lugar: 'Polideportivo' };

test('nuevaPachanga: el cupo sale de la modalidad, no del cliente', () => {
  const p = nuevaPachanga({ ...valida, cupo: 30 }, ahora);
  assert.strictEqual(p.deporte, 'Fútbol 7');
  assert.strictEqual(p.cupo, 14);
  assert.strictEqual(nuevaPachanga({ ...valida, deporte: 'Pádel dúos' }, ahora).cupo, 4);
  assert.strictEqual(nuevaPachanga({ ...valida, deporte: 'Fútbol 11' }, ahora).cupo, 22);
  assert.strictEqual(p.empiezaEn.toISOString(), '2026-10-23T19:00:00.000Z');
});

test('nuevaPachanga rechaza lo inválido', () => {
  for (const malo of [
    { ...valida, deporte: 'Fútbol 8' },
    { ...valida, deporte: 'fútbol 7' },
    { ...valida, deporte: undefined },
    { ...valida, empieza_en: '2026-10-20T19:00:00Z' },
    { ...valida, empieza_en: 'mañana' },
    { ...valida, empieza_en: '2028-01-01T00:00:00Z' },
    { ...valida, lugar: 'x' },
    { ...valida, deporte: '' },
  ]) {
    assert.throws(() => nuevaPachanga(malo, ahora), ErrorValidacion, JSON.stringify(malo));
  }
});

test('nombreJugador', () => {
  assert.strictEqual(nombreJugador('  Juan   Pérez '), 'Juan Pérez');
  assert.throws(() => nombreJugador('J'), ErrorValidacion);
  assert.throws(() => nombreJugador('x'.repeat(41)), ErrorValidacion);
});

test('código del link', () => {
  const c = nuevoCodigo();
  assert.ok(esCodigo(c), c);
  assert.notStrictEqual(c, nuevoCodigo());
  assert.ok(!esCodigo('../etc/passwd'));
  assert.ok(!esCodigo('corto'));
});

test('repartir titulares y suplentes por orden de llegada', () => {
  const lista = [1, 2, 3, 4, 5].map((id) => ({ id }));
  assert.deepStrictEqual(repartir(lista, 3), { titulares: lista.slice(0, 3), suplentes: lista.slice(3) });
  assert.deepStrictEqual(repartir(lista.slice(0, 2), 3), { titulares: lista.slice(0, 2), suplentes: [] });
});

test('las modalidades del front y de la API coinciden', async () => {
  const MODALIDADES = require('../src/modalidades');
  const { DEPORTES } = await import('../../web/src/datos/modalidades.js');
  const delFront = new Map(DEPORTES.flatMap((d) => d.modalidades.map((m) => [m.nombre, m.cupo])));
  assert.deepStrictEqual(delFront, MODALIDADES);
});

test('plazo para bajarse: hasta 3 h antes del partido', () => {
  const { puedeBajarse, bajaHasta } = require('../src/validar');
  const partido = '2026-10-23T19:00:00Z';
  assert.strictEqual(bajaHasta(partido).toISOString(), '2026-10-23T16:00:00.000Z');
  assert.ok(puedeBajarse(partido, new Date('2026-10-23T15:59:00Z')));
  assert.ok(!puedeBajarse(partido, new Date('2026-10-23T16:00:00Z')));
  assert.ok(!puedeBajarse(partido, new Date('2026-10-23T18:30:00Z')));
});

test('token de baja: al azar y solo se guarda su hash', () => {
  const { nuevoTokenBaja, hashToken } = require('../src/validar');
  const t = nuevoTokenBaja();
  assert.match(t, /^[0-9a-f]{48}$/);
  assert.notStrictEqual(t, nuevoTokenBaja());
  assert.strictEqual(hashToken(t), hashToken(t));
  assert.notStrictEqual(hashToken(t), t);
});
