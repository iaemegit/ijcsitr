"use client";
import { useContext, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import JournalContext from "../context/JournalContext";
import PageIntro from "./PageIntro";
import HomeSidebar from "../pages/home/HomeSidebar";
import "../pages/publishing-pages.css";

export default function PublishingPageLayout({
  title,
  description,
  source,
  children,
}: {
  title: string;
  description: string;
  source?: string;
  children: ReactNode;
}) {
  const journal = useContext(JournalContext).data?.journal;
  return (
    <main>
      <PageIntro
        label="PUBLISH WITH IJCSITR"
        title={title}
        description={description}
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 jt-maincol">
            <article className="jt-section publishing-content">
              {children}
              {source && (
                <a
                  className="jt-text-link publishing-source"
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source: IJCSITR {title}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
            </article>
          </div>
          <HomeSidebar
            journal={journal}
            email={journal?.email || "editor@ijcsitr.com"}
          />
        </div>
      </div>
    </main>
  );
}
