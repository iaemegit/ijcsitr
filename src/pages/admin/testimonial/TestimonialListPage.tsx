"use client";
import ContentList from "../../../components/admin/ContentList";
import { testimonialConfig } from "./testimonial-config";
export default function TestimonialListPage() {
  return <ContentList config={testimonialConfig} />;
}
