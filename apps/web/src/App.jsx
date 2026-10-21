import { useEffect, useState } from 'react';
import { pedir } from './api.js';

// Fase 1: pantalla mínima que confirma que front, API y base están conectados.
export default function App() {
  const [estado, setEstado] = useState('comprobando…');

  useEffect(() => {
    pedir('/salud')
      .then((r) => setEstado(r.ok ? 'API y base de datos funcionando' : 'la API no ve la base'))
      .catch(() => setEstado('no se pudo conectar con la API'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '15vh auto', padding: 16, textAlign: 'center' }}>
      <h1>Juancito Pachangas</h1>
      <p>Armá el partido, compartí el link y que se anoten.</p>
      <p><small>{estado}</small></p>
    </main>
  );
}
