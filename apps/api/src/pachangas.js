// Pachangas: el organizador (con sesión) las crea y gestiona; cualquiera con el
// link (/p/<codigo>) ve la lista y se anota con su nombre, sin cuenta.
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const { requiereSesion } = require('./auth');
const { ErrorValidacion, nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir } = require('./validar');

// Anotarse es público: límite por IP para que un script no llene la lista.
const limitadorInscripcion = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

async function estado(codigo, usuario) {
  const { rows } = await pool.query(
    `SELECT p.id, p.codigo, p.deporte, p.cupo, p.empieza_en, p.lugar, p.organizador_id, u.nombre AS organizador
     FROM pachangas p JOIN usuarios u ON u.id = p.organizador_id WHERE p.codigo = $1`,
    [codigo]
  );
  const p = rows[0];
  if (!p) return null;
  const { rows: inscripciones } = await pool.query(
    'SELECT id, nombre FROM inscripciones WHERE pachanga_id = $1 ORDER BY creada_en, id',
    [p.id]
  );
  return {
    codigo: p.codigo,
    deporte: p.deporte,
    cupo: p.cupo,
    empieza_en: p.empieza_en,
    lugar: p.lugar,
    organizador: p.organizador,
    es_organizador: usuario?.id === p.organizador_id,
    ...repartir(inscripciones, p.cupo),
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
  const { rows } = await pool.query(
    `INSERT INTO pachangas (codigo, organizador_id, deporte, cupo, empieza_en, lugar)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING codigo`,
    [nuevoCodigo(), req.usuario.id, p.deporte, p.cupo, p.empiezaEn, p.lugar]
  );
  res.status(201).json(rows[0]);
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
  res.json(await estado(req.params.codigo, req.usuario));
}));

// ---------- público (link de WhatsApp) ----------

router.get('/p/:codigo', manejar(async (req, res) => {
  const e = esCodigo(req.params.codigo) ? await estado(req.params.codigo, req.usuario) : null;
  if (!e) return res.status(404).json({ error: 'Esta pachanga no existe' });
  res.json(e);
}));

router.post('/p/:codigo/inscripciones', limitadorInscripcion, manejar(async (req, res) => {
  if (!esCodigo(req.params.codigo)) return res.status(404).json({ error: 'Esta pachanga no existe' });
  const nombre = nombreJugador(req.body?.nombre);
  try {
    const { rowCount } = await pool.query(
      `INSERT INTO inscripciones (pachanga_id, nombre)
       SELECT id, $2 FROM pachangas WHERE codigo = $1 AND empieza_en > now()`,
      [req.params.codigo, nombre]
    );
    if (!rowCount) return res.status(410).json({ error: 'Esta pachanga ya pasó o no existe' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Ya hay alguien anotado como "${nombre}"` });
    throw err;
  }
  res.status(201).json(await estado(req.params.codigo, req.usuario));
}));

module.exports = router;
