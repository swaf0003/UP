import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauthenticated() {
  return { content: [{ type: "text" as const, text: "Not authenticated" }], isError: true };
}

export default defineTool({
  name: "list_courses",
  title: "List courses",
  description: "List courses available on Union Project, optionally filtered by faculty or a search term.",
  inputSchema: {
    search: z.string().optional().describe("Filter by course name or code."),
    faculty: z.string().optional().describe("Filter by faculty."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, faculty, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("courses")
      .select("id, name, short_name, code, faculty, year, semester, credits")
      .limit(limit ?? 25);
    if (faculty) query = query.eq("faculty", faculty);
    if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,short_name.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
