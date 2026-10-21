import Inicio from './pantallas/Inicio.jsx';
import Pachanga from './pantallas/Pachanga.jsx';

// Dos pantallas: el link público /p/<codigo> (lo que se comparte por WhatsApp) y
// el inicio del organizador. _redirects de Pages manda cualquier ruta a index.html.
export default function App() {
  const ruta = window.location.pathname.match(/^\/p\/([A-Za-z0-9_-]{11})\/?$/);
  return (
    <div className="app">
      <header className="cabecera">
        <a href="/" className="marca">⚽ Juancito <span>Pachangas</span></a>
      </header>
      {ruta ? <Pachanga codigo={ruta[1]} /> : <Inicio />}
    </div>
  );
}
