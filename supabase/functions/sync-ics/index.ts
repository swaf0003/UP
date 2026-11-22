import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_ICS_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 8000;

interface ICSEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local
  if (lower.startsWith("::ffff:")) {
    return isPrivateOrReservedIPv4(lower.slice(7));
  }
  return false;
}

async function validateExternalHttpsUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("URL ICS invalide");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Seules les URLs HTTPS sont autorisées");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URL avec identifiants non autorisée");
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Hôte non autorisé");
  }

  // Block raw IP literals directly
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    throw new Error("Les adresses IP directes ne sont pas autorisées");
  }

  // Resolve DNS to block SSRF to internal/private IPs
  try {
    const ipv4s = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
    const ipv6s = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
    if (ipv4s.length === 0 && ipv6s.length === 0) {
      throw new Error("Impossible de résoudre le domaine ICS");
    }
    for (const ip of ipv4s) {
      if (isPrivateOrReservedIPv4(ip)) throw new Error("Destination réseau non autorisée");
    }
    for (const ip of ipv6s) {
      if (isPrivateOrReservedIPv6(ip)) throw new Error("Destination réseau non autorisée");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("autorisée")) throw err;
    throw new Error("Domaine ICS introuvable ou bloqué");
  }

  return parsed;
}

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error("Le fichier ICS dépasse la taille maximale autorisée (2 Mo)");
  }

  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Le fichier ICS dépasse la taille maximale autorisée (2 Mo)");
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function parseICS(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const blocks = icsText.split("BEGIN:VEVENT");

  for (let i = 1; i < Math.min(blocks.length, 1001); i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key: string): string => {
      const regex = new RegExp(`${key}[^:]*:(.*)`, "m");
      const match = block.match(regex);
      return match ? match[1].trim().replace(/\\n/g, "\n").replace(/\\,/g, ",") : "";
    };

    const parseDate = (val: string): string => {
      if (!val) return new Date().toISOString();
      const cleanVal = val.includes(":") ? val.split(":").pop()! : val;
      const y = cleanVal.slice(0, 4);
      const m = cleanVal.slice(4, 6);
      const d = cleanVal.slice(6, 8);
      const h = cleanVal.slice(9, 11) || "00";
      const min = cleanVal.slice(11, 13) || "00";
      const s = cleanVal.slice(13, 15) || "00";
      const suffix = cleanVal.endsWith("Z") ? "Z" : "";
      return `${y}-${m}-${d}T${h}:${min}:${s}${suffix}`;
    };

    const uid = get("UID");
    const summary = get("SUMMARY");
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    const description = get("DESCRIPTION");
    const location = get("LOCATION");

    if (summary && dtstart) {
      events.push({
        uid: (uid || `gen-${i}-${Date.now()}`).slice(0, 200),
        title: summary.slice(0, 200),
        description: (description || "").slice(0, 1000),
        location: (location || "").slice(0, 200),
        start_time: parseDate(dtstart),
        end_time: dtend ? parseDate(dtend) : parseDate(dtstart),
      });
    }
  }

  return events;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const icsUrlRaw = typeof body?.ics_url === "string" ? body.ics_url.trim() : "";
    if (!icsUrlRaw || icsUrlRaw.length > 2048) {
      return new Response(JSON.stringify({ error: "URL ICS invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let safeUrl: URL;
    try {
      safeUrl = await validateExternalHttpsUrl(icsUrlRaw);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "URL ICS refusée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const icsResponse = await fetch(safeUrl.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "text/calendar, text/plain;q=0.9" },
    });

    if (icsResponse.status >= 300 && icsResponse.status < 400) {
      return new Response(
        JSON.stringify({ error: "Les redirections ICS ne sont pas autorisées. Utilise le lien direct." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!icsResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Impossible de récupérer le calendrier ICS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const icsText = await readTextWithLimit(icsResponse, MAX_ICS_BYTES);
    if (!icsText.includes("BEGIN:VCALENDAR")) {
      return new Response(
        JSON.stringify({ error: "Le lien ne pointe pas vers un fichier calendrier ICS valide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const events = parseICS(icsText);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("user_id", user.id)
      .eq("is_synced", true);

    if (events.length > 0) {
      const rows = events.map((e) => ({
        user_id: user.id,
        title: e.title,
        description: e.description,
        location: e.location,
        start_time: e.start_time,
        end_time: e.end_time,
        is_synced: true,
        ics_uid: e.uid,
        color: "primary",
      }));

      const { error: insertError } = await supabaseAdmin
        .from("calendar_events")
        .insert(rows);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Erreur lors de l'import" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Store private ICS URL in profile_private (not public profiles)
    await supabaseAdmin
      .from("profile_private")
      .upsert({ user_id: user.id, ics_link: safeUrl.toString() }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ success: true, count: events.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
