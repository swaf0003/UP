import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "./list-courses";

export default defineTool({
  name: "list_my_events",
  title: "List my agenda events",
  description: "List the signed-in user's calendar events, optionally within a date range.",
  inputSchema: {
    from: z.string().optional().describe("ISO datetime lower bound for event start."),
    to: z.string().optional().describe("ISO datetime upper bound for event start."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("calendar_events")
      .select("id, title, description, location, start_time, end_time, color, is_synced")
      .order("start_time", { ascending: true })
      .limit(limit ?? 50);
    if (from) query = query.gte("start_time", from);
    if (to) query = query.lte("start_time", to);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
