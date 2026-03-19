# Guide de Contribution

## 🏗️ Structure du Monorepo

```
RealTimeRoomCharlene/
├── monorepo-chat/
│   ├── api/            # Express + Socket.IO
│   ├── web/            # React + Vite
│   └── test/           # Logique partagée + tests
├── pnpm-workspace.yaml
├── package.json        # Root scripts
└── render.yaml         # Config déploiement Render
```

## 📝 Conventions de Code

### SCSS/BEM

Toutes les règles de style utilisent **BEM** (Block, Element, Modifier).

#### Format

```scss
// ❌ Mauvais
.chatContainer header h1 {
  color: blue;
}

// ✅ Bon
.chat {
  &__header {
    font-size: 1.25rem;
  }

  &__title {
    color: $color-primary;
  }

  &__title--active {
    font-weight: bold;
  }
}
```

#### Règles

- **Block** : Entité principale (`.chat`, `.memory-board`)
- **Element** : Partie du block (`.chat__main`, `.memory-board__cell`)
- **Modifier** : Variation (`.chat__item--me`, `.memory-card--matched`)

#### Variables SCSS

```scss
@use 'variables' as *;

// Dans _variables.scss
$color-primary: #06b6d4;
$color-secondary: #10b981;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
```

## 🔧 Scripts

### Root (pnpm)

```bash
pnpm dev          # Dev mode (API + Web parallèle)
pnpm build        # Build web production
pnpm lint         # Lint tous les packages
pnpm --filter web dev   # Dev web seulement
pnpm --filter api dev   # Dev API seulement
```

### Installation & Setup

```bash
cd RealTimeRoomCharlene
pnpm install      # Install toutes les dépendances

# Vérifier les versions
node -v           # >= 18.x
pnpm -v           # >= 8.x
```

## 🚀 Workflow de développement

### 1. Créer une branche

```bash
git checkout -b feature/nom-feature
# ou
git checkout -b fix/nom-bug
```

### 2. Développer & Tester

```bash
# Terminal 1 : API
cd monorepo-chat/api
pnpm dev

# Terminal 2 : Web
cd monorepo-chat/web
pnpm dev

# Terminal 3 : Tests
pnpm lint
```

### 3. Commit & Push

```bash
git add .
git commit -m "feat: description claire"
git push origin feature/nom-feature
```

### 4. Pull Request

Créer PR sur GitHub avec description :
- Quoi : courte description
- Pourquoi : le besoin
- Comment : l'approche

## 🐳 Docker & Render

### Build local

```bash
# API
cd monorepo-chat/api
docker build -t chat-api .

# Web
cd monorepo-chat/web
docker build -t chat-web .
```

### Test avec Docker Compose

```bash
docker-compose up
# http://localhost:80 (web)
# http://localhost:3001 (API)
```

### Deploy sur Render

Quand tu pushes sur `main` :
1. Render détecte `render.yaml`
2. Build des deux services démarrent
3. Déploiement automatique
4. Vérifier `/health` endpoint

```bash
curl https://chat-api-eepo.onrender.com/health
```

## 📏 Linting

### ESLint

```bash
pnpm lint                    # Tous les packages
pnpm lint -- --fix           # Auto-fix
pnpm --filter api lint       # API seulement
pnpm --filter web lint       # Web seulement
```

### SCSS Lint

Respecter BEM + conventions :
- Noms significatifs
- Pas de `!important`
- Pas de sélecteurs imbriqués profonds

## 🧪 Tests

### Logique métier (test/)

```bash
# Memory logic
pnpm --filter test run memoryTest

# Puissance 4 logic
pnpm --filter test run p4Test
```

## 📚 Documentation

### Socket.IO Events

Docs dans `docs/SOCKET_EVENTS.md` :
- Events client → serveur
- Events serveur → client
- Payload & réponses

### Swagger/OpenAPI

REST endpoints documentés (future)

## 🔒 Sécurité

### Validation

Toujours valider coté serveur :
- Pseudo : 2-20 chars, alphanumérique + accents
- Room : 2-50 chars, alphanumérique
- Message : 1-500 chars

```javascript
// API/src/index.js
function validatePseudo(pseudo) {
  if (!pseudo || typeof pseudo !== "string") return false;
  const trimmed = pseudo.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return false;
  return /^[a-zA-Z0-9_\-àâä...]+$/.test(trimmed);
}
```

### Headers HTTP

Helmet.js active automatiquement :
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options

### Rate Limiting

```javascript
// 100 req / 15 min par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

## 🎯 Checklist avant PR

- [ ] Code respecte BEM/SCSS
- [ ] Pas de console.log en production
- [ ] Pas de var → utiliser let/const
- [ ] Validation serveur OK
- [ ] pnpm lint passe
- [ ] Tests locaux OK
- [ ] Commit message clair

## 📖 Ressources

- [BEM Methodology](http://getbem.com/)
- [Socket.IO Docs](https://socket.io/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Render Docs](https://render.com/docs)
