import { useNavigate } from "react-router-dom";
import "../styles/Landing.css";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

function Landing() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 50px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>FinData Ops</div>
        <div style={{ display: 'flex', gap: '30px' }}>
          <span onClick={() => scrollToSection('features')} style={{ color: '#94a3b8', cursor: 'pointer' }}>Features</span>
          <span onClick={() => scrollToSection('ai-intel')} style={{ color: '#94a3b8', cursor: 'pointer' }}>AI Intelligence</span>
          <span onClick={() => scrollToSection('applications')} style={{ color: '#94a3b8', cursor: 'pointer' }}>Applications</span>
          <button 
            onClick={() => navigate("/login")}
            style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" style={{ padding: '4rem 2rem' }}>
        <div className="landing-content">
          <h1>FinData Operations Platform</h1>
          <p>An end-to-end financial data management system featuring automated ETL pipelines, real-time monitoring via WebSockets, and AI-powered natural language analytics. Built for secure and efficient banking data operations.</p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button 
              className="hero-btn" 
              onClick={() => navigate("/login")}
            >
              Access System
            </button>
          </div>
        </div>
      </section>

      {/* Project Architecture / Features Section */}
      <section id="features" className="features-section">
        <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '1rem', textAlign: 'center' }}>Project Modules</h2>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '4rem', maxWidth: '700px' }}>
          This system is divided into specialized modules to handle the complete financial data lifecycle.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📥</div>
            <h3>Automated ETL Pipeline</h3>
            <p>Processes raw CSV bank data. The backend performs validation, cleansing, and normalization before securely storing records in a structured PostgreSQL database.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Role-Based Security</h3>
            <p>Implements three distinct user roles (Admin, Operator, Analyst) using JWT authentication. Each role has specialized access to system functions and data views.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Analytics Engine</h3>
            <p>Integrates Groq API with LLAMA models to translate natural language questions into secure SQL queries, allowing analysts to talk directly to the database.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Live Feed</h3>
            <p>Utilizes WebSockets for low-latency communication. New transactions are pushed instantly from the server to the dashboard without requiring page refreshes.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Interactive Dashboards</h3>
            <p>Visualizes financial trends and branch workloads using Recharts. Provides dynamic graphical insights into transaction success rates and high-value anomalies.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <h3>Backend Frameworks</h3>
            <p>Powered by a high-performance Python FastAPI backend with SQLAlchemy ORM for robust database management and connection pooling.</p>
          </div>
        </div>
      </section>

      {/* AI ChatBot Showcase Section */}
      <section id="ai-intel" style={{ padding: '6rem 2rem', background: 'rgba(59, 130, 246, 0.05)', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '20px' }}>AI-Powered Financial Intelligence</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '30px' }}>
            The application features a specialized **Analyst AI Assistant** integrated with Groq Cloud. 
            It allows users to perform deep data analysis using natural language instead of complex SQL.
          </p>
          <div style={{ 
            background: 'rgba(15, 23, 42, 0.6)', 
            padding: '20px', 
            borderRadius: '15px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            textAlign: 'center', 
            fontStyle: 'italic', 
            color: '#3b82f6',
            margin: '0 auto',
            maxWidth: '600px'
          }}>
            "Show me the total amount of failed transactions in the North branch last month"
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section id="applications" style={{ padding: '6rem 2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '3rem', textAlign: 'center', width: '100%' }}>Real-World Applications</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', maxWidth: '1100px', margin: '0 auto' }}>
          {[
            { title: "Commercial Banking", desc: "Automate daily transaction audits across multiple branches and regions simultaneously." },
            { title: "Fraud Investigation", desc: "Identify suspicious high-value failures and anomalies using real-time data streaming." },
            { title: "Regulatory Reporting", desc: "Export standardized transaction reports for compliance and internal auditing purposes." },
            { title: "Operational Insights", desc: "Analyze branch-level workloads to optimize resource allocation and processing efficiency." }
          ].map((app, i) => (
            <div key={i} style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '15px', fontSize: '1.2rem' }}>{app.title}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>{app.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} FinData Ops Project. Built for Academic Demonstration.</p>
      </footer>
    </div>
  );
}

export default Landing;