// Escudo de JJ Pachangas: tres estrellas, "JJ", pelota y "PACHANGAS" en arco.
// La pelota es un diseño propio con los colores de los anfitriones del Mundial
// 2026 (México, EE. UU., Canadá); no copia el balón oficial, que es marca registrada.
const PANELES = [
  { color: '#e4002b', puntos: '100,97 87.6,88 92.4,73.5 107.6,73.5 112.4,88' },
  { color: '#00843d', puntos: '121.9,112.9 126.6,98.4 141.9,98.4 146.6,112.9 134.2,121.9' },
  { color: '#0057b8', puntos: '113.5,138.6 128.8,138.6 133.5,153.1 121.2,162.1 108.8,153.1' },
  { color: '#e4002b', puntos: '86.5,138.6 91.2,153.1 78.8,162.1 66.5,153.1 71.2,138.6' },
  { color: '#0057b8', puntos: '78.1,112.9 65.8,121.9 53.4,112.9 58.1,98.4 73.4,98.4' },
];
const COSTURAS = [
  '100,107 100,97', '112.4,116 121.9,112.9', '107.6,130.5 113.5,138.6', '92.4,130.5 86.5,138.6', '87.6,116 78.1,112.9',
  '111.8,103.8 125.9,84.4', '119,126.2 141.8,133.6', '100,140 100,164', '81,126.2 58.2,133.6', '88.2,103.8 74.1,84.4',
];
const ESCUDO = 'M100 8 L190 34 C190 120 172 186 100 232 C28 186 10 120 10 34 Z';
const escala = (s) => `translate(100 120) scale(${s}) translate(-100 -120)`;

function Estrella({ x }) {
  return <polygon transform={`translate(${x} 36) scale(0.8)`} points="0,-10 2.9,-3.1 9.5,-3.1 4.2,1.2 6.2,8.1 0,4 -6.2,8.1 -4.2,1.2 -9.5,-3.1 -2.9,-3.1" fill="#d9ff2e" />;
}

export default function Logo({ className, titulo = 'JJ Pachangas' }) {
  return (
    <svg className={className} viewBox="0 0 200 240" {...(titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true })}>
      <defs>
        <clipPath id="jj-pelota"><circle cx="100" cy="120" r="40" /></clipPath>
        <path id="jj-arco" d="M46 174 Q100 218 154 174" />
      </defs>
      {/* Borde: neón, negro y el campo del escudo */}
      <path d={ESCUDO} fill="#d9ff2e" />
      <path d={ESCUDO} transform={escala(0.94)} fill="#0a0b0a" />
      <path d={ESCUDO} transform={escala(0.89)} fill="#1b201c" />

      <Estrella x={72} />
      <Estrella x={100} />
      <Estrella x={128} />
      <text x="100" y="70" textAnchor="middle" fill="#f2f2ee" fontFamily="Anton, Impact, sans-serif" fontSize="26" letterSpacing="2">JJ</text>

      <g transform={`translate(0 -4) ${escala(1.0)}`}>
        <g clipPath="url(#jj-pelota)">
          <circle cx="100" cy="120" r="40" fill="#fff" />
          {PANELES.map((p, i) => <polygon key={i} points={p.puntos} fill={p.color} />)}
          <polygon points="100,107 112.4,116 107.6,130.5 92.4,130.5 87.6,116" fill="#0a0b0a" />
          {COSTURAS.map((c, i) => <polyline key={i} points={c} stroke="#0a0b0a" strokeWidth="1.6" fill="none" />)}
        </g>
        <circle cx="100" cy="120" r="40" fill="none" stroke="#0a0b0a" strokeWidth="2.5" />
      </g>

      <text fill="#f2f2ee" fontFamily="Anton, Impact, sans-serif" fontSize="23" letterSpacing="1.2">
        <textPath href="#jj-arco" startOffset="50%" textAnchor="middle">PACHANGAS</textPath>
      </text>
    </svg>
  );
}
