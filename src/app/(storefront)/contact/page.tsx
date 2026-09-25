import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact", description: "Reach the Corporate Gifting Hub team for sourcing briefs, quotes and vendor enquiries.", alternates: { canonical: "/contact" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Contact</h1>
      <p>For a sourcing brief without a product selection, add your requirements to an enquiry with no lines, or write to the address configured for this deployment. Response times follow published operating hours (IST) and are not guaranteed until confirmed.</p>
    </article>
  );
}
