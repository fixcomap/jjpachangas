const test = require('node:test');
const assert = require('node:assert');
const { nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir, ErrorValidacion } = require('../src/validar');

const ahora = new Date('2026-10-21T12:00:00Z');
const valida = { deporte: ' Fútbol  sala ', cupo: '10', empieza_en: '2026-10-23T19:00:00Z', lugar: 'Polideportivo' };

test('nuevaPachanga limpia y convierte', () => {
  const p = nuevaPachanga(valida, ahora);
  assert.strictEqual(p.deporte, 'Fútbol sala');
  assert.strictEqual(p.cupo, 10);
  assert.strictEqual(p.empiezaEn.toISOString(), '2026-10-23T19:00:00.000Z');
});

test('nuevaPachanga rechaza lo inválido', () => {
  for (const malo of [
    { ...valida, cupo: 1 },
    { ...valida, cupo: 31 },
    { ...valida, cupo: 'diez' },
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
