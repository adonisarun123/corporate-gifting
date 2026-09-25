import { apiHandler, json } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { listAuditEvents } from "@/modules/audit/read";

export const GET = apiHandler(async (req) => {
  const p = req.nextUrl.searchParams;
  return json(await listAuditEvents(await getActor(), { entityType: p.get("entityType"), entityId: p.get("entityId"), vendorId: p.get("vendorId"), limit: Number(p.get("limit") ?? 100) }));
});
