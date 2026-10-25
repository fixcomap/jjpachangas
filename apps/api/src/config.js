// Configuración desde variables de entorno. En local se lee el .env de la raíz
// y hay valores por defecto; en producción (NODE_ENV=production, Cloud Run) no:
// si falta una obligatoria, la API no arranca y dice cuál (nunca el valor).
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
}

const ES_PRODUCCION = process.env.NODE_ENV === 'production';
const OBLIGATORIAS_EN_PRODUCCION = ['DATABASE_URL', 'FRONT_URL', 'API_URL', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

class ErrorConfig extends Error {}

function leer(nombre) {
  const valor = process.env[nombre];
  return valor && valor.trim() ? valor.trim() : '';
}

// "https://jjpachangas.fixcomap.com/" -> "https://jjpachangas.fixcomap.com"
function origen(nombre, porDefecto) {
  const valor = leer(nombre) || (ES_PRODUCCION ? '' : porDefecto);
  let url;
  try {
    url = new URL(valor);
  } catch {
    throw new ErrorConfig(`${nombre} no es una URL válida`);
  }
  if (ES_PRODUCCION && url.protocol !== 'https:') throw new ErrorConfig(`${nombre} tiene que empezar con https://`);
  return url.origin;
}

// Producción: siempre SSL verificado, diga lo que diga sslmode en la URL.
function conexion() {
  if (!ES_PRODUCCION) {
    return leer('DATABASE_URL')
      ? { connectionString: leer('DATABASE_URL') }
      : { host: 'localhost', port: 5432, user: 'jjpachangas', database: 'jjpachangas', password: leer('POSTGRES_PASSWORD') };
  }
  let url;
  try {
    url = new URL(leer('DATABASE_URL'));
  } catch {
    throw new ErrorConfig('DATABASE_URL no es una URL válida');
  }
  for (const p of ['sslmode', 'channel_binding', 'uselibpqcompat']) url.searchParams.delete(p);
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } };
}

function cargar() {
  if (ES_PRODUCCION) {
    const faltan = OBLIGATORIAS_EN_PRODUCCION.filter((n) => !leer(n));
    if (faltan.length) throw new ErrorConfig(`Faltan variables de entorno obligatorias: ${faltan.join(', ')}`);
    if (leer('SESSION_SECRET').length < 32) throw new ErrorConfig('SESSION_SECRET tiene que tener al menos 32 caracteres');
  }
  return {
    esProduccion: ES_PRODUCCION,
    puerto: Number(process.env.PORT || 3000),
    db: conexion(),
    frontUrl: origen('FRONT_URL', 'http://localhost:5173'),
    apiUrl: origen('API_URL', 'http://localhost:3000'),
    sessionSecret: leer('SESSION_SECRET') || 'solo-para-desarrollo-local-no-usar-en-produccion',
    // Login con Google. En local, sin cliente OAuth, DEV_USER entra sin Google.
    googleClientId: leer('GOOGLE_CLIENT_ID'),
    googleClientSecret: leer('GOOGLE_CLIENT_SECRET'),
    devUser: ES_PRODUCCION ? '' : leer('DEV_USER'),
    // Desarrollo restringido (catalog: webapp.development.restricted): solo estos
    // emails pueden entrar. Vacío o placeholder (sin "@") = sin restricción.
    accesoEmails: (process.env.ACCESO_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@')),
  };
}

try {
  module.exports = cargar();
} catch (err) {
  if (!(err instanceof ErrorConfig)) throw err;
  console.error(`Configuración inválida: ${err.message}`);
  process.exit(1);
}
