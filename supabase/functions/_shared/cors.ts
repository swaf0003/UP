const DEFAULT_ALLOWED_ORIGINS = [
  "https://unionproject.be",
  "https://www.unionproject.be",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
];

export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = getAllowedOrigins();
  const matchedOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    Vary: "Origin",
  };
}
