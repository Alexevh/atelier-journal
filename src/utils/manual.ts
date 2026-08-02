// The user manual for the whole fused app (journal + frames + ideas + colour
// tool), in both languages. Rendered by the Help page and exported to PDF.

import { Lang } from '../i18n'

export interface ManualSection {
  title: string
  body: string[]
}

const ES: ManualSection[] = [
  {
    title: '¿Qué es Atelier?',
    body: [
      'Atelier es un cuaderno de taller digital para pintores al óleo. Reúne en una sola aplicación el archivo de tus obras, el diario del proceso de cada pintura, un cuaderno de ideas, un taller de enmarcado y un laboratorio de color y pigmentos.',
      'Todo funciona en tu navegador y tus datos viven únicamente en tu dispositivo. No hay cuentas ni servidores nuestros: la nube es opcional y es la tuya (tu propio proyecto de Firebase). La app se instala como PWA y funciona sin conexión.',
    ],
  },
  {
    title: 'El Archivo (galería de obras)',
    body: [
      'La página principal muestra cada obra como una tarjeta de catálogo. Podés buscar por texto (títulos, materiales, notas), filtrar por estado (Boceto, En proceso, Terminada, Vendida) y ordenar por edición, creación, título o año.',
      '“Nueva Obra” crea un proyecto prellenado con tus datos de artista de Configuración. Desde la tarjeta podés duplicar o eliminar una obra.',
    ],
  },
  {
    title: 'La obra: información e imágenes',
    body: [
      'Cada obra guarda título, descripciones, año, técnica, dimensiones, estado y etiquetas, más dos imágenes principales: la referencia y la obra final. Las imágenes se comprimen localmente al subirlas.',
      'Con ambas imágenes cargadas aparece el comparador Antes/Después (deslizá la línea). El botón “Estudiar” abre el visor con herramientas de pintor: escala de grises (valores), grilla de composición, espejo y zoom.',
      'La imagen final se reutiliza automáticamente en el certificado, la tarjeta del artista y la tarjeta para redes.',
    ],
  },
  {
    title: 'Materiales',
    body: [
      'Una lista editable de lienzo, pigmentos, médiums y barnices. Agregá, editá, eliminá y reordená arrastrando. El resumen de materiales del certificado se completa en su propia sección.',
    ],
  },
  {
    title: 'Diario del proceso',
    body: [
      'El corazón de la app: entradas fechadas que cuentan cómo se hizo la pintura. Cada entrada lleva título, fecha, descripción, hasta 5 fotografías en un carrusel (con zoom y herramientas de estudio) y la duración de la sesión en minutos — el total por obra se muestra en el editor, la galería y la monografía.',
      'Los chips de “Agregar rápido” crean etapas típicas: boceto inicial, encaje, estudio de color, primera capa, veladura, detalles finales.',
      'Cada entrada admite además notas de “Decisiones y Descubrimientos Artísticos”, con categoría opcional (decisión, experimento, descubrimiento, problema, solución, lección). Se muestran como anotaciones manuscritas de taller y podés elegir si se incluyen en la documentación del coleccionista.',
    ],
  },
  {
    title: 'Documentos PDF',
    body: [
      'Monografía del proceso: un PDF tipo libro de arte con portada, ficha de la obra, materiales y la cronología completa con fotos grandes y notas opcionales. Admite marca de agua y tu nombre/marca.',
      'Certificado de autenticidad: A6 listo para imprimir a doble cara, con número único autogenerado, resumen de materiales, firma y declaración al dorso.',
      'Tarjeta del artista: A6 de solo frente con un poema o declaración, al estilo de las cédulas de galería. También podés generar una imagen cuadrada lista para redes sociales y un código QR con los datos del proyecto.',
    ],
  },
  {
    title: 'Taller de Enmarcado',
    body: [
      'Fotografiá tu cuadro (o usá la imagen final) y probalo con marcos: 15 marcos reales (fotografías CC0 de marcos antiguos del Rijksmuseum, más uno propio), 17 procedurales dibujados por la app, y un generador aleatorio infinito.',
      'Todo se ajusta con menús: color y grosor del paspartú (12 colores, 3 grosores) y, para los marcos procedurales, color y grosor del marco — independientes entre sí.',
      'Con “Mi marco” podés importar cualquier imagen de marco (una foto tuya o generada con IA): la abertura se detecta sola y se afina con controles. El resultado se descarga en JPEG a resolución completa.',
    ],
  },
  {
    title: 'Cuaderno de ideas',
    body: [
      'Un backlog de ideas para no perder ninguna chispa: cada idea lleva título, nota, imágenes (arrastrá, explorá o pegá con Ctrl+V), etiquetas y un estado (Semilla, Madurando, Lista, Archivada).',
      'Al abrir una idea entrás a su página de edición, donde además podés agregar entradas de desarrollo con fecha, texto e imágenes — la idea madurando en el tiempo.',
      '“Pasar a la acción” convierte la idea en una obra nueva: el título y la nota se vuelcan, la primera imagen pasa a referencia y las entradas de desarrollo se convierten en entradas del proceso. La idea queda archivada con el enlace a la obra.',
    ],
  },
  {
    title: 'Color y Pigmentos',
    body: [
      'El laboratorio de color completo (heredado de Pigment Match) vive dentro de Atelier con todas sus pestañas: Match (color objetivo → receta de mezcla con tu paleta de pigmentos reales), Imagen (muestrear colores de una foto), Extraer (paleta dominante de un cuadro), Escena, Coach (consejos de mezcla), Comparar (referencia vs. obra en curso), Mezcla, Bitácora (recetas guardadas con fotos), IMG Lab (ajustes y mejora con IA local), Calibrar (ajustar el modelo a tus pinturas reales) y Paleta (gestión de pigmentos).',
      'Las recetas se muestran en partes o porcentajes, con motores Clásico/Espectral/2-const, prioridad de valor, proporción áurea, tubos obligatorios y preparación por cantidades (ml/g/gotas).',
    ],
  },
  {
    title: 'Configuración',
    body: [
      'Identidad del artista (nombre, contacto, logo y firma) que prellena obras nuevas, certificados y PDFs; textos por defecto; apariencia e idioma (ES/EN); frecuencia del recordatorio de respaldo; y la zona de peligro para borrar los datos locales.',
    ],
  },
  {
    title: 'Sincronización en la nube (opcional)',
    body: [
      'Apagada por defecto: sin activarla, la app es 100 % local. Al activarla usás tu propio proyecto gratuito de Firebase con inicio de sesión de Google; la guía paso a paso y las reglas de seguridad están en la misma sección.',
      'Sincroniza obras, ideas (con sus imágenes) y también los datos del laboratorio de color: paletas, calibraciones, preferencias y la bitácora con fotos. El almacenamiento local siempre es la fuente de verdad: si se corta la conexión o apagás la nube, todo sigue funcionando.',
      'El ícono de nube en la barra muestra el estado y permite sincronizar al instante.',
    ],
  },
  {
    title: 'Datos, respaldos e importación',
    body: [
      'Los datos se guardan en IndexedDB con respaldos automáticos rotativos, y la app solicita almacenamiento persistente para evitar que el navegador los desaloje. Limpiar “caché” no borra tus datos; borrar “datos de sitio” sí.',
      '“Exportar todo” genera un único archivo JSON con TODO: obras, ideas, configuración y los datos del laboratorio de color (incluida la bitácora con fotos). Importarlo en otro dispositivo restaura el conjunto completo; las obras e ideas importadas reciben identificadores nuevos para no pisar lo existente.',
      'El panel al pie de la galería muestra el espacio usado, el estado de protección y la fecha del último respaldo, con recordatorios configurables.',
    ],
  },
  {
    title: 'Instalación y uso sin conexión',
    body: [
      'Atelier es una PWA: desde el navegador podés “Instalar la aplicación” (ícono en la barra de direcciones en escritorio, o “Agregar a pantalla de inicio” en el teléfono). Una vez instalada funciona sin conexión; al haber una versión nueva, se actualiza al recargar.',
    ],
  },
]

const EN: ManualSection[] = [
  {
    title: 'What is Atelier?',
    body: [
      'Atelier is a digital studio notebook for oil painters. It gathers in one app the archive of your works, each painting’s process journal, an idea notebook, a framing studio and a colour & pigments laboratory.',
      'Everything runs in your browser and your data lives only on your device. There are no accounts or servers of ours: the cloud is optional and it is yours (your own Firebase project). The app installs as a PWA and works offline.',
    ],
  },
  {
    title: 'The Archive (works gallery)',
    body: [
      'The main page shows each work as a catalogue card. Search across titles, materials and notes; filter by status (Sketch, In Progress, Finished, Sold); sort by edited, created, title or year.',
      '“New Work” creates a project prefilled with your artist identity from Settings. From the card you can duplicate or delete a work.',
    ],
  },
  {
    title: 'The work: information and images',
    body: [
      'Each work stores title, descriptions, year, technique, dimensions, status and tags, plus two key images: the reference and the final artwork. Images are compressed locally on upload.',
      'With both images present, the Before/After comparator appears (drag the line). The “Study” button opens the viewer with painter tools: grayscale values, composition grid, mirror and zoom.',
      'The final image is reused automatically in the certificate, the artist card and the social card.',
    ],
  },
  {
    title: 'Materials',
    body: [
      'An editable list of canvas, pigments, mediums and varnishes. Add, edit, delete and drag to reorder. The certificate’s materials summary is edited in its own section.',
    ],
  },
  {
    title: 'Process journal',
    body: [
      'The heart of the app: dated entries telling how the painting was made. Each entry holds a title, date, description, up to 5 photographs in a carousel (with zoom and study tools) and the session duration in minutes — the per-work total shows in the editor, gallery and monograph.',
      '“Quick add” chips create typical stages: initial sketch, blocking in, colour study, first pass, glazing, final details.',
      'Entries also take “Artistic Decisions & Discoveries” notes with an optional category (decision, experiment, discovery, problem, solution, lesson). They render as handwritten studio annotations, and you choose whether they appear in collector documentation.',
    ],
  },
  {
    title: 'PDF documents',
    body: [
      'Process monograph: an art-book PDF with cover, work details, materials and the full chronology with large photos and optional notes. Supports a watermark and your name/branding.',
      'Certificate of authenticity: print-ready A6 for double-sided printing, with an auto-generated unique number, materials summary, signature and the declaration on the back.',
      'Artist card: front-only A6 with a poem or statement, in the style of gallery interpretation cards. You can also generate a square social-media image and a QR code carrying the project data.',
    ],
  },
  {
    title: 'Framing Studio',
    body: [
      'Photograph your painting (or use the final image) and try frames on it: 15 real frames (CC0 photographs of antique frames from the Rijksmuseum, plus one of our own), 17 procedural frames drawn by the app, and an endless random generator.',
      'Everything adjusts via dropdowns: mat colour and width (12 colours, 3 widths) and — for procedural frames — frame colour and width, all independent of each other.',
      'With “My frame” you can import any frame image (your own photo or AI-generated): the opening is detected automatically and fine-tuned with sliders. The result downloads as a full-resolution JPEG.',
    ],
  },
  {
    title: 'Idea notebook',
    body: [
      'A backlog so no spark gets lost: each idea holds a title, note, images (drag, browse or paste with Ctrl+V), tags and a status (Seed, Developing, Ready, Archived).',
      'Opening an idea takes you to its edit page, where you can also add dated development entries with text and images — the idea maturing over time.',
      '“Turn into a work” converts the idea into a new project: title and note carry over, the first image becomes the reference and development entries become process entries. The idea is archived with a link to the work.',
    ],
  },
  {
    title: 'Colour & Pigments',
    body: [
      'The full colour laboratory (inherited from Pigment Match) lives inside Atelier with all its tabs: Match (target colour → mixing recipe from your palette of real pigments), Image (sample colours from a photo), Extract (a painting’s dominant palette), Scene, Coach (mixing advice), Compare (reference vs work in progress), Mix, Logbook (saved recipes with photos), IMG Lab (adjustments and local-AI enhancement), Calibrate (fit the model to your real paints) and Palette (pigment management).',
      'Recipes display as parts or percentages, with Classic/Spectral/2-const engines, value priority, golden ratio, required tubes and batch amounts (ml/g/drops).',
    ],
  },
  {
    title: 'Settings',
    body: [
      'Artist identity (name, contact, logo and signature) that prefills new works, certificates and PDFs; default texts; appearance and language (EN/ES); backup reminder cadence; and the danger zone to wipe local data.',
    ],
  },
  {
    title: 'Cloud sync (optional)',
    body: [
      'Off by default: without it the app is 100% local. When enabled you use your own free Firebase project with Google sign-in; the step-by-step guide and security rules live in that section.',
      'It syncs works, ideas (with their images) and also the colour lab data: palettes, calibrations, preferences and the logbook with photos. Local storage is always the source of truth: lose the connection or turn the cloud off and everything keeps working.',
      'The cloud icon in the top bar shows the status and offers an instant sync.',
    ],
  },
  {
    title: 'Data, backups and import',
    body: [
      'Data is stored in IndexedDB with rolling automatic backups, and the app requests persistent storage so the browser won’t evict it. Clearing the “cache” does not delete your data; clearing “site data” does.',
      '“Export all” produces a single JSON file with EVERYTHING: works, ideas, settings and the colour-lab data (including the photo logbook). Importing it on another device restores the full set; imported works and ideas get fresh ids so nothing is overwritten.',
      'The panel at the foot of the gallery shows storage used, protection status and the date of your last backup, with configurable reminders.',
    ],
  },
  {
    title: 'Installing and offline use',
    body: [
      'Atelier is a PWA: use “Install app” from the browser (address-bar icon on desktop, “Add to Home Screen” on phones). Once installed it works offline; when a new version ships it updates on reload.',
    ],
  },
]

export function getManual(lang: Lang): ManualSection[] {
  return lang === 'es' ? ES : EN
}
