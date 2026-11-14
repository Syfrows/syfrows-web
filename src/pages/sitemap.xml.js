import pages from "../pages.json";
import { posts } from "../lib-posts.js";
export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.values(pages).map((v) => ({ loc: v.canon, mod: today }))
    .concat(posts.map((p) => ({ loc: `https://www.syfrows.com/${p.slug}`, mod: String(p.date).slice(0, 10) })));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod></url>`).join("\n") + "\n</urlset>\n";
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
