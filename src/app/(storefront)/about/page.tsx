import type { Metadata } from "next";

export const metadata: Metadata = { title: "About", description: "Corporate Gifting Hub is an enquiry-led B2B gifting platform for teams in India.", alternates: { canonical: "/about" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">About</h1>
      <p>Corporate Gifting Hub is a working name for an enquiry-led corporate gifting service. Our team owns the customer relationship and issues every quotation; suppliers maintain their own supply information behind the scenes.</p><p>Claims about materials, certifications and sustainability appear only when we hold evidence for them.</p>
    </article>
  );
}
