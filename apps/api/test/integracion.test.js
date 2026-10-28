// Integración: la API de verdad contra Postgres (el pipeline levanta uno y aplica las
// migraciones). Sin DATABASE_URL (en local, normalmente) se salta.
const test = require('node:test');
const assert = require('node:assert');

const conBase = Boolean(process.env.DATABASE_URL);
process.env.DEV_USER = `prueba-${Date.now()}@ejemplo.com`;
const FRONT = 'http://localhost:5173';
const enDias = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

test('API contra Postgres', { skip: !conBase && 'sin DATABASE_URL' }, async (t) => {
  const app = require('../src/index');
  const pool = require('../src/db');
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}`;
  t.after(async () => {
    servidor.close();
    await pool.query('DELETE FROM usuarios WHERE email = $1', [process.env.DEV_USER]);
    await pool.end();
  });

  const login = await fetch(`${base}/auth/login`, { redirect: 'manual' });
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie.includes('='), 'el login de desarrollo da cookie de sesión');
  // `sesion: false`: un jugador desde el link de WhatsApp, sin cuenta.
  const pedir = async (ruta, { method = 'GET', body, headers = {}, sesion = true } = {}) => {
    const r = await fetch(`${base}${ruta}`, {
      method,
      headers: { ...(sesion && { cookie }), Origin: FRONT, ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const anotar = (codigo, nombre, extra = {}) => pedir(`/p/${codigo}/inscripciones`, { method: 'POST', body: { nombre, ...extra }, sesion: false });

  await t.test('salud: la API ve la base', async () => {
    assert.strictEqual((await pedir('/salud')).status, 200);
  });

  let codigo;
  await t.test('crear: el cupo sale de la modalidad; sin sesión 401', async () => {
    const nueva = { deporte: 'Pádel dúos', empieza_en: enDias(2), lugar: 'Club de prueba' };
    assert.strictEqual((await pedir('/pachangas', { method: 'POST', body: nueva, sesion: false })).status, 401);
    assert.strictEqual((await pedir('/pachangas', { method: 'POST', body: { ...nueva, deporte: 'Curling' } })).status, 400);
    const r = await pedir('/pachangas', { method: 'POST', body: { ...nueva, cupo: 30 } });
    assert.strictEqual(r.status, 201);
    codigo = r.json.codigo;
    const lista = await pedir('/pachangas');
    assert.deepStrictEqual(lista.json.map((p) => [p.codigo, p.cupo]), [[codigo, 4]]);
  });

  let baja;
  await t.test('anotarse: titulares por orden de llegada, el resto suplentes', async () => {
    for (const nombre of ['Ana', 'Beto', 'Ceci', 'Dani']) assert.strictEqual((await anotar(codigo, nombre)).status, 201);
    const r = await anotar(codigo, 'Eli');
    baja = r.json.mi_inscripcion;
    assert.match(baja.token, /^[0-9a-f]{48}$/);
    assert.deepStrictEqual(r.json.titulares.map((i) => i.nombre), ['Ana', 'Beto', 'Ceci', 'Dani']);
    assert.deepStrictEqual(r.json.suplentes.map((i) => i.nombre), ['Eli']);
    assert.strictEqual(r.json.es_organizador, false);
    assert.strictEqual((await anotar(codigo, 'ana')).status, 409);
    assert.strictEqual((await anotar('noexiste000', 'Fede')).status, 404);
  });

  await t.test('"no puedo ir": solo con su código de baja', async () => {
    const ruta = `/p/${codigo}/inscripciones/${baja.id}`;
    assert.strictEqual((await pedir(ruta, { method: 'DELETE', sesion: false, headers: { 'X-Baja-Token': 'f'.repeat(48) } })).status, 404);
    const r = await pedir(ruta, { method: 'DELETE', sesion: false, headers: { 'X-Baja-Token': baja.token } });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json.suplentes, []);
  });

  await t.test('equipos: solo el organizador y solo entre titulares', async () => {
    const { json: e } = await pedir(`/p/${codigo}`);
    assert.strictEqual(e.es_organizador, true);
    const [a, b, c, d] = e.titulares.map((i) => i.id);
    const ruta = `/pachangas/${codigo}/equipos`;
    const cuerpo = { colores: ['rojo', 'azul'], equipos: { [a]: 1, [b]: 1, [c]: 2, [d]: 2 } };
    assert.strictEqual((await pedir(ruta, { method: 'PUT', body: cuerpo, sesion: false })).status, 401);
    assert.strictEqual((await pedir(ruta, { method: 'PUT', body: { ...cuerpo, colores: ['rojo', 'rojo'] } })).status, 400);
    assert.strictEqual((await pedir(ruta, { method: 'PUT', body: { ...cuerpo, equipos: { 999999: 1 } } })).status, 400);
    const r = await pedir(ruta, { method: 'PUT', body: cuerpo });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json.colores, ['rojo', 'azul']);
    assert.deepStrictEqual(r.json.titulares.map((i) => i.equipo), [1, 1, 2, 2]);
  });

  await t.test('desafío: el capitán gestiona solo su grupo', async () => {
    const nuevo = { deporte: 'Fútbol sala', empieza_en: enDias(3), lugar: 'Pista 1', tipo: 'desafio', nombres: ['Locos', 'Visita'], colores: ['negro', 'blanco'] };
    const { json: { codigo: desafio } } = await pedir('/pachangas', { method: 'POST', body: nuevo });
    assert.strictEqual((await anotar(desafio, 'Gabi')).status, 400, 'sin grupo no se anota');
    assert.strictEqual((await anotar(desafio, 'Gabi', { equipo: 2 })).status, 201);
    const { json: { token } } = await pedir(`/pachangas/${desafio}/capitan`, { method: 'POST' });
    const capitan = { sesion: false, headers: { 'X-Capitan-Token': token } };
    assert.strictEqual((await pedir(`/p/${desafio}/grupos/1`, { method: 'PATCH', body: { nombre: 'Robado' }, ...capitan })).status, 403);
    assert.strictEqual((await pedir(`/p/${desafio}/grupos/2`, { method: 'PATCH', body: { color: 'negro' }, ...capitan })).status, 400);
    const r = await pedir(`/p/${desafio}/grupos/2`, { method: 'PATCH', body: { nombre: 'Los de fuera', color: 'rojo' }, ...capitan });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json.grupos.map((g) => [g.nombre, g.color, g.titulares.length]), [['Locos', 'negro', 0], ['Los de fuera', 'rojo', 1]]);
  });

  await t.test('CSRF: otro origen 403, cuerpo que no es JSON 415', async () => {
    assert.strictEqual((await pedir(`/p/${codigo}/inscripciones`, { method: 'POST', body: { nombre: 'Hugo' }, headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.strictEqual((await pedir(`/p/${codigo}/inscripciones`, { method: 'POST', body: 'nombre=Hugo', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 415);
  });

  await t.test('eliminar la pachanga se lleva sus inscripciones', async () => {
    assert.strictEqual((await pedir(`/pachangas/${codigo}`, { method: 'DELETE' })).status, 200);
    assert.strictEqual((await pedir(`/p/${codigo}`)).status, 404);
  });
});
