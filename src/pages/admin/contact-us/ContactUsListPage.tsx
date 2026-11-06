"use client";
import ContentList from "../../../components/admin/ContentList";
import { contactUsConfig } from "./contact-us-config";
export default function ContactUsListPage() {
  return <ContentList config={contactUsConfig} />;
}
