import content from "./aim-scope-content.json";
import "./aim-scope.css";
export default function HomeAimScope() {
  return (
    <section
      className="jt-section home-aim-scope"
      id="scope"
      aria-labelledby="home-scope-title"
    >
      <div className="jt-section-head">
        <h2 id="home-scope-title">Aims &amp; scope</h2>
      </div>
      <h3 className="home-scope-heading">Aim</h3>
      <p>{content.aimIntro}</p>
      <h3 className="home-scope-heading">{content.aimsHeading}</h3>
      <dl className="home-aim-list">
        {content.aims.map(({ title, text }) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      <p>{content.aimConclusion}</p>
      <h3 className="home-scope-heading">Scope</h3>
      {content.scopeIntro.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <h3 className="home-scope-heading">
        IJCSITR is particularly interested in:
      </h3>
      <dl className="home-scope-formats">
        {content.scope.map(({ title, text }) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
