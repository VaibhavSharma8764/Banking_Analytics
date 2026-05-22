import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css"; // Reuse dashboard styles for consistency
import { API_URL } from "../config";

const AnalystAI = () => {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Welcome to the AI Analytics Command Center. I have direct access to the transactions database. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const examplePrompts = [
    "Summarize me transaction database entries till this particular instant of time.",
    "Show me ratio of failed to successful transactions?",
    "How many branches are there and how many failed vs high value branches ?",
  ];

  useEffect(() => {
    if (!role) {
      navigate("/dashboard");
    }
  }, [role, navigate]);

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
        `${API_URL}/api/chat`,
        { message: userMsg.content },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessages((prev) => [...prev, { role: "ai", content: res.data.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg =
        error.response?.data?.reply ||
        "Sorry, I couldn't process your request right now.";
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `Error: ${errorMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const useExamplePrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div
      className="dashboard-layout"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header / Navbar */}
      <header
        style={{
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              padding: "8px 15px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>
            AI Analytics Command Center
          </h1>
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          Mode:{" "}
          <span style={{ color: "#10b981", fontWeight: "bold" }}>
            Deep Data Analysis
          </span>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          padding: "20px",
        }}
      >
        {/* Main Chat Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.02)",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          {/* Message List */}
          <div
            style={{
              flex: 1,
              padding: "40px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "70%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    textAlign: msg.role === "user" ? "right" : "left",
                  }}
                >
                  {msg.role === "user" ? role || "User" : "AI Intelligence"}
                </div>
                <div
                  style={{
                    backgroundColor:
                      msg.role === "user"
                        ? "#3b82f6"
                        : "rgba(255,255,255,0.05)",
                    color: "white",
                    padding: "20px 24px",
                    borderRadius:
                      msg.role === "user"
                        ? "24px 24px 4px 24px"
                        : "24px 24px 24px 4px",
                    fontSize: "1.1rem",
                    lineHeight: "1.6",
                    boxShadow:
                      msg.role === "user"
                        ? "0 4px 15px rgba(59, 130, 246, 0.3)"
                        : "none",
                    border:
                      msg.role === "user"
                        ? "none"
                        : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  color: "#3b82f6",
                  fontSize: "1rem",
                  display: "flex",
                  gap: "8px",
                  padding: "10px",
                }}
              >
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  Querying Database...
                </motion.span>
              </div>
            )}
            {messages.length === 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => useExamplePrompt(prompt)}
                    style={{
                      background: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      color: "#bfdbfe",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div
            style={{
              padding: "30px 40px",
              background: "rgba(15, 23, 42, 0.4)",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              gap: "20px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about transaction trends, failed regions, or branch workloads..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                padding: "18px 25px",
                color: "white",
                fontSize: "1.1rem",
                outline: "none",
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                border: "none",
                borderRadius: "16px",
                padding: "0 30px",
                color: "white",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "transform 0.2s",
              }}
            >
              Execute Analysis
            </button>
          </div>
        </div>

        {/* Sidebar Context Panel */}
        <div
          style={{
            width: "300px",
            marginLeft: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              padding: "25px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <h4 style={{ color: "white", margin: "0 0 15px 0" }}>
              Capabilities
            </h4>
            <ul
              style={{
                color: "#94a3b8",
                fontSize: "0.85rem",
                padding: "0 0 0 15px",
                lineHeight: "1.8",
              }}
            >
              <li>Summarize total transactions</li>
              <li>Find high-value failed payments</li>
              <li>Analyze branch-specific metrics</li>
              <li>Identify processing bottlenecks</li>
            </ul>
          </div>
          <div
            style={{
              padding: "25px",
              background: "rgba(59, 130, 246, 0.05)",
              borderRadius: "24px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <h4 style={{ color: "#3b82f6", margin: "0 0 10px 0" }}>
              AI Guardrails
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: 0 }}>
              This system operates in **READ-ONLY** mode. No data can be deleted
              or modified via AI commands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalystAI;
