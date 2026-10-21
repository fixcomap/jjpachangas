const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const pool = require('./db');

const app = express();

// Cloud Run: un solo proxy (Google) delante; sin esto req.ip sería el del proxy.
if (process.env.K_SERVICE) app.set('trust proxy', 1);

app.use(helmet());
// El front vive en otro subdominio (Pages): solo ese origen, con cookies.
app.use(cors({ origin: [config.frontUrl], credentials: true }));
app.use(express.json({ limit: '10kb' }));

// Cloud Run y el smoke test del pipeline: la API ve la base.
app.get('/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    console.error(`salud: ${err.message}`);
    res.status(503).json({ ok: false });
  }
});

app.use((req, res) => res.status(404).json({ error: 'No existe' }));

app.listen(config.puerto, () => {
  console.log(`API escuchando en el puerto ${config.puerto}`);
});
