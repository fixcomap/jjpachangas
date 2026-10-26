import { useEffect, useState } from 'react';
import { pedir, URL_API } from '../api.js';
import { aIso, dia, hora } from '../fechas.js';
import { DEPORTES } from '../datos/modalidades.js';
import { COLORES } from '../datos/colores.js';


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
    const error = new URLSearchParams(window.location.search).get('error');
    return (
      <main className="hero">
        <p className="cartel-pre">Armá el</p>
        <h1 className="cartel-grande">Partidito</h1>
        <p>Creás la pachanga, mandás el link por WhatsApp y cada uno se anota con su nombre.</p>
        {error === 'login' && <p className="error">No se pudo entrar con Google. Probá de nuevo.</p>}
        {error === 'acceso' && <p className="error">Este entorno es privado: tu cuenta no tiene acceso.</p>}
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
      <NuevaPachanga miNombre={usuario.nombre.split(' ')[0]} />
      <Lista titulo="Tus partiditos" pachangas={pachangas.filter((p) => new Date(p.empieza_en) > new Date())} setPachangas={setPachangas} />
      <Lista titulo="Ya jugados" nota="Se borran solos un día después del partido." pachangas={pachangas.filter((p) => new Date(p.empieza_en) <= new Date())} setPachangas={setPachangas} />
    </main>
  );
}

function Lista({ titulo, nota, pachangas, setPachangas }) {
  if (!pachangas.length) return null;
  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar el partidito en ${p.lugar}? Se borra la lista entera.`)) return;
    await pedir(`/pachangas/${p.codigo}`, { method: 'DELETE' });
    setPachangas((todas) => todas.filter((x) => x.codigo !== p.codigo));
  }
  return (
    <section>
      <h2>{titulo}</h2>
      {nota && <p className="tenue">{nota}</p>}
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
            <button className="quitar" onClick={() => eliminar(p)} aria-label={`Eliminar el partidito en ${p.lugar}`}>🗑</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NuevaPachanga({ miNombre }) {
  const [tipo, setTipo] = useState('abierta');
  const [colores, setColores] = useState(['negro', 'blanco']);
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
          tipo,
          ...(tipo === 'desafio' ? { nombres: [f.get('nombre1'), f.get('nombre2')], colores } : {}),
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
        <legend>Tipo</legend>
        <button type="button" className={tipo === 'abierta' ? 'activa' : ''} aria-pressed={tipo === 'abierta'} onClick={() => setTipo('abierta')}>
          Lista abierta<small>se anotan y armás los equipos</small>
        </button>
        <button type="button" className={tipo === 'desafio' ? 'activa' : ''} aria-pressed={tipo === 'desafio'} onClick={() => setTipo('desafio')}>
          Desafío<small>tu equipo contra otro</small>
        </button>
      </fieldset>
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
            <small>{tipo === 'desafio' ? `${m.cupo / 2} contra ${m.cupo / 2}` : `${m.cupo} jugadores`}</small>
          </button>
        ))}
      </fieldset>
      {tipo === 'desafio' && [1, 2].map((n) => (
        <div key={n}>
          <label>
            {n === 1 ? 'Tu equipo' : 'El equipo rival'}
            <input name={`nombre${n}`} required minLength={2} maxLength={30} defaultValue={n === 1 ? `Los de ${miNombre}` : ''} placeholder={n === 2 ? 'Los de Juan' : ''} />
          </label>
          <fieldset className="opciones colores">
            <legend>Camiseta</legend>
            {COLORES.map((c) => (
              <button type="button" key={c.id} disabled={colores[2 - n] === c.id} className={colores[n - 1] === c.id ? 'activa' : ''} aria-pressed={colores[n - 1] === c.id}
                onClick={() => setColores(n === 1 ? [c.id, colores[1]] : [colores[0], c.id])}>
                <span className="muestra" style={{ background: c.hex }} /> {c.nombre}
              </button>
            ))}
          </fieldset>
        </div>
      ))}
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
