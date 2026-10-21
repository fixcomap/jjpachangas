// Deportes y modalidades: cada modalidad fija cuántos juegan. Misma lista que
// apps/api/src/modalidades.js (la API rechaza combinaciones que no estén aquí).
export const DEPORTES = [
  {
    id: 'futbol',
    nombre: 'Fútbol',
    icono: '⚽',
    modalidades: [
      { nombre: 'Fútbol sala', corto: 'Sala', cupo: 10 },
      { nombre: 'Fútbol 6', corto: 'Fútbol 6', cupo: 12 },
      { nombre: 'Fútbol 7', corto: 'Fútbol 7', cupo: 14 },
      { nombre: 'Fútbol 9', corto: 'Fútbol 9', cupo: 18 },
      { nombre: 'Fútbol 11', corto: 'Fútbol 11', cupo: 22 },
    ],
  },
  {
    id: 'padel',
    nombre: 'Pádel',
    icono: '🎾',
    modalidades: [
      { nombre: 'Pádel simples', corto: 'Simples', cupo: 2 },
      { nombre: 'Pádel dúos', corto: 'Dúos', cupo: 4 },
    ],
  },
  {
    id: 'tenis',
    nombre: 'Tenis',
    icono: '🎾',
    modalidades: [
      { nombre: 'Tenis simples', corto: 'Simples', cupo: 2 },
      { nombre: 'Tenis dúos', corto: 'Dúos', cupo: 4 },
    ],
  },
];

export const iconoDe = (deporte) =>
  DEPORTES.find((d) => d.modalidades.some((m) => m.nombre === deporte))?.icono || '⚽';
