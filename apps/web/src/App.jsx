import Inicio from './pantallas/Inicio.jsx';
import Pachanga from './pantallas/Pachanga.jsx';
import Logo from './componentes/Logo.jsx';

// Dos pantallas: el link público /p/<codigo> (lo que se comparte por WhatsApp) y
// el inicio del organizador. _redirects de Pages manda cualquier ruta a index.html.
export default function App() {
  const ruta = window.location.pathname.match(/^\/p\/([A-Za-z0-9_-]{11})\/?$/);
  return (
    <>
      {/* El escudo en grande detrás de todo: decorativo, no se lee ni recibe clics. */}
      <div className="fondo-escudo" aria-hidden="true"><Logo titulo="" /></div>
      <div className="app">
        <header className="cabecera">
          <a href="/" className="marca" aria-label="JJ Pachangas, inicio">
            <Logo className="logo-cabecera" titulo="" />
            <span className="marca-texto">JJ Pachangas</span>
          </a>
        </header>
        {ruta ? <Pachanga codigo={ruta[1]} /> : <Inicio />}
      </div>
    </>
  );
}
