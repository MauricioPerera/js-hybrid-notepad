# Hybrid Notepad

Block de notas con busqueda hibrida (semantica + texto) que funciona 100% offline en el browser.

## Como funciona

```
Browser (100% offline despues de la primera carga)
├── Transformers.js        → multilingual-e5-small (ONNX/WASM, 384 dims)
├── js-vector-store        → PolarQuantizedStore (3-bit, busqueda semantica)
├── js-vector-store BM25   → BM25Index (busqueda por texto)
├── js-vector-store Hybrid → HybridSearch (RRF fusion)
├── js-doc-store           → DocStore (CRUD de notas)
└── IndexedDB              → persistencia (sobrevive refresh + cierre)
```

Zero backend. Zero API keys. El modelo de embeddings se descarga una vez y se cachea en el browser.

## Uso

1. Abrir `index.html` en el browser
2. Esperar a que el modelo se descargue (~65MB, primera vez)
3. Crear notas
4. Buscar con 3 modos:
   - **Hibrida** (default): combina semantica + texto con Reciprocal Rank Fusion
   - **Semantica**: busca por significado (encuentra "auto" si buscas "vehiculo")
   - **Texto (BM25)**: busca por palabras exactas (como Ctrl+F pero con ranking)

## Busqueda hibrida

La busqueda hibrida combina lo mejor de ambos mundos:

| Tipo | Que encuentra | Ejemplo |
|---|---|---|
| **BM25 (texto)** | Palabras exactas | "Python" encuentra notas que dicen "Python" |
| **Semantica** | Significado similar | "programacion" encuentra notas sobre "Python", "JavaScript", "codigo" |
| **Hibrida (RRF)** | Ambos, unificados | Encuentra por palabra Y por significado, rankeados por fusion |

### Reciprocal Rank Fusion (RRF)

```
score(doc) = 1/(k + rank_vector) + 1/(k + rank_bm25)
```

Un documento que esta top-3 en semantica Y top-3 en texto tendra mejor score que uno que esta top-1 solo en uno de los dos.

## Offline

Despues de la primera carga:
- El modelo ONNX se cachea en el browser (Cache API)
- Las notas se guardan en IndexedDB
- Los embeddings se guardan en IndexedDB
- Todo funciona sin red

## Stack

- [Transformers.js](https://huggingface.co/docs/transformers.js) — multilingual-e5-small (ONNX/WASM)
- [js-vector-store](https://github.com/MauricioPerera/js-vector-store) — PolarQuantizedStore + BM25 + HybridSearch
- [js-doc-store](https://github.com/MauricioPerera/js-doc-store) — DocStore para CRUD

## Licencia

MIT
