import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import GamePage from "./GamePage";
import MemoryBoard from "./games/memory/memoryBoard";
import Puissance4Board from "./games/puissance4/puissance4Board";

const socket = io("https://chat-api-eepo.onrender.com", { transports: ["websocket"] });

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function App() {
  const [pseudo, setPseudo] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userTyping, setUserTyping] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [p4Room, setP4Room] = useState(null);
  const [p4CodeInput, setP4CodeInput] = useState("");

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    socket.on("message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("system", (text) => setMessages((prev) => [...prev, { pseudo: "SYSTEM", content: text }]));
    socket.on("typing", ({ pseudo }) => setUserTyping(pseudo));
    socket.on("stopTyping", () => setUserTyping(null));
    return () => {
      socket.off("message"); socket.off("system"); socket.off("typing"); socket.off("stopTyping");
    };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pseudo.trim()) { setErrorMessage("Un pseudo est requis."); return; }
    if (!room) return;
    setErrorMessage("");
    socket.emit("join", { room, pseudo });
    setJoined(true);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit("message", { room, pseudo, content: message });
    socket.emit("stopTyping", { room });
    setMessage("");
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", { room, pseudo });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("stopTyping", { room }), 1000);
  };

  // ── PAGE : Rejoindre une room ──────────────────────────────
  if (!joined) {
    const rooms = ["Général", "Memory", "Puissance 4", "VIP"];
    return (
      <div className="join">
        <div className="join__card">
          <h1 className="join__title">Rejoindre une room</h1>
          {errorMessage && <div className="join__error">{errorMessage}</div>}
          <form className="join__form" onSubmit={handleJoin}>
            <input className="join__input" placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
            <div className="join__rooms">
              {rooms.map((r) => (
                <button key={r} type="button"
                  className={`join__room-btn ${room === r ? "join__room-btn--active" : ""}`}
                  onClick={() => setRoom(r)}>{r}</button>
              ))}
            </div>
            <button className="join__btn" type="submit" disabled={!room}>Entrer</button>
          </form>
        </div>
      </div>
    );
  }

  // ── PAGE : Mini-lobby Puissance 4 ──────────────────────────
  if (room === "Puissance 4" && !p4Room) {
    return (
      <div className="join">
        <div className="join__card">
          {/* Bouton retour */}
          <button
            onClick={() => setJoined(false)}
            style={{ alignSelf: "flex-start", background: "none", border: "1px solid #d1d5db", borderRadius: "0.375rem", padding: "0.375rem 0.75rem", fontSize: "0.875rem", color: "#6b7280", cursor: "pointer", marginBottom: "1rem" }}
          >
            ← Retour
          </button>
          <h1 className="join__title">🔴🟡 Puissance 4</h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem", textAlign: "center" }}>
            Crée une partie ou rejoins celle d'un ami.
          </p>
          <button className="join__btn" style={{ marginBottom: "1.5rem" }} onClick={() => setP4Room(generateCode())}>
            Créer une partie
          </button>
          <div style={{ color: "#9ca3af", textAlign: "center", marginBottom: "1rem" }}>— ou —</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              className="join__input"
              placeholder="Code de la partie"
              value={p4CodeInput}
              onChange={(e) => setP4CodeInput(e.target.value.toUpperCase())}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button className="join__btn" style={{ flexShrink: 0 }}
              disabled={p4CodeInput.length < 6}
              onClick={() => setP4Room(p4CodeInput.trim())}>
              Rejoindre
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Composant jeu ──────────────────────────────────────────
  let gameComponent = null;
  if (room === "Memory") {
    gameComponent = <MemoryBoard />;
  } else if (room === "Puissance 4" && p4Room) {
    gameComponent = (
      <Puissance4Board
        socket={socket}
        room={p4Room}
        pseudo={pseudo}
        onBack={() => setP4Room(null)}
      />
    );
  }

  // ── Chat ───────────────────────────────────────────────────
  const chatContent = (
    <div className="chat">
      <div className="chat__layout">
        <main className="chat__main">
          <h1 className="chat__header">Room : {room}</h1>
          <div className="messages">
            {messages.map((m, i) =>
              m.pseudo === "SYSTEM" ? (
                <div key={i} className="messages__item messages__item--system">{m.content}</div>
              ) : (
                <div key={i} className={`messages__item ${m.pseudo === pseudo ? "messages__item--me" : "messages__item--other"}`}>
                  <span className="messages__author">{m.pseudo}</span>
                  <p className="messages__text">{m.content}</p>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>
          {userTyping && userTyping !== pseudo && <div className="chat__typing">{userTyping} écrit…</div>}
          <form className="input-bar" onSubmit={handleSend}>
            <input className="input-bar__field" placeholder="Votre message" value={message} onChange={handleTyping} />
            <button className="input-bar__btn" type="submit">Envoyer</button>
          </form>
        </main>
      </div>
    </div>
  );

  if (gameComponent) return <GamePage game={gameComponent}>{chatContent}</GamePage>;
  return chatContent;
}

export default App;
