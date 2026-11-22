import { supabase } from "@/integrations/supabase/client";

/**
 * Validates that a URL uses an allowed http: or https: protocol (blocking javascript:, data:, etc.).
 */
export function isSafeHttpUrl(rawUrl: string | null | undefined, requireHttps = false): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (requireHttps) return parsed.protocol === "https:";
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Returns a sanitized external URL or "#" if the protocol is unsafe.
 */
export function sanitizeExternalUrl(rawUrl: string | null | undefined): string {
  return isSafeHttpUrl(rawUrl) ? rawUrl!.trim() : "#";
}

/**
 * Validates an OAuth redirect URL before assigning window.location.href.
 */
export function isSafeOAuthRedirect(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "https:") return true;
    // Allow http only on localhost for local OAuth development
    if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const ALLOWED_AVATAR_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export function validateAvatarFile(file: File): { valid: true; ext: string } | { valid: false; error: string } {
  const ext = ALLOWED_AVATAR_MIMES[file.type];
  if (!ext) {
    return { valid: false, error: "Format non autorisé. Utilise JPG, PNG ou WebP (SVG interdit)." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { valid: false, error: "Fichier trop lourd (maximum 2 Mo)." };
  }
  return { valid: true, ext };
}

/**
 * Resolves a private storage object path (or legacy public URL) into a short-lived signed URL.
 */
export async function getSignedStorageUrl(
  bucket: "voice-messages" | "resources",
  pathOrUrl: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!pathOrUrl) return null;

  let objectPath = pathOrUrl;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const idx = pathOrUrl.indexOf(publicMarker);
  if (idx !== -1) {
    objectPath = pathOrUrl.slice(idx + publicMarker.length);
  } else if (isSafeHttpUrl(pathOrUrl)) {
    // External non-storage URL (e.g. YouTube or external PDF)
    return pathOrUrl;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
