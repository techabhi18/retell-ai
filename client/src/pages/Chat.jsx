import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef(null);

  const agentId = "agent_45100f5a7c3ccc7769b545eae1";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const startChat = async () => {
      try {
        const res = await axios.post(
          "https://api.retellai.com/create-chat",
          { agent_id: agentId },
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        setChatId(res.data.chat_id);
        setMessages([
          {
            sender: "bot",
            text: "Hi, I’m Myra from StrategicERP. How can I help you today?",
          },
        ]);
      } catch (err) {
        console.error(err.response?.data || err.message);
        setMessages([
          {
            sender: "bot",
            text: "⚠️ Failed to start chat. Please refresh the page.",
          },
        ]);
      }
    };
    startChat();
  }, []);

  const sendMessage = async () => {
    if (!chatId || !input.trim()) return;
    const userText = input.trim();
    setMessages((p) => [...p, { sender: "user", text: userText }]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(
        "https://api.retellai.com/create-chat-completion",
        { chat_id: chatId, content: userText },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      const agentMsg =
        res.data.messages?.find((m) => m.role === "agent")?.content ||
        "No reply received.";
      setMessages((p) => [...p, { sender: "bot", text: agentMsg }]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          sender: "bot",
          text: "⚠️ Error: " + (err.response?.data?.message || err.message),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const endChat = async () => {
    if (!chatId) return;
    setEnding(true);
    try {
      await axios.patch(
        `https://api.retellai.com/end-chat/${chatId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_TOKEN}`,
          },
        }
      );
      setMessages((p) => [
        ...p,
        { sender: "bot", text: "✅ Chat ended. Thank you for reaching out!" },
      ]);
      setChatId(null);
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          sender: "bot",
          text:
            "⚠️ Failed to end chat: " +
            (err.response?.data?.message || err.message),
        },
      ]);
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="h-[92vh] w-full flex flex-col bg-gray-100">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">
          StrategicERP Support
        </h1>
        {chatId && (
          <button
            onClick={endChat}
            disabled={ending}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            {ending ? "Ending…" : "End Chat"}
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow
              ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="italic text-gray-500">Agent typing…</div>}
        <div ref={scrollRef} />
      </main>

      <footer className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring focus:ring-blue-300"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={!chatId || ending}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !chatId || ending}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
