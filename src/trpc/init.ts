import { initTRPC, TRPCError } from "@trpc/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";
import { rateLimitUser, rateLimitTenant } from "@/lib/rate-limit";

export async function createContext() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dbUser = null;
  if (user) {
    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    dbUser = found ?? null;
  }

  return { supabase, user, dbUser, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Authenticated procedure — requires login + rate limiting */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.dbUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Rate limit: 100 req/min per user, 1000 req/min per tenant
  try {
    const [userLimit, tenantLimit] = await Promise.all([
      rateLimitUser(ctx.dbUser.id),
      rateLimitTenant(ctx.dbUser.tenantId),
    ]);

    if (!userLimit.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Trop de requêtes. Veuillez patienter.",
      });
    }
    if (!tenantLimit.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Limite de requêtes de votre organisation atteinte.",
      });
    }
  } catch (error) {
    // If Redis is down, don't block the request — fail open
    if (error instanceof TRPCError) throw error;
    console.warn("[RateLimit] Redis unavailable, failing open:", error);
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      dbUser: ctx.dbUser,
      tenantId: ctx.dbUser.tenantId,
    },
  });
});

/** Admin-only procedure */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.dbUser.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
