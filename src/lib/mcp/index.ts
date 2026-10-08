import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list-courses";
import searchResources from "./tools/search-resources";
import listMyEvents from "./tools/list-my-events";
import createEvent from "./tools/create-event";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "union-project-mcp",
  title: "Union Project",
  version: "0.1.0",
  instructions:
    "Tools for Union Project, a Belgian student community app. Browse courses and the shared study-resource archive, read the signed-in student's profile, and read or create events in their agenda.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCourses, searchResources, getMyProfile, listMyEvents, createEvent],
});
