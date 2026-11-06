"use client";
import { BookOpen } from "lucide-react";
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={32} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export default Empty;
