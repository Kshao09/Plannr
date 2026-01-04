// lib/idempotency.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function now() {
  return new Date();
}

function addSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function getIdempotencyKey(req: Request) {
  const k =
    req.headers.get("idempotency-key") ??
    req.headers.get("Idempotency-Key") ??
    req.headers.get("x-idempotency-key") ??
    "";
  const key = k.trim();
  return key.length ? key : null;
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

export async function beginIdempotency(opts: {
  req: Request;
  route: string; // include dynamic parts (slug/email) so keys don’t cross streams
  userId?: string;
  ttlSeconds?: number; // how long we keep the stored response
}): Promise<
  | { kind: "none" }
  | { kind: "replay"; response: NextResponse }
  | { kind: "claimed"; recordId: string }
  | { kind: "inflight"; response: NextResponse }
> {
  const key = getIdempotencyKey(opts.req);
  if (!key) return { kind: "none" };

  const ttl = typeof opts.ttlSeconds === "number" ? opts.ttlSeconds : 10 * 60;

  const existing = await prisma.idempotencyKey.findUnique({
    where: { route_key: { route: opts.route, key } },
    select: {
      id: true,
      state: true,
      statusCode: true,
      response: true,
      expiresAt: true,
      userId: true,
    },
  });

  if (existing && existing.expiresAt > now()) {
    if (opts.userId && existing.userId && existing.userId !== opts.userId) {
      return {
        kind: "replay",
        response: NextResponse.json({ message: "Idempotency key conflict" }, { status: 409 }),
      };
    }

    if (existing.state === "COMPLETED") {
      return {
        kind: "replay",
        response: NextResponse.json(existing.response ?? {}, { status: existing.statusCode ?? 200 }),
      };
    }

    return {
      kind: "inflight",
      response: NextResponse.json({ message: "Request already in progress. Please wait." }, { status: 409 }),
    };
  }

  try {
    const created = await prisma.idempotencyKey.create({
      data: {
        route: opts.route,
        key,
        userId: opts.userId,
        state: "PENDING",
        expiresAt: addSeconds(ttl),
      },
      select: { id: true },
    });
    return { kind: "claimed", recordId: created.id };
  } catch (e: any) {
    if (isUniqueViolation(e)) {
      const again = await prisma.idempotencyKey.findUnique({
        where: { route_key: { route: opts.route, key } },
        select: { state: true, statusCode: true, response: true, expiresAt: true },
      });

      if (again && again.expiresAt > now() && again.state === "COMPLETED") {
        return {
          kind: "replay",
          response: NextResponse.json(again.response ?? {}, { status: again.statusCode ?? 200 }),
        };
      }

      return {
        kind: "inflight",
        response: NextResponse.json({ message: "Request already in progress. Please wait." }, { status: 409 }),
      };
    }

    console.warn("[idempotency] fail-open:", e?.message ?? e);
    return { kind: "none" };
  }
}

export async function finishIdempotency(opts: {
  recordId?: string;
  statusCode: number;
  response: any;
}) {
  if (!opts.recordId) return;

  try {
    await prisma.idempotencyKey.update({
      where: { id: opts.recordId },
      data: {
        state: "COMPLETED",
        statusCode: opts.statusCode,
        response: opts.response,
      },
    });
  } catch (e) {
    console.warn("[idempotency] finish failed:", (e as any)?.message ?? e);
  }
}
