"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Link } from "../../lib/navigation";

const destinations: Record<string, string> = {
  "Aim & Scope": "/aimandscope",
  "Peer Review Process": "/peerreviewprocess",
  "Why Publish with Us?": "/whypublishwithus",
  "Author Guidelines": "/authorguidelines",
  "Editorial Policy": "/editorpolicy",
  "Publication Ethics & Plagiarism Policy": "/publicationethics",
  "Privacy Statement": "/privacystatement",
};

const menuNames = [
  "Aim & Scope",
  "Peer Review Process",
  "Why Publish with Us?",
  "Author Guidelines",
  "Editorial Policy",
  "Publication Ethics & Plagiarism Policy",
  "Privacy Statement",
];

export default function HomeAboutMenu() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="jt-about-menu" ref={container}>
      <div className="jt-about-controls">
        <button
          ref={toggle}
          type="button"
          className="nav-link jt-about-label-toggle"
          aria-expanded={open}
          aria-controls="about-navigation"
          onClick={() => setOpen(!open)}
        >
          About
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <ul
          id="about-navigation"
          className="jt-about-dropdown jt-about-names"
          aria-label="About topics"
        >
          {menuNames.map((name) => (
            <li key={name}>
              {destinations[name] ? (
                <Link
                  className="dropdown-item-text"
                  to={destinations[name]}
                  onClick={() => setOpen(false)}
                >
                  {name}
                </Link>
              ) : (
                <span className="dropdown-item-text">{name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
