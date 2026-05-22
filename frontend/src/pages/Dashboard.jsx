import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL, WS_URL } from "../config";
import { Bot } from "lucide-react";
import { ToastContainer } from "../components/Toast";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};
function Dashboard() {
  const role = localStorage.getItem("role") || "Guest";
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const defaultEndpoint = "transactions";

  const [data, setData] = useState([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [transactionSummary, setTransactionSummary] = useState({
    all: 0,
    failed: 0,
    success: 0,
    pending: 0,
    high_value: 0,
    suspicious: 0,
    branches: 0,
  });
  const [file, setFile] = useState(null);
  const [liveStream, setLiveStream] = useState([]);
  const [currentEndpoint, setCurrentEndpoint] = useState(defaultEndpoint);

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);

  const [opFiles, setOpFiles] = useState([]);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "analyst",
  });
  const [showAddUser, setShowAddUser] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (role === "admin") {
      fetchAdminData();
    } else if (role === "operator") {
      fetchOperatorFiles();
    } else if (role === "analyst" || role === "guest") {
      fetchData(currentEndpoint);
    }

    // Live WebSocket Stream
    const ws = new WebSocket(`${WS_URL}/ws/transactions`);
    let keepAliveInterval;
    ws.onopen = () => {
      keepAliveInterval = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 25000);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "new_transaction") {
          setLiveStream((prev) => [msg.data, ...prev].slice(0, 10));
          fetchData(currentEndpoint, { showErrors: false });
        } else if (msg.type === "recent_transactions") {
          setLiveStream((msg.data || []).slice(0, 10));
          // Show analyst message if this was from a file upload
          if (msg.message) {
            addToast(msg.message, "info");
          }
        } else if (msg.type === "transactions_pruned") {
          setData((prev) =>
            prev.slice(0, Math.max(prev.length - msg.deleted, 0)),
          );
        } else if (msg.type === "reset_data") {
          setData([]);
          setStats({
            total_transactions: 0,
            failed_transactions: 0,
            success_rate: "0%",
            total_branches: 0,
          });
          setAlerts([]);
          setLiveStream([]);
        }
      } catch (err) {}
    };
    return () => {
      if (keepAliveInterval) window.clearInterval(keepAliveInterval);
      ws.close();
    };
  }, [role, currentEndpoint]);

  useEffect(() => {
    if (role !== "analyst" && role !== "guest") return;

    const refreshDashboard = async () => {
      await fetchData(currentEndpoint, { showErrors: false });
      try {
        const res = await axios.get(`${API_URL}/transactions?limit=10`, {
          headers,
        });
        setLiveStream((res.data || []).slice(0, 10));
      } catch (err) {
        console.error("Live feed refresh failed", err);
      }
    };

    refreshDashboard();
    const intervalId = window.setInterval(refreshDashboard, 4000);
    return () => window.clearInterval(intervalId);
  }, [role, currentEndpoint]);

  useEffect(() => {
    if (role !== "admin") return;

    fetchAdminData();
    const intervalId = window.setInterval(fetchAdminData, 4000);
    return () => window.clearInterval(intervalId);
  }, [role]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAdminData = async () => {
    try {
      const [uRes, sRes, aRes, hRes, fRes] = await Promise.all([
        axios.get(`${API_URL}/users`, { headers }),
        axios.get(`${API_URL}/admin-stats`, { headers }),
        axios.get(`${API_URL}/alerts`, { headers }),
        axios.get(`${API_URL}/upload-history`, { headers }),
        axios.get(`${API_URL}/files`, { headers }),
      ]);
      setUsers(uRes.data);
      setStats(sRes.data);
      setAlerts(aRes.data);
      setUploadHistory(hRes.data);
      setOpFiles(fRes.data);
    } catch (err) {
      console.error("Error fetching admin data", err);
    }
  };

  const fetchOperatorFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files`, { headers });
      setOpFiles(res.data);
    } catch (err) {
      console.error("Error fetching files", err);
    }
  };

  const endpointWithLimit = (endpoint) => {
    if (!endpoint.startsWith("transactions")) return endpoint;
    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=50`;
  };

  const transactionTypeFromEndpoint = (endpoint) => {
    if (!endpoint.startsWith("transactions")) return null;
    const queryString = endpoint.split("?")[1];
    return new URLSearchParams(queryString || "").get("type") || "all";
  };

  const fetchRecordTotal = async (endpoint) => {
    const transactionType = transactionTypeFromEndpoint(endpoint);
    if (!transactionType) {
      setRecordTotal(data.length);
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/transactions/summary`, {
        headers,
      });
      const summary = res.data || {};
      setTransactionSummary(summary);
      const summaryKey =
        transactionType === "high-value" ? "high_value" : transactionType;
      setRecordTotal(summary[summaryKey] || 0);
    } catch (err) {
      console.error("Transaction count refresh failed", err);
    }
  };

  const fetchData = async (endpoint, options = {}) => {
    const { showErrors = true } = options;
    try {
      const res = await axios.get(`${API_URL}/${endpointWithLimit(endpoint)}`, {
        headers,
      });
      setData(res.data);
      const transactionType = transactionTypeFromEndpoint(endpoint);
      if (transactionType) {
        fetchRecordTotal(endpoint);
      } else {
        setRecordTotal(res.data.length);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        if (showErrors) alert("Session expired. Please log in again.");
        handleLogout();
      } else if (showErrors) {
        alert("Error fetching data");
      }
    }
  };

  const selectDataView = (endpoint) => {
    setCurrentEndpoint(endpoint);
    fetchData(endpoint);
  };

  const uploadFile = async (fileToUpload = null) => {
    const actualFile = (fileToUpload instanceof File || fileToUpload instanceof Blob) ? fileToUpload : null;
    const uploadedFile = actualFile || file;
    if (!uploadedFile) {
      addToast("Please select a file first.", "warning");
      return;
    }
    console.log(
      "Uploading file:",
      uploadedFile && { name: uploadedFile.name, size: uploadedFile.size },
    );
    const formData = new FormData();
    formData.append("file", uploadedFile);
    try {
      setUploading(true);
      const res = await axios.post(`${API_URL}/upload`, formData, { headers });
      console.log("Upload response:", res?.data);
      const serverMsg = res?.data?.message || res?.data?.detail || null;
      addToast(
        serverMsg ||
          `✓ File "${uploadedFile.name}" uploaded successfully! Now analyst will analyse this file.`,
        "success",
      );

      fetchOperatorFiles();
      if (role === "operator") {
        fetchData("upload-history");
      }
      setFile(null);
      setShowSampleModal(false);

      // Refresh data and live feed after upload
      setTimeout(() => {
        fetchData(currentEndpoint, { showErrors: false });
        // Explicitly fetch recent transactions for live feed
        axios
          .get(`${API_URL}/transactions?limit=10`, { headers })
          .then((res) => {
            setLiveStream((res.data || []).slice(0, 10));
          })
          .catch((err) => console.error("Failed to fetch live feed", err));
      }, 500);
    } catch (err) {
      console.error("Upload error:", err);
      if (err.response && err.response.status === 401) {
        addToast(
          "Upload failed: Session expired. Please log in again.",
          "error",
        );
        handleLogout();
      } else {
        const errorMsg =
          err.response?.data?.detail || "Upload failed. Please try again.";
        addToast(errorMsg, "error");
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (filename) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${filename}"?\n\nThis will reset all analysis and transaction data.`,
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/delete-file/${filename}`, { headers });
      addToast(
        `✓ File "${filename}" deleted. Operator will upload new file.`,
        "info",
      );

      if (role === "admin") {
        fetchAdminData();
      } else {
        fetchOperatorFiles();
      }
      // Reset local states to zero/empty
      setData([]);
      setRecordTotal(0);
      setStats({
        total_transactions: 0,
        failed_transactions: 0,
        success_rate: "0%",
        total_branches: 0,
      });
      setAlerts([]);
      setLiveStream([]);
    } catch (err) {
      addToast("Delete failed. Please try again.", "error");
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      addToast("Username and password required", "warning");
      return;
    }
    try {
      await axios.post(`${API_URL}/add-user`, newUser, { headers });
      addToast(`✓ User "${newUser.username}" added successfully!`, "success");
      setNewUser({ username: "", password: "", role: "analyst" });
      setShowAddUser(false);
      fetchAdminData();
    } catch (err) {
      addToast("Failed to add user", "error");
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`${API_URL}/delete-user/${id}`, { headers });
      addToast("✓ User deleted successfully!", "success");
      fetchAdminData();
    } catch (err) {
      addToast("Failed to delete user", "error");
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API_URL}/export-data`, {
        headers,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transactions_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("✓ Data exported successfully!", "success");
    } catch (err) {
      addToast("Failed to export data: " + err.message, "error");
    }
  };

  const useSampleFile = async () => {
    try {
      addToast("Loading sample file...", "info");
      const res = await axios.get(`${API_URL}/sample-file`, {
        headers,
        responseType: "blob",
      });
      const sampleFile = new File([res.data], "sample_transactions.csv", {
        type: "text/csv",
      });
      await uploadFile(sampleFile);
      setShowSampleModal(false);
    } catch (err) {
      console.error("Sample file error:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to load sample file";
      addToast(`Error: ${errorMsg}`, "error");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "10px",
            borderRadius: "8px",
            color: "#fff",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: "5px 0 0 0", color: entry.color }}>
              {`${entry.name || entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderDynamicChart = () => {
    if (!data || data.length === 0) return null;

    const firstRow = data[0];

    // Case 1: Simple workload counts
    if (firstRow.hasOwnProperty("branch") && firstRow.hasOwnProperty("total")) {
      return (
        <div
          className="chart-container"
          style={{
            marginTop: "30px",
            background: "rgba(255,255,255,0.02)",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h3 style={{ color: "white", marginBottom: "20px" }}>
            Transaction Volume by Branch
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="branch"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Count"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorVolume)"
                animationDuration={1000}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Case 2: Transaction level data (amounts/times) - Aggregate it by branch to visualize
    if (
      firstRow.hasOwnProperty("amount") &&
      firstRow.hasOwnProperty("branch")
    ) {
      const groupedData = data.reduce((acc, curr) => {
        const b = curr.branch || "Unknown";
        if (!acc[b]) acc[b] = { branch: b, amount: 0, count: 0 };
        acc[b].amount += curr.amount || 0;
        acc[b].count += 1;
        return acc;
      }, {});

      const chartData = Object.values(groupedData);

      return (
        <div
          className="chart-container"
          style={{
            marginTop: "30px",
            background: "rgba(255,255,255,0.02)",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h3 style={{ color: "white", marginBottom: "20px" }}>
            Aggregated Financials by Branch
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="branch"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                yAxisId="left"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="amount"
                name="Total Amount ($)"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAmt)"
                animationDuration={1000}
              />
              <Bar
                yAxisId="right"
                dataKey="count"
                name="Frequency Count"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                barSize={20}
                animationDuration={1000}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <motion.div
        className="sidebar"
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h2>{role.toUpperCase()}</h2>

        <div className="sidebar-nav">
          {(role === "analyst" || role === "guest") && (
            <>
              <button onClick={() => selectDataView("transactions")}>
                All Transactions
              </button>
              <button
                onClick={() => selectDataView("transactions?type=failed")}
              >
                Failed Transactions
              </button>
              <button
                onClick={() => selectDataView("transactions?type=success")}
              >
                Successful Transactions
              </button>
              <button
                onClick={() => selectDataView("transactions?type=high-value")}
              >
                High Value
              </button>
              <button
                onClick={() => selectDataView("transactions?type=suspicious")}
              >
                Suspicious
              </button>
              <button onClick={() => selectDataView("branch-workload")}>
                Branch Workload
              </button>
            </>
          )}

          {role === "operator" && (
            <button onClick={() => fetchData("upload-history")}>
              Upload History
            </button>
          )}

          {role === "admin" && (
            <>
              <button
                onClick={() => {
                  setData([]);
                  fetchAdminData();
                }}
              >
                Overview Dashboard
              </button>
              <button
                onClick={handleExport}
                style={{
                  color: "#10b981",
                  borderColor: "rgba(16, 185, 129, 0.2)",
                }}
              >
                Export CSV Report
              </button>
            </>
          )}

          <button
            onClick={() => navigate("/analyst-ai")}
            style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              color: "white",
              fontWeight: "bold",
              marginTop: "10px",
              border: "none",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Bot size={18} />
            AI Assistant
          </button>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </motion.div>

      {/* Main Content */}
      <div className="main-content">
        <motion.div
          className="dashboard-header"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <h1>Dashboard Overview</h1>
        </motion.div>

        {/* Analyst Metric Cards & Live Stream */}
        {(role === "analyst" || role === "guest") && (
          <motion.div
            className="metrics-grid"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{
              gridTemplateColumns: "0.9fr 1.8fr 1.3fr",
              alignItems: "stretch",
            }}
          >
            <motion.div
              className="metric-card"
              variants={fadeUp}
              style={{ minHeight: "132px" }}
            >
              <span>Total Records Displayed</span>
              <h3>{recordTotal}</h3>
              <small style={{ color: "#94a3b8" }}>
                Showing latest {Math.min(data.length, 50)}
              </small>
            </motion.div>
            <motion.div
              className="metric-card"
              variants={fadeUp}
              style={{
                minHeight: "132px",
                padding: "22px 24px",
                overflow: "hidden",
              }}
            >
              <span>Transaction Summary</span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "10px 12px",
                  marginTop: "14px",
                  color: "#f8fafc",
                  fontSize: "0.88rem",
                  lineHeight: 1.2,
                }}
              >
                <strong style={{ whiteSpace: "nowrap" }}>
                  All: {transactionSummary.all}
                </strong>
                <strong style={{ color: "#ef4444", whiteSpace: "nowrap" }}>
                  Failed: {transactionSummary.failed}
                </strong>
                <strong style={{ color: "#10b981", whiteSpace: "nowrap" }}>
                  Success: {transactionSummary.success}
                </strong>
                <strong style={{ whiteSpace: "nowrap" }}>
                  High: {transactionSummary.high_value}
                </strong>
                <strong style={{ whiteSpace: "nowrap" }}>
                  Pending: {transactionSummary.pending}
                </strong>
                <strong style={{ whiteSpace: "nowrap" }}>
                  Suspicious: {transactionSummary.suspicious}
                </strong>
              </div>
            </motion.div>

            {/* Live Stream Ticker */}
            <motion.div
              className="metric-card"
              variants={fadeUp}
              style={{
                overflow: "hidden",
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                height: "132px",
                minHeight: "132px",
              }}
            >
              <span
                style={{
                  color: "#10b981",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                }}
              >
                Live Transaction Feed
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "10px",
                  height: "78px",
                  overflow: "hidden",
                }}
              >
                <AnimatePresence initial={false}>
                  {liveStream.slice(0, 2).map((tx, idx) => (
                    <motion.div
                      key={tx.transaction_id + idx}
                      layout={false}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{
                        fontSize: "0.85rem",
                        color: tx.status === "failed" ? "#ef4444" : "#f8fafc",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255,255,255,0.03)",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        borderLeft: `3px solid ${tx.status === "failed" ? "#ef4444" : "#10b981"}`,
                        height: "35px",
                        minHeight: "35px",
                        maxHeight: "35px",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          paddingRight: "8px",
                        }}
                      >
                        {tx.transaction_id} - {tx.branch}
                      </span>
                      <span style={{ fontWeight: "bold" }}>${tx.amount}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Operator View */}
        {role === "operator" && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="card"
              variants={fadeUp}
              style={{ marginBottom: "20px" }}
            >
              <h2 style={{ marginBottom: "20px", color: "white" }}>
                Secure File Ingestion
              </h2>
              <div className="upload-area">
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "20px",
                  }}
                >
                  Drag and drop your transaction CSV here
                </p>
                <label className="upload-label">
                  Select CSV File
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".csv"
                  />
                </label>
                <p style={{ color: "white", marginBottom: "20px" }}>
                  {file ? `Selected: ${file.name}` : "No file selected"}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {file && (
                    <button className="upload-btn" onClick={() => uploadFile()}>
                      Process & Upload
                    </button>
                  )}
                  <button
                    className="upload-btn"
                    style={{
                      background: "rgba(3, 182, 112, 0.3)",
                      border: "1px solid rgb(16, 185, 129)",
                    }}
                    onClick={() => setShowSampleModal(true)}
                  >
                    📄 Use Sample File
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showSampleModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(0,0,0,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 999,
                    }}
                    onClick={() => setShowSampleModal(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        padding: "30px",
                        maxWidth: "400px",
                        color: "white",
                      }}
                    >
                      <h3 style={{ marginBottom: "15px" }}>
                        Use Sample Transactions File?
                      </h3>
                      <p
                        style={{
                          color: "#94a3b8",
                          marginBottom: "20px",
                          lineHeight: 1.6,
                        }}
                      >
                        This will load a pre-configured sample transaction file
                        to test the system. Contains 15 sample transactions
                        across multiple branches.
                      </p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => setShowSampleModal(false)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "white",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={useSampleFile}
                          style={{
                            flex: 1,
                            padding: "10px",
                            background: "#10b981",
                            border: "none",
                            color: "white",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          Load Sample
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div className="card" variants={fadeUp}>
              <h2 style={{ marginBottom: "20px", color: "white" }}>
                Uploaded Files
              </h2>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opFiles.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: "center" }}>
                          No files
                        </td>
                      </tr>
                    )}
                    {opFiles.map((f, i) => (
                      <tr key={i}>
                        <td>{f.filename}</td>
                        <td>{f.size}</td>
                        <td>
                          <button
                            className="action-btn"
                            style={{ color: "#ef4444", borderColor: "#ef4444" }}
                            onClick={() => deleteFile(f.filename)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Admin View */}
        {role === "admin" && data.length === 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <div className="metrics-grid">
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Total Transactions</span>
                <h3>{stats.total_transactions || 0}</h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Successful</span>
                <h3 style={{ color: "#10b981" }}>
                  {stats.successful_transactions || 0}
                </h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Failed</span>
                <h3 style={{ color: "#ef4444" }}>
                  {stats.failed_transactions || 0}
                </h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Pending</span>
                <h3 style={{ color: "#f59e0b" }}>
                  {stats.pending_transactions || 0}
                </h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Success Rate</span>
                <h3 style={{ color: "#10b981" }}>
                  {stats.success_rate || "0%"}
                </h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>High Value</span>
                <h3>{stats.high_value_transactions || 0}</h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Suspicious</span>
                <h3 style={{ color: "#ef4444" }}>
                  {stats.suspicious_transactions || 0}
                </h3>
              </motion.div>
              <motion.div className="metric-card" variants={fadeUp}>
                <span>Total Branches</span>
                <h3>{stats.total_branches || 0}</h3>
              </motion.div>
            </div>

            <motion.div
              className="card"
              variants={fadeUp}
              style={{ marginBottom: "20px" }}
            >
              <h2 style={{ marginBottom: "20px", color: "white" }}>
                System Alerts
              </h2>
              {alerts.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    padding: "15px",
                    marginBottom: "10px",
                    borderRadius: "10px",
                    background:
                      a.severity === "high"
                        ? "rgba(239, 68, 68, 0.1)"
                        : a.severity === "medium"
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(16, 185, 129, 0.1)",
                    border: `1px solid ${a.severity === "high" ? "rgba(239, 68, 68, 0.3)" : a.severity === "medium" ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                    color: "#fff",
                  }}
                >
                  <strong>{a.type}:</strong> {a.message}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="card"
              variants={fadeUp}
              style={{ marginBottom: "20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h2 style={{ color: "white" }}>User Management</h2>
                <button
                  className="upload-btn"
                  style={{ padding: "8px 16px" }}
                  onClick={() => setShowAddUser(!showAddUser)}
                >
                  {showAddUser ? "Cancel" : "+ Add User"}
                </button>
              </div>

              <AnimatePresence>
                {showAddUser && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "20px",
                      overflow: "hidden",
                    }}
                  >
                    <input
                      style={{ padding: "10px", borderRadius: "8px", flex: 1 }}
                      placeholder="Username"
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                    />
                    <input
                      style={{ padding: "10px", borderRadius: "8px", flex: 1 }}
                      type="password"
                      placeholder="Password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                    <select
                      style={{ padding: "10px", borderRadius: "8px" }}
                      value={newUser.role}
                      onChange={(e) =>
                        setNewUser({ ...newUser, role: e.target.value })
                      }
                    >
                      <option value="analyst">Analyst</option>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button className="upload-btn" onClick={handleAddUser}>
                      Save
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username}</td>
                        <td>
                          <span style={{ textTransform: "capitalize" }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#10b981" }}>{u.status}</span>
                        </td>
                        <td>
                          {u.username !== role && (
                            <button
                              className="action-btn"
                              style={{
                                color: "#ef4444",
                                borderColor: "#ef4444",
                              }}
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div className="card" variants={fadeUp}>
              <h2 style={{ marginBottom: "20px", color: "white" }}>
                Upload History & Data Reset
              </h2>

              <div className="admin-table-section">
                <h3 className="admin-section-heading">
                  Active CSV Files (Delete to Reset Analysis)
                </h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Size</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opFiles.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: "center" }}>
                            No active files
                          </td>
                        </tr>
                      )}
                      {opFiles.map((f, i) => (
                        <tr key={i}>
                          <td>{f.filename}</td>
                          <td>{f.size}</td>
                          <td>
                            <button
                              className="action-btn"
                              style={{
                                color: "#ef4444",
                                borderColor: "#ef4444",
                              }}
                              onClick={() => deleteFile(f.filename)}
                            >
                              Delete & Reset Data
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-table-section">
                <h3 className="admin-section-heading">Historical Ledgers</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Upload Time</th>
                        <th>Records Processed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadHistory.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: "center" }}>
                            No history
                          </td>
                        </tr>
                      )}
                      {uploadHistory.map((h, i) => (
                        <tr key={i}>
                          <td>{h.filename}</td>
                          <td>{new Date(h.upload_time).toLocaleString()}</td>
                          <td>{h.records_processed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {(role === "analyst" || role === "guest" || data.length > 0) &&
          data.length > 0 && (
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      {Object.keys(data[0]).map((key) => (
                        <th key={key}>{key.replace(/_/g, " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((val, i) => (
                          <td key={i}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Automatically Render Charts if Applicable */}
              {renderDynamicChart()}
            </motion.div>
          )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default Dashboard;
