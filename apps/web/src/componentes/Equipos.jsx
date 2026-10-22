import { useState } from 'react';
import { pedir } from '../api.js';
import { COLORES, color } from '../datos/colores.js';
import { compartirImagen, generarImagen } from '../imagen.js';

// Equipos de una pachanga. El organizador elige colores, reparte (a mano o
// sorteando), guarda y genera la imagen; el resto ve los equipos guardados.
export default function Equipos({ p, setP, mensaje }) {
  if (p.es_organizador) return <Editor p={p} setP={setP} mensaje={mensaje} />;
  if (!p.colores) return null;
  return <Vista p={p} />;
}

function Vista({ p }) {
  return (
    <section className="equipos">
      <h2>Equipos</h2>
      <div className="columnas">
        {[1, 2].map((n) => {
          const c = color(p.colores[n - 1]);
          return (
            <div key={n} className="columna">
              <h3><span className="muestra" style={{ background: c.hex }} /> {c.nombre}</h3>
              <ul>{p.titulares.filter((i) => i.equipo === n).map((i) => <li key={i.id}>{i.nombre}</li>)}</ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Reparto al azar en dos mitades (si son impares, el equipo 1 lleva uno más).
function sortear(titulares) {
  const mezclados = [...titulares].sort(() => Math.random() - 0.5);
  return Object.fromEntries(mezclados.map((i, k) => [i.id, k % 2 === 0 ? 1 : 2]));
}

function Editor({ p, setP, mensaje }) {
  const [colores, setColores] = useState(p.colores || ['negro', 'blanco']);
  const [reparto, setReparto] = useState(() => Object.fromEntries(p.titulares.filter((i) => i.equipo).map((i) => [i.id, i.equipo])));
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');

  if (p.titulares.length < 2) return null;
  const cambiado = JSON.stringify(colores) !== JSON.stringify(p.colores)
    || p.titulares.some((i) => (reparto[i.id] || null) !== (i.equipo || null));
  const completos = p.titulares.every((i) => reparto[i.id]);

  const elegirColor = (n, id) => {
    const otros = [...colores];
    otros[n - 1] = id;
    // Mismo color en los dos: el otro equipo se queda con el que tenía este.
    if (otros[0] === otros[1]) otros[2 - n] = colores[n - 1];
    setColores(otros);
  };

  async function guardar() {
    setError('');
    setEstado('Guardando…');
    try {
      setP(await pedir(`/pachangas/${p.codigo}/equipos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colores, equipos: reparto }),
      }));
      setEstado('Equipos guardados: ya los ve todo el que abra el link.');
    } catch (err) {
      setError(err.message);
      setEstado('');
    }
  }

  async function imagen() {
    setError('');
    setEstado('Armando la imagen…');
    try {
      await compartirImagen(await generarImagen(p), mensaje);
      setEstado('');
    } catch (err) {
      setError(`No se pudo generar la imagen: ${err.message}`);
      setEstado('');
    }
  }

  return (
    <section className="tarjeta equipos">
      <h2>Equipos</h2>
      {[1, 2].map((n) => (
        <fieldset key={n} className="opciones colores">
          <legend>Camiseta equipo {n}</legend>
          {COLORES.map((c) => (
            <button type="button" key={c.id} aria-pressed={colores[n - 1] === c.id} className={colores[n - 1] === c.id ? 'activa' : ''} onClick={() => elegirColor(n, c.id)}>
              <span className="muestra" style={{ background: c.hex }} /> {c.nombre}
            </button>
          ))}
        </fieldset>
      ))}

      <div className="reparto-cabecera">
        <legend>Reparto</legend>
        <button type="button" className="enlace" onClick={() => setReparto(sortear(p.titulares))}>🎲 Sortear</button>
      </div>
      <ul className="reparto">
        {p.titulares.map((i) => (
          <li key={i.id}>
            <span>{i.nombre}</span>
            {[1, 2].map((n) => (
              <button
                type="button"
                key={n}
                aria-pressed={reparto[i.id] === n}
                className={reparto[i.id] === n ? 'activa' : ''}
                style={reparto[i.id] === n ? { background: color(colores[n - 1]).hex, color: color(colores[n - 1]).texto } : undefined}
                onClick={() => setReparto({ ...reparto, [i.id]: n })}
              >
                {color(colores[n - 1]).nombre}
              </button>
            ))}
          </li>
        ))}
      </ul>

      {error && <p className="error">{error}</p>}
      {estado && <p className="tenue">{estado}</p>}
      <button className="boton" disabled={!completos || !cambiado} onClick={guardar}>
        {completos ? 'Guardar equipos' : 'Falta repartir a alguien'}
      </button>
      {/* Solo con los equipos guardados y todos los que juegan repartidos (alguien
          pudo anotarse después de guardar). */}
      {p.colores && !cambiado && p.titulares.every((i) => i.equipo) && (
        <button className="boton whatsapp" onClick={imagen}>Generar imagen y compartir</button>
      )}
    </section>
  );
}
