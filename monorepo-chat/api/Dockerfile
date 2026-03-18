# Étape unique (pas de multi-stage nécessaire côté API — pas de build)
FROM node:20-alpine

# Dossier de travail dans le container
WORKDIR /app

# On copie d'abord les manifestes pour profiter du cache Docker
# Si package.json ne change pas, Docker réutilise le layer npm install
COPY package.json ./
RUN npm install --omit=dev

# Ensuite le code source
COPY src ./src

# Port exposé (documentaire — Render utilise la var PORT)
EXPOSE 3001

CMD ["node", "src/index.js"]