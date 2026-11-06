"use client";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import JournalContext from "../context/JournalContext";
import HomeHeader from "../pages/home/HomeHeader";
import HomeFooter from "../pages/home/HomeFooter";
import "../pages/home/home.css";
import "../pages/home/public-pages.css";
import "../pages/home/research-template.css";
import "../pages/home/responsive-template.css";
import "../pages/home/home-readability.css";
import "../pages/home/navigation-alignment.css";
import "../pages/compact-info-pages.css";
export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const journal = useContext(JournalContext).data?.journal;
  const email = journal?.email || "editor@ijcsitr.com";
  return (
    <div
      className={`journal-template research-template ${pathname === "/" ? "homepage-template" : ""}`}
    >
      <a href="#journal-content" className="jt-skip-link">
        Skip to content
      </a>
      <HomeHeader email={email} established={journal?.start_year} />
      <div id="journal-content" tabIndex={-1}>
        {pathname === "/" ? (
          children
        ) : (
          <div className="jt-inner-page">{children}</div>
        )}
      </div>
      <HomeFooter email={email} />
    </div>
  );
}
