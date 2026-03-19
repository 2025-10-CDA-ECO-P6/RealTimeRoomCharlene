# Étape unique (pas de multi-stage nécessaire côté API — pas de build)
FROM node:20-alpine

# Installer pnpm
RUN npm install -g pnpm@8

# Dossier de travail dans le container
WORKDIR /app

# On copie d'abord les manifestes pour profiter du cache Docker
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY monorepo-chat/api/package.json ./monorepo-chat/api/

# Installer les dépendances (production only)
RUN pnpm install --frozen-lockfile --prod

# Ensuite le code source
COPY monorepo-chat/api ./monorepo-chat/api

# Port exposé (documentaire — Render utilise la var PORT)
EXPOSE 3001

CMD ["node", "monorepo-chat/api/src/index.js"]