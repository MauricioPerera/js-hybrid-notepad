# Hybrid Notepad

Block de notas con AI local, busqueda hibrida, y knowledge graph. 100% offline en el browser. PWA instalable.

**Live: [hybrid-notepad.pages.dev](https://hybrid-notepad.pages.dev)**

## Como funciona

```
Browser (100% offline despues de la primera carga)
├── Qwen3-0.6B (Q4)       → LLM local (resumir, tags, preguntas, expandir, traducir)
├── multilingual-e5-small  → embeddings (ONNX/WASM, 384 dims, 100+ idiomas)
├── PolarQuantizedStore    → busqueda semantica (3-bit, 21x compresion)
├── BM25Index              → busqueda por texto (Okapi BM25)
├── HybridSearch           → fusion RRF (semantica + texto)
├── Knowledge Graph        → entidades + relaciones extraidas por AI
├── PDF.js                 → importar PDFs
├── DocStore               → CRUD de notas con indices
├── Service Worker         → cache de modelos + app para offline
└── IndexedDB              → persistencia (sobrevive refresh/cierre/offline)
```

Zero backend. Zero API keys. Los modelos se descargan una vez (~415MB) y se cachean.

## Features

### Notas
- Crear, editar, eliminar notas
- **Markdown** con preview renderizado (headings, bold, italic, code, listas, tablas, task lists)
- **Carpetas** para organizar notas
- **Auto-save** con debounce (600ms)
- Contador de palabras
- Persistencia en IndexedDB

### Busqueda (5 modos)

| Modo | Como busca |
|---|---|
| **Hibrida** | Semantica + BM25 con Reciprocal Rank Fusion |
| **Semantica** | Similitud de embeddings (e5-small, 384d) |
| **BM25** | Palabras exactas con ranking Okapi BM25 |
| **Graph** | Traversa entidades conectadas en el knowledge graph |

### AI local (Qwen3-0.6B)

Todo corre en tu browser via WebGPU (o WASM fallback):

| Accion | Que hace | Se guarda? |
|---|---|---|
| **Resumir** | Resume la nota en puntos clave | Si (note.summary) |
| **Auto-tag** | Genera tags y los guarda | Si (note.tags) |
| **Preguntas clave** | Identifica preguntas que la nota responde | Si (note.keyQuestions) |
| **Expandir** | Desarrolla las ideas con mas detalle | Si |
| **Traducir EN** | Traduce al ingles | Si (note.translation) |
| **Extraer grafo** | Extrae entidades y relaciones | Si (graph nodes/edges) |
| **Pregunta libre** | Pregunta sobre la nota con RAG + Graph context | Si (Q&A en historial) |
| **Thinking mode** | Toggle para razonamiento paso a paso | Configurable |

### Historial AI

Cada interaccion con AI se guarda en la nota y persiste entre sesiones:

- Panel "Historial AI" debajo del output
- **Copiar**: copia resultado al clipboard
- **Agregar a nota**: inserta resultado en el contenido
- Preview de nota muestra summary de AI si existe
- Badge `AI:N` en la lista indica interacciones

### Knowledge Graph

Grafo de conocimiento construido automaticamente desde tus notas:

```
Nota: "Alice trabaja en Acme Corp con Bob en el proyecto Atlas"
  → Entidades: Alice (person), Acme Corp (org), Bob (person), Atlas (project)
  → Relaciones: Alice →trabaja_en→ Acme, Alice →trabaja_con→ Bob
```

- Extraccion automatica al guardar (throttled)
- Extraccion manual con boton "Extraer grafo"
- Visualizacion con "Ver grafo" (entidades por tipo, color-coded)
- Busqueda por grafo: traversa entidades conectadas (BFS, profundidad 2)
- Context injection: preguntas al AI incluyen relaciones del grafo

### Importar archivos

- **PDF**: Extrae texto con PDF.js (todas las paginas)
- **TXT/MD**: Importa como texto plano
- **Drag & drop**: Arrastra archivos a la lista de notas
- **Multi-select**: Importa varios archivos a la vez
- Auto-indexa en vector store + BM25 + graph

### Carpetas

- Crear carpetas con "+ Carpeta"
- Barra de chips para filtrar por carpeta
- Selector en editor para mover notas entre carpetas
- Nuevas notas heredan la carpeta activa
- Carpetas dinamicas (se crean/eliminan con las notas)

### Export/Import

- **Exportar**: Descarga JSON con todas las notas, graph, AI history, tags
- **Importar**: Carga JSON backup, salta duplicados, re-indexa embeddings

## Offline / PWA

Despues de la primera carga, todo funciona sin internet:

| Componente | Cache |
|---|---|
| App (HTML/JS/CSS) | Service Worker (pre-cached) |
| Transformers.js | Service Worker |
| Modelos ONNX | Service Worker |
| PDF.js + worker | Service Worker |
| Notas + embeddings | IndexedDB |
| BM25 index | IndexedDB |
| Knowledge graph | IndexedDB |

**Instalar como app**: Chrome/Edge > icono de instalar en barra URL, o Menu > "Instalar"

## Stack tecnico

| Componente | Libreria | Tamano | Donde corre |
|---|---|---|---|
| LLM | Qwen3-0.6B Q4 | ~350MB (cached) | WebGPU/WASM |
| Embeddings | multilingual-e5-small | ~65MB (cached) | WASM |
| Vector search | PolarQuantizedStore (3-bit) | inline | JS |
| Text search | BM25Index | inline | JS |
| Hybrid search | HybridSearch (RRF) | inline | JS |
| Document DB | DocStore | inline | JS |
| PDF parsing | PDF.js | CDN (cached) | JS |
| Markdown | Vanilla parser | inline | JS |
| Persistence | IndexedDB | browser | browser |
| Offline | Service Worker | browser | browser |

## Costos

| Recurso | Costo |
|---|---|
| Hosting (Pages) | $0 |
| LLM | $0 (local) |
| Embeddings | $0 (local) |
| Storage | $0 (browser) |
| **Total** | **$0** |

## Repositorios relacionados

- [js-vector-store](https://github.com/MauricioPerera/js-vector-store) — Vector database
- [js-doc-store](https://github.com/MauricioPerera/js-doc-store) — Document database
- [js-browser-agent](https://github.com/MauricioPerera/js-browser-agent) — AI agent con memoria

## Seguridad

- **Markdown URLs**: solo permite `http:`, `https:`, `mailto:`, `#`, y `/` — bloquea `javascript:` y otros protocolos
- **AI History**: usa event delegation con `data-*` attributes — sin contenido inline en atributos HTML (previene XSS)
- **IndexedDB**: datos locales, nunca salen del browser
- **Service Worker**: solo cachea dominios conocidos (HuggingFace, jsDelivr, app propia)
- **Sin cookies, sin tracking, sin analytics**

## Arquitectura (1,386 lineas)

```
index.html
├── CSS (160 LOC)
│   ├── Dark theme + variables
│   ├── Layout (panels, editor, AI)
│   ├── Responsive mobile (view-based navigation)
│   └── Markdown preview styles
│
├── HTML (88 LOC)
│   ├── Header (model badges, progress, stats)
│   ├── Panel izquierdo (search, modes, folders, note list)
│   └── Panel derecho (editor, markdown preview, AI panel)
│
└── JavaScript (1,100 LOC)
    ├── IDBAdapter — IndexedDB con batch getAll()
    ├── Init — bootstrap + error boundary
    ├── Model loading — E5 + Qwen3 en paralelo + timing
    ├── Embedding — embed/embedQuery/indexMissing
    ├── Knowledge Graph — extractGraph/traverseGraph/getGraphContext
    ├── LLM — generate/generateStream + thinking mode
    ├── Markdown — vanilla parser (headings, lists, tables, code, etc.)
    ├── AI Persistence — saveAIResult/renderAIHistory
    ├── AI Actions — 7 acciones + pregunta libre + graph RAG
    ├── Graph Viz — entidades por tipo, relaciones
    ├── Folders — getFolders/renderBar/newFolder/setFolder
    ├── Note CRUD — new/delete/select/save + graph cleanup
    ├── Search — 4 modos con folder filter
    ├── Render — noteList/searchResults/stats
    ├── File Import — PDF.js + TXT/MD + drag&drop
    ├── Export/Import — JSON backup/restore
    └── persistAll() — flush centralizado
```

## Changelog

### v1.2 (actual)
- Fix XSS en AI history (event delegation)
- Fix XSS en Markdown URLs (sanitize protocol)
- Fix import hereda carpeta activa
- Fix search filtra por carpeta
- Fix await en todas las escrituras a IndexedDB
- Refactor: `persistAll()` reemplaza 9 patrones duplicados
- Error boundary en init()

### v1.1
- Carpetas para organizar notas
- AI persistence (historial guardado por nota)
- PDF/TXT/MD import con drag & drop
- Markdown rendering con preview toggle
- Knowledge Graph (entity extraction + BFS traversal)
- Thinking mode toggle para Qwen3

### v1.0
- Notepad con busqueda hibrida (semantic + BM25 + RRF)
- Qwen3-0.6B local (WebGPU/WASM)
- multilingual-e5-small para embeddings
- PWA instalable + Service Worker offline
- IndexedDB persistence

## Creditos

Creado por [Mauricio Perera](https://www.linkedin.com/in/mauricioperera/)

## Licencia

MIT
