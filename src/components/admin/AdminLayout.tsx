"use client";
import { useState } from "react";
import { Link, Navigate, NavLink } from "../../lib/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Layers3,
  LoaderCircle,
  LogOut,
  Menu,
  X,
  UsersRound,
  FileText,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import JournalLogo from "../JournalLogo";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, logout } = useAdmin(),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (loading)
    return (
      <div className="admin-loading">
        <LoaderCircle className="spin" /> Checking your session…
      </div>
    );
  if (!session) return <Navigate to="/portal/admin/login" replace />;
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-workspace">
      {open && (
        <button
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={"admin-sidebar " + (open ? "is-open" : "")}>
        <Link to="/portal/admin/dashboard" className="admin-logo">
          <JournalLogo />
          <span>
            IJCSITR<small>ADMIN PORTAL</small>
          </span>
        </Link>
        <button
          className="btn icon-button admin-sidebar-close"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <span className="admin-menu-label">WORKSPACE</span>
        <nav aria-label="Admin navigation">
          <NavLink to="/portal/admin/dashboard" onClick={() => setOpen(false)}>
            <LayoutDashboard size={18} /> Dashboard <ChevronRight size={14} />
          </NavLink>
          <span className="admin-menu-label">FORMS</span>
          <NavLink to="/portal/admin/discipline" onClick={() => setOpen(false)}>
            <Layers3 size={18} /> Discipline <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/journal" onClick={() => setOpen(false)}>
            <BookOpen size={18} /> Journal <ChevronRight size={14} />
          </NavLink>
          <NavLink
            to="/portal/admin/journal-issue"
            onClick={() => setOpen(false)}
          >
            <BookOpen size={18} /> Journal Issue <ChevronRight size={14} />
          </NavLink>
          <NavLink
            to="/portal/admin/affiliation"
            onClick={() => setOpen(false)}
          >
            <Building2 size={18} /> Affiliation <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/author" onClick={() => setOpen(false)}>
            <UsersRound size={18} /> Author <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/article" onClick={() => setOpen(false)}>
            <FileText size={18} /> Article <ChevronRight size={14} />
          </NavLink>
          <NavLink
            to="/portal/admin/editorial-board"
            onClick={() => setOpen(false)}
          >
            <UsersRound size={18} /> Editorial Board <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/membership" onClick={() => setOpen(false)}>
            <UsersRound size={18} /> Membership <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/awards" onClick={() => setOpen(false)}>
            <UsersRound size={18} /> Awards <ChevronRight size={14} />
          </NavLink>
          <NavLink
            to="/portal/admin/call-for-paper"
            onClick={() => setOpen(false)}
          >
            <BookOpen size={18} /> Call for Papers <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/join-us" onClick={() => setOpen(false)}>
            <UsersRound size={18} />
            Join Us
            <ChevronRight size={14} />
          </NavLink>
          <NavLink
            to="/portal/admin/online-papers"
            onClick={() => setOpen(false)}
          >
            <FileText size={18} />
            Online Papers
            <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/downloads" onClick={() => setOpen(false)}>
            <FileText size={18} />
            Downloads
            <ChevronRight size={14} />
          </NavLink>
          <NavLink
            to="/portal/admin/testimonial"
            onClick={() => setOpen(false)}
          >
            <UsersRound size={18} />
            Testimonial
            <ChevronRight size={14} />
          </NavLink>
          <NavLink to="/portal/admin/contact-us" onClick={() => setOpen(false)}>
            <FileText size={18} />
            Contact Us
            <ChevronRight size={14} />
          </NavLink>
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">
            View public journal <ArrowUpRight size={15} />
          </Link>
          <span>
            Journal administration
            <br />
            <b>IJCSITR editorial workspace</b>
          </span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="btn icon-button admin-menu-toggle"
              aria-label="Open admin menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>EDITORIAL WORKSPACE</span>
          </div>
          <div>
            <span className="admin-user-avatar">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="admin-user-name">
              {session.user.name}
              <small>Administrator</small>
            </span>
            <button
              className="btn admin-logout"
              onClick={signOut}
              disabled={busy}
            >
              <LogOut size={16} />
              <span>{busy ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </header>
        {error && (
          <div role="alert" className="alert alert-danger m-3">
            {error}
          </div>
        )}
        <div className="admin-content">{children}</div>
        <footer className="admin-footer">
          <span>© {new Date().getFullYear()} IJCSITR</span>
          <span>Editorial administration</span>
        </footer>
      </div>
    </div>
  );
}
