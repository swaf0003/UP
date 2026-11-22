export interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
}

export const UNIVERSITIES: University[] = [
  { id: "ulb", name: "ULB – Université Libre de Bruxelles", shortName: "ULB", city: "Bruxelles" },
  { id: "uclouvain", name: "UCLouvain", shortName: "UCLouvain", city: "Louvain-la-Neuve" },
  { id: "uliege", name: "ULiège – Université de Liège", shortName: "ULiège", city: "Liège" },
  { id: "umons", name: "UMons – Université de Mons", shortName: "UMons", city: "Mons" },
  { id: "unamur", name: "UNamur – Université de Namur", shortName: "UNamur", city: "Namur" },
  { id: "uantwerpen", name: "UAntwerpen", shortName: "UAntwerpen", city: "Anvers" },
  { id: "ugent", name: "UGent – Universiteit Gent", shortName: "UGent", city: "Gand" },
  { id: "uhasselt", name: "UHasselt", shortName: "UHasselt", city: "Hasselt" },
  { id: "vub", name: "VUB – Vrije Universiteit Brussel", shortName: "VUB", city: "Bruxelles" },
];

export const UNIVERSITY_NAMES: Record<string, string> = Object.fromEntries(
  UNIVERSITIES.map((u) => [u.id, u.shortName])
);

export const FACULTIES: string[] = [
  "Médecine",
  "Polytechnique",
  "Droit",
  "Sciences",
  "Économie",
  "Philosophie & Lettres",
  "Psychologie",
  "Sciences sociales",
  "Informatique",
];

export const ACADEMIC_YEARS: string[] = ["BA1", "BA2", "BA3", "MA1", "MA2"];

export function getUniversityShortName(id?: string | null): string {
  if (!id) return "";
  return UNIVERSITY_NAMES[id] ?? id.toUpperCase();
}
