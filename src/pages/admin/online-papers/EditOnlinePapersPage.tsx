"use client";
import ContentEdit from "../../../components/admin/ContentEdit";
import { onlinePapersConfig } from "./online-papers-config";
export default function EditOnlinePapersPage() {
  return <ContentEdit config={onlinePapersConfig} />;
}
