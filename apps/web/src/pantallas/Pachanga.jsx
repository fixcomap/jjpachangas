import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { dia, hora } from '../fechas.js';
import { iconoDe } from '../datos/modalidades.js';
import Equipos from '../componentes/Equipos.jsx';

// Página del link público. Cualquiera ve la lista y se anota; el organizador,
// además, la comparte por WhatsApp y puede sacar a alguien.
export default function Pachanga({ codigo }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  // Mi inscripción en este dispositivo: { id, nombre, token } (token = código de baja).
  const clave = `jjpachangas:${codigo}`;
  const [mia, setMia] = useState(() => leerMia(clave));
  const guardarMia = (valor) => {
    setMia(valor);
    try {
      if (valor) localStorage.setItem(clave, JSON.stringify(valor));
      else localStorage.removeItem(clave);
    } catch {
      // sin almacenamiento (modo privado): no se recuerda la inscripción
    }
  };

  useEffect(() => {
    pedir(`/p/${codigo}`).then(setP).catch((err) => setError(err.message));
  }, [codigo]);

  // Si el organizador me sacó de la lista, olvido la inscripción.
  useEffect(() => {
    if (p && mia?.id && ![...p.titulares, ...p.suplentes].some((i) => i.id === mia.id)) guardarMia(null);
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const { mi_inscripcion: nueva, ...resto } = await pedir(`/p/${codigo}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      guardarMia(nueva);
      setP(resto);
    } catch (err) {
      setError(err.message);
    }
  }

  // Solo el organizador: agrega a alguien a mano.
  async function agregar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setError('');
    try {
      setP(await pedir(`/pachangas/${codigo}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: new FormData(form).get('nombre') }),
      }));
      form.reset();
    } catch (err) {
      setError(err.message);
    }
  }

  async function bajarme() {
    if (!window.confirm(`¿Seguro que no podés ir? Se libera tu lugar.`)) return;
    setError('');
    try {
      setP(await pedir(`/p/${codigo}/inscripciones/${mia.id}`, {
        method: 'DELETE',
        headers: { 'X-Baja-Token': mia.token },
      }));
      guardarMia(null);
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
    <li key={i.id} className={i.id === mia?.id ? 'mio' : ''}>
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

      {p.es_organizador ? (
        <form className="tarjeta" onSubmit={agregar}>
          <label>
            Agregar a alguien
            <input name="nombre" required minLength={2} maxLength={40} placeholder="Nombre" autoComplete="off" />
          </label>
          <button className="boton">{anotados >= p.cupo ? 'Agregar de suplente' : 'Agregar a la lista'}</button>
        </form>
      ) : mia ? (
        <div className="anotado">
          <p>Estás anotado como <strong>{mia.nombre}</strong> 💪</p>
          {mia.token && new Date() < new Date(p.baja_hasta) && (
            <>
              <button className="boton baja" onClick={bajarme}>No puedo ir</button>
              <small>Podés bajarte hasta el {dia(p.baja_hasta).toLowerCase()} a las {hora(p.baja_hasta)}.</small>
            </>
          )}
          {mia.token && new Date() >= new Date(p.baja_hasta) && (
            <small>Faltan menos de 3 horas: si no podés ir, avisale a {p.organizador}.</small>
          )}
        </div>
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

      <Equipos p={p} setP={setP} mensaje={mensaje} />

      {p.es_organizador && (
        <button className="boton baja eliminar" onClick={async () => {
          if (!window.confirm('¿Eliminar este partidito? Se borra la lista entera.')) return;
          await pedir(`/pachangas/${codigo}`, { method: 'DELETE' });
          window.location.assign('/');
        }}>Eliminar partidito</button>
      )}

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

// Formato anterior: solo el nombre (sin código de baja).
function leerMia(clave) {
  try {
    const valor = localStorage.getItem(clave);
    if (!valor) return null;
    return valor.startsWith('{') ? JSON.parse(valor) : { nombre: valor };
  } catch {
    return null;
  }
}
