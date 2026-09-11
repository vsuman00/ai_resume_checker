export interface DetectedSection {
  type: ParseViewSection["type"];
  title: string;
  startLine: number;
  endLine: number;
}

type SectionAliases = {
  type: ParseViewSection["type"];
  aliases: readonly string[];
};

const SECTION_ALIASES: readonly SectionAliases[] = [
  {
    type: "summary",
    aliases: [
      "summary",
      "professional summary",
      "profile",
      "professional profile",
      "career profile",
      "candidate profile",
      "objective",
      "career objective",
      "about",
      "about me",
      "perfil profesional",
      "resumen profesional",
      "profil professionnel",
    ],
  },
  {
    type: "experience",
    aliases: [
      "experience",
      "work experience",
      "professional experience",
      "relevant experience",
      "employment",
      "employment history",
      "work history",
      "career history",
      "experiencia",
      "experiencia laboral",
      "experiencia profesional",
      "experience professionnelle",
      "berufserfahrung",
    ],
  },
  {
    type: "education",
    aliases: [
      "education",
      "education and training",
      "academic background",
      "academic history",
      "qualifications",
      "formacion",
      "formacion academica",
      "educacion",
      "etudes",
      "formation",
      "ausbildung",
    ],
  },
  {
    type: "skills",
    aliases: [
      "skills",
      "key skills",
      "technical skills",
      "core competencies",
      "competencies",
      "competences",
      "areas of expertise",
      "technical proficiencies",
      "technologies",
      "tools and technologies",
      "habilidades",
      "competencias",
      "competences techniques",
      "kenntnisse",
    ],
  },
  {
    type: "projects",
    aliases: [
      "projects",
      "selected projects",
      "project experience",
      "personal projects",
      "side projects",
      "portfolio",
      "proyectos",
      "projets",
    ],
  },
  {
    type: "certifications",
    aliases: [
      "certification",
      "certifications",
      "licenses and certifications",
      "licences and certifications",
      "certificaciones",
      "certificats",
    ],
  },
  {
    type: "awards",
    aliases: ["awards", "honors", "honours", "achievements", "premios"],
  },
  {
    type: "publications",
    aliases: ["publications", "papers", "talks", "conferences"],
  },
  {
    type: "volunteer",
    aliases: [
      "volunteer",
      "volunteer experience",
      "community service",
      "volunteering",
      "benevolat",
    ],
  },
  {
    type: "languages",
    aliases: ["languages", "language skills", "idiomas", "langues", "sprachen"],
  },
  {
    type: "interests",
    aliases: ["interests", "hobbies", "personal interests"],
  },
  {
    type: "references",
    aliases: ["references", "professional references"],
  },
];

const ALIAS_TO_TYPE = new Map<string, ParseViewSection["type"]>();
for (const section of SECTION_ALIASES) {
  for (const alias of section.aliases) {
    ALIAS_TO_TYPE.set(normalizeHeading(alias), section.type);
  }
}

export function normalizeHeading(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/^[\s:|\-–—]+|[\s:|\-–—]+$/g, "")
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectSectionType(
  line: string,
): ParseViewSection["type"] | null {
  const normalized = normalizeHeading(line);
  if (!normalized || normalized.length > 60) return null;
  return ALIAS_TO_TYPE.get(normalized) ?? null;
}

export function parseSections(lines: readonly string[]): DetectedSection[] {
  const starts: Omit<DetectedSection, "endLine">[] = [];

  for (let index = 0; index < lines.length; index++) {
    const type = detectSectionType(lines[index]);
    if (!type) continue;
    starts.push({
      type,
      title: lines[index].trim(),
      startLine: index,
    });
  }

  return starts.map((section, index) => ({
    ...section,
    endLine: starts[index + 1]?.startLine ?? lines.length,
  }));
}
