/**
 * Benchmark del Hybrid Notepad (sin modelo, simula embeddings con vectores random)
 */

// Simulate browser globals
global.window = global;
global.structuredClone = global.structuredClone || (obj => JSON.parse(JSON.stringify(obj)));
require('./js-vector-store.js');
require('./js-doc-store.js');

function hrMs(s) { const [a,b]=process.hrtime(s); return a*1000+b/1e6; }
function fmt(ms) { return ms<1?(ms*1000).toFixed(0)+'us':ms<1000?ms.toFixed(2)+'ms':(ms/1000).toFixed(2)+'s'; }

const sampleNotes = [
  { title: 'Reunion de equipo', content: 'Discutimos los objetivos del Q2. Maria propuso cambiar la estrategia de marketing digital. Juan sugiere enfocarnos en SEO organico.' },
  { title: 'Ideas para el producto', content: 'Agregar modo oscuro a la app. Implementar notificaciones push. Mejorar el onboarding con tutorial interactivo.' },
  { title: 'Receta pasta carbonara', content: 'Ingredientes: pasta, huevos, queso pecorino, guanciale, pimienta negra. Cocinar la pasta al dente, mezclar con huevos y queso.' },
  { title: 'Lista de compras', content: 'Leche, pan, huevos, frutas, verduras, pollo, arroz, aceite de oliva, sal, cafe.' },
  { title: 'Notas de Python', content: 'List comprehensions son mas rapidas que loops. Usar generators para datasets grandes. Decoradores para cross-cutting concerns.' },
  { title: 'Plan de ejercicio', content: 'Lunes: cardio 30min. Martes: pesas upper body. Miercoles: descanso. Jueves: HIIT. Viernes: pesas lower body.' },
  { title: 'Proyecto machine learning', content: 'Entrenar modelo de clasificacion de texto con BERT. Dataset de 50K reviews. Fine-tuning con learning rate 2e-5.' },
  { title: 'Viaje a Barcelona', content: 'Visitar la Sagrada Familia, el Parque Guell, Las Ramblas. Comer paella en la Barceloneta. Hotel en el Barrio Gotico.' },
  { title: 'Presupuesto mensual', content: 'Alquiler 800, servicios 150, comida 400, transporte 100, ocio 200, ahorro 350. Total ingresos: 2500.' },
  { title: 'Configuracion servidor', content: 'Nginx como reverse proxy. Node.js en puerto 3000. PostgreSQL en 5432. Redis para cache en 6379. SSL con certbot.' },
  { title: 'Apuntes de JavaScript', content: 'Closures capturan el scope lexico. Promises y async/await para asincronia. Event loop procesa la cola de microtasks primero.' },
  { title: 'Metas del anio', content: 'Aprender Rust. Correr un maraton. Leer 24 libros. Ahorrar 5000 euros. Viajar a Japon.' },
  { title: 'Debugging tips', content: 'Usar console.table para arrays. Chrome DevTools performance tab para memory leaks. Breakpoints condicionales ahorran tiempo.' },
  { title: 'Resumen libro Atomic Habits', content: 'Pequenos cambios generan grandes resultados. Las 4 leyes: hacer obvio, atractivo, facil, satisfactorio. Identidad antes que resultados.' },
  { title: 'API REST design', content: 'Usar verbos HTTP correctos. GET para lectura, POST para creacion. Versionado en URL /v1/. Paginacion con cursor, no offset.' },
  { title: 'Reunion cliente Acme', content: 'Piden integracion con su CRM Salesforce. Deadline fin de marzo. Presupuesto aprobado de 15K. Contacto: Laura Martinez.' },
  { title: 'Docker compose config', content: 'Services: app, db, redis, nginx. Volumes para datos persistentes. Networks para aislar frontend de backend. Healthchecks en cada servicio.' },
  { title: 'Receta smoothie verde', content: 'Espinacas, platano, manzana verde, jengibre, limon, agua de coco. Licuar 2 minutos. Opcional: semillas de chia.' },
  { title: 'Curso de Rust', content: 'Ownership y borrowing son el core del lenguaje. No hay garbage collector. Lifetimes aseguran seguridad de memoria en compile time.' },
  { title: 'Notas entrevista candidato', content: 'Senior dev, 8 anios experiencia. Fuerte en React y Node. Debil en testing. Pide 65K. Disponible en 2 semanas.' },
];

console.log('=== HYBRID NOTEPAD BENCHMARK ===\n');

const queries = [
  'machine learning python',
  'receta cocina',
  'configuracion servidor nginx',
  'presupuesto gastos mensuales',
  'reunion cliente proyecto',
];

const sizes = [20, 50, 100, 200, 500, 1000];

console.log('Size'.padEnd(8) + 'BM25'.padEnd(14) + 'Vector'.padEnd(14) + 'Hybrid'.padEnd(14) + 'Insert'.padEnd(14) + 'Flush'.padEnd(12) + 'VecKB'.padEnd(10) + 'Vocab');
console.log('-'.repeat(90));

for (const N of sizes) {
  const db = new DocStore(new DocMemoryStorageAdapter());
  const col = db.collection('notes');
  const vec = new PolarQuantizedStore(new MemoryStorageAdapter(), 384);
  const bm = new BM25Index();
  const hy = new HybridSearch(vec, bm, 'rrf');

  for (let i = 0; i < N; i++) {
    const s = sampleNotes[i % sampleNotes.length];
    const n = col.insert({ title: s.title, content: s.content, ts: Date.now() });
    bm.addDocument('notes', n._id, s.title + ' ' + s.content);
    const v = normalize(Array.from({length:384}, () => Math.random()*2-1));
    vec.set('notes', n._id, v, { title: s.title });
  }
  db.flush(); vec.flush();

  const fakeQ = normalize(Array.from({length:384}, () => Math.random()*2-1));

  // BM25
  let t = process.hrtime();
  for (let i = 0; i < 100; i++) for (const q of queries) bm.search('notes', q, 10);
  const bm25Ms = hrMs(t) / (100 * queries.length);

  // Vector
  t = process.hrtime();
  for (let i = 0; i < 100; i++) vec.search('notes', fakeQ, 10);
  const vecMs = hrMs(t) / 100;

  // Hybrid
  t = process.hrtime();
  for (let i = 0; i < 100; i++) hy.search('notes', fakeQ, queries[0], 10);
  const hybMs = hrMs(t) / 100;

  // Insert
  t = process.hrtime();
  for (let i = 0; i < 20; i++) {
    const s = sampleNotes[i % sampleNotes.length];
    const n = col.insert({ title: s.title, content: s.content, ts: Date.now() });
    bm.addDocument('notes', n._id, s.title + ' ' + s.content);
    vec.set('notes', n._id, fakeQ, { title: s.title });
  }
  const insertMs = hrMs(t) / 20;

  // Flush
  t = process.hrtime();
  db.flush(); vec.flush();
  const flushMs = hrMs(t);

  const vecKB = (vec.bytesPerVector() * vec.count('notes') / 1024).toFixed(1);

  console.log(
    String(N).padEnd(8) +
    fmt(bm25Ms).padEnd(14) +
    fmt(vecMs).padEnd(14) +
    fmt(hybMs).padEnd(14) +
    fmt(insertMs).padEnd(14) +
    fmt(flushMs).padEnd(12) +
    (vecKB + 'KB').padEnd(10) +
    bm.vocabularySize('notes')
  );
}

// BM25 search quality
console.log('\n=== BM25 SEARCH QUALITY (20 notas) ===\n');

const db2 = new DocStore(new DocMemoryStorageAdapter());
const notes2 = db2.collection('notes');
const bm2 = new BM25Index();

for (const s of sampleNotes) {
  const n = notes2.insert({ title: s.title, content: s.content });
  bm2.addDocument('notes', n._id, s.title + ' ' + s.content);
}

const testQueries = [
  'como cocinar pasta',
  'programacion web javascript',
  'ejercicio fitness gimnasio',
  'inteligencia artificial modelo',
  'viaje turismo ciudad',
  'devops infraestructura cloud',
  'ahorro dinero finanzas',
];

for (const q of testQueries) {
  const results = bm2.search('notes', q, 3);
  console.log('Query: "' + q + '"');
  if (results.length === 0) {
    console.log('  (sin resultados)');
  } else {
    results.forEach((r, i) => {
      const note = notes2.findById(r.id);
      console.log('  ' + (i+1) + '. [' + r.score.toFixed(4) + '] ' + (note ? note.title : r.id));
    });
  }
  console.log('');
}

// Memory footprint
console.log('=== MEMORY FOOTPRINT (384d, PolarQuantized 3-bit) ===\n');
const bpv = Math.ceil(384 * 3 / 16);
[100, 500, 1000, 5000, 10000].forEach(n => {
  const kb = (bpv * n / 1024).toFixed(1);
  console.log('  N=' + String(n).padEnd(6) + kb + ' KB vectors + ~' + (n * 0.5).toFixed(0) + ' KB docs');
});
