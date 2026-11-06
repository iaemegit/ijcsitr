"use client";
import { useState, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Globe2, Mail, Menu, X, LogIn } from "lucide-react";
import { Link } from "../../lib/navigation";
import JournalLogo from "../../components/JournalLogo";
import JournalContext from "../../context/JournalContext";
import "./header-navigation.css";
import HeaderSearch from "./HeaderSearch";
import HomeAboutMenu from "./HomeAboutMenu";
export default function HomeHeader({
  email,
  established,
}: {
  email: string;
  established?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const issue = useContext(JournalContext).data?.currentIssue;
  const currentIssue = issue
    ? `/articles?year=${encodeURIComponent(issue.year)}&volume=${encodeURIComponent(issue.volume_no)}&issue=${encodeURIComponent(issue.issue_no)}`
    : "/articles";
  const pathname = usePathname() || "/";
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  function active(to: string) {
    const destination = to.split("?")[0];
    return destination === "/"
      ? pathname === "/"
      : pathname === destination || pathname.startsWith(destination + "/");
  }
  return (
    <>
      <div className="jt-utility">
        <div className="container d-flex justify-content-between gap-3">
          <span>
            <Globe2 size={13} /> International open-access scholarly journal
          </span>
          <div className="d-flex align-items-center justify-content-end flex-wrap gap-3">
            <a href={`mailto:${email}`}>
              <Mail size={13} /> {email}
            </a>
            <Link to="/portal/admin/login">
              <LogIn size={13} aria-hidden="true" /> Admin Login
            </Link>
          </div>
        </div>
      </div>
      <header className="jt-identity jt-identity-with-search">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          <Link to="/" className="jt-brand" aria-label="IJCSITR home">
            <JournalLogo />
            <span>
              <strong className="jt-journal-title">
                International Journal of
                <br />
                Computer Science and IT Research (IJCSITR )
              </strong>
            </span>
          </Link>
          <div className="jt-identity-aside">
            <strong>Research. Knowledge. Progress.</strong>Peer reviewed &amp;
            open access{established ? ` · Established ${established}` : ""}
            <div className="jt-header-search">
              <HeaderSearch
                onSearch={() => {
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      </header>
      <div className="jt-blue-nav">
        <div className="container">
          <nav
            className="navbar navbar-expand-xl navbar-dark"
            aria-label="Main navigation"
          >
            <button
              className="navbar-toggler"
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={open}
              aria-controls="home-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />} <span>Menu</span>
            </button>
            <div
              id="home-navigation"
              className={`collapse navbar-collapse ${open ? "show" : ""}`}
            >
              <div className="navbar-nav me-auto">
                {[
                  ["Home", "/"],
                  ["About", "/about"],
                  ["Indexing and Abstracting", "/indexing"],
                  ["Current Issue", currentIssue],
                  ["Archive", "/archives"],
                  ["Subject Area", "/subjectarea"],
                  ["Impact Factor", "/impactfactor"],
                  ["Editorial Board", "/editorial-board"],
                  ["Join", "/joinreviewer"],
                  ["APC", "/apc"],
                  ["Contact Us", "/contact"],
                ].map(([label, to]) =>
                  label === "About" ? (
                    <HomeAboutMenu key={label} />
                  ) : (
                    <Link
                      key={label}
                      to={to}
                      className={`nav-link ${active(to) ? "active" : ""}`}
                      aria-current={active(to) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
