import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
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
    return (
      <div className="page-center">
        <div className="join-card">
          <h1>Rejoindre une room</h1>

          <form onSubmit={handleJoin}>
            <input
              placeholder="Pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
            />
            <input
              placeholder="Room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <button type="submit">Entrer</button>
          </form>
        </div>
      </div>
    );
  }

  // PAGE : Chat
  return (
    <div className="chat-container">
      <h1>Room : {room}</h1>

      <div className="messages">
        {messages.map((m, i) =>
          m.pseudo === "SYSTEM" ? (
            <div key={i} className="system-message">
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className={`message-bubble ${
                m.pseudo === pseudo ? "me" : "other"
              }`}
            >
              <span className="author">{m.pseudo}</span>
              <p>{m.content}</p>
            </div>
          )
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {userTyping && userTyping !== pseudo && (
        <div className="typing-indicator">
          {userTyping} est en train d’écrire…
        </div>
      )}

      <form className="input-area" onSubmit={handleSend}>
        <input
          placeholder="Votre message"
          value={message}
          onChange={handleTyping}
        />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}

export default App;