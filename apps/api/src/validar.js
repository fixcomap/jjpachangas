// Validación de lo que llega del front: nunca se confía en el cliente. Funciones
// puras (sin base) para poder probarlas con node --test.
const crypto = require('crypto');
const MODALIDADES = require('./modalidades');

class ErrorValidacion extends Error {}

// "  Juan   Pérez " -> "Juan Pérez"
function texto(valor, campo, min, max) {
  const limpio = String(valor ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length < min || limpio.length > max) {
    throw new ErrorValidacion(`${campo}: entre ${min} y ${max} caracteres`);
  }
  return limpio;
}

function nuevaPachanga(body, ahora = new Date()) {
  const deporte = String(body?.deporte ?? '');
  const cupo = MODALIDADES.get(deporte);
  if (!cupo) throw new ErrorValidacion(`deporte: elegí una de ${[...MODALIDADES.keys()].join(', ')}`);
  const empiezaEn = new Date(body?.empieza_en);
  if (Number.isNaN(empiezaEn.getTime())) throw new ErrorValidacion('empieza_en: fecha y hora inválidas');
  if (empiezaEn < ahora) throw new ErrorValidacion('empieza_en: tiene que ser en el futuro');
  if (empiezaEn - ahora > 366 * 24 * 60 * 60 * 1000) throw new ErrorValidacion('empieza_en: como mucho dentro de un año');
  return {
    deporte,
    cupo,
    empiezaEn,
    lugar: texto(body?.lugar, 'lugar', 2, 120),
  };
}

const nombreJugador = (valor) => texto(valor, 'nombre', 2, 40);

// Va en el link público: 11 caracteres al azar (64 bits), no adivinable.
const nuevoCodigo = () => crypto.randomBytes(8).toString('base64url');
const esCodigo = (valor) => typeof valor === 'string' && /^[A-Za-z0-9_-]{11}$/.test(valor);

// Por orden de llegada: los primeros `cupo` juegan, el resto son suplentes.
function repartir(inscripciones, cupo) {
  return { titulares: inscripciones.slice(0, cupo), suplentes: inscripciones.slice(cupo) };
}

module.exports = { ErrorValidacion, nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir };
