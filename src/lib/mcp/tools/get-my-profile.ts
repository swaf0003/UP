import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated } from "./list-courses";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Get the signed-in user's Union Project profile (university, faculty, academic year).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("id, user_id, display_name, university, faculty, academic_year, avatar_url")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { profile: data },
    };
  },
});
