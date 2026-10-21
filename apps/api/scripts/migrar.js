// Aplica en orden las migraciones pendientes de db/migrations: npm run migrar
// Lo corre el pipeline antes de cada deploy (webapp.migrate en el catálogo de
// platform), con la cadena DIRECTA de Neon: el lock de sesión no pasa por el pooler.
// Cada migración va en su transacción y queda anotada en schema_migraciones.
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

const CARPETA = path.resolve(__dirname, '../../../db/migrations');
const ID_LOCK = 73730001; // dos "migrar" a la vez: el segundo espera

async function main() {
  const archivos = fs.readdirSync(CARPETA).filter((f) => /^\d+_[\w-]+\.sql$/.test(f)).sort();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ID_LOCK]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migraciones (
      nombre text PRIMARY KEY,
      aplicada_en timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT nombre FROM schema_migraciones');
    const aplicadas = new Set(rows.map((r) => r.nombre));
    const pendientes = archivos.filter((f) => !aplicadas.has(f));
    for (const archivo of pendientes) {
      try {
        await client.query('BEGIN');
        await client.query(fs.readFileSync(path.join(CARPETA, archivo), 'utf8'));
        await client.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
        await client.query('COMMIT');
        console.log(`Aplicada: ${archivo}`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`${archivo}: ${err.message}`);
      }
    }
    console.log(pendientes.length ? `Listo: ${pendientes.length} migración(es).` : 'No hay migraciones pendientes.');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ID_LOCK]).catch(() => {});
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(`Error aplicando migraciones: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
