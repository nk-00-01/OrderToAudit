
import { useState } from "react";
import {
  Activity,
  LockKeyhole,
  Mail,
  Factory,
  Package,
  Boxes,
  Truck,
  ReceiptText,
  ChartNoAxesCombined,
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
  Workflow,
} from "lucide-react";
import { API_URL } from "./config";
const floatingIcons = [
  { Icon: Factory, className: "symbol-one" },
  { Icon: Package, className: "symbol-two" },
  { Icon: ChartNoAxesCombined, className: "symbol-three" },
  { Icon: Truck, className: "symbol-four" },
  { Icon: ReceiptText, className: "symbol-five" },
  { Icon: Boxes, className: "symbol-six" },
];

const workflowIcons = [
  Factory,
  Package,
  Boxes,
  Truck,
  ReceiptText,
  ChartNoAxesCombined,
];

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Animated background */}
      <div className="login-background">
        <div className="login-glow glow-one" />
        <div className="login-glow glow-two" />
        <div className="login-grid" />
      </div>

      {/* Floating symbols */}
      <div className="floating-symbols">
        {floatingIcons.map(({ Icon, className }, index) => (
          <div className={`floating-symbol ${className}`} key={index}>
            <Icon size={25} />
          </div>
        ))}
      </div>

      <div className="login-layout">

        {/* LEFT SIDE */}
        <section className="login-hero">

          <div className="brand-tag">
            <Activity size={15} />
            <span>SMART BUSINESS MANAGEMENT</span>
          </div>

          <div className="hero-heading">
            <h1>
              One Platform.
              <br />
              <span>Complete Control.</span>
            </h1>

            <p>
              Manage your manufacturing operations with
              intelligent inventory, production, sales,
              and financial visibility.
            </p>
          </div>

          {/* Animated workflow panel */}
          <div className="workflow-panel">

            <div className="workflow-heading">
              <div>
                <span className="live-dot" />
                <span>CONNECTED WORKFLOW</span>
              </div>
              <Workflow size={19} />
            </div>

            <div className="workflow-track">
              <div className="workflow-track-inner">
                {[...workflowIcons, ...workflowIcons].map(
                  (Icon, index) => (
                    <div className="workflow-node" key={index}>
                      <Icon size={24} />
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="workflow-labels">
              <span>Inventory</span>
              <span>Production</span>
              <span>Sales</span>
              <span>Accounts</span>
            </div>

            <div className="workflow-bottom">
              <div>
                <span className="workflow-status-dot" />
                <span>All operations connected</span>
              </div>
              <span>END-TO-END VISIBILITY</span>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="login-features">
            <div className="login-feature">
              <ShieldCheck size={19} />
              <span>Secure Access</span>
            </div>

            <div className="login-feature">
              <ClipboardCheck size={19} />
              <span>Transaction Tracking</span>
            </div>

            <div className="login-feature">
              <ChartNoAxesCombined size={19} />
              <span>Business Insights</span>
            </div>
          </div>

        </section>

        {/* RIGHT SIDE LOGIN */}
        <section className="login-form-section">

          <div className="login-card">

            <div className="login-card-top">
              <div className="login-logo">
                <Activity size={29} />
              </div>

              <div className="login-brand-name">
                <h2>OrderToAudit</h2>
                <span>MANUFACTURING INTELLIGENCE</span>
              </div>
            </div>

            <div className="login-welcome">
              <span className="welcome-label">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>Enter your credentials to access your workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">

              <div className="login-field">
                <label htmlFor="login-email">Email Address</label>

                <div className="login-input-wrapper">
                  <Mail size={19} />

                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Password</label>

                <div className="login-input-wrapper">
                  <LockKeyhole size={19} />

                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit"
              >
                <span>
                  {loading ? "Signing in..." : "Access Workspace"}
                </span>

                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            <div className="login-security">
              <ShieldCheck size={16} />
              <span>Protected with secure authentication</span>
            </div>

          </div>

          <p className="login-copyright">
            © {new Date().getFullYear()} OrderToAudit · All rights reserved
          </p>

        </section>
      </div>
    </div>
  );
}

export default Login;
