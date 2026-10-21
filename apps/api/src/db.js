const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.db);

// Neon corta las conexiones inactivas al suspenderse: no tiene que tirar la API.
pool.on('error', (err) => {
  console.error(`Conexión a la base cerrada: ${err.message}`);
});

module.exports = pool;
