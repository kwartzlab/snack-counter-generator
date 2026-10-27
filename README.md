# Snack Budget Counter

Type a name and a tagline, pick a font, and download a print-ready `.3mf` or `.stl` of the clicky snack counter. The page runs in the browser. The build is a folder of static files.

## Develop

```bash
npm install
npm run dev
```

Open the URL Vite prints. `npm test` runs the geometry tests. `npm run check` typechecks the Svelte project.

## Build

```bash
npm run build
```

The site lands in `build/`. Serve that folder from any static host. Asset URLs are relative, and `paths.base` is respected when you set it:

```bash
BASE_PATH=/snack-counter npm run build
```

`BASE_PATH` is a root path such as `/snack-counter`. Use it when the site is not at the host root. Leave it unset for a host that serves `build/` as `/`.

## Deploy

Copy `build/` to any static file host (GitHub Pages, nginx, Caddy, S3). For GitHub Pages on a project site, build with `BASE_PATH` set to the repository name.

A tiny nginx container:

```bash
docker build -t snack-counter .
docker run --rm -p 8080:80 snack-counter
```

The image copies `build/` into nginx. Build the site before `docker build`. For a subpath, build with `BASE_PATH` and point that location at the same files. `deploy/nginx.conf` is the server config inside the image.

## Add a font

1. Drop the `.ttf` and its OFL licence into `static/fonts/`.
2. Register it in `src/lib/fonts.ts` with an `id`, a label, and the file path under `static/`.

The lettering fonts are loaded with opentype.js. Bebas Neue, Anton, and Bangers are included. The page uses Jost for headings, a self-hosted stand-in for the Futura PT on kwartzlab.ca, and Arial for body text. Jost's licence is in `static/fonts/ui/`.

## Geometry

`src/lib/geometry` is plain TypeScript: outlines, layout, placement, extrusion, and 3MF and STL writers. It does not touch the DOM, except `threemf.ts`, which parses XML with `DOMParser`. A later Node CLI can import these modules. Browsers already have `DOMParser`. Node needs one available on `globalThis` (the tests use happy-dom for that file).

Placement comes from `src/lib/assets/plates.json`. Lettering is a separate solid on the bed face of each front plate (`z` from -2.8 to -1.9), mirrored in X so it reads correctly from the outside. The 3MF keeps all eight base parts. Each front plate is an assembly of the plate and a `"<plate name> lettering"` mesh, so a slicer can assign the text its own filament.
