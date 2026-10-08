import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, courseId } = await req.json();
    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch resources for this course to give context
    const { data: resources } = await supabaseAdmin
      .from("resources")
      .select("id, title, type, course_id")
      .eq("course_id", courseId)
      .limit(50);

    // Fetch course info
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("name, short_name, faculty, year")
      .eq("id", courseId)
      .single();

    const resourceList = (resources || [])
      .map((r: any) => `- "${r.title}" (${r.type}, id: ${r.id})`)
      .join("\n");

    const systemPrompt = `Tu es l'assistant IA de Union Project, une plateforme étudiante belge. Tu aides les étudiants dans le salon "${course?.short_name || course?.name || "ce cours"}".

Tu as accès aux ressources suivantes dans l'Archive de ce cours :
${resourceList || "Aucune ressource disponible pour ce cours."}

Règles :
- Réponds en français, de manière concise et utile (max 3-4 phrases)
- Si une ressource de la liste est pertinente, mentionne-la par son titre
- Sois encourageant et amical, comme un tuteur bienveillant
- Si tu ne sais pas, dis-le honnêtement
- N'invente pas de ressources qui ne sont pas dans la liste`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI error:", status, await response.text());
      return new Response(
        JSON.stringify({ error: "Erreur IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu répondre.";

    return new Response(
      JSON.stringify({ answer }),
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
