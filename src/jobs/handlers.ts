import "@/lib/server-guard";
import { eq } from "drizzle-orm";
import type { Db, Tx } from "@/db/client";
import { withContextTransaction } from "@/db/client";
import { contacts, enquiries, notificationDeliveries, productVariants, quoteRevisions, quotes, vendorInvitations, vendorOffers, vendors } from "@/db/schema";
import { systemContext } from "@/modules/identity/actor";
import { refreshSearchDocument, refreshSupplySummary } from "@/modules/catalog/service";
import { markProcessed, type OutboxRow } from "@/modules/outbox/service";
import { getNotificationAdapter, maskEmail } from "@/lib/notifications/adapter";
import { env } from "@/lib/env";

type Handler = (row: OutboxRow, db: Db) => Promise<void>;

/** Runs `fn` once per (event, handler) — safe under at-least-once delivery. */
async function once(db: Db, row: OutboxRow, handler: string, fn: (tx: Tx) => Promise<void>): Promise<void> {
  await withContextTransaction(systemContext(row.correlationId ?? row.id), async (tx) => {
    if (!(await markProcessed(tx, row.id, handler))) return;
    await fn(tx);
  }, db);
}

/** Sends after the marker commits; the delivery record tracks provider outcome. */
async function sendEmail(db: Db, row: OutboxRow, template: string, to: string, subject: string, text: string) {
  const adapter = getNotificationAdapter();
  const [delivery] = await db.insert(notificationDeliveries).values({ outboxEventId: row.id, channel: "email", template, recipientMasked: maskEmail(to), status: "sending", attempts: 1 }).returning();
  try {
    const r = await adapter.sendEmail({ to, subject, text, template });
    await db.update(notificationDeliveries).set({ status: "sent", providerMessageId: r.providerMessageId }).where(eq(notificationDeliveries.id, delivery!.id));
  } catch (e) {
    await db.update(notificationDeliveries).set({ status: "failed", lastError: String(e).slice(0, 500) }).where(eq(notificationDeliveries.id, delivery!.id));
    throw e; // outbox retries with backoff; the enquiry/quote itself is untouched (AC-05)
  }
}

export const handlers: Record<string, Handler[]> = {
  "catalog.product.published": [
    async (row, db) => once(db, row, "projections", async (tx) => { await refreshSupplySummary(tx, row.entityId); await refreshSearchDocument(tx, row.entityId); }),
  ],
  "catalog.product.unpublished": [async (row, db) => once(db, row, "projections", async (tx) => { await refreshSearchDocument(tx, row.entityId); })],
  "supply.offer.updated": [
    async (row, db) => once(db, row, "projections", async (tx) => {
      const productId = (row.payload.productId as string | undefined) ?? (await productIdForOffer(tx, row.entityId));
      if (productId) await refreshSupplySummary(tx, productId);
    }),
  ],
  "supply.stock.updated": [
    async (row, db) => once(db, row, "projections", async (tx) => {
      const productId = (row.payload.productId as string | undefined) ?? (await productIdForOffer(tx, row.entityId));
      if (productId) await refreshSupplySummary(tx, productId);
    }),
  ],
  "enquiry.submitted": [
    async (row, db) => {
      let to: string | null = null; let reference = ""; let name = "";
      await once(db, row, "customer_ack", async (tx) => {
        const e = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, row.entityId) });
        const c = e ? await tx.query.contacts.findFirst({ where: eq(contacts.id, e.contactId) }) : null;
        if (e && c?.email) { to = c.email; reference = e.reference; name = c.name; }
      });
      if (to) await sendEmail(db, row, "enquiry_ack", to, `Enquiry ${reference} received`, `Hello ${name},\n\nWe have recorded your enquiry ${reference}. Our team will confirm availability with suppliers and send a quotation.\n\nThis reference is not a login; a secure link will arrive with your quotation.`);
    },
  ],
  "quote.issued": [
    async (row, db) => {
      let to: string | null = null; let quoteNumber = ""; let link = "";
      await once(db, row, "customer_quote_email", async (tx) => {
        const rev = await tx.query.quoteRevisions.findFirst({ where: eq(quoteRevisions.id, row.entityId) });
        const q = rev ? await tx.query.quotes.findFirst({ where: eq(quotes.id, rev.quoteId) }) : null;
        const e = q ? await tx.query.enquiries.findFirst({ where: eq(enquiries.id, q.enquiryId) }) : null;
        const c = e ? await tx.query.contacts.findFirst({ where: eq(contacts.id, e.contactId) }) : null;
        if (rev?.customerDocument && q && c?.email) { to = c.email; quoteNumber = rev.customerDocument.quoteNumber; link = `${env.APP_ORIGIN}/quotes/${q.id}?t=${row.payload.accessToken as string}`; }
      });
      if (to) await sendEmail(db, row, "quote_issued", to, `Quotation ${quoteNumber}`, `Your quotation ${quoteNumber} is ready. Review and accept it here (link expires with the quote):\n${link}`);
    },
  ],
  "vendor.invited": [
    async (row, db) => {
      let to: string | null = null; let vendorName = "";
      await once(db, row, "vendor_invite_email", async (tx) => {
        const inv = await tx.query.vendorInvitations.findFirst({ where: eq(vendorInvitations.id, row.entityId) });
        const v = inv ? await tx.query.vendors.findFirst({ where: eq(vendors.id, inv.vendorId) }) : null;
        if (inv && v) { to = inv.email; vendorName = v.displayName; }
      });
      const link = `${env.APP_ORIGIN}/vendor/accept?token=${row.payload.token as string}`;
      if (to) await sendEmail(db, row, "vendor_invited", to, `You have been invited to manage ${vendorName}`, `An administrator invited you to manage ${vendorName} on Corporate Gifting Hub.\n\nAccept within 7 days: ${link}\n\nSign in with this e-mail address to accept.`);
    },
  ],
  "enquiry.status_changed": [],
  "sourcing.request.sent": [],
  "sourcing.response.received": [],
  "quote.accepted": [],
};

async function productIdForOffer(tx: Tx, offerId: string): Promise<string | null> {
  const r = await tx
    .select({ productId: productVariants.productId })
    .from(vendorOffers)
    .innerJoin(productVariants, eq(productVariants.id, vendorOffers.variantId))
    .where(eq(vendorOffers.id, offerId));
  return r[0]?.productId ?? null;
}
