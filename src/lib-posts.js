// Blog posts written in the dashboard (syfrows.com/admin) live in src/posts/*.md.
const files = import.meta.glob("./posts/*.md", { eager: true });
export const posts = Object.entries(files)
  .map(([path, mod]) => ({
    slug: path.split("/").pop().replace(/\.md$/, ""),
    ...mod.frontmatter,
    Content: mod.Content,
  }))
  .filter((p) => !p.draft)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));
