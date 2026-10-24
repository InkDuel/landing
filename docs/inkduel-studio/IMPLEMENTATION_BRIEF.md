# PROMPT PARA CLAUDE CODE — IMPLEMENTAR INKDUEL STUDIO

**Configuración recomendada:** Claude Code con el mejor modelo de programación al que tengas acceso, **Extended Thinking / esfuerzo de razonamiento máximo**. Dale acceso a `InkDuel/landing` y `InkDuel/inkduel-backend`; acceso de lectura a `InkDuel/inkduel_mobile` para auditar compatibilidad (edición mínima móvil solo si es imprescindible). Adjunta el archivo **`InkDuel_Studio_PRD_v1_2026-10-24.md`** de 23 secciones; **es el contrato funcional y técnico**.

---

Quiero que **implementes InkDuel Studio de punta a punta EN UNA SOLA EJECUCIÓN** como una ampliación de la **página existente de mi Work** (`/me/works/[workId]`), no como app aparte. Es una inversión de producto: transformar Works en un entorno de escritura serio que une manuscrito, capítulos, planificación, personajes, universo, relaciones, metas, historial y publicación sin romper el ADN de InkDuel ni la lectura pública.

**Lee primero el PRD adjunto COMPLETO y verifica HEAD actual.** Usa la máxima intensidad de razonamiento disponible. Actúa como CTO/staff engineer pragmático, experta en editoriales y UX de escritura, Go/Fiber/Firestore, Next.js 16, React 19 y clean architecture. No quiero maqueta, prototipo HTML, botones de mentira, código desconectado ni un plan para otro día: quiero los **P0 realmente implementados, conectados al backend, testeados, listos para revisión**.

### Prioridades de ejecución

1. Audita código de Works, `WorkManageView`, `chapter-editor.tsx`, `chapter-autosave.ts`, DTOs, endpoints, flags, diseño y Flutter consumidor. Registra decisiones brevemente; no vuelvas a auditar toda InkDuel.
2. Implementa **persistencia editorial privada**, separación inequívoca de edición y publicación, OCC/revisiones/idempotencia, control de acceso, snapshots, manejo de errores y recuperación.
3. Integra editor y navegación en Work conservando URLs y APIs existentes; añade manuscrito con capítulos y escenas, universo (personajes, lugares, lore y notas), relaciones listadas+grafo, tablero de escenas, progreso/metas/calendario/rachas, importación/exportación, previsualización y publicación segura.
4. Mantén **texto plano canónico** en P0 para no perder formato al publicar en el reader Flutter legacy; deja rich text completo para P1. Borra cualquier UI que sugiera formato no persistido.
5. Respeta límites actuales 5.000 caracteres publicados y 100 capítulos hasta demostrar compatibilidad móvil; permite borradores editoriales largos privados, y resuelve publicación larga solo con política de capacidades y flag probado, nunca truncando texto.
6. Toda ficha/relación/nota debe ser privada; publicar solo mediante acción explícita con snapshot exacto. El duelo de origen es inmutable.
7. Usa el sistema visual InkDuel y copys ES neutro/EN/PT-BR; optimiza rendimiento, tamaño del bundle y escrituras Firestore; registra analítica sin texto de usuario.
8. Ejecuta tests relevantes y de integración Go/Firestore y web/Vitest, typecheck, lint y build; verifica flujos de QA y compatibilidad sin fingir pruebas que no ejecutaste.

### Condiciones importantes

- **Una corrida, con etapas internas si las necesitás.** Tomá decisiones normales de ingeniería sin pedirme permisos intermedios. No agrandes alcance a P1/P2 salvo dependencia de seguridad del P0.
- No destruyas rutas, Works o capítulos legacy; no dupliques motores de autosave ni construyas backend paralelo `WorkV2`.
- No edites productos ajenos (Arena/ranked, duelos, landing marketing) salvo dependencia indispensable.
- Nada de IA generativa en P0, ni costos recurrentes nuevos de modelos, ni paywalls, ni analítica con contenido.
- **No merges, no deploys, no flags en ON y no tocar producción.** Entrega PR(s) y QA detallado. Si no tenés acceso efectivo a alguno de los repos, no inventes cambios: explica el bloqueo y termina el resto que sí puedas construir.
- Si por una limitación real no podés completar algún requisito P0, proponé alternativa funcional segura, implementala y documentá el gap con transparencia; nunca entregues una demo visual como feature terminada.

### Entrega al terminar

Quiero links a los PRs por repo, commits principales, lista de P0 cumplidos y no cumplidos, contratos y estructuras agregadas, migraciones/índices/flags/caps, orden recomendado de deploy y rollback, resultados reales de tests, QA manual en escritorio/móvil, y cualquier incompatibilidad conocida con versiones instaladas.

**Definition of Done:** puedo abrir una Obra existente, escribir de forma segura, crear y vincular personajes/escenas/lugares, visualizar relaciones, recuperar texto, exportarlo, y publicar un capítulo solo cuando es compatible y explícitamente confirmado, sin que ningún borrador privado se filtre a lectores.
