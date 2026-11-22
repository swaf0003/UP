import {
  Heart, Activity, Microscope, BookOpen, FlaskConical,
  Sigma, Atom, Code, Cog, Scale, Briefcase, Brain, Users,
  type LucideIcon,
} from "lucide-react";

export interface SubjectMeta {
  icon: LucideIcon;
  description: string;
}

const subjectMeta: Record<string, SubjectMeta> = {
  "Anatomie": { icon: Heart, description: "Schémas, atlas et cas cliniques" },
  "Anatomie Générale": { icon: Heart, description: "Schémas, atlas et cas cliniques" },
  "Anatomie et physiologie": { icon: Heart, description: "Structure et fonctionnement du corps humain" },
  "Biochimie": { icon: FlaskConical, description: "Métabolisme et voies biochimiques" },
  "Biochimie Fondamentale": { icon: FlaskConical, description: "Métabolisme et voies biochimiques" },
  "Biochimie et biologie moléculaire": { icon: FlaskConical, description: "Réactions cellulaires et moléculaires" },
  "Physiologie": { icon: Activity, description: "Fonctions des systèmes corporels" },
  "Physiologie Humaine I": { icon: Activity, description: "Fonctions des systèmes corporels" },
  "Histologie": { icon: Microscope, description: "Tissus et structures cellulaires" },
  "Histologie et embryologie": { icon: Microscope, description: "Tissus et développement embryonnaire" },
  "Analyse": { icon: Sigma, description: "Calcul différentiel et intégral" },
  "Analyse I": { icon: Sigma, description: "Limites, dérivées et intégrales" },
  "Analyse Mathématique I": { icon: Sigma, description: "Calcul différentiel et intégral" },
  "Mathématiques discrètes et analyse": { icon: Sigma, description: "Logique, combinatoire et analyse" },
  "Analyse mathématique I": { icon: Sigma, description: "Calcul différentiel et intégral" },
  "Mathématiques II": { icon: Sigma, description: "Algèbre linéaire et séries" },
  "Maths II": { icon: Sigma, description: "Algèbre linéaire et séries" },
  "Physique": { icon: Atom, description: "Mécanique et thermodynamique" },
  "Physique I": { icon: Atom, description: "Mécanique classique et ondes" },
  "Physique Générale I": { icon: Atom, description: "Mécanique, fluides et thermodynamique" },
  "Physique générale I": { icon: Atom, description: "Mécanique, fluides et thermodynamique" },
  "Info": { icon: Code, description: "Programmation et algorithmes" },
  "Informatique": { icon: Code, description: "Programmation et structures de données" },
  "Informatique I": { icon: Code, description: "Introduction à la programmation" },
  "Introduction à l'informatique": { icon: Code, description: "Bases de la programmation" },
  "Chimie": { icon: FlaskConical, description: "Chimie générale et organique" },
  "Chimie Générale": { icon: FlaskConical, description: "Atomistique et réactions chimiques" },
  "Chimie et chimie physique": { icon: FlaskConical, description: "Thermochimie et cinétique" },
  "Projet": { icon: Cog, description: "Projet multidisciplinaire intégré" },
  "Projet I": { icon: Cog, description: "Projet multidisciplinaire intégré" },
  "Projets Multidisciplinaires I": { icon: Cog, description: "Travail en équipe et conception" },
  "E&M": { icon: Atom, description: "Champs électriques et magnétiques" },
  "Électricité & Magnétisme": { icon: Atom, description: "Champs électriques et magnétiques" },
  "Droit": { icon: Scale, description: "Doctrine, jurisprudence et synthèses" },
  "Économie": { icon: Briefcase, description: "Microéconomie, macroéconomie et finance" },
  "Psychologie": { icon: Brain, description: "Psychologie cognitive, clinique et statistiques" },
  "Sciences sociales": { icon: Users, description: "Sociologie, sciences politiques et méthodes" },
};

export function getSubjectMeta(name: string, shortName: string): SubjectMeta {
  return subjectMeta[name] || subjectMeta[shortName] || { icon: BookOpen, description: "Ressources et supports de cours" };
}
