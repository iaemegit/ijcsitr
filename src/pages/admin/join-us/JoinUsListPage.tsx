"use client";
import ContentList from "../../../components/admin/ContentList";
import { joinUsConfig } from "./join-us-config";
import "./join-us.css";
export default function JoinUsListPage() {
  return (
    <section className="join-us-directory">
      <ContentList config={joinUsConfig} />
    </section>
  );
}
