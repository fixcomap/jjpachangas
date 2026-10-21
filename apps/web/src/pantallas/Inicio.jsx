import { useEffect, useState } from 'react';
import { pedir, URL_API } from '../api.js';
import { aIso, dia, hora } from '../fechas.js';
import Logo from '../componentes/Logo.jsx';

const DEPORTES = ['Fútbol sala', 'Fútbol 7', 'Fútbol 11', 'Pádel', 'Básquet', 'Vóley'];

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

  async function crear(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    setEnviando(true);
    try {
      const { codigo } = await pedir('/pachangas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deporte: f.get('deporte'),
          cupo: Number(f.get('cupo')),
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
      <label>
        Deporte
        <input name="deporte" list="deportes" defaultValue="Fútbol sala" required maxLength={40} />
        <datalist id="deportes">{DEPORTES.map((d) => <option key={d} value={d} />)}</datalist>
      </label>
      <div className="fila">
        <label>Día<input name="fecha" type="date" required /></label>
        <label>Hora<input name="hora" type="time" required /></label>
        <label>Jugadores<input name="cupo" type="number" min={2} max={30} defaultValue={10} required /></label>
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
