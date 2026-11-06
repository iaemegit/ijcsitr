"use client";
import ContentEdit from "../../../components/admin/ContentEdit";
import { contactUsConfig } from "./contact-us-config";
export default function EditContactUsPage() {
  return <ContentEdit config={contactUsConfig} />;
}
