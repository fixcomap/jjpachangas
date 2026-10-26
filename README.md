# fixcomap/jjpachangas

**Juancito Pachangas**: armás un partido (deporte, cupo, día, hora y lugar), compartís el link por
WhatsApp y la gente se anota con su nombre. Cuando se llena el cupo se avisa al organizador, que arma
los equipos con su color de camiseta y genera la imagen para mandar al grupo.

Front React (Vite) en Cloudflare Pages + API Node (Express) en Cloud Run + Postgres en Neon.

Producción: próximamente.

## Estado

| Fase | Qué | |
|---|---|---|
| 1 | Esqueleto desplegado: API con `/salud`, front, migraciones | ✅ |
| 2 | Login con Google, crear pachanga, link público, anotarse, compartir por WhatsApp | ✅ |
| 3 | Equipos con color de camiseta e imagen para compartir | ✅ |
| 4 | Aviso al organizador al llenarse el cupo (push y email) | ⏳ |

## Estructura

| Ruta | Qué es |
|---|---|
| `apps/api/` | API Express: `src/config.js` (variables, validadas al arrancar), `src/db.js`, `src/index.js` |
| `apps/api/scripts/migrar.js` | aplica `db/migrations/*.sql` pendientes; lo corre el pipeline antes de cada deploy |
| `apps/web/` | front React; `src/api.js` es el único sitio que habla con la API |
| `db/migrations/` | SQL numerado: nunca se edita uno aplicado, se agrega otro |

## Desarrollo local

Requisitos: Node 22+ y Docker.

```sh
cp .env.example .env                                   # y poner una POSTGRES_PASSWORD
docker compose up -d                                   # Postgres en localhost:5432
(cd apps/api && npm ci && npm run migrar && DEV_USER=tu@email npm run dev)   # API en :3000
(cd apps/web && npm ci && npm run dev)                     # front en http://localhost:5173
```

Vite reenvía `/api/*` a la API sin el prefijo. En Pages, el front llama a `VITE_API_URL`.
`DEV_USER` entra sin Google (solo fuera de producción). El login con Google se prueba en desarrollo.
Tests: `(cd apps/api && npm test)`.

## Despliegue

Pipeline estándar de [fixcomap/platform](https://github.com/fixcomap/platform): PR → checks;
`develop` → entorno de desarrollo (privado); `main` → producción con aprobación.
