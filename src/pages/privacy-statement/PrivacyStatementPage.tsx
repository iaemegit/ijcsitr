import PublishingPageLayout from "../../components/PublishingPageLayout";
import "./privacy-statement.css";

export default function PrivacyStatementPage() {
  return (
    <PublishingPageLayout
      title="Privacy Statement"
      description="How IJCSITR uses and protects your personal information."
    >
      <div className="privacy-statement-content">
        <p>
          At International Journal of Computer Science and Information
          Technology Research (IJCSITR), we prioritize the protection of your
          personal information. The names and email addresses provided during
          the submission process or any other interaction with our journal site
          will be used exclusively for the stated purposes of this journal. We
          assure you that your personal information will not be shared, sold, or
          made available to any other party for any other purpose.
        </p>
        <p>
          We collect and store your personal information securely, in compliance
          with relevant data protection regulations. Your information is used
          solely for the following purposes:
        </p>
        <section aria-labelledby="privacy-communication">
          <h2 id="privacy-communication">Communication:</h2>
          <p>
            We may use your email address to communicate with you regarding the
            submission process, editorial decisions, and any other relevant
            updates related to your interactions with IJCSITR.
          </p>
        </section>
        <section aria-labelledby="privacy-operations">
          <h2 id="privacy-operations">Journal Operations:</h2>
          <p>
            Your name and email address may be used for internal journal
            operations, such as peer review coordination, editorial
            correspondence, and administrative tasks.
          </p>
        </section>
        <section aria-labelledby="privacy-publication">
          <h2 id="privacy-publication">Publication:</h2>
          <p>
            If your submission is accepted for publication, your name and
            affiliation (if provided) may be included in the published article
            for proper attribution.
          </p>
        </section>
        <p>
          We are committed to maintaining the confidentiality and integrity of
          your personal information. If you have any concerns about the use of
          your personal data or wish to update or remove your information from
          our records, please contact us at{" "}
          <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a>.
        </p>
        <p>
          Thank you for entrusting us with your personal information. We value
          your privacy and strive to provide a secure and transparent experience
          for all users of IJCSITR.
        </p>
      </div>
    </PublishingPageLayout>
  );
}
