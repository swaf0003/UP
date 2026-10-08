import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ICSEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
}

function parseICS(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const blocks = icsText.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key: string): string => {
      const regex = new RegExp(`${key}[^:]*:(.*)`, "m");
      const match = block.match(regex);
      return match ? match[1].trim().replace(/\\n/g, "\n").replace(/\\,/g, ",") : "";
    };

    const parseDate = (val: string): string => {
      if (!val) return new Date().toISOString();
      // Handle TZID format: DTSTART;TZID=Europe/Brussels:20260101T090000
      const cleanVal = val.includes(":") ? val.split(":").pop()! : val;
      // Format: 20260101T090000Z or 20260101T090000
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
        uid: uid || `gen-${i}-${Date.now()}`,
        title: summary,
        description: description || "",
        location: location || "",
        start_time: parseDate(dtstart),
        end_time: dtend ? parseDate(dtend) : parseDate(dtstart),
      });
    }
  }

  return events;
}

Deno.serve(async (req) => {
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

    const { ics_url } = await req.json();
    if (!ics_url) {
      return new Response(JSON.stringify({ error: "URL ICS requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ICS
    const icsResponse = await fetch(ics_url);
    if (!icsResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Impossible de récupérer le calendrier ICS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const icsText = await icsResponse.text();
    const events = parseICS(icsText);

    // Delete old synced events for this user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("user_id", user.id)
      .eq("is_synced", true);

    // Insert new events
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

    // Save the ICS link in profile
    await supabaseAdmin
      .from("profiles")
      .update({ ics_link: ics_url })
      .eq("user_id", user.id);

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
