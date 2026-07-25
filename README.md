# SAMO — static marketing site

Find your language. Find your people. A single-page static site with no build step: plain HTML, CSS and JavaScript, plus Tailwind from a CDN.

## Deploy on GitHub Pages

1. Create a public repository, for example `samo-website`.
2. Copy every file and folder from this directory into the repository root.
3. Push:
   ```bash
   git init
   git add .
   git commit -m "Launch SAMO"
   git branch -M main
   git remote add origin https://github.com/USERNAME/samo-website.git
   git push -u origin main
   ```
4. In the repository, open **Settings → Pages** and set **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. The site appears at `https://USERNAME.github.io/samo-website/`.

Every path in the site is relative, so it works both at a repository subpath and at a root domain (`USERNAME.github.io`). The `.nojekyll` file stops GitHub from filtering files that begin with an underscore.

A GitHub Actions workflow is included at `.github/workflows/pages.yml` if you prefer Actions-based deployment. It is optional; the branch method above needs no workflow at all.

To test locally:
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
Use a server rather than opening the file directly, otherwise the service worker will not register.

## Folder structure

```
samo-website/
├── index.html                  Main page
├── 404.html                    Not-found page
├── offline.html                Shown by the service worker when offline
├── manifest.json               PWA manifest (installable)
├── sw.js                       Service worker
├── robots.txt                  Update the sitemap URL
├── sitemap.xml                 Update the domain
├── .nojekyll                   Required for GitHub Pages
├── LICENSE
├── README.md
├── .github/workflows/pages.yml Optional Actions deployment
└── assets/
    ├── css/style.css           Design system and all components
    ├── js/data.js              Languages, cities, content, demo generator
    ├── js/app.js               Rendering and interaction
    └── images/                 favicon, icons, patterns, social preview
```

## Languages

`assets/js/data.js` holds 59 languages grouped into five regions. South Asian languages are listed individually rather than collapsed: Urdu, Punjabi, Pashto, Sindhi, Balochi, Saraiki, Hindi, Bengali, Tamil, Telugu, Malayalam, Gujarati, Marathi, Nepali and Sinhala.

To add one, append an entry to `LANGUAGES`:

```js
{ code: 'brh', label: '🇵🇰 Brahui', native: 'براہوئی', rtl: true, tier: 'sa' }
```

`rtl: true` gives the language a right-to-left native line in the UI. `tier` controls which group it appears under in the directory and the dropdown (`sa`, `mena`, `africa`, `asia`, `eu`).

Optionally add a name bank under `NAMES` using the same code, so the demo generates plausible profiles, and a translated hero line under `UI`.

## What to change before a real launch

The site currently ships as a prototype and says so in the footer. Before putting real money behind it:

- **`DEMO_MODE`** at the top of `data.js`. Set it to `false` and the invented "nearby now" counter and the placeholder stories disappear. Leave it `true` only while the site is clearly labelled as a prototype.
- **Testimonials** in `data.js` are written placeholders describing the situations the product targets, not real quotes. Replace them with consented, attributable ones or delete the section.
- **The waitlist form** stores entries in the visitor's own browser unless you point it somewhere. Set the endpoint in `index.html`:
  ```html
  <script>window.SAMO_CONFIG = { FORM_ENDPOINT: 'https://formspree.io/f/XXXXXXX' };</script>
  ```
  It posts JSON with `email`, `language` and `city`. Formspree, Buttondown, Getform and a Cloudflare Worker all accept this shape.
- **`robots.txt` and `sitemap.xml`** contain `USERNAME`. Replace it with your real domain.
- **Pricing** in `data.js` is placeholder. Nothing charges anyone.
- **Privacy policy and terms** are dead links in the footer. If you collect emails in the EU you need a real privacy notice.

## Notes

- Tailwind is loaded from a CDN, which prints a production warning in the console. For a real launch, either install Tailwind and build a stylesheet, or move the handful of utility classes you actually use into `style.css`.
- Reduced motion, keyboard focus rings, skip link, ARIA labels and a mobile menu are all in place.
- The service worker caches local files only. Cross-origin requests to the font and Tailwind CDNs are left alone.
