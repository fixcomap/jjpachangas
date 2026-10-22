// Validación de lo que llega del front: nunca se confía en el cliente. Funciones
// puras (sin base) para poder probarlas con node --test.
const crypto = require('crypto');
const MODALIDADES = require('./modalidades');
const COLORES = require('./colores');

class ErrorValidacion extends Error {}

// "  Juan   Pérez " -> "Juan Pérez"
function texto(valor, campo, min, max) {
  const limpio = String(valor ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length < min || limpio.length > max) {
    throw new ErrorValidacion(`${campo}: entre ${min} y ${max} caracteres`);
  }
  return limpio;
}

// Dos colores de camiseta de la lista y distintos entre sí.
function coloresValidos(colores) {
  const [c1, c2] = Array.isArray(colores) ? colores : [];
  if (!COLORES.includes(c1) || !COLORES.includes(c2)) throw new ErrorValidacion(`colores: elegí entre ${COLORES.join(', ')}`);
  if (c1 === c2) throw new ErrorValidacion('colores: cada equipo con un color distinto');
  return [c1, c2];
}

const nombreGrupo = (valor, n) => texto(valor, `nombre del equipo ${n}`, 2, 30);

// tipo "abierta": una lista y el organizador reparte después. "desafio": dos
// grupos fijos desde el principio (nombre y color cada uno), mitad del cupo cada uno.
function nuevaPachanga(body, ahora = new Date()) {
  const deporte = String(body?.deporte ?? '');
  const cupo = MODALIDADES.get(deporte);
  if (!cupo) throw new ErrorValidacion(`deporte: elegí una de ${[...MODALIDADES.keys()].join(', ')}`);
  const empiezaEn = new Date(body?.empieza_en);
  if (Number.isNaN(empiezaEn.getTime())) throw new ErrorValidacion('empieza_en: fecha y hora inválidas');
  if (empiezaEn < ahora) throw new ErrorValidacion('empieza_en: tiene que ser en el futuro');
  if (empiezaEn - ahora > 366 * 24 * 60 * 60 * 1000) throw new ErrorValidacion('empieza_en: como mucho dentro de un año');
  const tipo = body?.tipo === 'desafio' ? 'desafio' : 'abierta';
  const nombres = Array.isArray(body?.nombres) ? body.nombres : [];
  return {
    deporte,
    cupo,
    empiezaEn,
    lugar: texto(body?.lugar, 'lugar', 2, 120),
    tipo,
    grupos: tipo === 'desafio'
      ? { nombres: [nombreGrupo(nombres[0], 1), nombreGrupo(nombres[1], 2)], colores: coloresValidos(body?.colores) }
      : null,
  };
}

// En un desafío, a qué grupo se anota (1 o 2); en una lista abierta, ninguno.
function grupoDeInscripcion(tipo, valor) {
  if (tipo !== 'desafio') return null;
  const n = Number(valor);
  if (n !== 1 && n !== 2) throw new ErrorValidacion('equipo: elegí en qué equipo jugás');
  return n;
}

// Cambios de un grupo del desafío: nombre y/o color (distinto del del rival).
function cambiosGrupo(body, n, colorRival) {
  const cambios = {};
  if (body?.nombre !== undefined) cambios.nombre = nombreGrupo(body.nombre, n);
  if (body?.color !== undefined) {
    if (!COLORES.includes(body.color)) throw new ErrorValidacion(`color: elegí entre ${COLORES.join(', ')}`);
    if (body.color === colorRival) throw new ErrorValidacion('color: el rival ya usa ese color');
    cambios.color = body.color;
  }
  if (!Object.keys(cambios).length) throw new ErrorValidacion('nada que cambiar');
  return cambios;
}

const nombreJugador = (valor) => texto(valor, 'nombre', 2, 40);

// Va en el link público: 11 caracteres al azar (64 bits), no adivinable.
const nuevoCodigo = () => crypto.randomBytes(8).toString('base64url');
const esCodigo = (valor) => typeof valor === 'string' && /^[A-Za-z0-9_-]{11}$/.test(valor);

// Cada uno puede bajarse hasta PLAZO_BAJA_HORAS antes del partido; después, solo
// el organizador lo saca (y así tiene margen para conseguir reemplazo).
const PLAZO_BAJA_HORAS = 3;
const bajaHasta = (empiezaEn) => new Date(new Date(empiezaEn).getTime() - PLAZO_BAJA_HORAS * 60 * 60 * 1000);
const puedeBajarse = (empiezaEn, ahora = new Date()) => ahora < bajaHasta(empiezaEn);

// Código de baja que se entrega al anotarse; en la base, solo su hash.
const nuevoTokenBaja = () => crypto.randomBytes(24).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Equipos: { colores: [c1, c2], equipos: { <id inscripción>: 1 | 2 } }. Solo
// titulares; colores de la lista y distintos entre sí.
function equipos(body, idsTitulares) {
  const [c1, c2] = coloresValidos(body?.colores);
  const titulares = new Set(idsTitulares);
  const asignaciones = new Map();
  for (const [id, equipo] of Object.entries(body?.equipos ?? {})) {
    if (!titulares.has(Number(id))) throw new ErrorValidacion('equipos: solo se reparten los que juegan');
    if (equipo !== 1 && equipo !== 2) throw new ErrorValidacion('equipos: cada jugador va al equipo 1 o al 2');
    asignaciones.set(Number(id), equipo);
  }
  return { colores: [c1, c2], asignaciones };
}

// Por orden de llegada: los primeros `cupo` juegan, el resto son suplentes.
function repartir(inscripciones, cupo) {
  return { titulares: inscripciones.slice(0, cupo), suplentes: inscripciones.slice(cupo) };
}

module.exports = {
  ErrorValidacion, nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir,
  PLAZO_BAJA_HORAS, bajaHasta, puedeBajarse, nuevoTokenBaja, hashToken, equipos,
  grupoDeInscripcion, cambiosGrupo,
};
