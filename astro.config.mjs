import { defineConfig } from "astro/config";

// Static build: pages are written as about-us.html etc. so existing links and .htaccess rules keep working.
export default defineConfig({
  site: "https://www.syfrows.com",
  output: "static",
  build: { format: "file" },
  compressHTML: false,
});
