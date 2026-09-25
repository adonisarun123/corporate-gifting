import { apiHandler, json, readJson } from "@/lib/api/handler";
import { startEmailVerification } from "@/modules/verification/service";

export const POST = apiHandler(async (req) => {
  const result = await startEmailVerification(await readJson(req));
  // Never return the code (the test-only hook is stripped here).
  return json({ verificationId: result.verificationId, expiresAt: result.expiresAt, channel: result.channel }, { status: 201 });
});
