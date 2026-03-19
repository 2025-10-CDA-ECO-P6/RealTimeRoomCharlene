import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://chat-api-eepo.onrender.com", {
  transports: ["websocket"],
});

function App() {
  const [pseudo, setPseudo] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userTyping, setUserTyping] = useState(null);

  const messagesEndRef = useRef(null);
  let typingTimeout = useRef(null);

  // Réception des messages
  useEffect(() => {
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("system", (text) => {
      setMessages((prev) => [...prev, { pseudo: "SYSTEM", content: text }]);
    });

    socket.on("typing", ({ pseudo }) => {
      setUserTyping(pseudo);
    });

    socket.on("stopTyping", () => {
      setUserTyping(null);
    });

    return () => {
      socket.off("message");
      socket.off("system");
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, []);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pseudo || !room) return;
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
    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", { room });
    }, 1000);
  };

 // PAGE : Rejoindre une room
if (!joined) {
  const rooms = ["Général", "Mémory", "Puissance 4", "VIP"];

  return (
    <div className="join">
      <div className="join__card">
        <h1 className="join__title">Rejoindre une room</h1>
        <form className="join__form" onSubmit={handleJoin}>
          <input
            className="join__input"
            placeholder="Pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
          />
          <div className="join__rooms">
            {rooms.map((r) => (
              <button
                key={r}
                type="button"
                className={`join__room-btn ${room === r ? "join__room-btn--active" : ""}`}
                onClick={() => setRoom(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="join__btn" type="submit" disabled={!room}>
            Entrer
          </button>
        </form>
      </div>
    </div>
  );
}
  // PAGE : Chat
  return (
    <div className="chat">
      <div className="chat__layout">
        <main className="chat__main">
          <h1 className="chat__header">Room : {room}</h1>
          <div className="messages">
            {messages.map((m, i) =>
              m.pseudo === "SYSTEM" ? (
                <div key={i} className="messages__item messages__item--system">
                  {m.content}
                </div>
              ) : (
                <div
                  key={i}
                  className={`messages__item ${m.pseudo === pseudo ? "messages__item--me" : "messages__item--other"}`}
                >
                  <span className="messages__author">{m.pseudo}</span>
                  <p className="messages__text">{m.content}</p>
                </div>
              )
            )}
            <div ref={messagesEndRef}></div>
          </div>
          {userTyping && userTyping !== pseudo && (
            <div className="chat__typing">{userTyping} est en train d'écrire…</div>
          )}
          <form className="input-bar" onSubmit={handleSend}>
            <input
              className="input-bar__field"
              placeholder="Votre message"
              value={message}
              onChange={handleTyping}
            />
            <button className="input-bar__btn" type="submit">Envoyer</button>
          </form>
        </main>
        <aside className="chat__sidebar">
          <h2 className="chat__sidebar-title">Room</h2>
          <p className="chat__sidebar-room">{room}</p>
        </aside>
      </div>
    </div>
  );
}

export default App;