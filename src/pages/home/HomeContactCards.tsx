import { Mail, MapPin, Phone } from "lucide-react";
import "./home-contact-cards.css";

export default function HomeContactCards() {
  return (
    <section
      className="home-contact-section"
      aria-labelledby="home-contact-title"
    >
      <h2 id="home-contact-title">Contact Us</h2>
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card home-contact-card h-100">
            <span className="home-contact-icon">
              <MapPin size={22} aria-hidden="true" />
            </span>
            <h3>Address</h3>
            <p>Chennai, Tamilnadu, India</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card home-contact-card h-100">
            <span className="home-contact-icon">
              <Mail size={22} aria-hidden="true" />
            </span>
            <h3>Email Us</h3>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a>
            </p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card home-contact-card h-100">
            <span className="home-contact-icon">
              <Phone size={22} aria-hidden="true" />
            </span>
            <h3>Support</h3>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
