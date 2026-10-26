// Colores de camiseta: los mismos que acepta la API (apps/api/src/colores.js).
export const COLORES = [
  { id: 'negro', nombre: 'Negro', hex: '#151515', texto: '#f2f2ee' },
  { id: 'blanco', nombre: 'Blanco', hex: '#f4f4f0', texto: '#111111' },
  { id: 'rojo', nombre: 'Rojo', hex: '#d62828', texto: '#ffffff' },
  { id: 'azul', nombre: 'Azul', hex: '#1d4ed8', texto: '#ffffff' },
];

export const color = (id) => COLORES.find((c) => c.id === id);
