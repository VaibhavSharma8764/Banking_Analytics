import { useState } from "react";
import axios from "axios";
import "../styles/Login.css";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_URL } from "../config";
import { BarChart3, ShieldCheck, UploadCloud } from "lucide-react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const demoAccounts = [
    {
      label: "Analyst",
      username: "analyst",
      password: "analyst123",
      Icon: BarChart3,
    },
    {
      label: "Admin",
      username: "admin",
      password: "admin123",
      Icon: ShieldCheck,
    },
    {
      label: "Operator",
      username: "operator",
      password: "operator123",
      Icon: UploadCloud,
    },
  ];

  const saveSession = (data) => {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    navigate("/dashboard");
  };

  const handleLogin = async (
    loginUsername = username,
    loginPassword = password,
  ) => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", loginUsername);
      formData.append("password", loginPassword);

      const res = await axios.post(`${API_URL}/login`, formData);

      saveSession(res.data);
    } catch (err) {
      alert("Login Failed: Please check your credentials");
    }
  };

  const fillDemoAccount = (account) => {
    setUsername(account.username);
    setPassword(account.password);
  };

  return (
    <div className="login-wrapper">
      <div
        className="login-content-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "80px",
          maxWidth: "1000px",
          width: "90%",
          zIndex: 1,
        }}
      >
        {/* Project Content Section */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="project-info"
          style={{ flex: 1, color: "white" }}
        >
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: "bold",
              marginBottom: "20px",
              background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FinData_ops
          </h1>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#94a3b8",
              lineHeight: "1.6",
              marginBottom: "30px",
            }}
          >
            A comprehensive data operations platform designed for automated
            financial record management. This system integrates real-time
            transaction processing with AI-driven analytics to provide a
            centralized workspace for banking data oversight and optimization.
          </p>

          <div
            className="features-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {[
              {
                title: "Real-time Processing",
                desc: "Live transaction streaming via WebSockets.",
              },
              {
                title: "AI Analyst",
                desc: "Natural language database querying with Groq.",
              },
              {
                title: "Secure ETL",
                desc: "Robust CSV ingestion and validation engine.",
              },
              {
                title: "Role-Based Access",
                desc: "Secure permissions for Admins and Analysts.",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#f8fafc",
                    marginBottom: "5px",
                  }}
                >
                  {f.title}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Login Container */}
        <div className="login-container" style={{ flex: "0 0 400px" }}>
          <h2>Login</h2>
          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              marginTop: "-10px",
              marginBottom: "10px",
            }}
          >
            Enter credentials to continue
          </p>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          />

          <button onClick={() => handleLogin()}>Authenticate</button>

          <div className="quick-login">
            <span>Guest login</span>
            <div className="quick-login-grid">
              {demoAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="quick-login-btn"
                  onClick={() => fillDemoAccount(account)}
                >
                  <account.Icon size={16} />
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
