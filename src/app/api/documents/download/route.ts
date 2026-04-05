import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/db";
import { users, documents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logError } from "@/lib/error-handler";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("id");

    if (!docId) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    // Auth check
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get document — verify tenant ownership
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.tenantId, dbUser.tenantId)))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Generate signed URL from Supabase Storage
    const adminSupabase = createSupabaseAdmin();
    const { data, error } = await adminSupabase.storage
      .from("documents")
      .createSignedUrl(doc.filePath, 300); // 5 min expiry

    if (error || !data?.signedUrl) {
      logError(error, { context: "document_download", docId });
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl, fileName: doc.fileName });
  } catch (error) {
    logError(error, { context: "document_download_handler" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
