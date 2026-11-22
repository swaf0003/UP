import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "./list-courses";

export default defineTool({
  name: "create_event",
  title: "Create agenda event",
  description: "Create a calendar event in the signed-in user's Union Project agenda.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Event title."),
    start_time: z.string().datetime({ offset: true }).describe("ISO datetime when the event starts."),
    end_time: z.string().datetime({ offset: true }).describe("ISO datetime when the event ends."),
    description: z.string().max(1000).optional().describe("Optional details."),
    location: z.string().max(200).optional().describe("Optional location."),
    color: z.string().max(32).optional().describe("Optional color token."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("calendar_events")
      .insert({
        title: input.title,
        start_time: input.start_time,
        end_time: input.end_time,
        description: input.description ?? null,
        location: input.location ?? null,
        color: input.color ?? "primary",
        user_id: ctx.getUserId(),
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});
