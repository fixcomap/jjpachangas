# fixcomap/jjpachangas

**Juancito Pachangas**: armás un partido (deporte, cupo, día, hora y lugar), compartís el link por
WhatsApp y la gente se anota con su nombre. Cuando se llena el cupo se avisa al organizador, que arma
los equipos con su color de camiseta y genera la imagen para mandar al grupo.

Front React (Vite) en Cloudflare Pages + API Node (Express) en Cloud Run + Postgres en Neon.

| Entorno | Front | API | Rama |
|---|---|---|---|
| Producción | https://jjpachangas.fixcomap.com | https://api-jjpachangas.fixcomap.com | `main` |
| Desarrollo | https://jjpachangas.dev.fixcomap.com | https://api-jjpachangas.dev.fixcomap.com | `develop` |
| Local | http://localhost:5173 | http://localhost:3000 | tu rama |

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
`DEV_USER` entra sin Google (solo fuera de producción). Para probar el login real en local:
`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env` (el cliente ya tiene la redirect URI de localhost).
Tests: `(cd apps/api && npm test)`.

## API

| Ruta | Quién | Qué |
|---|---|---|
| `GET /auth/login`, `/auth/callback` | — | login con Google (código OAuth en el servidor) |
| `GET /auth/yo`, `POST /auth/salir` | organizador | sesión actual / cerrarla |
| `GET /pachangas`, `POST /pachangas` | organizador | sus pachangas / crear una (devuelve el `codigo` del link) |
| `POST /pachangas/:codigo/inscripciones` | organizador | agregar a alguien a mano |
| `PUT /pachangas/:codigo/equipos` | organizador | colores de camiseta y reparto de los titulares |
| `DELETE /pachangas/:codigo/inscripciones/:id` | organizador | sacar a alguien de la lista |
| `GET /p/:codigo` | cualquiera con el link | detalle, titulares y suplentes |
| `POST /p/:codigo/inscripciones` | cualquiera con el link | anotarse con un nombre (20 por IP cada 15 min); devuelve el código de baja |
| `DELETE /p/:codigo/inscripciones/:id` | quien se anotó (`X-Baja-Token`) | bajarse, hasta 3 h antes del partido |

La imagen para compartir la genera el navegador del organizador (`apps/web/src/imagen.js`, canvas 1080×1350).

## Cómo se despliega

Este repo no tiene pipeline propio: `.github/workflows/ci.yml` llama al pipeline estándar de
[`fixcomap/platform`](https://github.com/fixcomap/platform), que lee
[`catalog/jjpachangas.yaml`](https://github.com/fixcomap/platform/blob/main/catalog/jjpachangas.yaml).

| Evento | Qué pasa |
|---|---|
| PR a `develop` o `main` | gitflow, gitleaks + trivy + higiene, `npm ci` + build de `apps/api` y `apps/web`, imagen + trivy |
| Merge a `develop` | migraciones en `jjpachangas_dev`, API en `jjpachangas-dev`, front en Pages (rama `develop`) |
| Merge a `main` | lo mismo en producción tras aprobar el environment `production`; tag `vX.Y.Z` de `VERSION` |

GitFlow: `feature/*` → `develop` (PR, checks en verde); `release/x.y.z` → `main`; después, back-merge.

## Configuración en Cloud Run

| Variable | Origen |
|---|---|
| `DATABASE_URL` | secreto `jjpachangas[-dev]-database-url` (cadena *pooled* de Neon, rol `jjpachangas`) |
| `SESSION_SECRET` | secreto `jjpachangas[-dev]-session-secret` (32+ caracteres al azar) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | secretos del cliente OAuth de Google (fase 2) |
| `FRONT_URL`, `API_URL` | catálogo: primer hostname del entorno |
| `NODE_ENV`, `PORT` | `Dockerfile` |

Migraciones: secreto `jjpachangas[-dev]-database-url-direct` (cadena directa, sin pooler).
