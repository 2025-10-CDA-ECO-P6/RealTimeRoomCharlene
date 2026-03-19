# Socket.IO Events Documentation

## Vue d'ensemble

Protocole temps réel pour le chat et jeux multijoueurs.

**Base URL** : `https://chat-api-eepo.onrender.com`
**Transport** : WebSocket + fallback polling

---

## 🔵 Chat

### Event: `join`

Client demande de rejoindre une room.

**Sender** : Client  
**Target** : Serveur  
**Namespace** : `/`

```javascript
socket.emit("join", {
  room: "General",        // string, 2-50 chars
  pseudo: "Alice"         // string, 2-20 chars
});
```

**Erreurs** :
```javascript
socket.on("error", (message) => {
  // "Pseudo ou room invalide"
});
```

**Effets serveur** :
- Rejoin client à la room
- Broadcast system message : `"Alice a rejoint la room"`

---

### Event: `message`

Client envoie un message à la room.

**Sender** : Client  
**Target** : Room  
**Namespace** : `/`

```javascript
socket.emit("message", {
  room: "General",        // string
  pseudo: "Alice",        // string
  content: "Hello!"       // string, 1-500 chars
});
```

**Réception (tous les clients de la room)**:
```javascript
socket.on("message", (msg) => {
  console.log(msg);
  // {
  //   pseudo: "Alice",
  //   content: "Hello!",
  //   timestamp: "2026-03-19T10:30:00.000Z"
  // }
});
```

**Validation** :
- `content.trim()` : 1-500 chars
- `pseudo`, `room` : format validé

---

### Event: `typing`

Client annonce qu'il tape un message.

**Sender** : Client  
**Target** : Room  
**Namespace** : `/`

```javascript
socket.emit("typing", {
  room: "General",
  pseudo: "Alice"
});
```

**Réception (autres clients de la room)** :
```javascript
socket.on("typing", ({ pseudo }) => {
  console.log(`${pseudo} écrit…`);
});
```

---

### Event: `stopTyping`

Client annonce qu'il a arrêté de taper.

**Sender** : Client  
**Target** : Room  
**Namespace** : `/`

```javascript
socket.emit("stopTyping", {
  room: "General"
});
```

**Réception** :
```javascript
socket.on("stopTyping", () => {
  console.log("L'utilisateur a arrêté");
});
```

---

### Event: `system`

Notification système (auto).

**Sender** : Serveur  
**Target** : Room  
**Auto** : Broadcast join/leave

```javascript
socket.on("system", (text) => {
  console.log(text);
  // "Alice a rejoint la room"
  // "Bob a quitté"
});
```

---

## 🔴 Puissance 4

### Event: `p4-join`

Client rejoint une partie Puissance 4.

**Sender** : Client  
**Target** : Serveur  
**Namespace** : `/`

```javascript
socket.emit("p4-join", {
  room: "Puissance 4",
  pseudo: "Alice"
});
```

**Réponse** :
```javascript
// Joueur 1 (premier à rejoindre)
socket.on("p4-waiting", () => {
  console.log("En attente d'un adversaire...");
});

// Joueur 2 (deuxième + Joueur 1)
socket.on("p4-player-assigned", ({ playerNum, opponent }) => {
  console.log(`Tu es Joueur ${playerNum}, adversaire: ${opponent}`);
  // playerNum: 1 | 2
  // opponent: pseudo du second joueur
});
```

---

### Event: `p4-move`

Client joue un coup (descend une pièce).

**Sender** : Client (Joueur dont c'est le tour)  
**Target** : Serveur  
**Validation** : Doit être au tour du joueur

```javascript
socket.emit("p4-move", {
  room: "Puissance 4",
  col: 3  // 0-6 (colonne)
});
```

**Réception (autre joueur)** :
```javascript
socket.on("p4-move", ({ col }) => {
  console.log(`Adversaire a joué colonne ${col}`);
  // Mettre à jour plateau en local
});
```

**Erreur** : Pas ton tour → aucun événement

---

### Event: `p4-game-over`

Partie terminée (gagnant ou égalité).

**Sender** : Serveur  
**Target** : Tous les joueurs  
**Auto** : Quand 4 en ligne ou grille pleine

```javascript
socket.on("p4-game-over", ({ winner, isDraw, board }) => {
  if (winner) {
    console.log(`Joueur ${winner} a gagné!`);
  } else if (isDraw) {
    console.log("Égalité!");
  }
  // board: état final 6x7
});
```

---

### Event: `p4-restart`

Client demande une nouvelle partie.

**Sender** : Client  
**Target** : Serveur

```javascript
socket.emit("p4-restart", {
  room: "Puissance 4"
});
```

**Réception (tous les joueurs)** :
```javascript
socket.on("p4-restart-ack", () => {
  // Réinitialiser le plateau
  game = createGame();
});
```

---

### Event: `p4-opponent-left`

L'adversaire a quitté / déconnecté.

**Sender** : Serveur  
**Target** : Joueur restant  
**Auto** : Quand socket disconnect

```javascript
socket.on("p4-opponent-left", () => {
  console.log("L'adversaire a quitté la partie");
  // Afficher message, bouton "quitter"
});
```

---

## ❌ Error Handling

Erreurs générales emises par le serveur:

```javascript
socket.on("error", (message) => {
  // "Données invalides"
  // "Pseudo ou room invalide"
  // "Message invalide"
});
```

---

## 📊 Flux Complet Chat

```
User A                          Server                    User B
  |                               |                          |
  |---- emit("join", data) ------->|                          |
  |                                |                          |
  |                                |---- broadcast("system") -->|
  |                                |    "User A rejoined"       |
  |                                |                          |
  |---- emit("message", text) ---->|                          |
  |                                |--- emit("message") ------>|
  |                                |    { pseudo, content }    |
  |                                |                          |
  |---- emit("typing") ----------->|                          |
  |                                |--- emit("typing") ------->|
  |                                |    { pseudo }             |
  |                                |                          |
  |                                |<--- emit("stopTyping") ---|
  |<---- emit("stopTyping") -------|                          |
```

---

## 📊 Flux Complet Puissance 4

```
Player 1                   Server              Player 2
  |                          |                    |
  |--------------join-------->|                    |
  |                           |                    |
  |<---- p4-waiting ----------|                    |
  |                           |                    |
  |                           |<------ join -------|
  |                           |                    |
  |<-- p4-player-assigned ----|---- p4-player-assigned -->|
  |    (1, "Player2")         |     (2, "Player1")        |
  |                           |                    |
  |---- p4-move(col:3) ------>|                    |
  |                           |------ p4-move ---->|
  |                           |      (col:3)       |
  |                           |                    |
  |<--- p4-move(col:4) -------|<--- p4-move -------|
  |                           |     (col:4)        |
  |                           |                    |
  | (continuons...)           |                    |
  |                           |                    |
  |                 [4 en ligne détecté]           |
  |                           |                    |
  |<------- p4-game-over -----|---- p4-game-over ->|
  |       {winner:1}          |    {winner:1}      |
```

---

## 🔐 Rate Limiting

**Limite** : 100 requêtes / 15 minutes par IP

**Réponse sur limit** :
```
HTTP 429 Too Many Requests
{
  "message": "Trop de requêtes, veuillez réessayer plus tard."
}
```

---

## 🧪 Test depuis CLI

### Test connection et message

```bash
# Terminal 1: start serveur
node src/index.js

# Terminal 2: test avec socket.io-client CLI
npx socket.io-client https://chat-api-eepo.onrender.com

# Dans le CLI:
> emit join {"room":"Test","pseudo":"Bot"}
> emit message {"room":"Test","pseudo":"Bot","content":"Hello"}
```

### Test avec cURL (REST)

```bash
# Health check
curl https://chat-api-eepo.onrender.com/health

# Response
{"status":"ok","timestamp":"2026-03-19T10:30:00.000Z"}
```
