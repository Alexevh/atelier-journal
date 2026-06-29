# Atelier — Painting Process Journal

A digital atelier notebook for traditional oil painters. Atelier preserves not
only the finished painting, but the journey, decisions and discoveries that led
to its creation — and lets you hand collectors a beautiful record of that
process.

It is **local-first and private by default**: there is no account and no login,
and every piece of data lives on your own device. Optional cloud sync (your own
Firebase) can be turned on if you want your work mirrored across devices — but
it is entirely opt-in and the app always works without it.

**Live app:** https://alexevh.github.io/atelier-journal/

## Highlights

- **Studio archive** — each project is one artwork, presented as a gallery card,
  with search, status filtering, duplication and tags.
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
- **Settings tab** — artist identity & defaults for new works, appearance,
  language, backup cadence, cloud sync and a danger zone.
- **Bilingual** — full Spanish (default) and English UI, including PDFs and date
  formats; switch instantly from the top bar or Settings.
- **Optional cloud sync** — bring your own Firebase project + Google sign-in to
  mirror your archive across devices. Local-first always holds (see below).
- **Privacy by design** — data is stored in IndexedDB (with a localStorage
  fallback) plus rolling automatic backups; persistent-storage is requested so
  the browser won't evict it.
- **Import / export** — single projects or your whole library as portable JSON;
  a gentle backup reminder and a storage-usage indicator in the gallery.
- **QR codes** — encode a project for sharing.
- **In-browser image compression**, drag-and-drop upload, dark & light themes.
- **Installable PWA** — works offline once installed.

## Local-first cloud sync (optional)

Cloud sync is **off by default**. When it is off, Firebase is never even
downloaded and the app is 100% local. When you turn it on:

- The **local store (IndexedDB) is always the source of truth.** The UI reads
  and writes locally first; Firebase is only a synced copy layered on top.
- If you **lose connection or turn the flag off**, the app keeps reading and
  writing locally without breaking. It reconciles again when you reconnect or
  re-enable.
- **Coherence** is kept with a last-write-wins merge per project, plus
  tombstones so deletions propagate. A realtime listener keeps devices in sync
  while sync is active; a manual **Sync now** is available too.
- **Bring your own Firebase (BYO)** with **Google sign-in** — each user only
  sees their own data (`users/{uid}/…`). The Firebase SDK is lazy-loaded.

### How images are stored when syncing

To respect Firestore's 1 MiB per-document limit, the project document stores
only text + image references; each image's base64 data is uploaded to
`users/{uid}/blobs/{imageId}` **split into ~700 KB chunks**. Image ids are
immutable, so each image uploads once and is only re-downloaded on devices that
don't already have it. (Firebase Storage is intentionally **not** used, which
avoids bucket/CORS setup.)

### Setting up your Firebase (one time)

In **Settings → Cloud sync** the app shows this guide and the exact security
rules. In short:

1. Create a project at <https://console.firebase.google.com> (free Spark plan).
2. Add a **Web app** and paste its `firebaseConfig` into Settings.
3. **Authentication →** enable the **Google** provider.
4. **Authentication → Settings → Authorized domains →** add your site's host
   (e.g. `alexevh.github.io`).
5. Create a **Cloud Firestore** database (production mode) and paste these rules:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null
                            && request.auth.uid == userId;
       }
     }
   }
   ```

6. Enable the flag in Settings and click **Connect with Google**.

> On the free Spark plan you cannot incur charges: exceeding a quota simply
> blocks operations until it resets (and the app keeps working locally).

## Tech

- React 18 + TypeScript, built with Vite
- `jspdf` for in-browser PDF generation (lazy-loaded)
- `qrcode` for QR generation
- `firebase` (Auth + Firestore) for optional sync (lazy-loaded only when enabled)
- `vite-plugin-pwa` for offline / installable support
- No first-party backend — fully client-side

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
```

Then open the printed local URL. Create your first work with **New Work**.

> The production build uses a base path of `/atelier-journal/` for GitHub Pages.
> Override it for a different host or root deploy with the `VITE_BASE` env var,
> e.g. `VITE_BASE=/ npm run build`.

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages automatically. Hash-based routing means
deep links work without server rewrites. The first run auto-enables Pages
(build type "GitHub Actions").

## How data is stored

All projects are serialised — including images, which are compressed and stored
as data URLs — so a project (or the whole library) exports cleanly to a single
self-contained JSON file. Importing assigns fresh ids, so it never overwrites
existing work. Rolling automatic backups (the last few snapshots) are kept in
IndexedDB as a safety net. Settings live alongside the data, also on-device.

> Clearing the browser **cache** keeps your data; clearing **site data** (or
> uninstalling the PWA with "clear data" ticked) removes it. The real safety net
> is the JSON export — keep one somewhere safe.

## Project structure

```
src/
  types.ts                 domain model (projects, settings, sync types)
  db/storage.ts            IndexedDB + localStorage persistence, settings & backups
  context/
    AppContext.tsx         projects state + CRUD + remote-apply hook
    SettingsContext.tsx    artist defaults, preferences, sync config
    SyncContext.tsx        optional Firebase sync engine (local-first)
    ThemeContext.tsx       dark / light theme
  i18n/                    translations (es default, en) + provider
  sync/
    firebase.ts            lazy Firebase wrapper (auth, Firestore, chunked blobs)
    merge.ts               pure last-write-wins merge
    images.ts              strip / rehydrate image data for Firestore
  utils/
    image.ts               in-browser compression
    transfer.ts            JSON import / export
    persistence.ts         persistent-storage request + usage estimate
    qr.ts                  QR generation
    pdf/                   monograph, certificate & artist-card generators
  components/
    panels/                editor sections (info, materials, process, …)
    Gallery, ProjectEditor, Settings, TopBar, StorageStatus,
    ImageCarousel, DropZone, CollapsiblePanel, …
  styles/                  design system (paper textures, typography, brushwork)
```

Made to feel like opening a master painter's private studio notebook — not a
piece of productivity software.
