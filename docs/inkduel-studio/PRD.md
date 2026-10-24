# INKDUEL STUDIO — PRD MAESTRO

**Versión:** 1.0 — 24 de octubre de 2026  
**Estado:** decisión de producto + especificación para implementación  
**Producto:** InkDuel Web, integrado a **Mis obras → Detalle de obra**  
**Repositorios a inspeccionar:** `InkDuel/landing`, `InkDuel/inkduel-backend`, y `InkDuel/inkduel_mobile` únicamente para verificar compatibilidad de lectura/edición  
**Propuesta de trabajo:** una entrega vertical funcional, desarrollada por etapas internas y presentada en PRs separados por repositorio; **no hacer merge ni habilitar producción automáticamente**.  
**Intensidad recomendada para Claude:** razonamiento **máximo / Extended Thinking High o superior**, con contexto de los tres repositorios y ejecución hasta cumplir aceptación, no solo generar scaffolding.

> **Visión:** InkDuel es el lugar donde una persona descubre que disfruta escribir, mejora compitiendo, desarrolla obras con herramientas serias y encuentra lectores. Studio es el espacio privado para producir esas obras; la Arena descubre talento y crea hábito; Historias distribuye el contenido. No son productos separados.

---

## 0. Decisión ejecutiva (leer antes de escribir código)

**Aprobar un InkDuel Studio integrado en `/me/works/[workId]` sin reemplazar Works.** La vista del propietario pasa a tener un entorno de autor progresivo: **Escribir, Planificar, Universo, Progreso y Publicar**. La lectura pública `/work/[workId]` permanece liviana. La entrada a Studio no debería requerir crear otro proyecto si ya existe un Work.

**No convertir la entrega en una copia de Campfire ni en un editor ofimático.** El factor diferenciador es el recorrido **escritura → obra → publicación por capítulos → lectores, Marcas, reacciones, seguimiento**, enlazado a duelos. La complejidad se revela bajo demanda: escribir debe ser posible antes de crear fichas de personajes o planificar una trama.

**Una ejecución, alcance coherente:** entregar todas las funciones **P0** integradas de punta a punta (Go, Firestore, Next.js, pruebas, documentación, banderas, compatibilidad); documentar P1/P2 pero **no construir implementaciones huecas, botones falsos ni un megasistema inestable**. “De un tirón” significa un ciclo de implementación que termine verificable, **no un único commit ni un deployment automático**.

**Invariantes:** privacidad de borradores; datos perdurables y exportables; edición con concurrencia controlada; publicación explícita; inmutabilidad del duelo de origen; compatibilidad con Flutter y clientes instalados; cero código de IA necesario; precio/subscripción no bloquea escritura ni salida de contenido.

### Hechos verificados en los repositorios al redactar este PRD

- `landing/src/app/(session)/me/works/[workId]/page.tsx` ya existe y usa `WorkManageView`; el editor vive en `chapter-editor.tsx`; API client en `src/lib/session/works.ts`; motor de guardado en `chapter-autosave.ts`; localización en `works-copy.ts`/`i18n.ts`; analítica en `works-analytics.ts`.
- `landing` utiliza **Next.js 16.3.8, React 19, TypeScript, Tailwind 4, Vitest**. Tiene componentes Ink de diseño que hay que reutilizar.
- `inkduel-backend/internal/models/work_limits.go`: `MaxWorkTitle=120`, `MaxChapterTitle=120`, `MaxChapterContent=5000` **codepoints/runes** y `MaxChaptersPerWork=100`.
- `WorkChapter` almacena `content`, `title`, `orderIndex`, `revision`, `published`. El `orderIndex` se asigna una sola vez y no hay reordenamiento público actualmente. `UpdateChapter` modifica el contenido persistido del mismo documento, incluso cuando ya está publicado.
- El guardado web hoy usa 2 s de debounce, al menos 20 s entre guardados automáticos y revisión optimista con `expectedRevision`; el editor actual es texto plano; borradores de capítulos actualmente se guardan en servidor sin copia local persistente.
- La publicación actual distingue `Work.published`, `Chapter.published` e `isGalleryEligible`; un Work solo es elegible si está publicado, tiene ≥1 capítulo publicado y está activo para moderación.
- Las rutas actuales `/api/works...` detrás de `CONTINUE_STORIES_ENABLED` tienen controles de acceso y rate limits. El registro de duelos original **no debe alterarse**.
- **Consecuencia:** un “editor profesional” que escriba novelas largas, reordene capítulos o modifique un capítulo ya publicado **no se implementa solo con frontend**. Requiere diseño explícito de datos, contratos y compatibilidad.

> Toda ruta y todo estado mencionado deben verificarse de nuevo contra HEAD antes de cambiar código. Estos hechos son una fotografía del 24/10/2026, no una autorización para romper contratos si evolucionaron.

---

## 1. Análisis competitivo: qué aprender y qué no copiar

| Referencia | Fortaleza relevante | Aplicación a InkDuel | Qué no copiar todavía |
|---|---|---|---|
| **Campfire** | Manuscritos + módulos de personajes, mundo, mapas, cronología, relaciones; publicación y monetización | Entidades de universo reutilizables y vinculadas a la obra | Decenas de módulos especializados obligatorios o de entrada |
| **Scrivener** | Binder de documentos, escaleta, fichas, snapshots, metas y exportación | Jerarquía clara, tarjetas/escenas, cambio veloz entre escribir y planificar | Complejidad de escritorio: carpetas arbitrarias e infinitas configuraciones |
| **Novelcrafter** | Codex, escenas, subtramas, continuidad contextual y asistencia IA | Biblia de la historia, etiquetas, fichas referenciables, subtramas | IA redactando capítulos por defecto y deuda de mantenimiento por RAG |
| **Plottr** | Timeline, tarjetas de escenas, plotlines, fichas y atributos | Tablero editorial que muestra estructura y evolución | Cronologías multicapas como editor de diagramas genérico |
| **Reedsy Studio** | Editor muy limpio, Boards, metas, comentarios editoriales, exportación profesional | Flujo escribir–planificar–revisar–publicar y referencias al lado del texto | Coedición en tiempo real y maquetación editorial de imprenta en P0 |
| **Dabble** | Planificación accesible, metas, foco, sincronización y soporte multiformato | Ritmo de escritura, claridad de guardado, modos de foco | Recrear un escritorio de escritura entero para cada dispositivo |

**Conclusión de producto:** una persona escribe más si la interfaz no interrumpe el flujo; planifica mejor si las notas están a un clic; persevera cuando ve progreso legítimo; y confía si sus borradores son privados, recuperables y exportables. **Confianza > cantidad de widgets.**

**Advertencia competitiva:** Campfire y Reedsy **ya conectan producción, publicación y otros servicios**. No afirmar que InkDuel es único por tener ambos. El posicionamiento propio es descubrimiento y mejora mediante duelos + publicación social de ficción serial.

---

## 2. Problema, oportunidad y estrategia

### Problemas reales que queremos resolver

1. **Página en blanco:** el autor quiere escribir de inmediato sin configurar veinte opciones.
2. **Desorganización:** necesita recordar quién es cada personaje, objetivos, relaciones, lugares y promesas narrativas.
3. **Pérdida de contexto:** al regresar después de varios días debe entender qué escribió, qué planeaba y qué sigue.
4. **Inseguridad sobre borradores:** teme perder horas de trabajo, sobreescribir cambios o publicar por accidente.
5. **Falta de progreso visible:** necesita metas realistas sin convertir la creatividad en un castigo diario.
6. **Transición a lectores:** cuando el texto está listo debe poder publicarlo sin copiar y pegar entre aplicaciones.
7. **Autonomía editorial:** el escritor debe poder exportar su obra y migrar a otro editor.

### Jobs-to-be-done

- **Principiante:** “Tengo una idea, quiero empezar a escribir y recibir lectores sin estudiar software complejo”.
- **Autor serial:** “Tengo varios capítulos, quiero mantener continuidad y publicar cuando estén listos”.
- **Planificador:** “Quiero visualizar personajes, subtramas y escenas para no perderme”.
- **Escritor intuitivo:** “No quiero planificar nada; abro y escribo”.
- **Autor proveniente de duelo:** “Quiero convertir el texto breve en una historia larga sin cambiar el resultado del duelo”.

**North star propuesta:** autores que realizan ≥2 sesiones de escritura con cambios persistidos en días distintos dentro de 7 días y conservan intención de regresar. Medir además la **publicación de segundo capítulo**, no solo cantidad de fichas creadas.

**Metas para experimento, no predicciones:** elevar el porcentaje de autores que inician un segundo capítulo y la retención semanal de autores respecto al grupo control. Definir objetivos cuantitativos tras observar línea de base por cohortes. Nunca extrapolar D7 global al uso del Studio sin segmentar.

---

## 3. Principios de diseño no negociables

1. **Escribir primero:** máximo dos interacciones desde un Work existente hasta tener cursor en texto.
2. **Revelación progresiva:** paneles cerrables; 0 fichas obligatorias; defaults sensatos.
3. **Escritura segura:** estados separados de “Guardando…”, “Guardado en este dispositivo”, “Sincronizado” y “No se pudo guardar”. Jamás decir guardado sin confirmación.
4. **Publicado ≠ borrador:** la versión visible no cambia al editar un borrador de revisión; “Publicar cambios” es explícito.
5. **Privacidad por defecto:** manuscritos, notas, personajes y relaciones son privados aunque la obra sea pública.
6. **Obra portable:** exportar contenido y metadatos propios, sin bloqueo artificial por plan.
7. **La interfaz debe desaparecer:** anchura cómoda, tipografía literaria, foco y atajos.
8. **Accesible:** keyboard-first, contraste WCAG 2.2 AA, labels, estados anunciados, drag-and-drop con alternativa sin mouse, reduced-motion.
9. **Consistencia internacional:** strings ES neutro, EN, PT-BR; no voseo en copys de producto. Respetar idioma de obra/autores.
10. **Sin promesas falsas:** no ofrecer “ordenar capítulos públicos”, “EPUB” o “offline” si no funciona de verdad.

---

## 4. Alcance contractual: P0, P1 y P2

**P0 = construir en esta ejecución end-to-end. P1 = diseño preparado/documentado y construir luego. P2 = exploración futura.** Si un elemento P0 resulta técnicamente inviable en HEAD, resolver una alternativa real y documentar el compromiso con su impacto; nunca simular backend con estado local temporal.

### P0 — experiencia integrada completa

| Código | Requisito verificable |
|---|---|
| F01 | Tablero de obra en `/me/works/[workId]` con Escribir, Planificar, Universo, Progreso, Publicar; edición accesible desde rutas existentes |
| F02 | Manuscrito con estructura **capítulos + escenas/bloques de trabajo privados**, agregar/renombrar/cambiar estado; navegar con buscador y resumen |
| F03 | Editor fiable: composición Unicode/IME, deshacer/rehacer, selección, spellcheck nativo, foco, atajos, tamaño y ancho configurables |
| F04 | Guardado autosave servidor + recuperación local de emergencia **con etiquetado correcto y controles de privacidad**, revisión OCC, multi-tab y multi-dispositivo |
| F05 | **Borrador de revisión separado de contenido publicado**, publicación explícita, vista previa exacta, validaciones y compatibilidad Works actual |
| F06 | Fichas de **personajes**: identidad, rol, motivación, objetivo, conflicto, arco, voz, descripción, rasgos, secretos y campos personalizados acotados |
| F07 | **Universo**: lugares y notas/lore de mundo, tags, búsqueda y referencias a escenas |
| F08 | **Relaciones entre personajes** con editor accesible en lista y visualización de grafo simple; dirección, tipo, etiqueta, estado |
| F09 | **Planificación**: tarjetas de escenas, sinopsis, estado, subtrama, POV, lugar, personajes, orden de planificación y vista tablero/lista |
| F10 | **Notas rápidas** a un clic desde el editor, panel contextual fijable de personaje/escena, no distraer de la escritura |
| F11 | **Productividad auténtica**: palabras, caracteres Unicode, estimación de lectura, meta por obra y por sesión, días de escritura, calendario tipo contribuciones y racha opcional |
| F12 | **Historial y recuperación**: versiones/hitos explícitos, restaurar mediante copia segura (nunca sobrescribir silenciosamente), papelera para contenido privado |
| F13 | **Importar** `.txt` y `.md` seguros; **exportar** `.txt`, `.md` y `.docx` si la dependencia elegida es robusta; respaldo estructurado JSON o ZIP para datos privados; fidelidad validada |
| F14 | Revisión editorial antes de publicar: checklist, lector previo, capítulos pendientes, confirmación explícita, enlaces a obra pública y estado de moderación |
| F15 | Buscar por título/contenido en la obra y por fichas/notas; orden y filtros básicos, **sin enviar manuscrito a servicios de terceros** |
| F16 | Estados de carga/vacío/error/desconexión, responsive, experiencia móvil web utilizable y diseño Ink existente |
| F17 | Seguridad, límites, índices y banderas; pruebas Go + Vitest, QA de compatibilidad Flutter y eventos de analítica sin texto privado |

### P1 — próximo incremento, NO bloquear P0

- Formato enriquecido persistente de manuscrito y lectura pública (negrita, cursiva, citas, escenas, imágenes) con contrato común web/Flutter.
- Exportación editorial EPUB 3 y PDF maquetado; importación DOCX/EPUB con validación y vista previa de transformación.
- Reordenamiento **público** de capítulos con semántica y orden compatibles entre todos los clientes; índice de actos/partes.
- Línea temporal narrativa multicapas, dependencias de tramas y visualización por personajes.
- Comparador visual diff de dos versiones y restauración granular.
- Búsqueda y reemplazo global con previsualización de cambios.
- Compartir manuscritos de forma privada a lectores beta mediante invitación, expiración y permisos.
- Anotaciones editoriales privadas en rangos de texto y tareas de revisión.
- Modo offline de larga duración certificado y sincronización multi-dispositivo más sofisticada.

### P2 — investigación (sin código en esta entrega)

- Colaboración en tiempo real tipo Google Docs; CRDT/OT; mercados de editores y correctores.
- Generación de diagramas, arcos, mapas y continuidad con IA opt-in, con costo/consentimiento claros.
- Publicación comercial, DRM, impresión bajo demanda, marketplace, herramientas de formato profesional editorial.
- Bible compartida entre series y multi-autor; exportación a estándares editoriales industriales; calendario fantástico configurable.

**Justificación:** hacer P0 íntegro ya es un esfuerzo amplio. Intentar P0+P1+P2 de una vez produce un producto visualmente impresionante pero difícil de mantener y de recuperar si un escritor pierde texto. Un PRD excelente también sabe qué posponer.

---

## 5. Arquitectura de información e interacción

### Integración, rutas y navegación

- Mantener `/me/works` (listado) y `/me/works/[workId]` (detalle propietario). **No abrir una aplicación/hostname aparte**.
- El detalle tiene encabezado con título, estado de publicación, acceso a vista del lector y menú acciones. Navegación de cinco áreas: **Escribir | Planificar | Universo | Progreso | Publicar**.
- El área principal **Escribir** abre por defecto si hay contenido o al elegir “Continuar escribiendo”. Si el Work es nuevo, CTA visible “Escribir primer capítulo”; edición sin llenar ficha.
- Las rutas `/me/works/[workId]/chapter/[chapterId]` deben conservarse y servir al mismo sistema de edición o redirigir de forma segura, no duplicar motores. Los bookmarks no se rompen.
- Opcional: usar rutas anidadas o `?tab=` navegables para volver a vista con Back; evitar pérdida de edición al cambiar de sección.
- `/work/[workId]` público y `/stories` no se rediseñan. Las fichas del universo no son públicas.

### Desktop (≥1024 px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ InkDuel      Mis obras / El último guardián     [Sincronizado] [Ver obra] │
├─────────────────────────────────────────────────────────────────────────┤
│ Escribir  Planificar  Universo  Progreso  Publicar                       │
├─────────────────┬──────────────────────────────────┬────────────────────┤
│ Manuscrito      │                                  │ Referencias         │
│ > Capítulo 1    │    Capítulo 2 — La promesa        │ Personaje fijado    │
│   Capítulo 2    │                                  │  Objetivo...        │
│   Capítulo 3    │    Texto, foco, escritura...      │ Notas / búsqueda    │
│ + Nuevo capítulo│                                  │                    │
│ Buscar          │                                  │                    │
├─────────────────┴──────────────────────────────────┴────────────────────┤
│ 1.240 palabras · Meta 1.500     Guardado    [Vista previa] [Publicar]     │
└─────────────────────────────────────────────────────────────────────────┘
```

- Panel izquierdo: índice y tarjetas breves; centro: zona literaria 620–760 px de ancho, altura flexible; derecho: notas/contexto **cerrado por defecto** en espacios pequeños.
- Foco: oculta navegación secundaria, conserva estado de guardado, control de salida y atajo visible.
- Editor no debe re-renderizar el manuscrito completo ante cada contador o guardado; aplicar debouncing/memoización según framework real.

### Tablet y móvil web

- Un solo panel activo, índice y fichas como drawer/sheet. Barra del editor mínima, `textarea`/editor compatible con teclado móvil e IME, safe areas.
- Botones primarios 44×44 px aprox; selección/caret y scroll no saltan cuando autosave responde.
- No obligar al usuario a usar grafo: lista equivalente con edición de relaciones.
- Permitir escribir y guardar; no exigir que todas las herramientas visuales tengan paridad móvil perfecta.

### Estados vacíos

- Work sin capítulos: “Tu historia comienza aquí” + **Escribir**; link secundario “Planificar primero”.
- Sin personajes: “Puedes agregarlos cuando los necesites”, sin sugerir que es requisito.
- Sin progreso: indicar que el calendario comienza después del primer guardado real.
- Error/403/404 no revelar contenido privado de otras cuentas.

---

## 6. Flujo del autor (journey de extremo a extremo)

1. **Entrar**: desde Mis obras, abre Work; el acceso no cambia si nació de duelo u original.
2. **Crear o continuar**: selecciona capítulo o crea uno. El cursor se enfoca donde corresponde; se recuerda último documento solo para su cuenta.
3. **Escribir**: editor limpio; contador y guardado visible; añadir nota o personaje sin cerrar el capítulo.
4. **Planificar** (opcional): tarjetas de escenas, sinopsis y estado. Se puede escribir sin conectar tarjetas.
5. **Revisar**: guardar snapshot, consultar índice, ficha y progreso, revisar preview y advertencias.
6. **Publicar**: seleccionar capítulo terminado, confirmar preview; el servidor publica versión concreta; no publicar un guardado pendiente o en conflicto.
7. **Recibir lectores**: enlaces a obra pública; luego comentarios y Marcas ya existentes. Métrica de impacto posterior, sin mezclar preferencias privadas del escritor con analítica de lectores.
8. **Volver**: Work recuerda dónde escribir, señala un próximo paso opcional, no bloquea por racha perdida.

### Flujos delicados

- **Desde un duelo**: capítulo semilla de Work puede editarse como una copia; el relato original/resultado es inmutable.
- **Work ya publicado**: comenzar revisión sobre snapshot de versión publicada; guardar en borrador privado; la lectura pública se mantiene igual hasta “Publicar cambios”.
- **Work no publicado**: se pueden tener capítulos y materiales privados; `Work.published` sigue las reglas de visibilidad actual.
- **No hay red**: no descartar texto; mostrar “Guardado localmente / Pendiente de sincronizar” solo si de verdad se guardó local. Bloquear publicación hasta confirmación del servidor.
- **Dos pestañas**: reutilizar cuando aplique el patrón Web Locks probado en ranked o usar lease y OCC; permitir lector pasivo y transferencia; no sobreescribir contenido.
- **Conflicto entre dispositivos**: preservar ambos contenidos; permitir “Usar versión del servidor”, “Guardar mi versión como copia” y comparación textual simple; jamás “Conservar el mío” en modo ciego sin confirmar.

---

## 7. Especificación funcional del editor y el manuscrito

### 7.1 Datos y jerarquía

- Una **Obra** es la unidad pública/propietaria existente.
- **Capítulo público** es el `WorkChapter` existente con URL estable.
- **Borrador editorial privado** es la versión de trabajo de un capítulo público o de un futuro capítulo, independientemente de la versión publicada.
- Una **escena** es una unidad de planificación o segmento interno **privado**, opcionalmente vinculada a un capítulo; no debe convertirse accidentalmente en un capítulo público.
- Cada capítulo/borrador: título, cuerpo en texto plano canónico v1, sinopsis privada, estado editorial (`idea`, `draft`, `revising`, `ready`), vínculos de escenas, metadata liviana, timestamps, revisión, wordCount calculado.
- No inventar árboles arbitrarios en v1: **obra → capítulos, con escenas/tarjetas referenciables**. Mantener modelo fácilmente exportable.

### 7.2 Editor P0: intencionalmente texto plano confiable

**Decisión difícil:** el lector móvil actual consume `content: string` texto plano; por lo tanto la persistencia canónica v1 de los capítulos destinados a publicación será **texto plano Unicode**, no HTML, no Markdown interpretado, no JSON de ProseMirror. Podrá haber estilos visuales de editor (fuentes, ancho, interlineado, foco), pero **no botones de negrita o cursiva que luego se pierdan al publicar**. Rich text completo será P1, con contrato web/Flutter explícito. Mejor una limitación honesta que pérdida silenciosa de intención artística.

Capacidades requeridas:

- Pegado de texto multilinea conservando párrafos, saltos, guiones y caracteres Unicode; no consumir atajos de sistema.
- Undo/redo nativos; prevenir pérdida de foco o salto de cursor al autosave.
- Corrector ortográfico del navegador (`spellCheck`) con idioma apropiado; no enviar texto a un servicio de IA.
- Contar **palabras** con tokenización internacional validada (no usar solamente `split(/\s+/)` como métrica editorial; documentar idiomas CJK), **caracteres Unicode** con misma semántica que backend, y aproximación de lectura.
- Buscar texto dentro del capítulo; navegar anterior/siguiente y ver contexto.
- Atajos: `Cmd/Ctrl+S` fuerza persistencia y feedback; `Cmd/Ctrl+K` abre buscador/acciones según patrón del repo; `Esc` sale de foco; no interceptar atajos estándar del SO.
- Opciones de lectura/escritura locales por cuenta: serif/sans si ya existen tokens, tamaños, interlineado, ancho, tema Ink compatible, modo foco.
- Navegación entre capítulos protegida por guard de cambios no sincronizados; aviso beforeunload como última defensa, no como estrategia central.
- Nada de temporizador obligatorio de 5 minutos: los duelos y el Studio son contextos diferentes.

### 7.3 Longitud de capítulos y migración

- **No imponer el límite histórico de 5.000 caracteres a borradores editoriales largos.** Definir un máximo seguro por documento editorial (propuesta inicial: **40.000 codepoints** por documento, sujeto a prueba con UTF-8 y márgenes frente al límite de Firestore de 1 MiB); si los autores necesitan más, fragmentar editorialmente, no dividir textos en secreto.
- Mantener `MaxChapterContent=5000` y contratos actuales para **clientes legacy** mientras no haya acuerdo de compatibilidad. El límite de publicación nuevo debe estar gobernado por **capacidad/flag y pruebas en lectores móviles**, nunca expandirse en producción a ciegas.
- P0 implementa borradores largos y toda su exportación; la publicación de capítulos que superan el límite compatible muestra una restricción **explícita y accionable**, sin truncar. Si la verificación de Flutter y el diseño de capacidad confirman seguridad, habilitar en web la publicación larga bajo nueva capacidad/versionado en el mismo ciclo, con flag apagado hasta QA. No declarar soportada una publicación >5k sin compatibilidad real.
- Preservar límite técnico de 100 `WorkChapter` hasta que exista migración de paginación/índices y compatibilidad de consumidores. Escenas/notas privadas no consumen ese cupo.
- Nunca cambiar en silencio un `orderIndex` de contenido publicado o de capítulo semilla. Reordenar libremente tarjetas **privadas de planificación**, no capítulos públicos, en P0.

### 7.4 Publicación y revisiones (norma central)

- Todo cambio iniciado desde Studio afecta **un documento editorial privado**. `WorkChapter` público se actualiza únicamente en una operación **explícita de publicar versión**.
- El backend confirma snapshot y revision exactos; creación y promoción atómicas e idempotentes. Reusar `WorkChapter` e ID cuando corresponde; no cambiar URLs, likes, Marcas, followers ni orden.
- Validar propietario, moderación, `expectedDraftRevision` y `expectedPublishedRevision`, tamaño permitido, contenido no vacío y rate limit. Un `409` brinda información suficiente para reconciliar, sin sobrescribir.
- Para un capítulo ya publicado, `PublishChapter` legacy puede seguir siendo idempotente; agregar endpoint específico para promoción desde borrador editorial. Clientes antiguos conservan rutas actuales, pero **no ganan automáticamente la semántica nueva de draft**.
- Cuando un lector abre obra durante edición privada sigue viendo versión pública previa; al publicar, todas las plataformas ven misma versión al volver a consultar.
- Si Work no está publicado, se pueden preparar capítulos; la publicación a Galería sigue requiriendo Work y capítulo publicados, bajo moderación activa.
- Historial de publicaciones/instantáneas permite recuperar contenido perdido sin retroceder estado público automáticamente.

---

## 8. Módulos de planificación y universo (P0)

### 8.1 Personajes — ficha breve primero, profundidad opcional

**Campos de primer nivel:** nombre obligatorio; alias/apodo; rol en la obra (protagonista, antagonista, secundario, otro); descripción breve; foto opcional P1 (evitar storage/safety en P0); tags.

**Ficha expandible:** edad/etapa, pronombres opcionales, apariencia, personalidad, fortalezas, defectos, miedo, deseo, objetivo externo, necesidad interna, conflicto, secreto, motivación, relaciones, arco al inicio/final, voz/manera de hablar, notas libres, estado narrativo (activo/ausente/fallecido/desconocido), atributos personalizados clave/valor. No presentar ficha como formulario obligatorio de veinte campos.

**Acciones:** CRUD; vincular a escenas (IDs); buscar; filtrar por rol/tag; duplicar como plantilla privada; eliminar con confirmación y resolver enlaces huérfanos mediante IDs, no por texto literal. Mostrar fichas fijadas desde el editor. Campos textuales tienen límites validados en Go y cliente. No imponer “edad”, “género” o estructura heroica por defecto.

### 8.2 Lugares y lore

- **Lugar:** nombre, tipo, descripción, importancia, historia, atmósfera, reglas, tags, escenas relacionadas.
- **Nota de universo / lore:** título, categoría liviana (regla, facción, objeto, magia, cultura, investigación, otra), cuerpo texto, tags, enlaces a otras notas y escenas.
- **Notas rápidas:** pin temporal en panel del editor, ordenar por actualizado, asociar a capítulo opcionalmente.
- Privado por defecto, inclusivo para no fantasía: un escritor de realismo puede usar “lore” como contexto/investigación.
- No crear módulos separados para idiomas inventados, religiones, calendarios especiales, dioses, cultos y especies en P0. Usar categoría de nota y campos flexibles; añadir módulo especializado solo si hay uso comprobado.

### 8.3 Relaciones entre personajes

- Modelo de arista: `id`, `workId`, `fromCharacterId`, `toCharacterId`, `type`, `label`, `notes`, `directed`/`reciprocal`, estado, revisión. `type` sugerido: familia, amistad, romance, rivalidad, mentoría, alianza, antagonismo, otra; texto libre tiene precedencia.
- **Dos vistas del mismo dato**: lista editable completamente accesible + grafo simple. No basar la única forma de editar en arrastrar nodos.
- Los nodos son **personajes reales del Work**, no textos duplicados. Borrado de personaje limpia o invalida relaciones de forma transaccional/predictible.
- Grafo: zoom/pan sencillos, “centrar”, selección de nodo que abre ficha, filtro por relación, labels legibles; layout automático determinista; fallback lista en pantallas pequeñas/reduced-motion.
- No requieren imágenes, detección con IA, familiar trees complejos ni física compleja de nodos.

### 8.4 Planificador editorial: tablero de escenas

Una tarjeta representa una escena por escribir o ya escrita, con: título, sinopsis, propósito dramático, conflicto, desenlace, `status` (`idea`, `planned`, `draft`, `revising`, `done`), POV opcional, personajes, lugar, subtrama/tag, capítulo asociado (si lo hay) y orden de planificación.

- Vista **Lista** como alternativa accesible y rápida; vista **Tablero** por estado; arrastrar y soltar con controles mover arriba/abajo para teclado.
- Orden privado independiente del `WorkChapter.orderIndex` público. Si una tarjeta está vinculada a un capítulo, moverla cambia el plan **no la secuencia pública**. Esto debe ser evidente.
- Editar/abrir escena desde editor lateral. Crear escena no publica, ni crea capítulo real automáticamente.
- Estado “Listo” es recomendación editorial, no validación automática infalible.
- Vista sencilla de sinopsis general de obra y subtramas por etiquetas; timeline multicapas avanzado en P1.

### 8.5 Cómo soportar escritores “pantser” y “plotter”

- **Pantser**: entra y escribe; nunca aparece una lista de tareas obligatoria.
- **Plotter**: puede planificar capítulos y escenas antes de escribir el primer párrafo.
- **Serial**: puede crear borradores, recordar últimas publicaciones y ver pendientes, sin bloquear el ritmo natural.
- El producto ofrece guías/templates como sugerencias, no hace juicios literarios; templates P0 simples: “Historia libre”, “Tres actos (tarjetas sugeridas)”, “Relato breve”; no sobreescribir contenido existente al aplicarlos.

---

## 9. Progreso, metas y gamificación cuidadosa

### Medidas

- Palabras **actuales** por capítulo y obra (no sumar borradores y publicado dos veces).
- Caracteres Unicode por capítulo para validar contrato; tiempo de lectura **estimado** rotulado como estimación, no certeza.
- Sesiones de escritura con actividad real, fechas en zona horaria IANA del usuario; resúmenes diarios por obra y global opcional.
- **Palabras netas añadidas** (delta positivo/negativo) y **palabras escritas durante sesión** diferenciadas. Evitar inflar progreso al pegar párrafos o importarlos: evento “importación” no cuenta para racha, y el contador no debe ser antimanipulación policial.
- Metas por sesión/día/obra; metas voluntarias y editables, no cobran premios por publicar contenido mediocre.
- Calendario tipo GitHub: cuadrícula por semana/mes, color/intensidad por palabras persistidas o sesiones válidas; leyenda y equivalencia textual accesible.
- Racha: cantidad de **días locales consecutivos con sesión válida**, no días con apertura pasiva; normalizar cambios de zona horaria y no duplicar un día por UTC. Permitir desactivar widget, sin notificaciones de culpa.
- Animación discreta y recompensa no competitiva. No usar rachas como ranking de calidad literaria.

### Reglas anti-inflado y costo

- Registrar métricas solo tras confirmación de escritura persistida. Deduplicación idempotente por `sessionId`/`eventId`; no enviar un evento por cada tecla.
- Umbral de “día activo”: una sesión con escritura real y un mínimo configurable de caracteres originales añadidos netos o movimientos de texto guardados, con métricas de borrados anotadas, sin guardar keystrokes.
- Importaciones y publicaciones no generan falsas miles de palabras “escritas hoy”.
- Mostrar series vacías honestamente. No inventar histórico previo de Works.

---

## 10. Respaldo, versiones, importación, exportación y confianza

### Persistencia y recuperación

- Documento editorial se guarda en backend con OCC (`revision`, `expectedRevision`), acciones idempotentes y serialización de requests por documento.
- Guardado automático: conservar patrón de ahorro existente como referencia (debounce 2 s, frecuencia mínima 20 s), adaptado para documento privado; forzar flush al publicar, cambiar capítulo, exportar o salir. **No provocar cientos de escrituras por minuto.**
- Estado no sincronizado visible. Si hay problema de red, permitir continuar y **crear recuperación local de emergencia** con IndexedDB u opción más segura aprobada; aislar por UID/obra/documento, con TTL razonable y purga en logout. No afirmarlo cifrado de extremo a extremo. Explicar en ajustes que copias en este navegador pueden quedar accesibles a quienes compartan el dispositivo. Si no se implementa almacenamiento local fiable, no declarar “trabaja sin conexión”.
- No borrarlo local hasta que servidor confirme misma revisión/contenido; ante conflicto ofrecer guardar copia local exportable.
- Historial P0: snapshot manual con título opcional + checkpoints al publicar, y snapshots automáticos limitados (p.ej., 15 min de escritura modificada, máximo 30 últimas automáticas, 90 días; calibrar costos). Restaurar significa crear **nueva revisión editorial** y guardar la anterior, no reescribir la versión pública en silencio.
- Papelera de fichas/notas/escenas con restauración limitada (p.ej. 30 días), excepto política de borrado definitivo exigida por usuario/seguridad.

### Importación

- `.txt` UTF-8: normalizar line-endings, preservar saltos de párrafos, mostrar previsualización con conteo/tamaño.
- `.md`: manejar como texto sin interpretar imágenes/scripts ni links embebidos; opcional extraer encabezados solo tras confirmación; no ejecutar HTML.
- Importar a **nuevo borrador** o reemplazar borrador existente con snapshot previo y confirmación. No crear decenas de capítulos sin preview ni riesgo de duplicados.
- Límites de tamaño en bytes y caracteres en cliente/servidor; errores localizados.

### Exportación

- `.txt` y `.md` completos, con títulos y delimitadores estables; codificación UTF-8, metadata básica con consentimiento.
- `.docx` como exportación de manuscrito solo si implementada y validada realmente, separando capítulos y saltos. Si fallara librería en entorno real, `.docx` pasa a P1 **explicitando el recorte y sin botón falso**.
- Respaldo estructurado `InkDuel-obra-YYYYMMDD.json` (o ZIP con JSON + capítulos) incluye fichas, relaciones, notas, escenas, metas, fecha, `schemaVersion`; nunca tokens, IDs de terceros ni material privado de otros autores. Documentar que formato JSON es de respaldo, no necesariamente importación P0.
- Exportación **siempre disponible al autor** incluso con flag del Studio desactivado para evitar lock-in. Salida no exige premium.
- Round-trip: exportar e importar texto preserva párrafos, tildes, comillas, emojis y secuencia; comparar con fixtures. Probar obras nacidas de duelo y originales.

---

## 11. Backend/Firestore: diseño sugerido para una sola fuente de verdad

**No crear `WorkV2` paralelo.** El backend Go debe seguir siendo dueño de permisos y datos. Extender el agregado Work de forma **aditiva** con objetos privados vinculados por `workId` y `authorId`; nunca confiar en `authorId` enviado por cliente.

### Modelo conceptual (ajustar a convenciones reales del repo)

```
Work (existente, público/autor según DTO)
  ├── WorkChapter (existente, revisión pública / draft legacy)
  └── Studio [PRIVADO]
       ├── WorkStudioSettings   (goal, lastEdited, preferences, schemaVersion)
       ├── EditorialDrafts      (draftId, linkedChapterId?, basePublishedRevision?, body,
       │                        title, synopsis, status, revision, updatedAt, authorId)
       ├── Snapshots            (documentId, revision, kind, timestamp, payload)
       ├── Characters           (characterId, fields, tags, revision, deletedAt?)
       ├── Places               (placeId, fields, tags, revision, deletedAt?)
       ├── LoreNotes            (noteId, category, fields, links, revision, deletedAt?)
       ├── SceneCards           (sceneId, summary, status, plannedOrder, linkedChapterId?, ...)
       ├── Relations            (relationId, fromId, toId, type, label, directed, ...)
       └── WritingStats         (daily rollups by timezone and idempotent sessions)
```

- Nombre exacto de colecciones, anidamiento y repositorios a definir conforme a arquitectura existente. Firestore limita documento a **1 MiB**; mantener `body` y documentos grandes **exentos de indexación**; no almacenar todas las fichas ni un manuscrito entero en un único documento de Work.
- Indexar solo consultas reales `workId,authorId,updatedAt` / `workId,type,order` según Firestore. Paginación con cursores estable, tamaño predeterminado 20–50; no cargar miles de tarjetas de golpe.
- `revision` optimista por objeto, `createdAt`/`updatedAt` en servidor, `deletedAt` para soft-delete; IDs opacos validados y checks de pertenencia work-author.
- Esquema versionado y forward-compatible: opcionales con defaults para Work antiguos, sin script masivo obligatorio.
- Retención de historial y compactación explícita, sin costo ilimitado ni consultas N+1 para abrir un editor.
- Contrato de idioma y zona horaria: `language` del Work, preferencias de cuenta; reportes por día del autor calculados consistentemente.
- No exponer colecciones privadas por endpoints públicos de galería, perfil, lectura ni búsqueda.

### Endpoints orientativos — respetar estilo del proyecto

```
GET    /api/works/:workId/studio                   → overview privado
GET    /api/works/:workId/studio/drafts            → listado paginado
POST   /api/works/:workId/studio/drafts            → crear idempotente
GET    /api/works/:workId/studio/drafts/:draftId   → detalle
PATCH  /api/works/:workId/studio/drafts/:draftId   → expectedRevision OCC
DELETE /api/works/:workId/studio/drafts/:draftId   → soft-delete
POST   /api/works/:workId/studio/drafts/:id/promote → snapshot explícito a WorkChapter (OCC + idempotencia)
GET/POST/PATCH/DELETE /api/works/:workId/studio/characters[/:id]
GET/POST/PATCH/DELETE /api/works/:workId/studio/places[/:id]
GET/POST/PATCH/DELETE /api/works/:workId/studio/notes[/:id]
GET/POST/PATCH/DELETE /api/works/:workId/studio/scenes[/:id]
GET/POST/PATCH/DELETE /api/works/:workId/studio/relations[/:id]
GET/PUT   /api/works/:workId/studio/goals
GET       /api/works/:workId/studio/progress?from=&to=&tz=
GET/POST  /api/works/:workId/studio/drafts/:id/snapshots
POST      /api/works/:workId/studio/drafts/:id/restore
GET       /api/works/:workId/studio/export?format=...
```

Son **contratos propuestos**, no rutas que ya existen. Claude deberá definir DTOs estrictos, validación, error mapping y ordenar rutas parametrizadas como hace Fiber. Listados separados de cuerpo grande; “overview” no transporta todas las fichas ni todo el manuscrito.

### Autorización y seguridad

- Todos los endpoints Studio requieren Firebase Auth existente, usuario humano activo y ownership de Work. Para otro usuario responder 404 no enumerativo cuando corresponda; no confiar en query/body para `authorId`.
- Validar IDs y bounding; JSON estricto, sanitizar/controlar payload y no ejecutar Markdown/HTML arbitrario; CSP y escape de strings, prevenir XSS en fichas, etiquetas, export y preview.
- Limitar mutaciones por usuario/Work/tipo sin penalizar autosave normal; medir 429 para no bloquear uso real. Anti-abuse y backoff.
- Nunca registrar cuerpo de manuscritos, notas ni secretos en logs, analytics, crash reports, URLs o traces. Evitar que textos privados pasen por GA4.
- Datos de autores no se enviarán a un LLM ni se usarán para entrenar modelos sin consentimiento explícito y política formal. **No integrar IA en P0.**
- Respaldos/restauraciones del servidor sujetos a estrategia de disaster recovery; probar recuperación manual/export.

---

## 12. Contrato de concurrencia, consistencia y publicación

### Estados de documento

`clean | dirty | saving | saved | retrying | failed | conflict | offlineLocal`.

**Normas:**

- Una petición de escritura en vuelo por documento; coalescing de cambios; no descartar dirty edits por una respuesta vieja.
- Creación con `clientRequestId`/ID estable y payload fijado en retries para evitar duplicados, conforme al autosave actual.
- `PATCH` con revisión; si 409 conservar local y estado servidor y dar acciones claras. Restaurar siempre produce nueva revisión.
- Salir/cambiar/publish espera confirmación cuando sea posible; `beforeunload` es último recurso.
- Publish/promote selecciona `draftRevision` concreta y `basePublishedRevision`, genera resultado idempotente sin duplicar capítulos, followers, eventos ni contadores.
- No publicar texto que todavía no se guardó o que supera el tamaño soportado del lector.
- Promoción atómica que preserva `chapterId`, orden, autor, moderación, `PublishedChapterCount` y `firstPublishedAt` según reglas existentes.
- Si otra sesión publicó/modificó el capítulo, exigir reconciliación, no sobrescribir por última escritura.
- Si Studio no está disponible por flag, lectura pública y Works legacy deben seguir funcionando.

### Casos negativos que deben estar probados

1. Usuario B intenta GET/PATCH de Studio de A.
2. Otro dispositivo modifica el mismo draft entre GET y PATCH.
3. Se reintenta POST porque se perdió el ACK.
4. Se cierra la pestaña durante escritura, hay red o no.
5. Se publica con guardado pendiente.
6. Se edita una versión ya publicada mientras otra persona la lee.
7. Se modifica un capítulo semilla de duelo; el duelo sigue idéntico.
8. Se cancela una publicación y no hay escrituras públicas.
9. Se desactiva flag cuando hay borradores guardados; no hay borrado.
10. Publicación larga abierta desde Flutter legacy, con comportamiento definido y probado.
11. Se elimina/restaura personaje con relaciones y escenas referenciadas.
12. 40.000 caracteres multibyte, emoji, nuevas líneas y copy-paste enorme.
13. Se cambia idioma/zona horaria, racha no genera días fantasma.
14. Se intenta publicar capítulo sin título y contenido vacío y se respeta backend.
15. Se exporta cuando existe dirty buffer local: pedir flush o incluir explícitamente versión local exportada.

---

## 13. Compatibilidad con Flutter y rollout seguro

**No rediseñar Flutter en este encargo**, salvo los ajustes mínimos de lectura/compatibilidad que la auditoría del código demuestre imprescindibles para una publicación larga. Un usuario con app anterior instalada no debe experimentar crashes, cambios silenciosos de orden o pérdida de capacidad de leer.

1. Detectar exactamente cómo el Flutter actual consume `WorkPublicDTO`, muestra capítulos y valida/edita contenido; inspeccionar `inkduel_mobile` antes de alterar límites.
2. Los campos del backend son aditivos. `Work` y `WorkChapter` existentes permanecen válidos. No cambiar nombres JSON ni semánticas públicas.
3. Mantener `chapterId` y `workId` inmutables; no manipular `orderIndex` histórico. Los clientes viejos deben ignorar nuevos campos.
4. **Capítulo >5k:** admitir borrador privado grande, pero habilitar publicación larga solo si se demostró compatibilidad de lectura móvil, control de edición legacy y seguimiento por feature capability; en caso contrario mantener límite público y explicar claramente bloqueo al autor. No aumentar `MaxChapterContent` global sin plan de capacidades.
5. Studio detrás de flag propio **independiente** de `CONTINUE_STORIES_ENABLED`; valor predeterminado `false`, fail-closed en mutaciones experimentales. Datos existentes no dependen de flag para exportación/retirada.
6. Rollout: dev → QA staging con datos viejos → grupo interno → 5% autores web → 25% → 100% **si métricas y errores lo permiten**. No despliegue automático ni encender flag sin orden explícita.
7. Kill switch: desactivar interfaz experimental sin borrar borradores ni invalidar la lectura pública; exportación sigue accesible o hay ruta de rescate.
8. No prometer editar contenido largo en versiones antiguas de Flutter. El producto debe detectar o evitar esa incompatibilidad antes del lanzamiento.

---

## 14. Instrumentación y economía

### Eventos (sin texto)

- `studio_opened {work_id, origin_type}`
- `studio_editor_opened {work_id, document_kind, is_new}`
- `studio_first_text_saved {work_id, chapter_id?}`
- `studio_session_completed {work_id, duration_bucket, words_added_bucket}`
- `studio_draft_save_failed {work_id, reason}`
- `studio_draft_conflict {work_id, reason}`
- `studio_entity_created {work_id, entity_type}`
- `studio_plan_scene_created {work_id}`
- `studio_goal_set {work_id, goal_type}`
- `studio_exported {work_id, format, success}`
- `studio_publish_attempt {work_id, chapter_id, type}`
- `studio_publish_completed {work_id, chapter_id, type}`
- `studio_publish_failed {work_id, reason}`

Reusar taxonomía Works actual donde tenga sentido; no duplicar eventos existentes `work_chapter_published` ni romper embudo de publicación. Respeto total a consentimiento regional/filtrado de rutas sensibles del sitio. No trackear palabras literales, títulos, nombres, notas, prompts, fichas ni contenido.

### Métricas de éxito y guardrails

**Activación:** autor que abre Studio y guarda su primer cambio real; tiempo desde Work creado hasta primera escritura; % que publica segundo capítulo en 14/30 días.

**Retención:** autores que escriben en 2+ días de una semana, D7/D30 autor por cohorte (web; separado de D7 global de InkDuel). **Calidad de experiencia:** conflictos por 1000 guardados, pérdida confirmada de texto (objetivo **0**), autosave success, p95 de guardado y apertura, errores 429/5xx.

**Costos:** escrituras Firestore/autor activo/día, bytes/Work, snapshots por autor, lecturas por carga, egress, storage de historiales, costo unitario por escritor semanal activo; alarmas de consumo y límite presupuestario.

**Experimento:** comparar grupo elegible con control si tamaño de muestra suficiente; con bajo tráfico, usar cohorte cualitativa de 10–15 autores y análisis de tareas; no interpretar cambios aleatorios como causalidad. Preguntar por qué dejaron de escribir antes de construir P1.

### Monetización eventual (fuera del alcance técnico P0)

- Propuesta: escribir/publicar/exportar siempre gratis; premium opcional para estadísticas avanzadas, organización sofisticada, historial extendido, plantillas y herramientas IA con consentimiento.
- **No agregar paywalls P0**. Evitar prometer USD 4/mes o 5–7% conversión sin experimento de disposición a pagar.
- Diferenciador económico: retorno y publicación sostenidos → más contenido → más lectura → más interacción; validar cada flecha, no asumir efecto de red mágico.

---

## 15. Diseño visual, copy, internacionalización y accesibilidad

- Reutilizar tokens, componentes y estética actuales de InkDuel (`InkButton`, `InkDialog`, `InkInlineBanner`, tipografía, `cx`, colores de superficie, outline). **No introducir dashboards SaaS genéricos**.
- Primera pantalla calmada; no mostrar 12 cajas de estadísticas encima del manuscrito. Jerarquía: texto → estado de guardado → índice → notas opcionales.
- Voz ES neutro internacional, no voseo: “Escribir”, “Añadir personaje”, “Guardar versión”, “Publicar capítulo”, “Ver obra”, “Continuar escribiendo”. EN y PT-BR equivalentes idiomáticos.
- Textos de error con acción concreta: “No se pudo sincronizar. Tu texto sigue en este dispositivo. Reintentar / Exportar copia”. Solo si ese respaldo efectivamente existe.
- Roles/labels semánticos; `aria-live` con throttling para guardado; accesibilidad de grafo mediante lista; foco restaurado al cerrar modal; contraste WCAG AA; reduced motion.
- Sin onboarding de diez pasos. Máximo un mini-guía de tres consejos, descartable.
- Pruebas con 320 px, 768 px, 1280 px, zoom 200%, teclado, lector de pantalla, modo claro/oscuro si InkDuel ofrece ambos.

### Ejemplos de microcopy final

| Situación | Copy ES neutral |
|---|---|
| Obra vacía | “Cada gran historia comienza con una línea.” |
| CTA primario | “Escribir primer capítulo” |
| Ficha opcional | “Los personajes pueden esperar. Tu historia, no.” |
| Guardado remoto | “Sincronizado” |
| Enviando | “Guardando cambios…” |
| Sin red y copia local | “Guardado en este dispositivo · Pendiente de sincronizar” |
| Preview | “Así lo leerán tus lectores” |
| Publish | “Publicar esta versión” |
| Edición de publicado | “Tu versión publicada no cambiará hasta que confirmes.” |
| Racha interrumpida | “Puedes volver a escribir cuando quieras.” |
| Exportar | “Tu obra es tuya. Llévala contigo.” |

---

## 16. Rendimiento y condiciones no funcionales

- Apertura de detalle desde API existente, cargando solo los metadatos necesarios; lazy-load de grafo, historia y editor pesados. Meta provisional de tiempo percibido rápido, medir baseline real antes de fijar p95 definitivo.
- Con 50–100 capítulos, 100 fichas, 100 escenas y notas, listas deben paginar y filtrar sin caer en N+1 ni montar todas las tarjetas y cuerpos.
- No guardar todo el manuscrito en un documento Firestore; evaluar byte-size de JSON; eximir contenido largo de índices.
- Dependencias de edición/visualización revisadas por licencias, bundle size, mantenimiento, SSR y seguridad. **No traer una librería enorme para dibujar cinco nodos si basta un SVG accesible**.
- Usar selección/datos controlados para no destruir cursor o IME en React 19; si se adopta Tiptap en P1, la documentación oficial recomienda `immediatelyRender: false` en Next.js. En P0, editor texto plano existente es la base.
- No ampliar tests superfluos: pruebas de contratos/guardado/conflicto/permisos/import-export/compatibilidad, más smoke tests de UI. Respetar estrategia actual de pruebas del proyecto.
- Errores y estados de conectividad observables, sin exponer contenido del usuario.

---

## 17. Plan técnico de ejecución EN UNA SOLA CORRIDA (etapas internas)

**Orden de trabajo sugerido para Claude:**

**A. Auditoría enfocada y decisión técnica:** leer las rutas y modelos indicados, `WorkManageView`, `ChapterEditor`, `ChapterAutosave`, `worksApi`, design system, copy, flags, tests, Flutter Works. Escribir una nota compacta `docs/INKDUEL_STUDIO_IMPLEMENTATION.md` con cambios reales/compatibilidad, sin redescubrir todo InkDuel.

**B. Backend primero:** tipos de Studio, ownership, validadores, endpoints, OCC, operaciones de promoción y snapshots, filtros/paginación, índices, límites, banderas y tests cruciales. Contratos estrictos y sin mutaciones de colecciones públicas hasta publish explícito.

**C. Frontend Web:** `worksApi` extendida + hooks separados por dominio; integrar tabs en `WorkManageView` sin tirar su estado/flujo; editor compartido y recuperación, paneles y módulos; sistema responsive Ink, analytics, i18n ES/EN/PT. No reescribir toda la web ni tocar ranked/duels.

**D. Compatibilidad:** ejecutar análisis de consumidores Flutter y adaptar mínimo si es indispensable, sin cambiar UI móvil fuera de Works. Identificar client caps y límites de publicación larga; flags apagados.

**E. Validación real:** unit y emulador Firestore para autorización, OCC, idempotencia, publicación, fuga pública y recovery. Tests front para ciclo autor. Correr `go test ./...`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, según suites existentes. Si hay fallas preexistentes, registrar baseline y regresiones nuevas.

**F. QA y entrega:** PR(s) con commits lógicos, checklist de QA manual, documentación de endpoints/flags/índices/costos, migración (si aplica) y matriz de compatibilidad. No merge, no deploy, no activar flag, no cambiar datos de producción.

### Estructura de componentes orientativa (no imponer nombres existentes)

```
landing/src/components/session/studio/
  studio-shell.tsx              # navegación / layout responsive
  manuscript-sidebar.tsx        # lista de capítulos
  studio-editor.tsx             # editor/guardado privado
  studio-save-status.tsx        # confiabilidad
  story-planner.tsx             # escenas/board
  world-bible.tsx               # personajes/lugares/notas
  relationship-graph.tsx        # SVG/lista accesible
  studio-progress.tsx           # metas/calendario
  studio-publish.tsx            # preview/versiones
  studio-export.tsx             # portabilidad
landing/src/lib/session/studio/ # api, modelos, validación, autosave, analítica
backend/internal/{models,services,controllers}/studio_*.go
```

**Clean architecture práctica:** handlers HTTP finos; validación de contrato; services de dominio con invariantes; repositorios Firestore/adaptadores; modelos y serialización separados; clientes no invocan Firestore directamente. Evitar abstracciones innecesarias y complejidad de tres capas para getters triviales.

---

## 18. Criterios de aceptación (Definition of Done)

**DoD funcional — todos P0 deben estar operativos:**

- [ ] Desde `/me/works/[id]`, un autor crea/abre capítulo y escribe sin completar fichas.
- [ ] El editor persiste y recupera el mismo texto con UTF-8/emoji; no pierde cursor ni cambios cuando llega un save.
- [ ] `Guardar`, salir/volver y 409 no provocan pérdida o sobreescritura silenciosa.
- [ ] En dos pestañas/dispositivos con contenido concurrente, hay resolución explícita o modo read-only, nunca last-write-wins accidental.
- [ ] Un capítulo publicado puede tener **revisión privada** que no se ve públicamente hasta promoción explícita.
- [ ] Publicación/promoción idempotente mantiene IDs, contadores, moderación, `firstPublishedAt`, elegibilidad y links.
- [ ] Las obras anteriores (original/duelo), capítulos antiguos, Marcas, seguidores y lectura web/móvil siguen funcionando.
- [ ] Personajes, lugares, lore, notas, relaciones y escenas son **CRUD real** servidor, privados, buscables y asociables al texto.
- [ ] Grafo legible y editor de relaciones accesible sin mouse.
- [ ] Las escenas se ordenan en la **planificación** sin mentir sobre el orden público.
- [ ] Las metas, estadísticas, calendario y rachas reflejan solo actividad persistida; importación no infla escritura real.
- [ ] Existe historial con snapshots recuperables y se puede restaurar como nueva revisión.
- [ ] Importación TXT/MD y exportación TXT/MD/backup confiables; DOCX solo si pasa pruebas de fidelidad.
- [ ] No hay notas/manuscritos privados en DTOs/consultas públicos ni en analytics.
- [ ] Flag desactivado conserva versión existente; exportar material privado sigue posible.
- [ ] Todos los copys ES/EN/PT-BR; responsive, teclado, sin estados falsos de guardado.
- [ ] `go test ./...`, suite web, typecheck, lint, build; regresiones y QA manual documentados.
- [ ] PRs listos para revisión, sin merge ni despliegue automático.

**DoD de negocio:** el Studio sirve a un escritor real para escribir un segundo capítulo y seguirlo otro día; no solo se ve bonito en screenshots.

---

## 19. Riesgos y cómo gestionarlos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Borrador se convierte en edición pública inesperada | Crítica | Draft privado + promoción transaccional; pruebas con lector concurrente |
| Pérdida/sobrescritura de texto | Crítica | OCC, recuperación local, snapshots, UI honesta y tests multi-pestaña |
| Se supera límite mobile de 5k y cliente viejo falla | Alta | Caps/flag separados, QA Flutter, publicación larga no habilitada sin validación |
| Cantidad de funciones distrae de escribir | Alta | IA progresiva, editor por defecto, paneles cerrados, entrevistas |
| Costos Firestore por cada tecla/versiones | Alta | Throttling, snapshots acotados, index exemptions, seguimiento de costos |
| Privacidad de fichas y manuscritos | Crítica | Ownership Go, no read client-side Firestore, audit DTO, no analytics content |
| Divergencia capítulo vs escena, orden público | Alta | Entidades distintas, etiquetas explícitas, no reorder público P0 |
| Falsas métricas de retención por rachas | Media | Días reales, separar importación y escritura, encuestas |
| Alcance excesivo del agente | Alta | P0 obligatorio, P1/P2 aplazados, PRs por repo con hitos comprobables |
| Dependencia costosa de IA | Media | No IA en P0, consentimiento y cuotas en futuros experimentos |

---

## 20. Investigación con usuarios antes de activar a todos

- Reclutar 5 escritores nuevos, 5 autores existentes con Work abandonado y 5 autores seriales activos si los hay; idealmente ES/PT/EN.
- Pedirles: “escribe tres párrafos y añade un personaje”, “continúa una obra de hace una semana”, “revisa un capítulo publicado sin que cambie para los lectores”, “exporta todo y entiende dónde quedó”, “explica qué significan tus estados de guardado”.
- Observar sin guiar; medir tiempo al primer párrafo, comprensión de borrador vs publicado, errores de guardado y descubrimiento de exportación.
- Después de una semana preguntar si la herramienta ayudó a producir y publicar algo o solo entretuvo organizando tarjetas.

---

## 21. Registro de decisiones para no reabrir discusión durante la ejecución

| Tema | Decisión |
|---|---|
| ¿App nueva? | No, todo en Work existente |
| ¿Panel Studio obligatorio? | No, herramientas progresivas |
| ¿Reescribir editor con rich-text de inmediato? | No, contenido público legacy es plano; primero confiabilidad y versión privada |
| ¿Borrador distinto del publicado? | Sí, obligatorio |
| ¿Reordenar capítulos públicos? | No en P0; sí orden privado de tarjetas |
| ¿Diagramas de relaciones? | Sí, visualización simple + lista equivalente |
| ¿Rachas? | Sí, suaves y desactivables, solo escritura guardada |
| ¿IA que escriba novelas? | No en P0 |
| ¿Pagar para exportar? | No |
| ¿Cambio de backend? | Sí, imprescindible |
| ¿Cambio masivo de Flutter? | No; auditoría y compatibilidad mínima, capacidades antes de long-form público |
| ¿Fecha/estimación de ingresos? | No inventar; validar con cohorts |
| ¿Merge y despliegue automático? | No |
| ¿Tests? | Contratos, integridad y UX críticos; evitar redundancia |

---

## 22. Fuentes consultadas (páginas oficiales salvo indicación)

1. Campfire — apps y módulos: https://campfirewriting.com/apps
2. Campfire — precios/limitaciones de niveles: https://campfirewriting.com/es/pricing
3. Scrivener — editor, corkboard, outliner, metas y export: https://www.literatureandlatte.com/scrivener/overview
4. Novelcrafter — características de escritura, Codex y IA: https://www.novelcrafter.com/features
5. Novelcrafter — tipos de Codex: https://www.novelcrafter.com/help/docs/codex/codex-types
6. Plottr — timelines, scenes, story bibles: https://plottr.com/features/
7. Reedsy Studio — flujo completo: https://reedsy.com/studio/
8. Reedsy Studio — Boards: https://reedsy.com/studio/plan-a-book/
9. Reedsy Studio — FAQ, versiones, exportación, formatos: https://reedsy.com/studio/resources/book-writing-software-faq/
10. Dabble — funcionalidades: https://www.dabblewriter.com/features-2/dabble-features
11. Dabble — documentación: https://www.dabblewriter.com/docs
12. Firestore — cuotas y límite por documento: https://firebase.google.com/docs/firestore/quotas
13. WCAG 2.2: https://www.w3.org/TR/wcag/
14. Tiptap y Next.js, referencia para futura fase rich-text: https://tiptap.dev/docs/editor/getting-started/install/nextjs
15. InkDuel source of truth: https://github.com/InkDuel/landing ; https://github.com/InkDuel/inkduel-backend ; https://github.com/InkDuel/inkduel_mobile

---

## 23. ENCARGO MAESTRO PARA CLAUDE — COPIAR JUNTO CON ESTE PRD

**Rol:** actúa como staff/CTO full-stack y líder de producto experto en escritura de ficción, Go/Fiber/Firestore, clean architecture pragmática, Next.js/React, calidad editorial, accesibilidad y diseño InkDuel.

**Objetivo:** implementar **InkDuel Studio P0** como una única entrega integrada y funcional en la página existente de Work, en backend y web y con auditoría de compatibilidad móvil. Este documento es el contrato. Investiga el código actual antes de editar; si hay divergencia, prioriza integridad, seguridad y compatibilidad, dejando documentada la decisión concreta.

**Modo de ejecución:** usa el **máximo esfuerzo de razonamiento disponible**. **No te quedes en ideas, pseudocódigo, pantallas demo ni un plan.** Ejecuta el trabajo end-to-end en ramas de feature, con commits coherentes; verifica comportamiento en tests y, si es posible, browser real. Puedes organizar internamente etapas, pero entrega todos los P0 en la misma corrida. **No solicites aprobaciones intermedias para decisiones normales de implementación**; decide siguiendo el PRD. Si una restricción impide un P0, deja una alternativa funcional segura y un gap muy explícito, no un botón vacío.

**Reglas de oro:** no modificar duel original; Work/Chapter legacy sigue válido; no exponer borradores, fichas o notas; no escribir públicamente mientras el autor está editando; no aumentar arbitrariamente límite de publicaciones de 5k; no crear dependencias innecesarias ni llamadas de IA; no alterar Arena, ranking o reader público salvo compatibilidad imprescindible; no hacer merge ni deploy, no activar flags.

**Prioriza:** 1) integridad de datos; 2) publicación segura; 3) rapidez de escritura; 4) usabilidad; 5) capacidades de planificación; 6) progreso y extras. La sofisticación visual no justifica comprometer los primeros tres puntos.

**Entregables obligatorios:**

1. Implementación funcional web y backend con P0 de este PRD.
2. Tests significativos y comandos con resultados reales, incluyendo diferencias respecto al baseline.
3. PR web + PR backend (y PR móvil solo si indispensable), sin merge.
4. Descripción de esquemas, índices Firestore, flags/env/caps, orden de despliegue y rollback.
5. Checklist de QA manual reproducible, screenshots del editor/tablero en desktop y móvil si el entorno lo permite.
6. Lista **honesta** de funcionalidades efectivas y diferencias documentadas respecto al P0; nunca declarar completo lo que no está conectado de punta a punta.

**Criterio final:** un usuario puede abrir un Work viejo, escribir un borrador largo y seguro, planificar escenas y personajes, registrar relaciones, recuperar una versión, exportar su contenido y publicar solo cuando el sistema confirma que esa publicación es compatible, sin romper la app actual. Un producto serio para autores; no un clon superficial de Campfire.
