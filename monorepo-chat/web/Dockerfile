# ── Étape 1 : build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Installer pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copier uniquement le répertoire web et les fichiers de lockfile du monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY . ./

# Installer les dépendances uniquement pour le web package
RUN pnpm install --frozen-lockfile --filter web

# Générer dist/ avec Vite – depuis /app/monorepo-chat/web
WORKDIR /app/monorepo-chat/web
RUN pnpm build

# ── Étape 2 : serve ──────────────────────────────────────────────
# On repart d'une image Nginx vierge — on n'embarque pas node_modules
FROM nginx:alpine

# Copie uniquement le résultat du build, pas le code source
COPY --from=builder /app/monorepo-chat/web/dist /usr/share/nginx/html

# Créer la config Nginx directement (évite les problèmes de checksum Render)
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend SPA — fallback to index.html pour routing client
    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # API REST proxy
    location /api {
        proxy_pass http://chat-api:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy — Socket.IO
    location /socket.io {
        proxy_pass http://chat-api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

EXPOSE 80