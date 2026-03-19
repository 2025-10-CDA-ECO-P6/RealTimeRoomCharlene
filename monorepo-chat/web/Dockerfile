# ── Étape 1 : build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Installer pnpm
RUN npm install -g pnpm@8

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY monorepo-chat/web/package.json ./monorepo-chat/web/
COPY monorepo-chat/test ./monorepo-chat/test

RUN pnpm install --frozen-lockfile

COPY monorepo-chat/web ./monorepo-chat/web

# Vite génère le dossier dist/
RUN pnpm --filter web build

# ── Étape 2 : serve ──────────────────────────────────────────────
# On repart d'une image Nginx vierge — on n'embarque pas node_modules
FROM nginx:alpine

# Copie uniquement le résultat du build, pas le code source
COPY --from=builder /app/monorepo-chat/web/dist /usr/share/nginx/html
COPY monorepo-chat/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80