// Rebuilds public/assets/css/site.min.css from the theme CSS, keeping only selectors used by the site.
// Run after changing page templates: build the site (npx astro build), then: cd tools && npm i purgecss@6.0.0 clean-css@5.3.3 && node build-css.cjs
const {PurgeCSS}=require('purgecss');const CleanCSS=require('clean-css');const fs=require('fs');
const D='../public/assets/css/';
const files=['bootstrap.min.css','animate.min.css','magnific-popup.css','fontawesome-all.min.css','swiper-bundle.min.css','odometer.css','slick.css','default.css','style.css','responsive.css'];
(async()=>{
const css=files.map(f=>({raw:fs.readFileSync(D+f,'utf8').replace(/url\((['"]?)\.\.\//g,'url($1../')}));
const res=await new PurgeCSS().purge({content:['../dist/**/*.html','../public/assets/js/main.js','../public/assets/js/syfrows-*.js','../src/pages/**/*.astro','../src/posts/*.md'],css,
 safelist:{standard:[/^swiper/,/^odometer/,/^animated/,/^wow/,/sticky/,/^active$/,/^show$/,/^open/,/mobile-menu/,/menu-/,/collaps/,/dropdown/,/^sy-/,/^sf-/,/cursor/,/scroll-top/,/opacity-0/,/^fix$/,/^tg/,/^h[1-6]$/,/^modal/,/^btn/,/^nav/,/^form/,/^is-/],deep:[/mobile-menu/,/tgmenu/]},
 fontFace:true,keyframes:true,variables:false});
res.forEach((r,i)=>console.log(files[i],Math.round(r.css.length/1024)));let out=res.map(r=>r.css).join('\n');
const before=css.reduce((s,c)=>s+c.raw.length,0);
const min=new CleanCSS({level:1}).minify(out).styles;
fs.writeFileSync(D+'site.min.css',min);console.log('before',Math.round(before/1024),'KB after',Math.round(min.length/1024),'KB');
})();
