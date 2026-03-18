import React from "react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
console.log("Socket client code loaded");

const socket = io("http://localhost:3001", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Connected to socket server:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

function App() {
  const [pseudo, setPseudo] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
  socket.on("message", (msg) => {
    setMessages((prev) => [...prev, msg])
  })

  socket.on("system", (text) => {
    setMessages((prev) => [...prev, { pseudo: "SYSTEM", content: text }])
  })

  return () => {
    socket.off("message")
    socket.off("system")
  }
}, []);

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
    setMessage("");
  };

  if (!joined) {
    return (
      <main style={{ padding: 20 }}>
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
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Room : {room}</h1>

    <div style={{ border: "1px solid #ccc", padding: 10, height: 300, overflowY: "auto" }}>
      {messages.map((m, i) => (
        m.pseudo === "SYSTEM" ? (
          <p key={i} style={{ fontStyle: "italic", color: "#888" }}>
            {m.content}
          </p>
        ) : (
          <p key={i}>
            <strong>{m.pseudo}</strong> : {m.content}
          </p>
        )
  ))}
</div>



      <form onSubmit={handleSend}>
        <input
          placeholder="Votre message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Envoyer</button>
      </form>
    </main>
  );
}

export default App;