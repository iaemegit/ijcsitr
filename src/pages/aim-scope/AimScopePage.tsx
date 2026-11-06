import PublishingPageLayout from "../../components/PublishingPageLayout";
import content from "../home/aim-scope-content.json";
import "./aim-scope-page.css";

export default function AimScopePage() {
  return (
    <PublishingPageLayout
      title="Aim & Scope"
      description="The journal’s mission, research priorities and scope of publication."
      source="https://www.ijcsitr.com/aimandscope"
    >
      <div className="aim-scope-page">
        <section aria-labelledby="aim-scope-about">
          <h2 id="aim-scope-about">About IJCSITR</h2>
          <p>
            The International Journal of Computer Science and Information
            Technology Research (IJCSITR) is a scholarly publication established
            in 2020, dedicated to advancing research in the fields of computer
            science and information technology. It serves as a platform for
            academics, researchers, and professionals to share their latest
            findings, innovative ideas, and technological advancements in areas
            such as algorithms, artificial intelligence, data science, cyber
            security, software engineering, networking, and more. The journal
            aims to contribute to the collective knowledge base in these
            disciplines, fostering collaboration and driving progress in the
            rapidly evolving fields of computer science and information
            technology.
          </p>
        </section>
        <section aria-labelledby="journal-aim">
          <h2 id="journal-aim">Aim</h2>
          <p>{content.aimIntro}</p>
          <h3>{content.aimsHeading}</h3>
          <dl className="aim-scope-objectives">
            {content.aims.map(({ title, text }) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <p>{content.aimConclusion}</p>
        </section>
        <section aria-labelledby="journal-scope">
          <h2 id="journal-scope">Scope</h2>
          {content.scopeIntro.map((text) => (
            <p key={text}>{text}</p>
          ))}
          <h3>IJCSITR is particularly interested in:</h3>
          <dl className="aim-scope-topics">
            {content.scope.map(({ title, text }) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </PublishingPageLayout>
  );
}
