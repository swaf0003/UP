const ALLOWED_DOMAINS = [
  "ulb.be", "student.ulb.be", "ulb.ac.be",
  "uclouvain.be", "student.uclouvain.be",
  "uliege.be", "student.uliege.be", "ulg.ac.be",
  "umons.ac.be", "student.umons.ac.be",
  "unamur.be", "student.unamur.be",
  "uantwerpen.be", "student.uantwerpen.be",
  "ugent.be",
  "uhasselt.be", "student.uhasselt.be",
  "vub.be", "vub.ac.be",
  "kuleuven.be", "student.kuleuven.be",
  "saintlouis.be", "usaintlouis.be",
  "he2b.be", "heh.be", "helb-prigogine.be", "helmo.be", "henallux.be",
  "ephec.be", "ichec.be", "vinci.be", "condorcet.be", "hers.be", "hepl.be",
];

const ALLOWED_SUFFIXES = [
  ".ac.be", ".ulb.be", ".uclouvain.be", ".uliege.be",
  ".unamur.be", ".ugent.be", ".vub.be", ".kuleuven.be",
  ".uantwerpen.be", ".uhasselt.be",
];

export function isAcademicEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domain = parts[1];
  return (
    ALLOWED_DOMAINS.includes(domain) ||
    ALLOWED_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  );
}
