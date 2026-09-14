import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { data: session } = await auth.getSession();

  if (!isAdminUser(session?.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured" }, { status: 503 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid voice note" }, { status: 400 });
  }

  const notes = await sql`select blob_url from weekly_voice_notes where id = ${id} limit 1`;
  if (!notes.length) {
    return NextResponse.json({ error: "Voice note not found" }, { status: 404 });
  }

  const result = await get(String(notes[0].blob_url), { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Voice note not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "content-type": result.blob.contentType,
      "content-length": String(result.blob.size),
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "accept-ranges": "none",
      "x-content-type-options": "nosniff",
    },
  });
}
