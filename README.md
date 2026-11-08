# syfrows.com

Built with [Astro](https://astro.build) (static output). Pushing to `main` builds the site and deploys `dist/` to hosting via GitHub Actions.

## Structure
- `src/layouts/Base.astro` - shared page shell (head, header, footer, scripts)
- `src/partials/` - shared header, footer, head and script blocks
- `src/content/*.html` - main content of each page
- `src/pages/*.astro` - one file per page (title/description come from `src/pages.json`)
- `public/` - images, CSS, JS, favicons, robots.txt, sitemap.xml, .htaccess

## Edit locally
```
npm install
npm run dev      # preview at http://localhost:4321
npm run build    # outputs dist/
```

The previous plain-HTML version of the site is kept on the `legacy-static` branch.
