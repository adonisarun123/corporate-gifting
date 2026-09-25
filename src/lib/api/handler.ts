import "@/lib/server-guard";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { AppError, isAppError } from "@/lib/errors";

type Handler<Ctx> = (req: NextRequest, ctx: Ctx & { requestId: string }) => Promise<Response>;

/** Wraps a route handler with the error contract (spec §19) and a request id. */
export function apiHandler<Ctx = { params: Promise<Record<string, string>> }>(fn: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    try {
      const res = await fn(req, { ...ctx, requestId });
      res.headers.set("x-request-id", requestId);
      if (!res.headers.has("cache-control")) res.headers.set("cache-control", "private, no-store");
      return res;
    } catch (e) {
      return errorResponse(e, requestId);
    }
  };
}

export function errorResponse(e: unknown, requestId: string): NextResponse {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of e.issues) {
      const k = issue.path.join(".") || "_";
      (fieldErrors[k] ??= []).push(issue.message);
    }
    return NextResponse.json({ code: "validation_failed", message: "Validation failed", fieldErrors, requestId }, { status: 422, headers: { "x-request-id": requestId } });
  }
  if (isAppError(e)) return NextResponse.json(e.toJSON(requestId), { status: e.status, headers: { "x-request-id": requestId } });
  console.error(`[${requestId}]`, e);
  const internal = new AppError("internal", "Something went wrong; please retry");
  return NextResponse.json(internal.toJSON(requestId), { status: 500, headers: { "x-request-id": requestId } });
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("validation_failed", "Request body must be JSON", { fieldErrors: { _: ["invalid JSON"] } });
  }
}

export const json = (body: unknown, init?: ResponseInit) => NextResponse.json(body, init);
