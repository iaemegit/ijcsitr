import { Link } from "../../lib/navigation";
import JournalLogo from "../../components/JournalLogo";
export default function HomeFooter({ email }: { email: string }) {
  return (
    <footer className="jt-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-5">
            <Link to="/" className="jt-brand">
              <JournalLogo />
              <strong>IJCSITR</strong>
            </Link>
            <p>
              International Journal of Computer Science and Information
              Technology Research. Supporting scholarly exchange in computing
              and information technology.
            </p>
            <a href={`mailto:${email}`}>{email}</a>
          </div>
          <div className="col-6 col-lg-3">
            <h3>Journal</h3>
            <Link to="/#about">About IJCSITR</Link>
            <Link to="/articles">Articles &amp; issues</Link>
            <Link to="/archives">Journal archives</Link>
            <Link to="/editorial-board">Editorial board</Link>
          </div>
          <div className="col-6 col-lg-4">
            <h3>Publishing resources</h3>
            <Link to="/submit">Guide for authors</Link>
            <Link to="/submit">Submit a manuscript</Link>
            <Link to="/contact">Contact the editorial office</Link>
            <Link to="/portal/admin/login">Admin portal</Link>
          </div>
        </div>
        <div className="jt-footline">
          © {new Date().getFullYear()} IJCSITR. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
