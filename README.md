# Atelier — Painting Process Journal

A digital atelier notebook for traditional oil painters. Atelier preserves not
only the finished painting, but the journey, decisions and discoveries that led
to its creation — and lets you hand collectors a beautiful record of that
process.

It runs **entirely in the browser**. There is no backend, no account, no login
and no cloud. Every brushstroke of data lives on your own device.

## Highlights

- **Studio archive** — each project is one artwork, presented as a gallery card.
- **Process journal** — a museum-style chronology of entries, each with up to
  five photographs in a gentle carousel.
- **Artistic Decisions & Discoveries** — an optional handwritten-feel notebook
  layer on every entry, categorised (decision, experiment, discovery, problem,
  solution, lesson) so you capture *why*, not just *what*.
- **Materials** — add, edit, remove and drag-to-reorder.
- **Collector Monograph PDF** — an art-book style document of the full process,
  generated in the browser, with optional artist notes, watermark and branding.
- **Certificate of Authenticity** — print-ready A6, designed for double-sided
  printing, with auto-generated unique certificate numbers and signature images.
- **Artist Context Card** — a front-only A6 gallery companion card carrying a
  poem, reflection or statement.
- **Privacy by design** — data is stored in IndexedDB (with a localStorage
  fallback) and automatic rolling backups.
- **Import / export** — single projects or your whole library as portable JSON.
- **QR codes** — encode a project for sharing.
- **In-browser image compression**, drag-and-drop upload, dark & light themes,
  search & filtering, project duplication, tags.
- **Installable PWA** — works offline once installed.

## Tech

- React 18 + TypeScript, built with Vite
- `jspdf` for in-browser PDF generation (lazy-loaded)
- `qrcode` for QR generation
- `vite-plugin-pwa` for offline / installable support
- No other runtime services — fully client-side

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
```

Then open the printed local URL. Create your first work with **New Work**.

## How data is stored

All projects are serialised — including images, which are compressed and stored
as data URLs — so a project (or the whole library) exports cleanly to a single
self-contained JSON file. Importing assigns fresh ids, so it never overwrites
existing work. Automatic backups (the last few snapshots) are kept locally as a
safety net.

## Project structure

```
src/
  types.ts                 domain model
  db/storage.ts            IndexedDB + localStorage persistence & backups
  context/                 App state + theme providers
  utils/
    image.ts               in-browser compression
    transfer.ts            JSON import / export
    qr.ts                  QR generation
    pdf/                   monograph, certificate & artist-card generators
  components/
    panels/                editor sections (info, materials, process, …)
    Gallery, ProjectEditor, ImageCarousel, DropZone, CollapsiblePanel, …
  styles/                  design system (paper textures, typography, brushwork)
```

Made to feel like opening a master painter's private studio notebook — not a
piece of productivity software.
