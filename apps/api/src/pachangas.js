// Pachangas: el organizador (con sesión) las crea y gestiona; cualquiera con el
// link (/p/<codigo>) ve la lista y se anota con su nombre, sin cuenta. En un
// desafío, el capitán del grupo 2 gestiona el suyo con su código (X-Capitan-Token).
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const { requiereSesion } = require('./auth');
const {
  ErrorValidacion, nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir,
  PLAZO_BAJA_HORAS, bajaHasta, puedeBajarse, nuevoTokenBaja, hashToken, equipos,
  grupoDeInscripcion, cambiosGrupo,
} = require('./validar');

// Anotarse es público: límite por IP para que un script no llene la lista.
const limitadorInscripcion = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

// Las pachangas se borran solas 1 día después de jugarse (con sus inscripciones).
// Sin cron: lo hace la propia API al listar o abrir una, como mucho cada 10 min
// por instancia. Barato (índice por fecha) y sin servicios extra.
const MARGEN_BORRADO = '1 day';
let ultimaLimpieza = 0;
async function limpiarViejas() {
  if (Date.now() - ultimaLimpieza < 10 * 60 * 1000) return;
  ultimaLimpieza = Date.now();
  try {
    const { rowCount } = await pool.query(`DELETE FROM pachangas WHERE empieza_en < now() - interval '${MARGEN_BORRADO}'`);
    if (rowCount) console.log(`limpieza: ${rowCount} pachanga(s) vieja(s) borrada(s)`);
  } catch (err) {
    console.error(`limpieza: ${err.message}`);
  }
}

async function fila(codigo) {
  const { rows } = await pool.query(
    `SELECT p.id, p.codigo, p.deporte, p.cupo, p.empieza_en, p.lugar, p.organizador_id, p.color_1, p.color_2,
            p.tipo, p.nombre_1, p.nombre_2, p.capitan_hash, u.nombre AS organizador
     FROM pachangas p JOIN usuarios u ON u.id = p.organizador_id WHERE p.codigo = $1`,
    [codigo]
  );
  return rows[0] || null;
}

// Quién es quien en esta petición: organizador (sesión) o capitán del grupo 2.
function roles(p, req) {
  const token = req.get('X-Capitan-Token');
  return {
    organizador: req.usuario?.id === p.organizador_id,
    capitan: p.tipo === 'desafio' && !!token && !!p.capitan_hash && p.capitan_hash === hashToken(token),
  };
}

async function estado(codigo, req) {
  const { rows } = await pool.query(
    `SELECT p.id, p.codigo, p.deporte, p.cupo, p.empieza_en, p.lugar, p.organizador_id, p.color_1, p.color_2,
            p.tipo, p.nombre_1, p.nombre_2, p.capitan_hash, u.nombre AS organizador
     FROM pachangas p JOIN usuarios u ON u.id = p.organizador_id WHERE p.codigo = $1`,
    [codigo]
  );
  const p = rows[0];
  if (!p) return null;
  const { rows: inscripciones } = await pool.query(
    'SELECT id, nombre, equipo FROM inscripciones WHERE pachanga_id = $1 ORDER BY creada_en, id',
    [p.id]
  );
  const { organizador, capitan } = roles(p, req);
  let reparto;
  if (p.tipo === 'desafio') {
    // Mitad del cupo por grupo; titulares y suplentes por orden de llegada en cada uno.
    const mitad = p.cupo / 2;
    const grupos = [1, 2].map((n) => repartir(inscripciones.filter((i) => i.equipo === n), mitad));
    reparto = {
      titulares: [...grupos[0].titulares, ...grupos[1].titulares],
      suplentes: [...grupos[0].suplentes, ...grupos[1].suplentes],
      grupos: grupos.map((g, k) => ({ numero: k + 1, nombre: p[`nombre_${k + 1}`], color: p[`color_${k + 1}`], cupo: mitad, ...g })),
    };
  } else {
    reparto = repartir(inscripciones, p.cupo);
  }
  return {
    codigo: p.codigo,
    tipo: p.tipo,
    deporte: p.deporte,
    cupo: p.cupo,
    empieza_en: p.empieza_en,
    lugar: p.lugar,
    organizador: p.organizador,
    es_organizador: organizador,
    es_capitan: capitan,
    baja_hasta: bajaHasta(p.empieza_en),
    colores: p.color_1 ? [p.color_1, p.color_2] : null,
    nombres: p.tipo === 'desafio' ? [p.nombre_1, p.nombre_2] : null,
    ...reparto,
  };
}

function manejar(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
      next(err);
    }
  };
}

const router = express.Router();

// ---------- organizador ----------

router.get('/pachangas', requiereSesion, manejar(async (req, res) => {
  await limpiarViejas();
  const { rows } = await pool.query(
    `SELECT p.codigo, p.deporte, p.cupo, p.empieza_en, p.lugar, count(i.id)::int AS anotados
     FROM pachangas p LEFT JOIN inscripciones i ON i.pachanga_id = p.id
     WHERE p.organizador_id = $1 GROUP BY p.id ORDER BY p.empieza_en DESC LIMIT 50`,
    [req.usuario.id]
  );
  res.json(rows);
}));

router.post('/pachangas', requiereSesion, manejar(async (req, res) => {
  const p = nuevaPachanga(req.body);
  const g = p.grupos;
  const { rows } = await pool.query(
    `INSERT INTO pachangas (codigo, organizador_id, deporte, cupo, empieza_en, lugar, tipo, nombre_1, nombre_2, color_1, color_2)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING codigo`,
    [nuevoCodigo(), req.usuario.id, p.deporte, p.cupo, p.empiezaEn, p.lugar, p.tipo,
      g?.nombres[0] ?? null, g?.nombres[1] ?? null, g?.colores[0] ?? null, g?.colores[1] ?? null]
  );
  res.status(201).json(rows[0]);
}));

// Eliminar la pachanga entera (con sus inscripciones): solo el organizador.
router.delete('/pachangas/:codigo', requiereSesion, manejar(async (req, res) => {
  if (!esCodigo(req.params.codigo)) return res.status(404).json({ error: 'No existe' });
  const { rowCount } = await pool.query('DELETE FROM pachangas WHERE codigo = $1 AND organizador_id = $2', [req.params.codigo, req.usuario.id]);
  if (!rowCount) return res.status(404).json({ error: 'No existe' });
  res.json({ ok: true });
}));

// Agregar a alguien a mano (avisó por WhatsApp, en persona...): solo el organizador.
// Sin código de baja: a esa persona solo la puede sacar el organizador.
router.post('/pachangas/:codigo/inscripciones', requiereSesion, manejar(async (req, res) => {
  if (!esCodigo(req.params.codigo)) return res.status(404).json({ error: 'No existe' });
  const p = await fila(req.params.codigo);
  if (!p || p.organizador_id !== req.usuario.id) return res.status(404).json({ error: 'No existe' });
  const nombre = nombreJugador(req.body?.nombre);
  const equipo = grupoDeInscripcion(p.tipo, req.body?.equipo);
  try {
    const { rowCount } = await pool.query(
      `INSERT INTO inscripciones (pachanga_id, nombre, equipo)
       SELECT id, $2, $3 FROM pachangas WHERE codigo = $1 AND empieza_en > now()`,
      [req.params.codigo, nombre, equipo]
    );
    if (!rowCount) return res.status(404).json({ error: 'No existe o ya pasó' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Ya hay alguien anotado como "${nombre}"` });
    throw err;
  }
  res.status(201).json(await estado(req.params.codigo, req));
}));

// Guardar los equipos: colores de camiseta y reparto de los titulares. Solo el organizador.
router.put('/pachangas/:codigo/equipos', requiereSesion, manejar(async (req, res) => {
  if (!esCodigo(req.params.codigo)) return res.status(404).json({ error: 'No existe' });
  const e = await estado(req.params.codigo, req);
  if (!e || !e.es_organizador) return res.status(404).json({ error: 'No existe' });
  if (e.tipo === 'desafio') return res.status(400).json({ error: 'En un desafío los equipos ya están armados' });
  const { colores, asignaciones } = equipos(req.body, e.titulares.map((i) => i.id));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE pachangas SET color_1 = $2, color_2 = $3 WHERE codigo = $1', [req.params.codigo, ...colores]);
    await client.query(
      'UPDATE inscripciones SET equipo = NULL WHERE pachanga_id = (SELECT id FROM pachangas WHERE codigo = $1)',
      [req.params.codigo]
    );
    for (const [id, equipo] of asignaciones) {
      await client.query('UPDATE inscripciones SET equipo = $2 WHERE id = $1', [id, equipo]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  res.json(await estado(req.params.codigo, req));
}));

// Link del capitán del grupo 2 (desafío): genera un código nuevo e invalida el anterior.
// Solo viaja en esta respuesta; en la base, el hash.
router.post('/pachangas/:codigo/capitan', requiereSesion, manejar(async (req, res) => {
  const p = esCodigo(req.params.codigo) ? await fila(req.params.codigo) : null;
  if (!p || p.organizador_id !== req.usuario.id || p.tipo !== 'desafio') return res.status(404).json({ error: 'No existe' });
  const token = nuevoTokenBaja();
  await pool.query('UPDATE pachangas SET capitan_hash = $2 WHERE id = $1', [p.id, hashToken(token)]);
  res.json({ token });
}));

// Sacar a alguien de la lista (se equivocó de nombre, no viene...): solo el organizador.
router.delete('/pachangas/:codigo/inscripciones/:id', requiereSesion, manejar(async (req, res) => {
  const id = Number(req.params.id);
  if (!esCodigo(req.params.codigo) || !Number.isInteger(id)) return res.status(404).json({ error: 'No existe' });
  const { rowCount } = await pool.query(
    `DELETE FROM inscripciones i USING pachangas p
     WHERE i.id = $1 AND i.pachanga_id = p.id AND p.codigo = $2 AND p.organizador_id = $3`,
    [id, req.params.codigo, req.usuario.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'No existe' });
  res.json(await estado(req.params.codigo, req));
}));

// ---------- público (link de WhatsApp) ----------

router.get('/p/:codigo', manejar(async (req, res) => {
  await limpiarViejas();
  const e = esCodigo(req.params.codigo) ? await estado(req.params.codigo, req) : null;
  if (!e) return res.status(404).json({ error: 'Esta pachanga no existe' });
  res.json(e);
}));

router.post('/p/:codigo/inscripciones', limitadorInscripcion, manejar(async (req, res) => {
  const p = esCodigo(req.params.codigo) ? await fila(req.params.codigo) : null;
  if (!p) return res.status(404).json({ error: 'Esta pachanga no existe' });
  const nombre = nombreJugador(req.body?.nombre);
  const equipo = grupoDeInscripcion(p.tipo, req.body?.equipo);
  const token = nuevoTokenBaja();
  let id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO inscripciones (pachanga_id, nombre, baja_hash, equipo)
       SELECT id, $2, $3, $4 FROM pachangas WHERE codigo = $1 AND empieza_en > now()
       RETURNING id`,
      [req.params.codigo, nombre, hashToken(token), equipo]
    );
    if (!rows.length) return res.status(410).json({ error: 'Esta pachanga ya pasó o no existe' });
    id = rows[0].id;
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Ya hay alguien anotado como "${nombre}"` });
    throw err;
  }
  // El token solo viaja esta vez: el front lo guarda en el dispositivo para "No puedo ir".
  res.status(201).json({ ...(await estado(req.params.codigo, req)), mi_inscripcion: { id, nombre, token } });
}));

// "No puedo ir": quien se anotó, con su código de baja, hasta PLAZO_BAJA_HORAS antes.
router.delete('/p/:codigo/inscripciones/:id', manejar(async (req, res) => {
  const id = Number(req.params.id);
  const token = req.get('X-Baja-Token');
  if (!esCodigo(req.params.codigo) || !Number.isInteger(id) || !token) return res.status(404).json({ error: 'No existe' });
  const { rows } = await pool.query(
    `SELECT i.id, p.empieza_en FROM inscripciones i JOIN pachangas p ON p.id = i.pachanga_id
     WHERE i.id = $1 AND p.codigo = $2 AND i.baja_hash = $3`,
    [id, req.params.codigo, hashToken(token)]
  );
  if (!rows.length) return res.status(404).json({ error: 'No encontramos tu inscripción' });
  if (!puedeBajarse(rows[0].empieza_en)) {
    return res.status(403).json({ error: `Faltan menos de ${PLAZO_BAJA_HORAS} horas: ya no te podés bajar. Avisale al organizador.` });
  }
  await pool.query('DELETE FROM inscripciones WHERE id = $1', [id]);
  res.json(await estado(req.params.codigo, req));
}));

// ---------- grupos del desafío: organizador (los dos) o capitán (el 2) ----------

async function grupoGestionable(req, res) {
  const n = Number(req.params.n);
  const p = esCodigo(req.params.codigo) && (n === 1 || n === 2) ? await fila(req.params.codigo) : null;
  if (!p || p.tipo !== 'desafio') {
    res.status(404).json({ error: 'No existe' });
    return null;
  }
  const { organizador, capitan } = roles(p, req);
  if (!organizador && !(capitan && n === 2)) {
    res.status(403).json({ error: 'Solo el organizador o el capitán de ese equipo' });
    return null;
  }
  return { p, n };
}

// Renombrar o cambiar el color de un grupo.
router.patch('/p/:codigo/grupos/:n', manejar(async (req, res) => {
  const g = await grupoGestionable(req, res);
  if (!g) return;
  const cambios = cambiosGrupo(req.body, g.n, g.p[`color_${3 - g.n}`]);
  if (cambios.nombre) await pool.query(`UPDATE pachangas SET nombre_${g.n} = $2 WHERE id = $1`, [g.p.id, cambios.nombre]);
  if (cambios.color) await pool.query(`UPDATE pachangas SET color_${g.n} = $2 WHERE id = $1`, [g.p.id, cambios.color]);
  res.json(await estado(req.params.codigo, req));
}));

// Sacar a alguien de un grupo.
router.delete('/p/:codigo/grupos/:n/inscripciones/:id', manejar(async (req, res) => {
  const g = await grupoGestionable(req, res);
  if (!g) return;
  const { rowCount } = await pool.query('DELETE FROM inscripciones WHERE id = $1 AND pachanga_id = $2 AND equipo = $3', [Number(req.params.id), g.p.id, g.n]);
  if (!rowCount) return res.status(404).json({ error: 'No existe' });
  res.json(await estado(req.params.codigo, req));
}));

module.exports = router;
