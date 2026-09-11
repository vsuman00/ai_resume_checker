export interface SkillTaxonomyEntry {
  id: string;
  canonical: string;
  aliases: readonly string[];
}

export interface SkillTaxonomy {
  version: string;
  entries: readonly SkillTaxonomyEntry[];
}

export const SKILL_TAXONOMY = {
  version: "skills-taxonomy-v1",
  entries: [
    {
      id: "javascript",
      canonical: "JavaScript",
      aliases: ["JS", "ECMAScript"],
    },
    { id: "python", canonical: "Python", aliases: [] },
    { id: "typescript", canonical: "TypeScript", aliases: [] },
    {
      id: "node-js",
      canonical: "Node.js",
      aliases: ["NodeJS", "Node JS"],
    },
    { id: "react", canonical: "React", aliases: ["React.js", "ReactJS"] },
    { id: "java", canonical: "Java", aliases: [] },
    { id: "cplusplus", canonical: "C++", aliases: ["C plus plus"] },
    { id: "csharp", canonical: "C#", aliases: ["C sharp"] },
    {
      id: "dotnet",
      canonical: ".NET",
      aliases: ["dotnet", "ASP.NET"],
    },
    {
      id: "machine-learning",
      canonical: "Machine learning",
      aliases: ["ML"],
    },
    {
      id: "data-analysis",
      canonical: "Data analysis",
      aliases: ["data analytics"],
    },
    {
      id: "aws",
      canonical: "AWS",
      aliases: ["Amazon Web Services"],
    },
    {
      id: "ci-cd",
      canonical: "CI/CD",
      aliases: [
        "continuous integration and continuous delivery",
        "continuous integration and delivery",
      ],
    },
    {
      id: "postgresql",
      canonical: "PostgreSQL",
      aliases: ["Postgres"],
    },
    { id: "docker", canonical: "Docker", aliases: [] },
    {
      id: "kubernetes",
      canonical: "Kubernetes",
      aliases: ["K8s"],
    },
    {
      id: "rest-api",
      canonical: "REST API",
      aliases: ["RESTful API", "REST APIs"],
    },
    { id: "graphql", canonical: "GraphQL", aliases: [] },
    {
      id: "accessibility",
      canonical: "Accessibility",
      aliases: ["a11y", "web accessibility"],
    },
  ],
} as const satisfies SkillTaxonomy;

export const TAXONOMY_VERSION = SKILL_TAXONOMY.version;
