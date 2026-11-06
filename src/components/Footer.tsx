"use client";
import { ArrowUpRight } from "lucide-react";
import JournalLogo from "./JournalLogo";
import { Link } from "../lib/navigation";
function Footer() {
  return (
    <footer>
      <div className="container footer-main">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <JournalLogo />
            <div>
              <strong>
                IJCSITR<span>®</span>
              </strong>
              <small>RESEARCH MOVES US FORWARD.</small>
            </div>
          </Link>
          <p>
            International Journal of Computer Science
            <br />
            and Information Technology Research
          </p>
        </div>
        <div>
          <span className="eyebrow">EXPLORE</span>
          <Link to="/articles">Research articles</Link>
          <Link to="/archives">Issue archives</Link>
          <Link to="/editorial-board">Editorial board</Link>
        </div>
        <div>
          <span className="eyebrow">CONNECT</span>
          <Link to="/about">About the journal</Link>
          <Link to="/submit">Submit a manuscript</Link>
          <Link to="/contact">Contact the editorial office</Link>
        </div>
        <div className="footer-statement">
          Good questions.
          <br />
          New perspectives.
          <br />
          <em>Shared progress.</em>
          <ArrowUpRight size={26} />
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} IJCSITR. All rights reserved.</span>
        <span>
          Made for curious minds. <span className="status-dot" />
        </span>
      </div>
    </footer>
  );
}
export default Footer;
