"use client";
import "./admin-login.css";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "../../lib/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import JournalLogo from "../../components/JournalLogo";
export default function AdminLogin() {
  const { session, loading, error: sessionError, login } = useAdmin(),
    navigate = useNavigate();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (loading)
    return (
      <div className="admin-loading">
        <LoaderCircle className="spin" /> Checking your session…
      </div>
    );
  if (session) return <Navigate to="/portal/admin/dashboard" replace />;
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      navigate("/portal/admin/dashboard", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-login-page">
      <section className="admin-login-story">
        <Link to="/" className="admin-logo">
          <JournalLogo />
          <span>
            IJCSITR<small>EDITORIAL ADMINISTRATION</small>
          </span>
        </Link>
        <div className="login-story-copy">
          <span className="eyebrow">THE WORK BEHIND THE KNOWLEDGE</span>
          <h1>
            Great research.
            <br />
            Thoughtful
            <br />
            <em>management.</em>
          </h1>
          <p>
            A dedicated workspace for the people who keep the journal moving
            forward.
          </p>
          <div className="login-story-badge">
            <ShieldCheck size={20} />
            <span>Restricted editorial access</span>
          </div>
        </div>
        <span className="login-story-footer">
          International Journal of Computer Science
          <br />
          and Information Technology Research
        </span>
        <div className="login-decoration" aria-hidden="true" />
      </section>
      <section className="admin-login-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} /> Back to the journal
        </Link>
        <div className="admin-login-form">
          <div className="admin-lock-icon">
            <LockKeyhole size={25} />
          </div>
          <span className="eyebrow muted">ADMIN PORTAL</span>
          <h2>Welcome back.</h2>
          <p>Sign in to manage your journal.</p>
          <form onSubmit={submit}>
            <label className="form-label" htmlFor="admin-username">
              Username
            </label>
            <input
              className="form-control"
              id="admin-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={255}
              required
              autoFocus
            />
            <label className="form-label" htmlFor="admin-password">
              Password
            </label>
            <div className="admin-password-field">
              <input
                className="form-control"
                id="admin-password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={256}
                required
              />
              <button
                type="button"
                className="btn icon-button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {(error || sessionError) && (
              <div className="alert alert-danger admin-alert" role="alert">
                {error || sessionError}
              </div>
            )}
            <button className="btn button w-100" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={17} className="spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="admin-login-note">
            <ShieldCheck size={14} /> Access is limited to authorized journal
            administrators.
          </p>
        </div>
        <span className="login-copyright">
          © {new Date().getFullYear()} IJCSITR · Editorial workspace
        </span>
      </section>
    </main>
  );
}
