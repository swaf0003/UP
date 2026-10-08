// Universities & faculties
export const universities = [
  { id: "ulb", name: "ULB", domain: "@student.ulb.be", city: "Bruxelles" },
  { id: "uclouvain", name: "UCLouvain", domain: "@student.uclouvain.be", city: "Louvain-la-Neuve" },
  { id: "uliege", name: "ULiège", domain: "@student.uliege.be", city: "Liège" },
  { id: "vub", name: "VUB", domain: "@vub.be", city: "Bruxelles" },
  { id: "umons", name: "UMons", domain: "@student.umons.be", city: "Mons" },
  { id: "unamur", name: "UNamur", domain: "@student.unamur.be", city: "Namur" },
  { id: "uantwerpen", name: "UAntwerpen", domain: "@student.uantwerpen.be", city: "Antwerpen" },
  { id: "ugent", name: "UGent", domain: "@student.ugent.be", city: "Gent" },
  { id: "uhasselt", name: "UHasselt", domain: "@student.uhasselt.be", city: "Hasselt" },
];

export const pilotFaculties = ["Médecine", "Polytechnique"] as const;
export const academicYears = ["BA1", "BA2", "BA3"] as const;

export const comingSoonFaculties = [
  { name: "Droit", icon: "Scale" },
  { name: "Sciences Économiques", icon: "TrendingUp" },
  { name: "Philosophie & Lettres", icon: "BookOpen" },
  { name: "Sciences", icon: "Atom" },
  { name: "Psychologie", icon: "Brain" },
];

export const faculties = [
  "Sciences", "Engineering", "Medicine", "Law", "Economics",
  "Philosophy & Letters", "Psychology", "Computer Science", "Architecture", "Political Science",
];

// ─── University-specific curricula ──────────────────────────────────────────

export interface CourseResource {
  id?: string;
  type: "video" | "pdf" | "quiz";
  title: string;
  url: string;
  duration?: string;
  pages?: number;
  questions?: number;
  source?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description?: string;
  credits: number;
  semester: 1 | 2;
  resources: CourseResource[];
}

export interface CurriculumYear {
  year: "BA1" | "BA2" | "BA3";
  courses: Course[];
}

export interface FacultyCurriculum {
  faculty: "Polytechnique" | "Médecine";
  years: CurriculumYear[];
}

export interface UniversityCurriculum {
  universityId: string;
  faculties: FacultyCurriculum[];
}

export const curricula: UniversityCurriculum[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // ULB — École polytechnique de Bruxelles
  // ══════════════════════════════════════════════════════════════════════════
  {
    universityId: "ulb",
    faculties: [
      {
        faculty: "Polytechnique",
        years: [
          {
            year: "BA1",
            courses: [
              {
                id: "ulb-math-h1002", code: "MATH-H1002", name: "Analyse I", shortName: "Analyse I",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ulb-math-h1003", code: "MATH-H1003", name: "Algèbre linéaire et géométrie", shortName: "Algèbre",
                credits: 7, semester: 1, resources: [],
              },
              {
                id: "ulb-math-h1004", code: "MATH-H1004", name: "Éléments d'analyse", shortName: "Élém. d'analyse",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-phys-h1001", code: "PHYS-H1001", name: "Physique générale I", shortName: "Physique I",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulb-phys-h1002", code: "PHYS-H1002", name: "Physique générale II", shortName: "Physique II",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-chim-h1001", code: "CHIM-H1001", name: "Chimie générale et procédés durables", shortName: "Chimie",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-info-h100", code: "INFO-H100", name: "Informatique", shortName: "Info",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-meca-h100", code: "MECA-H100", name: "Mécanique rationnelle I", shortName: "Méca Ration. I",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA2",
            courses: [
              {
                id: "ulb-math-h2000", code: "MATH-H2000", name: "Analyse II", shortName: "Analyse II",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ulb-math-h2002", code: "MATH-H2002", name: "Calcul des probabilités et statistiques", shortName: "Proba & Stats",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-math-h202", code: "MATH-H202", name: "Analyse numérique", shortName: "Analyse Num.",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-elec-h2001", code: "ELEC-H2001", name: "Électromagnétisme", shortName: "E&M",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-info-h2001", code: "INFO-H2001", name: "Programmation orientée objet", shortName: "POO",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-cnst-h2001", code: "CNST-H2001", name: "Mécanique des solides et des structures", shortName: "Méca Solides",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-chim-h2001", code: "CHIM-H2001", name: "Chimie physique, matériaux et fabrication", shortName: "Chimie Phys.",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-meca-h200", code: "MECA-H200", name: "Mécanique rationnelle II", shortName: "Méca Ration. II",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA3",
            courses: [
              {
                id: "ulb-elec-h3001", code: "ELEC-H3001", name: "Électricité appliquée", shortName: "Élec. Appli.",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-math-h3001", code: "MATH-H3001", name: "Signaux et systèmes", shortName: "Signaux",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-meca-h3001", code: "MECA-H3001", name: "Fluid Mechanics and Transfer Processes", shortName: "Méca Fluides",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
        ],
      },
      {
        faculty: "Médecine",
        years: [
          {
            year: "BA1",
            courses: [
              {
                id: "ulb-anat-m100", code: "MEDI-B-100", name: "Anatomie Générale", shortName: "Anatomie",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ulb-bioch-m100", code: "MEDI-B-101", name: "Biochimie Fondamentale", shortName: "Biochimie",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulb-physio-m100", code: "MEDI-B-102", name: "Physiologie Humaine I", shortName: "Physiologie",
                credits: 8, semester: 2, resources: [],
              },
              {
                id: "ulb-histo-m100", code: "MEDI-B-103", name: "Histologie", shortName: "Histologie",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-chimmed-m100", code: "MEDI-B-104", name: "Chimie Générale et Organique", shortName: "Chimie",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-biophy-m100", code: "MEDI-B-105", name: "Biophysique", shortName: "Biophysique",
                credits: 4, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA2",
            courses: [
              {
                id: "ulb-anat-m200", code: "MEDI-B-200", name: "Anatomie Systématique", shortName: "Anatomie II",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ulb-physio-m200", code: "MEDI-B-201", name: "Physiologie Humaine II", shortName: "Physiologie II",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulb-bioch-m200", code: "MEDI-B-202", name: "Biochimie Métabolique", shortName: "Biochimie II",
                credits: 6, semester: 1, resources: [],
              },
              {
                id: "ulb-embr-m200", code: "MEDI-B-203", name: "Embryologie et Génétique", shortName: "Embryologie",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ulb-micro-m200", code: "MEDI-B-204", name: "Microbiologie Générale", shortName: "Microbio",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-pharma-m200", code: "MEDI-B-205", name: "Pharmacologie Générale", shortName: "Pharmaco",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA3",
            courses: [
              {
                id: "ulb-path-m300", code: "MEDI-B-300", name: "Pathologie Générale", shortName: "Pathologie",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulb-semiomed-m300", code: "MEDI-B-301", name: "Sémiologie Médicale", shortName: "Sémiologie",
                credits: 6, semester: 1, resources: [],
              },
              {
                id: "ulb-immuno-m300", code: "MEDI-B-302", name: "Immunologie", shortName: "Immuno",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulb-neuro-m300", code: "MEDI-B-303", name: "Neurosciences", shortName: "Neuro",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ulb-biostat-m300", code: "MEDI-B-304", name: "Biostatistique et Épidémiologie", shortName: "Biostats",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulb-stage-m300", code: "MEDI-B-305", name: "Introduction au Stage Clinique", shortName: "Stage",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // UCLouvain — École Polytechnique de Louvain (EPL)
  // ══════════════════════════════════════════════════════════════════════════
  {
    universityId: "uclouvain",
    faculties: [
      {
        faculty: "Polytechnique",
        years: [
          {
            year: "BA1",
            courses: [
              {
                id: "ucl-lepl1101", code: "LEPL1101", name: "Algèbre", shortName: "Algèbre",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1102", code: "LEPL1102", name: "Analyse I", shortName: "Analyse I",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1201", code: "LEPL1201", name: "Physique I", shortName: "Physique I",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1401", code: "LEPL1401", name: "Informatique 1", shortName: "Info 1",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1501", code: "LEPL1501", name: "Projet 1", shortName: "Projet 1",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1104", code: "LEPL1104", name: "Méthodes numériques", shortName: "Méth. Num.",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1105", code: "LEPL1105", name: "Analyse II", shortName: "Analyse II",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1202", code: "LEPL1202", name: "Physique II", shortName: "Physique II",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1502", code: "LEPL1502", name: "Projet 2", shortName: "Projet 2",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1301", code: "LEPL1301", name: "Chimie et chimie physique 1", shortName: "Chimie 1",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1801", code: "LEPL1801", name: "Éthique de l'ingénieur", shortName: "Éthique",
                credits: 3, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1803", code: "LEPL1803", name: "Économie", shortName: "Économie",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA2",
            courses: [
              {
                id: "ucl-lepl1103", code: "LEPL1103", name: "EDPs et analyse complexe", shortName: "EDPs",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1106", code: "LEPL1106", name: "Signaux et systèmes", shortName: "Signaux",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1203", code: "LEPL1203", name: "Physique III", shortName: "Physique III",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1108", code: "LEPL1108", name: "Mathématiques discrètes et probabilité", shortName: "Maths Disc.",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1503", code: "LEPL1503", name: "Projet 3", shortName: "Projet 3",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1302", code: "LEPL1302", name: "Chimie et chimie physique 2", shortName: "Chimie 2",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1402", code: "LEPL1402", name: "Informatique 2", shortName: "Info 2",
                credits: 5, semester: 1, resources: [],
              },
            ],
          },
          {
            year: "BA3",
            courses: [
              {
                id: "ucl-lepl1109", code: "LEPL1109", name: "Statistiques et science des données", shortName: "Stats & Data",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1110", code: "LEPL1110", name: "Éléments finis", shortName: "Éléments Finis",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-lepl1804", code: "LEPL1804", name: "Développement durable et transition", shortName: "Dev. Durable",
                credits: 3, semester: 1, resources: [],
              },
              {
                id: "ucl-lepl1504", code: "LEPL1504", name: "Projet 4 (Spécialisation)", shortName: "Projet 4",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
        ],
      },
      {
        faculty: "Médecine",
        years: [
          {
            year: "BA1",
            courses: [
              {
                id: "ucl-wmd1100", code: "WMD1100", name: "Anatomie et Physiologie Humaine", shortName: "Anatomie",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1101", code: "WMD1101", name: "Biochimie et Biologie Moléculaire", shortName: "Biochimie",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1102", code: "WMD1102", name: "Histologie et Embryologie", shortName: "Histologie",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ucl-wmd1103", code: "WMD1103", name: "Chimie Générale", shortName: "Chimie",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1104", code: "WMD1104", name: "Physique Médicale", shortName: "Physique",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA2",
            courses: [
              {
                id: "ucl-wmd1200", code: "WMD1200", name: "Physiologie des Grands Systèmes", shortName: "Physiologie",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1201", code: "WMD1201", name: "Anatomie Topographique", shortName: "Anatomie II",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1202", code: "WMD1202", name: "Microbiologie et Infectiologie", shortName: "Microbio",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ucl-wmd1203", code: "WMD1203", name: "Génétique et Embryologie", shortName: "Génétique",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ucl-wmd1204", code: "WMD1204", name: "Pharmacologie", shortName: "Pharmaco",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA3",
            courses: [
              {
                id: "ucl-wmd1300", code: "WMD1300", name: "Pathologie et Physiopathologie", shortName: "Pathologie",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1301", code: "WMD1301", name: "Sémiologie et Communication Clinique", shortName: "Sémiologie",
                credits: 6, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1302", code: "WMD1302", name: "Immunologie Fondamentale", shortName: "Immuno",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ucl-wmd1303", code: "WMD1303", name: "Neurosciences", shortName: "Neuro",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ucl-wmd1304", code: "WMD1304", name: "Biostatistique", shortName: "Biostats",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ULiège — Faculté des Sciences Appliquées
  // ══════════════════════════════════════════════════════════════════════════
  {
    universityId: "uliege",
    faculties: [
      {
        faculty: "Polytechnique",
        years: [
          {
            year: "BA1",
            courses: [
              {
                id: "ulg-math0002", code: "MATH0002-4", name: "Analyse mathématique 1", shortName: "Analyse 1",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-math0502", code: "MATH0502-1", name: "Analyse mathématique 2", shortName: "Analyse 2",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ulg-math0013", code: "MATH0013-1", name: "Algèbre", shortName: "Algèbre",
                credits: 4, semester: 1, resources: [],
              },
              {
                id: "ulg-phys2020", code: "PHYS2020-1", name: "Physique 1 : Mécanique", shortName: "Physique 1",
                credits: 4, semester: 1, resources: [],
              },
              {
                id: "ulg-phys2021", code: "PHYS2021-1", name: "Physique 2 : Électricité et électromagnétisme", shortName: "Physique 2",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulg-chim9272", code: "CHIM9272-2", name: "Chimie 1", shortName: "Chimie 1",
                credits: 4, semester: 1, resources: [],
              },
              {
                id: "ulg-chim9273", code: "CHIM9273-1", name: "Chimie 2", shortName: "Chimie 2",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulg-info2009", code: "INFO2009-2", name: "Introduction à l'informatique", shortName: "Info",
                credits: 4, semester: 1, resources: [],
              },
              {
                id: "ulg-info0061", code: "INFO0061-4", name: "Organisation des ordinateurs", shortName: "Orga. Ordi.",
                credits: 3, semester: 2, resources: [],
              },
              {
                id: "ulg-proj0001", code: "PROJ0001-1", name: "Introduction aux méthodes numériques et projet", shortName: "Projet I",
                credits: 4, semester: 2, resources: [],
              },
              {
                id: "ulg-math0001", code: "MATH0001-2", name: "Communication graphique", shortName: "Comm. Graph.",
                credits: 3, semester: 1, resources: [],
              },
              {
                id: "ulg-genv0001", code: "GENV0001-2", name: "Génie de l'environnement", shortName: "Env.",
                credits: 4, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA2",
            courses: [
              {
                id: "ulg-meca0003", code: "MECA0003-2", name: "Mécanique rationnelle", shortName: "Méca Ration.",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-meca0001", code: "MECA0001-2", name: "Mécanique des matériaux", shortName: "Méca Matériaux",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-meca0011", code: "MECA0011-2", name: "Éléments de mécanique des fluides", shortName: "Méca Fluides",
                credits: 4, semester: 2, resources: [],
              },
              {
                id: "ulg-math0006", code: "MATH0006-3", name: "Introduction to Numerical Analysis", shortName: "Num. Analysis",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-chim0286", code: "CHIM0286-1", name: "Éléments de thermodynamique", shortName: "Thermo",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-phys2022", code: "PHYS2022-2", name: "Physique 3 : Ondes et quanta", shortName: "Physique 3",
                credits: 3, semester: 1, resources: [],
              },
              {
                id: "ulg-math0062", code: "MATH0062-1", name: "Éléments du calcul des probabilités", shortName: "Probabilités",
                credits: 3, semester: 2, resources: [],
              },
              {
                id: "ulg-info0952", code: "INFO0952-1", name: "Complément d'informatique", shortName: "Compl. Info",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-syst0002", code: "SYST0002-2", name: "Introduction aux signaux et systèmes", shortName: "Signaux",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA3",
            courses: [
              {
                id: "ulg-math0504", code: "MATH0504-1", name: "Mathématiques appliquées", shortName: "Maths Appli.",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-math0487", code: "MATH0487-2", name: "Éléments de statistiques", shortName: "Statistiques",
                credits: 3, semester: 1, resources: [],
              },
              {
                id: "ulg-droi0724", code: "DROI0724-1", name: "Droit et activités de l'ingénieur", shortName: "Droit",
                credits: 2, semester: 1, resources: [],
              },
              {
                id: "ulg-genv0002", code: "GENV0002-1", name: "Énergie et développement durable", shortName: "Énergie & DD",
                credits: 2, semester: 2, resources: [],
              },
              {
                id: "ulg-genv0003", code: "GENV0003-1", name: "Matières premières et économie circulaire", shortName: "Éco. Circulaire",
                credits: 3, semester: 2, resources: [],
              },
            ],
          },
        ],
      },
      {
        faculty: "Médecine",
        years: [
          {
            year: "BA1",
            courses: [
              {
                id: "ulg-anat0001", code: "ANAT0001-2", name: "Anatomie Générale", shortName: "Anatomie",
                credits: 10, semester: 1, resources: [],
              },
              {
                id: "ulg-bioc0001", code: "BIOC0001-2", name: "Biochimie Fondamentale", shortName: "Biochimie",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulg-phym0001", code: "PHYM0001-2", name: "Physiologie Humaine", shortName: "Physiologie",
                credits: 8, semester: 2, resources: [],
              },
              {
                id: "ulg-hist0001", code: "HIST0001-2", name: "Histologie", shortName: "Histologie",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulg-chimm0001", code: "CHIM0010-2", name: "Chimie Générale et Organique", shortName: "Chimie",
                credits: 5, semester: 1, resources: [],
              },
            ],
          },
          {
            year: "BA2",
            courses: [
              {
                id: "ulg-anat0002", code: "ANAT0002-2", name: "Anatomie Topographique", shortName: "Anatomie II",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulg-phym0002", code: "PHYM0002-2", name: "Physiologie des Systèmes", shortName: "Physiologie II",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulg-micr0001", code: "MICR0001-2", name: "Microbiologie", shortName: "Microbio",
                credits: 5, semester: 2, resources: [],
              },
              {
                id: "ulg-embr0001", code: "EMBR0001-2", name: "Embryologie et Génétique", shortName: "Embryologie",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ulg-phar0001", code: "PHAR0001-2", name: "Pharmacologie Générale", shortName: "Pharmaco",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
          {
            year: "BA3",
            courses: [
              {
                id: "ulg-path0001", code: "PATH0001-2", name: "Pathologie Générale", shortName: "Pathologie",
                credits: 8, semester: 1, resources: [],
              },
              {
                id: "ulg-semi0001", code: "SEMI0001-2", name: "Sémiologie Médicale", shortName: "Sémiologie",
                credits: 6, semester: 1, resources: [],
              },
              {
                id: "ulg-immu0001", code: "IMMU0001-2", name: "Immunologie", shortName: "Immuno",
                credits: 5, semester: 1, resources: [],
              },
              {
                id: "ulg-neur0001", code: "NEUR0001-2", name: "Neurosciences", shortName: "Neuro",
                credits: 6, semester: 2, resources: [],
              },
              {
                id: "ulg-bios0001", code: "BIOS0001-2", name: "Biostatistique et Épidémiologie", shortName: "Biostats",
                credits: 5, semester: 2, resources: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Existing data (updated for pilot faculties) ────────────────────────────

export const medicineSubjects = [
  { id: "anatomie", name: "Anatomie", icon: "Heart", description: "Schémas, atlas et cas cliniques" },
  { id: "biochimie", name: "Biochimie", icon: "FlaskConical", description: "Métabolisme et voies biochimiques" },
  { id: "physiologie", name: "Physiologie", icon: "Activity", description: "Fonctions des systèmes corporels" },
  { id: "histologie", name: "Histologie", icon: "Microscope", description: "Tissus et structures cellulaires" },
];

export const polytechSubjects = [
  { id: "analyse-math", name: "Analyse Mathématique", icon: "Sigma", description: "Calcul intégral, séries et valeurs propres" },
  { id: "physique-gen", name: "Physique Générale", icon: "Atom", description: "Mécanique, thermodynamique, ondes" },
  { id: "info-algo", name: "Informatique / Algorithmique", icon: "Code", description: "Structures de données et algorithmes" },
  { id: "chimie-gen", name: "Chimie Générale", icon: "FlaskConical", description: "Chimie générale et organique" },
];
