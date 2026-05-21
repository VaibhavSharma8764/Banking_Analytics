import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Hello! I am your Analyst AI Assistant. Ask me anything about the transactions data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://127.0.0.1:8000/api/chat",
        { message: userMsg.content },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessages((prev) => [...prev, { role: "ai", content: res.data.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg =
        error.response?.data?.detail ||
        "Sorry, I couldn't process your request right now.";
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `Error: ${errorMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        fontFamily: "sans-serif",
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              width: "350px",
              height: "500px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(15px)",
              borderRadius: "24px",
              boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              marginBottom: "15px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                color: "white",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                  Analyst AI
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                  Powered by Groq
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1rem",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    backgroundColor:
                      msg.role === "user" ? "#6366f1" : "#f3f4f6",
                    color: msg.role === "user" ? "white" : "#1f2937",
                    padding: "12px 16px",
                    borderRadius:
                      msg.role === "user"
                        ? "20px 20px 4px 20px"
                        : "20px 20px 20px 4px",
                    maxWidth: "85%",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {msg.content}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: "#f3f4f6",
                    padding: "12px 16px",
                    borderRadius: "20px 20px 20px 4px",
                    color: "#6b7280",
                    fontSize: "0.85rem",
                    display: "flex",
                    gap: "4px",
                  }}
                >
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    •
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  >
                    •
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  >
                    •
                  </motion.span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: "20px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                gap: "12px",
                backgroundColor: "white",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Query transactions..."
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: "24px",
                  border: "1px solid #e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={isLoading}
                style={{
                  backgroundColor: "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "44px",
                  height: "44px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isLoading ? 0.7 : 1,
                  fontSize: "1.2rem",
                }}
              >
                ➤
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "32px",
          backgroundColor: "#6366f1",
          color: "white",
          border: "none",
          boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
        }}
      >
        {isOpen ? "✕" : "💬"}
      </motion.button>
    </div>
  );
};

export default ChatBot;
