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

// Cada uno puede bajarse hasta PLAZO_BAJA_HORAS antes del partido; después, solo
// el organizador lo saca (y así tiene margen para conseguir reemplazo).
const PLAZO_BAJA_HORAS = 3;
const bajaHasta = (empiezaEn) => new Date(new Date(empiezaEn).getTime() - PLAZO_BAJA_HORAS * 60 * 60 * 1000);
const puedeBajarse = (empiezaEn, ahora = new Date()) => ahora < bajaHasta(empiezaEn);

// Código de baja que se entrega al anotarse; en la base, solo su hash.
const nuevoTokenBaja = () => crypto.randomBytes(24).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Por orden de llegada: los primeros `cupo` juegan, el resto son suplentes.
function repartir(inscripciones, cupo) {
  return { titulares: inscripciones.slice(0, cupo), suplentes: inscripciones.slice(cupo) };
}

module.exports = {
  ErrorValidacion, nuevaPachanga, nombreJugador, nuevoCodigo, esCodigo, repartir,
  PLAZO_BAJA_HORAS, bajaHasta, puedeBajarse, nuevoTokenBaja, hashToken,
};
