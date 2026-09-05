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

export async function uploadAttachment(path: string, file: File, contentType?: string): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  // contentType, when provided, is the content-DETECTED type (see
  // lib/fileType.ts) — never the raw client label. Supabase stores this as
  // the object's metadata, which is what signed URLs later serve as the
  // Content-Type header.
  const { error } = await client()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType: contentType || file.type || "application/octet-stream", upsert: false });
  if (error) {
    // Surface the exact bucket name being used — "bucket not found" almost
    // always means the bucket name here doesn't match what actually exists
    // in Supabase (typo, wrong project, or a stale SUPABASE_STORAGE_BUCKET
    // override left over from before the bucket was renamed/recreated).
    throw new Error(`Attachment upload failed: ${error.message} (bucket: "${BUCKET}")`);
  }
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

// Signed URL that forces a download instead of inline rendering. Used for
// anything that is not a verified image — a file whose real type is
// HTML/JS/SVG (or anything we can't confirm) must never be rendered inline
// in the browser, where it could execute. Supabase appends ?download= which
// makes the browser save the file rather than open it.
export async function signedAttachmentDownloadUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const { data, error } = await client()
      .storage.from(BUCKET)
      .createSignedUrl(path, expiresInSeconds, { download: true });
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// Pick the right signed URL for a stored object based on its (server-detected)
// content type. Verified images may render inline; everything else is forced
// to download so a spoofed or unexpected file can never execute in the
// browser context (stored-XSS defence-in-depth).
export async function signedUrlFor(fileType: string, path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (fileType.startsWith("image/")) {
    return signedAttachmentUrl(path, expiresInSeconds);
  }
  return signedAttachmentDownloadUrl(path, expiresInSeconds);
}

export async function deleteAttachment(path: string): Promise<void> {
  const { error } = await client().storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Attachment delete failed: ${error.message}`);
}
