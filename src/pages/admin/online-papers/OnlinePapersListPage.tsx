"use client";
import ContentList from "../../../components/admin/ContentList";
import { onlinePapersConfig } from "./online-papers-config";
import "./online-papers.css";
export default function OnlinePapersListPage() {
  return <ContentList config={onlinePapersConfig} />;
}
