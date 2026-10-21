# Imagen de la API para Cloud Run (contexto: apps/api; ver catalog/jjpachangas.yaml de platform).
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Solo dependencias de producción, exactas del lockfile. npm se borra después:
# en la imagen final no hace falta y sus dependencias internas traen CVEs.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY src ./src

USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
