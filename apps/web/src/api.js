// Único sitio del front que habla con la API. En local, /api (proxy de Vite);
// en Pages, VITE_API_URL (https://api-jjpachangas[.dev].fixcomap.com).
export const URL_API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(URL_API + ruta, { credentials: 'include', ...opciones });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(cuerpo?.error || `Error ${respuesta.status}`);
  return cuerpo;
}
