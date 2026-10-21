// Fechas en la zona y el idioma del navegador de cada uno.
const formatoDia = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
const formatoHora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

// "viernes, 23 de octubre" -> "Viernes, 23 de octubre"
export const dia = (iso) => {
  const texto = formatoDia.format(new Date(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
export const hora = (iso) => formatoHora.format(new Date(iso));

// <input type="date"> + <input type="time"> (hora local) -> ISO con zona.
export const aIso = (fecha, horaLocal) => new Date(`${fecha}T${horaLocal}`).toISOString();
