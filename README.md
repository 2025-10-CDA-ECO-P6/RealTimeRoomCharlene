# RealTimeRoom - Chat & Jeux Multijoueur

> Plateforme temps réel de chat avec jeux multijoueurs intégrés (Memory, Puissance 4)

## 🎯 Architecture

Monorepo **pnpm** avec 2 services Docker déployés sur Render :
- **API** : Express + Socket.IO (Node.js)
- **Web** : React + Vite + Nginx (Static + Proxy)

```
monorepo-chat/
├── api/           # Service API (Express + Socket.IO)
│   ├── src/index.js
│   ├── package.json
│   └── Dockerfile
├── web/           # Service Web (React + Vite)
│   ├── src/
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
└── test/          # Tests et logique partagée
```

## 📋 Prérequis

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Docker** (pour build local)
- **Git**

## 🚀 Installation & Démarrage

### Mode développement local

```bash
# Clone + install dépendances
git clone <repo>
cd RealTimeRoomCharlene
pnpm install

# Démarrage parallèle (API + Web)
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:5173
```

### Mode production (Docker local)

```bash
# Build les deux images
docker-compose build

# Démarrer les services
docker-compose up
# Web: http://localhost:80
# API: http://localhost:3001
```

### Déploiement Render

Le déploiement automatique est activé via `render.yaml` :

```bash
git push origin main
# Render détecte render.yaml et déploie automatiquement
```

**Render URL** : https://chat-api-eepo.onrender.com (à remplacer par ton URL)

## 📦 Scripts Root

```bash
pnpm dev       # Développement (tous les services en parallèle)
pnpm build     # Build production (web uniquement)
pnpm lint      # ESLint (tous les packages)
```

## 🎮 Fonctionnalités

### Chat Temps Réel
- ✅ Rejoindre une room via pseudo
- ✅ Messages synchronisés multi-navigateurs
- ✅ Indicateur de typing
- ✅ Notifications système (join/leave)

### Jeux
- 🎯 **Memory** : Solo, leaderboard local (localStorage)
- 🔴 **Puissance 4** : 2 joueurs, Socket.IO

## 🔒 Sécurité

- **Helmet.js** : Protection headers HTTP
- **CORS** : Restreint aux origines autorisées
- **Rate Limiting** : 100 req / 15 min par IP
- **Validation** : Pseudo (2-20 chars), Room (2-50 chars), Message (1-500 chars)

## 📚 Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) - CI/CD, conventions SCSS/BEM, workflow
- [API Events](./docs/SOCKET_EVENTS.md) - Documentation Socket.IO

## 🏗️ Déploiement

### Variables d'environnement

**API (.env):**
```
PORT=3001
NODE_ENV=production
```

**Web (.env):**
```
VITE_API_URL=https://chat-api-eepo.onrender.com
```

### Health Check

```bash
curl https://chat-api-eepo.onrender.com/health
# {"status":"ok","timestamp":"2026-03-19T10:30:00.000Z"}
```

## 📊 Performance & Ressources

### Optimisations Docker

- **API** : Image alpine (~150MB), pas de multi-stage
- **Web** : Multi-stage (builder + nginx), dist seul (~2MB)
- Base : Node 20-alpine + Nginx alpine

### Mémoire & CPU

- API : Render free (512MB)
- Web : Render free (512MB)

### Caching

- Frontend : Cache-Control no-store sur HTML, long TTL sur assets
- Nginx : Reverse proxy caching pour /api

## 🐛 Troubleshooting

### Puissance 4 ne synchro pas

Vérifier que :
1. Deux joueurs sont présents dans la room
2. Socket.IO proxy est activé dans nginx.conf
3. URL API est correcte dans env vars

### Socket.IO "Connexion..."

```bash
# Vérifier le health check
curl http://localhost:3001/health

# Vérifier que Socket.IO écoute
netstat -an | grep 3001
```

## 📄 Licence

MIT
