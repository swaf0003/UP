import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { curricula, type Course, type CourseResource } from "@/data/mockData";

interface DbCourse {
  id: string;
  code: string;
  name: string;
  short_name: string;
  credits: number;
  semester: number;
  university_id: string;
  faculty: string;
  year: string;
}

interface DbResource {
  id: string;
  course_id: string;
  type: string;
  title: string;
  url: string;
  duration: string | null;
  pages: number | null;
  questions: number | null;
  source: string | null;
}

const mapDbToCourse = (dbCourse: DbCourse, dbResources: DbResource[]): Course => ({
  id: dbCourse.id,
  code: dbCourse.code,
  name: dbCourse.name,
  shortName: dbCourse.short_name,
  credits: dbCourse.credits,
  semester: dbCourse.semester as 1 | 2,
  resources: dbResources
    .filter((r) => r.course_id === dbCourse.id)
    .map((r) => ({
      id: r.id,
      type: r.type as "video" | "pdf" | "quiz",
      title: r.title,
      url: r.url,
      duration: r.duration ?? undefined,
      pages: r.pages ?? undefined,
      questions: r.questions ?? undefined,
      source: r.source ?? undefined,
    })),
});

export const useCourses = (universityId: string, faculty: string, year: string) => {
  return useQuery({
    queryKey: ["courses", universityId, faculty, year],
    queryFn: async (): Promise<Course[]> => {
      // Fetch from DB
      const { data: dbCourses, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("university_id", universityId)
        .eq("faculty", faculty)
        .eq("year", year);

      if (coursesError) throw coursesError;

      // Get mock data for this combo
      const mockCurriculum = curricula.find((c) => c.universityId === universityId);
      const mockFaculty = mockCurriculum?.faculties.find((f) => f.faculty === faculty);
      const mockYear = mockFaculty?.years.find((y) => y.year === year);
      const mockCourses = mockYear?.courses || [];

      if (!dbCourses || dbCourses.length === 0) {
        // No DB courses, use mock data
        return mockCourses;
      }

      // Fetch resources for DB courses
      const courseIds = dbCourses.map((c) => c.id);
      const { data: dbResources } = await supabase
        .from("resources")
        .select("*")
        .in("course_id", courseIds);

      const dbMapped = dbCourses.map((c) => mapDbToCourse(c, dbResources || []));

      // Merge: DB courses + mock courses not already in DB (by code)
      const dbCodes = new Set(dbCourses.map((c) => c.code));
      const remaining = mockCourses.filter((mc) => !dbCodes.has(mc.code));

      return [...dbMapped, ...remaining];
    },
    staleTime: 30_000,
  });
};
