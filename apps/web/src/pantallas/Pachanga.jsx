import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { dia, hora } from '../fechas.js';
import { iconoDe } from '../datos/modalidades.js';

// Página del link público. Cualquiera ve la lista y se anota; el organizador,
// además, la comparte por WhatsApp y puede sacar a alguien.
export default function Pachanga({ codigo }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const clave = `jjpachangas:${codigo}`;
  const [miNombre, setMiNombre] = useState(() => {
    try {
      return localStorage.getItem(clave) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    pedir(`/p/${codigo}`).then(setP).catch((err) => setError(err.message));
  }, [codigo]);

  if (error && !p) return <p className="centro error">{error}</p>;
  if (!p) return <p className="centro">Cargando…</p>;

  const anotados = p.titulares.length;
  const link = `${window.location.origin}/p/${p.codigo}`;
  const mensaje = `¿Querés jugar al ${p.deporte} el ${dia(p.empieza_en)} a las ${hora(p.empieza_en)} en ${p.lugar}? Anotate acá: ${link}`;

  async function anotarme(e) {
    e.preventDefault();
    const nombre = new FormData(e.currentTarget).get('nombre');
    setError('');
    try {
      setP(await pedir(`/p/${codigo}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      }));
      const limpio = String(nombre).replace(/\s+/g, ' ').trim();
      setMiNombre(limpio);
      try {
        localStorage.setItem(clave, limpio);
      } catch {
        // sin almacenamiento (modo privado): solo no recordamos el nombre
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function sacar(id) {
    setError('');
    try {
      setP(await pedir(`/pachangas/${codigo}/inscripciones/${id}`, { method: 'DELETE' }));
    } catch (err) {
      setError(err.message);
    }
  }

  const persona = (i, n) => (
    <li key={i.id}>
      <span className="numero">{n}.</span>
      <span className="nombre">{i.nombre}</span>
      {p.es_organizador && <button className="quitar" onClick={() => sacar(i.id)} aria-label={`Sacar a ${i.nombre}`}>×</button>}
    </li>
  );

  // Pizarra: los `cupo` huecos numerados desde el principio; se llenan por orden de llegada.
  const huecos = Array.from({ length: p.cupo }, (_, n) => p.titulares[n]);

  return (
    <main>
      <section className="cartel">
        <p className="cartel-pre">Partidito en</p>
        <h1 className={`cartel-grande${p.lugar.length > 16 ? ' largo' : ''}`}>{p.lugar}</h1>
        <div className="chips">
          <span>{iconoDe(p.deporte)} {p.deporte}</span>
          <span>📅 {dia(p.empieza_en)}</span>
          <span>🕘 {hora(p.empieza_en)}</span>
        </div>
        <p className="organiza">Organiza {p.organizador}</p>
      </section>

      {p.es_organizador && (
        <section className="acciones">
          <a className="boton whatsapp" href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            Compartir por WhatsApp
          </a>
          <button className="boton secundario" onClick={() => navigator.clipboard?.writeText(link)}>Copiar link</button>
        </section>
      )}

      {miNombre ? (
        <p className="anotado">Estás anotado como <strong>{miNombre}</strong> 💪</p>
      ) : (
        <form className="tarjeta" onSubmit={anotarme}>
          <label>
            Tu nombre
            <input name="nombre" required minLength={2} maxLength={40} autoComplete="name" />
          </label>
          <button className="boton">{anotados >= p.cupo ? 'Anotarme de suplente' : 'Anotarme'}</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}

      <section className="tiza" aria-label="Lista de jugadores">
        <div className="tiza-titulo">
          <h2>{anotados >= p.cupo ? '¡Completo!' : 'Juegan'}</h2>
          <span className="cuenta">{anotados}/{p.cupo}</span>
        </div>
        <ol>
          {huecos.map((i, n) => (i ? persona(i, n + 1) : (
            <li key={`libre-${n}`} className="libre">
              <span className="numero">{n + 1}.</span>
              <span className="nombre">__________</span>
            </li>
          )))}
        </ol>
        {p.suplentes.length > 0 && (
          <>
            <h3>Suplentes</h3>
            <ol>{p.suplentes.map((i, n) => persona(i, p.cupo + n + 1))}</ol>
          </>
        )}
      </section>
    </main>
  );
}
