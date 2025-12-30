import { useState } from "react";
//import "./safezone-chat.css";

export default function SafeZoneAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hola 👋 soy el asistente virtual SafeZone. Pregúntame algo." }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { from: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    const res = await fetch("http://localhost:8080/api/chat", {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();

    const botMsg = { from: "bot", text: data.reply };
    setMessages((prev) => [...prev, botMsg]);
    setInput("");
  };

  return (
    <>
      <button className="sz-chat-fab" onClick={() => setOpen(!open)}>💬</button>

      {open && (
        <div className="sz-chat-window">
          <div className="sz-chat-header">
            <h3>SafeZone Assistant</h3>
            <button className="sz-chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="sz-chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`sz-msg sz-msg--${m.from}`}>{m.text}</div>
            ))}
          </div>
          <div className="sz-chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu duda..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      )}
    </>
  );
}
