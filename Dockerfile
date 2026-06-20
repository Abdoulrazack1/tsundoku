# Image de production — mono-serveur (API + front statique)
FROM node:20-alpine

WORKDIR /app

# Dépendances backend (cache de couche)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Code
COPY server ./server
COPY client ./client

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/server
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
