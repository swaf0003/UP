import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "./list-courses";

export default defineTool({
  name: "search_resources",
  title: "Search resources",
  description: "Search study resources (notes, exams, videos) in the Union Project archive, optionally scoped to a course.",
  inputSchema: {
    search: z.string().optional().describe("Text to match against resource titles."),
    courseId: z.string().uuid().optional().describe("Restrict results to this course id."),
    type: z.string().optional().describe("Resource type filter, e.g. 'notes', 'exam', 'video'."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, courseId, type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("resources")
      .select("id, title, type, url, course_id, pages, questions, duration, source, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (courseId) query = query.eq("course_id", courseId);
    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { resources: data ?? [] },
    };
  },
});
