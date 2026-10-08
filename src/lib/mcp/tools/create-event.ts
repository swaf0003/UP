import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "./list-courses";

export default defineTool({
  name: "create_event",
  title: "Create agenda event",
  description: "Create a calendar event in the signed-in user's Union Project agenda.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Event title."),
    start_time: z.string().describe("ISO datetime when the event starts."),
    end_time: z.string().describe("ISO datetime when the event ends."),
    description: z.string().optional().describe("Optional details."),
    location: z.string().optional().describe("Optional location."),
    color: z.string().optional().describe("Optional color token."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("calendar_events")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});
