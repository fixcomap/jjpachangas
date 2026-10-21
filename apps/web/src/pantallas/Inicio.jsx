import { useEffect, useState } from 'react';
import { pedir, URL_API } from '../api.js';
import { aIso, dia, hora } from '../fechas.js';
import Logo from '../componentes/Logo.jsx';
import { DEPORTES } from '../datos/modalidades.js';


export default function Inicio() {
  const [usuario, setUsuario] = useState(undefined); // undefined = cargando, null = sin sesión
  const [pachangas, setPachangas] = useState([]);

  useEffect(() => {
    pedir('/auth/yo')
      .then((u) => {
        setUsuario(u);
        return pedir('/pachangas').then(setPachangas);
      })
      .catch(() => setUsuario(null));
  }, []);

  if (usuario === undefined) return <p className="centro">Cargando…</p>;

  if (!usuario) {
    const errorLogin = new URLSearchParams(window.location.search).get('error') === 'login';
    return (
      <main className="hero">
        <Logo className="logo-hero" />
        <p className="cartel-pre">Armá el</p>
        <h1 className="cartel-grande">Partidito</h1>
        <p>Creás la pachanga, mandás el link por WhatsApp y cada uno se anota con su nombre.</p>
        {errorLogin && <p className="error">No se pudo entrar con Google. Probá de nuevo.</p>}
        <a className="boton" href={`${URL_API}/auth/login`}>Entrar con Google</a>
      </main>
    );
  }

  const salir = () => pedir('/auth/salir', { method: 'POST' }).finally(() => window.location.assign('/'));

  return (
    <main>
      <p className="hola">
        Hola, {usuario.nombre} · <button className="enlace" onClick={salir}>Salir</button>
      </p>
      <NuevaPachanga />
      {pachangas.length > 0 && (
        <section>
          <h2>Tus partiditos</h2>
          <ul className="lista">
            {pachangas.map((p) => (
              <li key={p.codigo}>
                <a href={`/p/${p.codigo}`}>
                  <span>
                    <strong>{p.lugar}</strong>
                    <br />
                    <span className="tenue">{p.deporte} · {dia(p.empieza_en)}, {hora(p.empieza_en)}</span>
                  </span>
                  <span className="contador">{Math.min(p.anotados, p.cupo)}/{p.cupo}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function NuevaPachanga() {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [deporteId, setDeporteId] = useState(DEPORTES[0].id);
  const deporte = DEPORTES.find((d) => d.id === deporteId);
  const [modalidad, setModalidad] = useState(deporte.modalidades[0].nombre);
  const elegida = deporte.modalidades.find((m) => m.nombre === modalidad) || deporte.modalidades[0];

  function elegirDeporte(id) {
    setDeporteId(id);
    setModalidad(DEPORTES.find((d) => d.id === id).modalidades[0].nombre);
  }

  async function crear(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    setEnviando(true);
    try {
      const { codigo } = await pedir('/pachangas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El cupo lo fija la API según la modalidad.
        body: JSON.stringify({
          deporte: elegida.nombre,
          empieza_en: aIso(f.get('fecha'), f.get('hora')),
          lugar: f.get('lugar'),
        }),
      });
      window.location.assign(`/p/${codigo}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <form className="tarjeta" onSubmit={crear}>
      <h2>Nuevo partidito</h2>
      <fieldset className="opciones">
        <legend>Deporte</legend>
        {DEPORTES.map((d) => (
          <button type="button" key={d.id} className={d.id === deporteId ? 'activa' : ''} aria-pressed={d.id === deporteId} onClick={() => elegirDeporte(d.id)}>
            {d.icono} {d.nombre}
          </button>
        ))}
      </fieldset>
      <fieldset className="opciones">
        <legend>Modalidad</legend>
        {deporte.modalidades.map((m) => (
          <button type="button" key={m.nombre} className={m.nombre === elegida.nombre ? 'activa' : ''} aria-pressed={m.nombre === elegida.nombre} onClick={() => setModalidad(m.nombre)}>
            {m.corto}
            <small>{m.cupo} jugadores</small>
          </button>
        ))}
      </fieldset>
      <div className="fila">
        <label>Día<input name="fecha" type="date" required /></label>
        <label>Hora<input name="hora" type="time" required /></label>
      </div>
      <label>
        Dónde
        <input name="lugar" placeholder="Polideportivo, cancha, dirección…" required maxLength={120} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="boton" disabled={enviando}>{enviando ? 'Armando…' : 'Armar partidito'}</button>
    </form>
  );
}
