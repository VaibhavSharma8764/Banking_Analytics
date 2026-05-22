import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

const Toast = ({ message, type = "info", onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.3)",
    },
    error: {
      icon: XCircle,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
      border: "rgba(239, 68, 68, 0.3)",
    },
    warning: {
      icon: AlertCircle,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.3)",
    },
    info: {
      icon: Info,
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.1)",
      border: "rgba(59, 130, 246, 0.3)",
    },
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: "8px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: "#f8fafc",
        zIndex: 9999,
        maxWidth: "400px",
        backdropFilter: "blur(10px)",
      }}
    >
      <Icon size={20} color={config.color} />
      <span style={{ fontSize: "0.95rem", flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#94a3b8",
          cursor: "pointer",
          fontSize: "1.2rem",
          padding: 0,
        }}
      >
        ×
      </button>
    </motion.div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </AnimatePresence>
  );
};

export { Toast, ToastContainer };
