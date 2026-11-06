import "./about-scope.css";
const aims = [
  [
    "Research quality",
    "Advance computing through rigorous, original and interdisciplinary scholarship.",
  ],
  [
    "New ideas",
    "Share emerging technologies, algorithms, tools and approaches.",
  ],
  [
    "Research into practice",
    "Connect academic findings with industry needs and practical applications.",
  ],
  [
    "International exchange",
    "Bring together researchers and diverse perspectives from around the world.",
  ],
  [
    "Learning and teaching",
    "Support educators and students through research and shared knowledge.",
  ],
  [
    "Research for society",
    "Address privacy, security, sustainability, health and access to technology.",
  ],
  [
    "Publication integrity",
    "Maintain transparent, ethical publishing and fair, rigorous review.",
  ],
];
const scope = [
  ["Original contributions", "New theories, models, algorithms and systems."],
  ["Practical research", "Technology applied to real-world problems."],
  [
    "Work across disciplines",
    "Combined perspectives on technological challenges.",
  ],
  [
    "Research reviews",
    "Evidence summaries, research gaps and future directions.",
  ],
  ["Technology development", "New tools, frameworks and software."],
  ["Case-based studies", "Lessons from practical implementations."],
  ["Better methods", "Improvements in efficiency, accuracy and performance."],
  ["Social responsibility", "Technology’s ethical and societal effects."],
];
export default function AboutAimScope() {
  return (
    <section
      className="jt-section about-aim-scope"
      id="scope"
      aria-labelledby="about-scope-title"
    >
      <div className="jt-section-head">
        <h2 id="about-scope-title">Aim and Scope</h2>
      </div>
      <h3>Aim</h3>
      <p>
        IJCSITR connects researchers, educators and industry professionals to
        share discoveries, methods and theoretical progress in computer science
        and information technology.
      </p>
      <h3>The journal’s specific aims</h3>
      <div className="about-aim-details">
        {aims.map(([title, text]) => (
          <div key={title}>
            <h4>{title}</h4>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <h3>Scope</h3>
      <p>
        The journal welcomes theoretical, experimental and applied computing
        research, including interdisciplinary work that addresses complex
        technological challenges.
      </p>
      <dl className="about-scope-details">
        {scope.map(([title, text]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
