"use client";
import ContentEdit from "../../../components/admin/ContentEdit";
import { downloadsConfig } from "./downloads-config";
export default function EditDownloadsPage() {
  return <ContentEdit config={downloadsConfig} />;
}
