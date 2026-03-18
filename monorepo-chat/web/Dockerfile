# ── Étape 1 : build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
# Vite génère le dossier dist/
RUN npm run build

# ── Étape 2 : serve ──────────────────────────────────────────────
# On repart d'une image Nginx vierge — on n'embarque pas node_modules
FROM nginx:alpine

# Copie uniquement le résultat du build, pas le code source
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80