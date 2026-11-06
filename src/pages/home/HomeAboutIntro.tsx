import "./home-about-intro.css";

export default function HomeAboutIntro() {
  return (
    <section className="rt-about-intro" aria-labelledby="about-ijcsitr-heading">
      <div className="row g-4 g-xl-5 align-items-start">
        <div className="col-lg-7">
          <h2 id="about-ijcsitr-heading">About IJCSITR</h2>
          <p className="rt-about-intro-lead">
            <strong>
              The International Journal of Computer Science and Information
              Technology Research (IJCSITR) is a scholarly publication
              established in 2020
            </strong>
          </p>
          <h3>Welcome Message from Editor in Chief</h3>
          <p>
            Welcome to the{" "}
            <strong>
              International Journal of Computer Science and Information
              Technology Research (IJCSITR).
            </strong>{" "}
            Since our founding in 2020, IJCSITR has aimed to serve as a trusted
            platform for high-quality research in computer science and
            information technology, covering a wide range of areas including AI,
            data science, cybersecurity, networking, quantum computing, and
            more.
          </p>
          <p>
            We are proud to announce that IJCSITR is indexed in several
            prestigious databases, including:
          </p>
          <ul className="rt-about-platforms">
            {[
              "Google Scholar",
              "Scope Database",
              "ResearchGate",
              "Academia",
              "SSRN (Social Science Research Network)",
            ].map((name) => (
              <li key={name}>
                <strong>{name}</strong>
              </li>
            ))}
          </ul>
          <p>
            These platforms help us ensure greater visibility, reach, and
            academic impact for our authors’ work.
          </p>
          <p>
            Thank you to our contributors, reviewers, and editorial board for
            their continued support. We invite researchers worldwide to submit
            their innovative work and join us in advancing knowledge and
            technology.
          </p>
        </div>
        <div className="col-lg-5">
          <img
            className="img-fluid rt-about-image"
            src="/images/journal-cover.jpg"
            alt="International Journal of Computer Science and Information Technology Research (IJCSITR) journal cover"
            width={766}
            height={1074}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
