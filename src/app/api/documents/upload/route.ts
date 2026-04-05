import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/db";
import { users, documents, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { logError } from "@/lib/error-handler";
import { logAudit, getIpFromRequest } from "@/lib/audit";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
]);

export async function POST(req: Request) {
  try {
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

    const tenantId = dbUser.tenantId;

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Maximum: ${MAX_SIZE / 1024 / 1024} Mo` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporte. PDF, Word, Excel, images acceptes." },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const adminSupabase = createSupabaseAdmin();
    const fileName = `${tenantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminSupabase.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logError(uploadError, { context: "document_upload", tenantId });
      return NextResponse.json(
        { error: "Echec de l'upload. Reessayez." },
        { status: 500 }
      );
    }

    // Create document record
    const [doc] = await db
      .insert(documents)
      .values({
        tenantId,
        filePath: fileName,
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
      })
      .returning();

    // Audit log
    await logAudit({
      tenantId,
      userId: dbUser.id,
      action: "document.uploaded",
      resource: "document",
      resourceId: doc.id,
      detail: { fileName: file.name, size: file.size, mimeType: file.type },
      ipAddress: getIpFromRequest(req),
    });

    // Trigger admin agent for classification if active
    const [adminAgent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.tenantId, tenantId),
          eq(agents.type, "admin"),
          eq(agents.status, "active")
        )
      )
      .limit(1);

    if (adminAgent) {
      await inngest.send({
        name: "agent/document.uploaded",
        data: {
          tenantId,
          agentId: adminAgent.id,
          documentId: doc.id,
          filePath: fileName,
          fileName: file.name,
          mimeType: file.type,
        },
      });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        category: doc.category,
      },
    });
  } catch (error) {
    logError(error, { context: "document_upload_handler" });
    return NextResponse.json(
      { error: "Erreur interne lors de l'upload." },
      { status: 500 }
    );
  }
}
