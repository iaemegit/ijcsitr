"use client";
import { BookOpen } from "lucide-react";
function Cover({ issue, small = false }) {
  return (
    <div
      className={`journal-cover ${small ? "cover-small" : ""}`}
      aria-label={`IJCSITR journal cover, volume ${issue?.volume_no || "7"}`}
    >
      <div className="cover-top">
        <span>IJCSITR</span>
        <BookOpen size={small ? 18 : 23} />
      </div>
      <div className="cover-title">
        International Journal of
        <br />
        Computer Science and
        <br />
        Information Technology
        <br />
        Research
      </div>
      <div className="cover-art">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />
        <div className="orbit orbit-four" />
        <div className="orbit-core" />
        <span className="art-cross cross-one">+</span>
        <span className="art-cross cross-two">+</span>
        <span className="art-dot" />
      </div>
      <div className="cover-footer">
        <span>
          VOLUME {issue?.volume_no || "7"}
          <br />
          ISSUE {issue?.issue_no || "2"}
        </span>
        <span>
          {issue?.year || "2026"}
          <br />
          RESEARCH JOURNAL
        </span>
      </div>
    </div>
  );
}
export default Cover;
