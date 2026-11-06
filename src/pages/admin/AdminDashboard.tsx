"use client";
import { useEffect, useState } from "react";
import { Link } from "../../lib/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  UsersRound,
  CheckCircle2,
  Layers3,
} from "lucide-react";
import State from "../../components/State";
import adminApi from "../../services/adminApi";
import { useAdmin } from "../../context/AdminContext";
export default function AdminDashboard() {
  const { session } = useAdmin(),
    [state, setState] = useState<any>({ loading: true }),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    adminApi("/dashboard")
      .then((data) => {
        if (active) setState({ data, loading: false });
      })
      .catch((error) => {
        if (active) setState({ error: error.message, loading: false });
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">OVERVIEW</span>
          <h1>Welcome, {session?.user.name}.</h1>
          <p>Your journal’s editorial workspace, all in one place.</p>
        </div>
      </div>
      <State {...state} retry={() => setAttempt((v) => v + 1)}>
        {state.data && (
          <div className="row g-4 admin-stats">
            <div className="col-md-4">
              <div className="card">
                <Layers3 />
                <span>Total disciplines</span>
                <strong>{state.data.disciplines}</strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <CheckCircle2 />
                <span>Active disciplines</span>
                <strong>{state.data.activeDisciplines}</strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <BookOpen />
                <span>Journals</span>
                <strong>{state.data.journals}</strong>
              </div>
            </div>
          </div>
        )}
      </State>
      <section className="admin-dashboard-section">
        <span className="eyebrow muted">YOUR FORMS</span>
        <h2>Manage journal foundations.</h2>
        <Link to="/portal/admin/journal" className="card admin-form-card mb-3">
          <div className="admin-form-icon">
            <BookOpen size={25} />
          </div>
          <div>
            <h3>Journal</h3>
            <p>View and edit the details of your existing journal.</p>
            <span>
              Open journal details <ArrowRight size={15} />
            </span>
          </div>
          <ArrowUpRight size={22} />
        </Link>
        <Link to="/portal/admin/discipline" className="card admin-form-card">
          <div className="admin-form-icon">
            <Layers3 size={25} />
          </div>
          <div>
            <h3>Discipline</h3>
            <p>
              Maintain your journal's discipline, department, and publication
              status.
            </p>
            <span>
              Open discipline manager <ArrowRight size={15} />
            </span>
          </div>
          <ArrowUpRight size={22} />
        </Link>
        <Link
          to="/portal/admin/affiliation"
          className="card admin-form-card mt-3"
        >
          <div className="admin-form-icon">
            <Building2 size={25} />
          </div>
          <div>
            <h3>Affiliation</h3>
            <p>
              Manage institutions, organizations, addresses, and affiliation
              details.
            </p>
            <span>
              Open affiliation manager <ArrowRight size={15} />
            </span>
          </div>
          <ArrowUpRight size={22} />
        </Link>
      </section>
      <Link
        to="/portal/admin/journal-issue"
        className="card admin-form-card mt-3"
      >
        <div className="admin-form-icon">
          <BookOpen size={25} />
        </div>
        <div>
          <h3>Journal Issue</h3>
          <p>Manage volumes, publication periods, and special issues.</p>
          <span>
            Open journal issue manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <Link to="/portal/admin/author" className="card admin-form-card mt-3">
        <div className="admin-form-icon">
          <UsersRound size={25} />
        </div>
        <div>
          <h3>Author</h3>
          <p>Manage author profiles, institutions, and research details.</p>
          <span>
            Open author manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <Link
        to="/portal/admin/editorial-board"
        className="card admin-form-card mt-3"
      >
        <div className="admin-form-icon">
          <UsersRound size={25} />
        </div>
        <div>
          <h3>Editorial Board</h3>
          <p>
            Manage editors, affiliations, academic profiles and board
            membership.
          </p>
          <span>
            Open editorial board manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <Link to="/portal/admin/article" className="card admin-form-card mt-3">
        <div className="admin-form-icon">
          <BookOpen size={25} />
        </div>
        <div>
          <h3>Article</h3>
          <p>
            Manage articles, authors, journal issues and publication status.
          </p>
          <span>
            Open article manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <Link to="/portal/admin/awards" className="card admin-form-card mt-3">
        <div className="admin-form-icon">
          <UsersRound size={25} />
        </div>
        <div>
          <h3>Awards</h3>
          <p>Manage award recipients, descriptions and academic profiles.</p>
          <span>
            Open awards manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <Link to="/portal/admin/membership" className="card admin-form-card mt-3">
        <div className="admin-form-icon">
          <UsersRound size={25} />
        </div>
        <div>
          <h3>Membership</h3>
          <p>Manage members, membership years and academic profiles.</p>
          <span>
            Open membership manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      <Link
        to="/portal/admin/call-for-paper"
        className="card admin-form-card mt-3"
      >
        <div className="admin-form-icon">
          <BookOpen size={25} />
        </div>
        <div>
          <h3>Call for Papers</h3>
          <p>
            Manage issue schedules, submission deadlines and announcement PDFs.
          </p>
          <span>
            Open calls for papers manager <ArrowRight size={15} />
          </span>
        </div>
        <ArrowUpRight size={22} />
      </Link>
      {[
        ["join-us", "Join Us", "Review applications and CVs."],
        [
          "online-papers",
          "Online Papers",
          "Review submitted manuscripts and author details.",
        ],
        ["downloads", "Downloads", "Maintain downloadable journal documents."],
        [
          "testimonial",
          "Testimonial",
          "Manage testimonials and contributor profiles.",
        ],
        ["contact-us", "Contact Us", "Review incoming contact messages."],
      ].map(([path, title, description]) => (
        <Link
          key={path}
          to={"/portal/admin/" + path}
          className="card admin-form-card mt-3"
        >
          <div className="admin-form-icon">
            <BookOpen size={25} />
          </div>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
            <span>
              Open {title}
              <ArrowRight size={15} />
            </span>
          </div>
          <ArrowUpRight size={22} />
        </Link>
      ))}
    </>
  );
}
