FROM node:20-alpine

RUN npm install -g pnpm@8

WORKDIR /app

# Depuis la racine du repo (contexte = racine)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY monorepo-chat/api/package.json ./monorepo-chat/api/
COPY monorepo-chat/web/package.json ./monorepo-chat/web/

# Install dépendances (prod only)
RUN pnpm install --frozen-lockfile --prod

# Code API
COPY monorepo-chat/api ./monorepo-chat/api

EXPOSE 3001

CMD ["node", "monorepo-chat/api/src/index.js"]
EXPOSE 3001

CMD ["node", "monorepo-chat/api/src/index.js"]