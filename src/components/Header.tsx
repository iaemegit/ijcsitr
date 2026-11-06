"use client";
import { ArrowUpRight, Bookmark, Menu, X } from "lucide-react";
import JournalLogo from "./JournalLogo";
import { useContext, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "../lib/navigation";
import SavedContext from "../context/SavedContext";
function Header() {
  const [open, setOpen] = useState(false);
  const { saved } = useContext(SavedContext);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <>
      <div className="utility">
        <div className="container">
          <span>Independent ideas. Shared knowledge.</span>
          <div>
            <Link to="/about">About the journal</Link>
            <span className="utility-dot" />
            <Link to="/contact">
              Contact us <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
      <header>
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="IJCSITR home">
            <JournalLogo />
            <div>
              <strong>
                IJCSITR<span>®</span>
              </strong>
              <small>COMPUTER SCIENCE & IT RESEARCH</small>
            </div>
          </Link>
          <button
            className="mobile-toggle icon-button btn"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            className={open ? "nav open" : "nav"}
            aria-label="Primary navigation"
          >
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/articles">Articles</NavLink>
            <NavLink to="/archives">Archives</NavLink>
            <NavLink to="/editorial-board">Editorial board</NavLink>
          </nav>
          <div className="header-actions">
            <Link
              className="saved-link icon-button btn"
              to="/saved"
              aria-label={`Saved articles (${saved.length})`}
            >
              <Bookmark size={20} />
              {saved.length > 0 && <b>{saved.length}</b>}
            </Link>
            <Link className="button small btn" to="/submit">
              Submit a paper <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
export default Header;
