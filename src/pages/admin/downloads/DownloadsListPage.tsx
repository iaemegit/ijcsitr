"use client";
import ContentList from "../../../components/admin/ContentList";
import { downloadsConfig } from "./downloads-config";
export default function DownloadsListPage() {
  return <ContentList config={downloadsConfig} />;
}
