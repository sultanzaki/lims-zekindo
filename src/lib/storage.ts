import "server-only";
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "test-attachments";

// Bypasses RLS — service-role key must never reach the client bundle. This
// module is server-only and every export here must stay that way.
function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use attachment storage."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadAttachment(path: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(`Attachment upload failed: ${error.message}`);
}

export async function signedAttachmentUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function deleteAttachment(path: string): Promise<void> {
  const { error } = await client().storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Attachment delete failed: ${error.message}`);
}
