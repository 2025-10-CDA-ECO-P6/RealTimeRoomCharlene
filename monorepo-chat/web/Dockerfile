# ── BUILD STAGE ────────────────────────────────────────────────
FROM node:20-alpine AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm install -g pnpm@8

WORKDIR /app

# Depuis la racine du repo (contexte = racine)
COPY package.json pnpm-workspace.yaml pnpm-workspace.yaml ./
COPY monorepo-chat/web/package.json ./monorepo-chat/web/
COPY monorepo-chat/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY monorepo-chat/web/src ./monorepo-chat/web/src

# Install dépendances
RUN pnpm install --frozen-lockfile

# Code source web
COPY monorepo-chat/web ./monorepo-chat/web

# Build
RUN pnpm --filter web build

# ── SERVE STAGE ────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/monorepo-chat/web/dist /usr/share/nginx/html
COPY monorepo-chat/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80