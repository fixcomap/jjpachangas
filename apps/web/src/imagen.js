// Cartel del partido para compartir: se dibuja en el navegador (canvas), con las
// mismas fuentes y colores de la web. 1080x1350 (4:5), el formato que mejor se ve
// en WhatsApp. No pasa por ningún servidor.
import { color } from './datos/colores.js';
import { dia, hora } from './fechas.js';

const W = 1080;
const H = 1350;
const NEON = '#d9ff2e';
const TIZA = '#f4f4ef';
const TENUE = '#9aa09b';

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Texto en cursiva (inclinado como en la web), centrado en x.
function textoInclinado(ctx, texto, x, y, inclinacion = -0.14) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, inclinacion, 1, 0, 0);
  ctx.fillText(texto, 0, 0);
  ctx.restore();
}

// Ajusta el tamaño de letra para que el texto quepa en `ancho`.
function ajustar(ctx, texto, familia, maximo, ancho) {
  let tam = maximo;
  do {
    ctx.font = `${tam}px ${familia}`;
    tam -= 4;
  } while (ctx.measureText(texto).width > ancho && tam > 24);
  return tam + 4;
}

// Efecto gastado: agujeritos al azar sobre lo ya dibujado en esa zona.
function gastar(ctx, x, y, w, h, cantidad) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < cantidad; i += 1) {
    const r = Math.random() < 0.85 ? Math.random() * 2.2 + 0.4 : Math.random() * 4 + 2;
    ctx.globalAlpha = Math.random() * 0.6 + 0.4;
    ctx.beginPath();
    ctx.arc(x + Math.random() * w, y + Math.random() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Camiseta simple, rellena con el color del equipo.
function camiseta(ctx, x, y, tam, relleno) {
  const s = tam / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.quadraticCurveTo(50, 14, 70, 0);
  ctx.lineTo(100, 16);
  ctx.lineTo(88, 40);
  ctx.lineTo(76, 34);
  ctx.lineTo(76, 100);
  ctx.lineTo(24, 100);
  ctx.lineTo(24, 34);
  ctx.lineTo(12, 40);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fillStyle = relleno;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = NEON;
  ctx.stroke();
  ctx.restore();
}

export async function generarImagen(p) {
  await Promise.all([document.fonts.load('80px Anton'), document.fonts.load('44px "Cabin Sketch"')]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fondo: casi negro con luz de estadio arriba y el escudo tenue detrás.
  ctx.fillStyle = '#0a0b0a';
  ctx.fillRect(0, 0, W, H);
  const luz = ctx.createRadialGradient(W / 2, -120, 40, W / 2, -120, 900);
  luz.addColorStop(0, 'rgba(60, 72, 62, 0.9)');
  luz.addColorStop(1, 'rgba(10, 11, 10, 0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, W, H);
  try {
    const escudo = await cargarImagen('/favicon.svg');
    ctx.globalAlpha = 0.07;
    ctx.drawImage(escudo, W / 2 - 420, 300, 840, 1008);
    ctx.globalAlpha = 1;
    ctx.drawImage(escudo, 60, 52, 58, 70);
  } catch {
    // sin escudo: el cartel sigue siendo válido
  }

  ctx.fillStyle = NEON;
  ctx.font = 'italic 46px Anton';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  textoInclinado(ctx, 'JJ PACHANGAS', 134, 106);

  // "PARTIDITO EN" + el lugar en grande, neón y gastado.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 70px Anton';
  textoInclinado(ctx, p.tipo === 'desafio' ? 'DESAFÍO EN' : 'PARTIDITO EN', W / 2, 250);
  // El lugar se dibuja y se gasta en un lienzo aparte: los agujeros no tienen que
  // borrar el fondo del cartel.
  const lugar = p.lugar.toUpperCase();
  const tam = ajustar(ctx, lugar, 'Anton', 170, W - 140);
  const capa = document.createElement('canvas');
  capa.width = W;
  capa.height = tam + 60;
  const cctx = capa.getContext('2d');
  cctx.font = `italic ${tam}px Anton`;
  cctx.fillStyle = NEON;
  cctx.textAlign = 'center';
  textoInclinado(cctx, lugar, W / 2, tam + 20);
  gastar(cctx, 0, 0, W, tam + 60, 1500);
  ctx.drawImage(capa, 0, 250 - 10);

  // Deporte, día y hora.
  ctx.fillStyle = '#ffffff';
  ctx.font = '40px system-ui, -apple-system, "Segoe UI", sans-serif';
  const linea = `${p.deporte}  ·  ${dia(p.empieza_en)}  ·  ${hora(p.empieza_en)}`;
  ajustar(ctx, linea, 'system-ui, -apple-system, "Segoe UI", sans-serif', 40, W - 120);
  ctx.fillText(linea, W / 2, 250 + tam + 100);

  // Dos columnas: camiseta, "EQUIPO <COLOR>" y los nombres con tiza.
  const arriba = 250 + tam + 190;
  [1, 2].forEach((n) => {
    const c = color(p.colores[n - 1]);
    const cx = n === 1 ? W / 4 + 10 : (3 * W) / 4 - 10;
    camiseta(ctx, cx - 55, arriba, 110, c.hex);
    ctx.fillStyle = NEON;
    ctx.font = 'italic 50px Anton';
    const etiqueta = (p.nombres ? p.nombres[n - 1] : `Equipo ${c.nombre}`).toUpperCase();
    ajustar(ctx, etiqueta, 'Anton', 50, W / 2 - 70);
    ctx.font = `italic ${ctx.font}`;
    textoInclinado(ctx, etiqueta, cx, arriba + 175);
    const jugadores = p.titulares.filter((i) => i.equipo === n);
    const alto = Math.min(60, Math.floor((H - (arriba + 240) - 110) / Math.max(jugadores.length, 1)));
    ctx.fillStyle = TIZA;
    jugadores.forEach((j, k) => {
      ajustar(ctx, j.nombre, '"Cabin Sketch"', Math.min(48, alto - 6), W / 2 - 80);
      ctx.fillText(j.nombre, cx, arriba + 245 + k * alto);
    });
  });

  ctx.fillStyle = TENUE;
  ctx.font = '30px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(window.location.host, W / 2, H - 48);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Móvil: hoja de compartir del sistema (WhatsApp incluido). Si no, se descarga.
export async function compartirImagen(blob, texto) {
  const archivo = new File([blob], 'partidito.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: texto });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'partidito.png' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
