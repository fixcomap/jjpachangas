import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { dia, hora } from '../fechas.js';
import { iconoDe } from '../datos/modalidades.js';
import { COLORES, color } from '../datos/colores.js';
import Equipos from '../componentes/Equipos.jsx';
import { compartirImagen, generarImagen } from '../imagen.js';

// Página del link público. Cualquiera ve la lista y se anota; el organizador,
// además, la comparte y la gestiona. En un desafío hay dos grupos: cada uno con
// su link (?g=1 / ?g=2) y el grupo 2 con su capitán (?c=<código de capitán>).
export default function Pachanga({ codigo }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  // Mi inscripción en este dispositivo: { id, nombre, token } (token = código de baja).
  const clave = `jjpachangas:${codigo}`;
  const [mia, setMia] = useState(() => leer(clave));
  const [capitan] = useState(() => tokenCapitan(codigo));
  const grupoDelLink = Number(new URLSearchParams(window.location.search).get('g')) || null;

  const guardarMia = (valor) => {
    setMia(valor);
    guardar(clave, valor);
  };
  // Todas las peticiones de esta página llevan el código de capitán si lo hay.
  const api = (ruta, opciones = {}) =>
    pedir(ruta, { ...opciones, headers: { ...(opciones.headers || {}), ...(capitan ? { 'X-Capitan-Token': capitan } : {}) } });

  useEffect(() => {
    api(`/p/${codigo}`).then(setP).catch((err) => setError(err.message));
  }, [codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si me sacaron de la lista, olvido la inscripción.
  useEffect(() => {
    if (p && mia?.id && ![...p.titulares, ...p.suplentes].some((i) => i.id === mia.id)) guardarMia(null);
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !p) return <p className="centro error">{error}</p>;
  if (!p) return <p className="centro">Cargando…</p>;

  const desafio = p.tipo === 'desafio';
  const base = `${window.location.origin}/p/${p.codigo}`;
  const cuando = `el ${dia(p.empieza_en).toLowerCase()} a las ${hora(p.empieza_en)} en ${p.lugar}`;
  const mensaje = desafio
    ? `${p.nombres[0]} vs ${p.nombres[1]}: ${p.deporte} ${cuando}. Anotate en tu equipo: ${base}`
    : `¿Querés jugar al ${p.deporte} ${cuando}? Anotate acá: ${base}`;

  const ejecutar = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };
  const enviar = (ruta, method, body) => api(ruta, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const anotarme = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    ejecutar(async () => {
      const { mi_inscripcion: nueva, ...resto } = await enviar(`/p/${codigo}/inscripciones`, 'POST', { nombre: f.get('nombre'), equipo: f.get('equipo') });
      guardarMia(nueva);
      setP(resto);
    });
  };
  const agregar = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    ejecutar(async () => {
      setP(await enviar(`/pachangas/${codigo}/inscripciones`, 'POST', { nombre: f.get('nombre'), equipo: f.get('equipo') }));
      form.reset();
    });
  };
  const bajarme = () => {
    if (!window.confirm('¿Seguro que no podés ir? Se libera tu lugar.')) return;
    ejecutar(async () => {
      setP(await api(`/p/${codigo}/inscripciones/${mia.id}`, { method: 'DELETE', headers: { 'X-Baja-Token': mia.token } }));
      guardarMia(null);
    });
  };
  // El organizador saca a cualquiera; el capitán, solo a los de su grupo (el 2).
  const sacar = (i) => ejecutar(async () => {
    const ruta = p.es_organizador ? `/pachangas/${codigo}/inscripciones/${i.id}` : `/p/${codigo}/grupos/${i.equipo}/inscripciones/${i.id}`;
    setP(await api(ruta, { method: 'DELETE' }));
  });
  const puedeSacar = (i) => p.es_organizador || (p.es_capitan && i.equipo === 2);

  const completo = desafio ? p.grupos.every((g) => g.titulares.length >= g.cupo) : p.titulares.length >= p.cupo;

  return (
    <main>
      <section className="cartel">
        <p className="cartel-pre">{desafio ? 'Desafío en' : 'Partidito en'}</p>
        <h1 className={`cartel-grande${p.lugar.length > 16 ? ' largo' : ''}`}>{p.lugar}</h1>
        {desafio && <p className="versus">{p.nombres[0]} <span>vs</span> {p.nombres[1]}</p>}
        <div className="chips">
          <span>{iconoDe(p.deporte)} {p.deporte}</span>
          <span>📅 {dia(p.empieza_en)}</span>
          <span>🕘 {hora(p.empieza_en)}</span>
        </div>
        <p className="organiza">Organiza {p.organizador}</p>
      </section>

      {p.es_organizador && !desafio && (
        <section className="acciones">
          <a className="boton whatsapp" href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>
          <button className="boton secundario" onClick={() => navigator.clipboard?.writeText(base)}>Copiar link</button>
        </section>
      )}
      {desafio && (p.es_organizador || p.es_capitan) && (
        <PanelDesafio p={p} setP={setP} api={api} enviar={enviar} base={base} cuando={cuando} mensaje={mensaje} ejecutar={ejecutar} />
      )}

      {p.es_organizador ? (
        <form className="tarjeta" onSubmit={agregar}>
          <label>
            Agregar a alguien
            <input name="nombre" required minLength={2} maxLength={40} placeholder="Nombre" autoComplete="off" />
          </label>
          {desafio && <ElegirGrupo p={p} inicial={1} />}
          <button className="boton">Agregar</button>
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
          {desafio && <ElegirGrupo p={p} inicial={grupoDelLink} fijo={!!grupoDelLink} />}
          <button className="boton">{!desafio && completo ? 'Anotarme de suplente' : 'Anotarme'}</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}

      {!desafio && <Equipos p={p} setP={setP} mensaje={mensaje} />}

      {desafio ? (
        <div className="grupos">
          {p.grupos.map((g) => (
            <Pizarra key={g.numero} titulo={g.nombre} color={g.color} cupo={g.cupo} titulares={g.titulares} suplentes={g.suplentes} mia={mia} puedeSacar={puedeSacar} sacar={sacar} />
          ))}
        </div>
      ) : (
        <Pizarra titulo={completo ? '¡Completo!' : 'Juegan'} cupo={p.cupo} titulares={p.titulares} suplentes={p.suplentes} mia={mia} puedeSacar={puedeSacar} sacar={sacar} />
      )}

      {p.es_organizador && (
        <button className="boton baja eliminar" onClick={() => {
          if (!window.confirm('¿Eliminar este partidito? Se borra la lista entera.')) return;
          ejecutar(async () => {
            await api(`/pachangas/${codigo}`, { method: 'DELETE' });
            window.location.assign('/');
          });
        }}>Eliminar partidito</button>
      )}
    </main>
  );
}

// Lista escrita con tiza: los `cupo` huecos numerados desde el principio.
function Pizarra({ titulo, color: idColor, cupo, titulares, suplentes, mia, puedeSacar, sacar }) {
  const persona = (i, n) => (
    <li key={i.id} className={i.id === mia?.id ? 'mio' : ''}>
      <span className="numero">{n}.</span>
      <span className="nombre">{i.nombre}</span>
      {puedeSacar(i) && <button className="quitar" onClick={() => sacar(i)} aria-label={`Sacar a ${i.nombre}`}>×</button>}
    </li>
  );
  const huecos = Array.from({ length: cupo }, (_, n) => titulares[n]);
  return (
    <section className="tiza" aria-label={`Lista de ${titulo}`}>
      <div className="tiza-titulo">
        <h2>{idColor && <span className="muestra grande" style={{ background: color(idColor).hex }} />} {titulo}</h2>
        <span className="cuenta">{titulares.length}/{cupo}</span>
      </div>
      <ol>
        {huecos.map((i, n) => (i ? persona(i, n + 1) : (
          <li key={`libre-${n}`} className="libre">
            <span className="numero">{n + 1}.</span>
            <span className="nombre">__________</span>
          </li>
        )))}
      </ol>
      {suplentes.length > 0 && (
        <>
          <h3>Suplentes</h3>
          <ol>{suplentes.map((i, n) => persona(i, cupo + n + 1))}</ol>
        </>
      )}
    </section>
  );
}

// Elegir en qué grupo del desafío (fijo si se entró por el link de un grupo).
function ElegirGrupo({ p, inicial, fijo }) {
  const [equipo, setEquipo] = useState(inicial || null);
  if (fijo) {
    return (
      <>
        <input type="hidden" name="equipo" value={equipo} />
        <p className="tenue">Te anotás en <strong>{p.nombres[equipo - 1]}</strong></p>
      </>
    );
  }
  return (
    <fieldset className="opciones">
      <legend>¿En qué equipo?</legend>
      <input type="hidden" name="equipo" value={equipo || ''} required />
      {p.grupos.map((g) => (
        <button type="button" key={g.numero} className={equipo === g.numero ? 'activa' : ''} aria-pressed={equipo === g.numero} onClick={() => setEquipo(g.numero)}>
          <span className="muestra" style={{ background: color(g.color).hex }} /> {g.nombre}
          <small>{g.titulares.length}/{g.cupo}</small>
        </button>
      ))}
    </fieldset>
  );
}

// Organizador (los dos grupos) o capitán (el grupo 2): links, nombres, colores e imagen.
function PanelDesafio({ p, setP, api, enviar, base, cuando, mensaje, ejecutar }) {
  const [linkCapitan, setLinkCapitan] = useState('');
  const mios = p.es_organizador ? [1, 2] : [2];
  const textoGrupo = (n) => `${p.nombres[0]} vs ${p.nombres[1]}: ${p.deporte} ${cuando}. Anotate en ${p.nombres[n - 1]}: ${base}?g=${n}`;

  const nuevoCapitan = () => ejecutar(async () => {
    const { token } = await api(`/pachangas/${p.codigo}/capitan`, { method: 'POST' });
    setLinkCapitan(`${base}?c=${token}`);
  });
  const imagen = () => ejecutar(async () => compartirImagen(await generarImagen(p), mensaje));

  return (
    <section className="tarjeta panel-desafio">
      {mios.map((n) => (
        <div key={n} className="grupo-panel">
          <EditarGrupo p={p} n={n} enviar={enviar} setP={setP} ejecutar={ejecutar} />
          <a className="boton whatsapp" href={`https://wa.me/?text=${encodeURIComponent(textoGrupo(n))}`} target="_blank" rel="noreferrer">
            Compartir link de {p.nombres[n - 1]}
          </a>
        </div>
      ))}

      {p.es_organizador && (
        <div className="capitan">
          <h3>Capitán de {p.nombres[1]}</h3>
          <p className="tenue">Con su link maneja su equipo: nombre, color, sacar gente y compartirlo con los suyos.</p>
          {linkCapitan ? (
            <>
              <a className="boton whatsapp" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Sos capitán de ${p.nombres[1]} en el desafío de ${p.deporte} ${cuando}. Con este link manejás tu equipo y lo compartís con los tuyos (no lo pases a nadie más): ${linkCapitan}`)}`}>
                Mandarle su link por WhatsApp
              </a>
              <button className="boton secundario" onClick={() => navigator.clipboard?.writeText(linkCapitan)}>Copiar link de capitán</button>
            </>
          ) : (
            <button className="boton secundario" onClick={nuevoCapitan}>Generar link de capitán</button>
          )}
          <small className="tenue">Generar uno nuevo anula el anterior.</small>
        </div>
      )}

      {p.es_organizador && p.titulares.length > 0 && (
        <button className="boton" onClick={imagen}>Generar imagen y compartir</button>
      )}
    </section>
  );
}

function EditarGrupo({ p, n, enviar, setP, ejecutar }) {
  const g = p.grupos[n - 1];
  const rival = p.grupos[2 - n].color;
  const cambiar = (body) => ejecutar(async () => setP(await enviar(`/p/${p.codigo}/grupos/${n}`, 'PATCH', body)));
  return (
    <>
      <label>
        Nombre del equipo {n}
        <input defaultValue={g.nombre} maxLength={30} onBlur={(e) => e.target.value.trim() !== g.nombre && cambiar({ nombre: e.target.value })} />
      </label>
      <fieldset className="opciones colores">
        <legend>Camiseta</legend>
        {COLORES.map((c) => (
          <button type="button" key={c.id} disabled={c.id === rival} className={g.color === c.id ? 'activa' : ''} aria-pressed={g.color === c.id} onClick={() => g.color !== c.id && cambiar({ color: c.id })}>
            <span className="muestra" style={{ background: c.hex }} /> {c.nombre}
          </button>
        ))}
      </fieldset>
    </>
  );
}

function leer(clave) {
  try {
    const valor = localStorage.getItem(clave);
    if (!valor) return null;
    // Formato anterior: solo el nombre (sin código de baja).
    return valor.startsWith('{') ? JSON.parse(valor) : { nombre: valor };
  } catch {
    return null;
  }
}

function guardar(clave, valor) {
  try {
    if (valor) localStorage.setItem(clave, typeof valor === 'string' ? valor : JSON.stringify(valor));
    else localStorage.removeItem(clave);
  } catch {
    // sin almacenamiento (modo privado): no se recuerda
  }
}

// El código de capitán llega una vez en el link (?c=): se guarda en el dispositivo
// y se quita de la barra de direcciones, para que no se comparta sin querer.
function tokenCapitan(codigo) {
  const clave = `jjpachangas:capitan:${codigo}`;
  const url = new URL(window.location.href);
  const c = url.searchParams.get('c');
  if (c && /^[0-9a-f]{48}$/.test(c)) {
    guardar(clave, c);
    url.searchParams.delete('c');
    window.history.replaceState(null, '', url.pathname + url.search);
    return c;
  }
  try {
    return localStorage.getItem(clave) || null;
  } catch {
    return null;
  }
}
