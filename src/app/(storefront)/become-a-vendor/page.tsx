import type { Metadata } from "next";

export const metadata: Metadata = { title: "Become a vendor", description: "Apply to supply gifts through Corporate Gifting Hub.", alternates: { canonical: "/become-a-vendor" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Become a vendor</h1>
      <p>Vendors keep their own products, stock, lead times and costs current in a private portal. Public content is reviewed before publication; your procurement costs and SKUs are never shown to customers.</p><p>Applications are approved by our team, after which managers are invited by e-mail.</p>
    </article>
  );
}
