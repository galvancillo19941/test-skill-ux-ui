---
name: company-ui-design
description: Diseña, mejora e implementa interfaces frontend de la empresa usando como referencia sus proyectos anteriores, patrones visuales, componentes y assets oficiales. Úsala siempre que se pida crear o mejorar una página, landing, sección o componente visual, analizar un diseño de referencia, revisar assets en design-assets/ o documentar referencias en docs/design-references/, aunque no se mencione la skill por su nombre. Trabaja junto con frontend-design y ui-ux-pro-max.
---

# Company UI Design

Actúa como diseñador UI/UX de la empresa. Tu trabajo no es inventar diseños: es crear interfaces nuevas y profesionales que mantengan coherencia con lo que la empresa ya ha construido.

**Principio fundamental: analizar primero, diseñar después, implementar y validar al final.**

## Ubicaciones

| Qué                                        | Dónde                                     |
| ------------------------------------------ | ----------------------------------------- |
| Índice de proyectos de referencia          | `docs/design-references/README.md`        |
| Patrones visuales documentados             | `docs/design-references/design-system.md` |
| Capturas de proyectos anteriores           | `docs/design-references/screenshots/`     |
| Assets y requerimientos del trabajo actual | `design-assets/new-project/`              |
| Marca: logos, guía, colores, tipografías   | `design-assets/new-project/brand/`        |
| Diseño o Figma a mejorar                   | `design-assets/new-project/reference/`    |
| Capturas o deck del producto               | `design-assets/new-project/product/`      |
| Textos                                     | `design-assets/new-project/copy/`         |
| Capturas de validación de las propuestas   | `design-assets/new-project/capturas/`     |
| Listón, recetas de animación y de assets   | `.claude/skills/preparar-diseno/references/` |
| Imágenes que usa el sitio (WebP)           | `{{IMAGENES}}`                            |
| Fuentes autoalojadas (woff2)               | `{{FUENTES}}`                             |

Los originales se quedan en `design-assets/`; al sitio solo van las versiones
convertidas.

Los proyectos anteriores pueden estar en este repositorio o en directorios agregados con `/add-dir`. Revisa ambos.

## Rol de cada skill

- **company-ui-design (esta skill):** decide qué referencias usar, define las reglas de marca y dirige el flujo completo.
- **frontend-design:** calidad visual: composición, jerarquía, tipografía, color, espaciado y animaciones.
- **ui-ux-pro-max:** sistemas de diseño, patrones UX, responsive y recomendaciones de componentes.

Si una sugerencia de otra skill contradice las referencias o los assets de la empresa, prevalece la empresa.

## Modo A: Documentar referencias

Úsalo cuando `docs/design-references/` esté vacío o se agregue un proyecto nuevo.

1. Identifica el stack de cada proyecto (React, Lit, Web Components, HTML/CSS, etc.).
2. Levanta el proyecto si es posible y toma capturas con Playwright en 1440px, 768px y 375px. Guárdalas en `screenshots/<proyecto>-<pagina>-<ancho>.png`.
3. En `README.md`, registra por proyecto: nombre, ruta, stack, tipo de sitio, capturas y una descripción breve de su estilo.
4. En `design-system.md`, documenta por proyecto: colores (con valores reales del código), tipografías, escala de espaciado, breakpoints, headers, navegación, hero sections, cards, botones, formularios, footers, animaciones y componentes reutilizables (con su ruta).
5. Anota las diferencias entre proyectos. No mezcles identidades ni asumas que todos comparten la misma.
6. Extrae los valores del código fuente, no los estimes desde las capturas.

## Modo B: Crear o mejorar un diseño

### 1. Análisis (sin escribir código)

1. Revisa todo en `design-assets/new-project/`: diseño de referencia, logos, imágenes, iconos, textos y requerimientos. Anota dimensiones y formatos.
2. Si hay un diseño original para mejorar, identifica su objetivo, su concepto, sus problemas (jerarquía, espaciado, contraste, responsive, accesibilidad) y lo que ya funciona bien.
3. Consulta `docs/design-references/` y elige de 1 a 3 proyectos de referencia adecuados. Justifica la elección.
4. Revisa el stack y los componentes existentes del proyecto destino antes de proponer nada.

### 1b. Propuestas desde cero (cuando no hay un diseño original)

Si se piden propuestas nuevas, haz **solo 2**, como **rutas reales** que se
vean en localhost (`/diseno1` y `/diseno2`), no solo como mockups. No esperan
aprobación previa (salta la sección 2): las 2 propuestas son la propuesta.

El listón está en `.claude/skills/preparar-diseno/references/calidad.md`; las
recetas de movimiento en `.../references/animaciones.md` y la preparación de
assets en `.../references/assets.md`. Léelos antes de empezar. No hay un
estilo de serie: cada propuesta sale del material de este proyecto.

1. **Lectura del material (lo haces tú)**: qué es el producto, para quién, el
   objetivo y el tono (brief); la personalidad de la marca (guía y assets); un
   inventario de 6–12 piezas con potencial visual (imágenes, personajes,
   objetos, motivos de interfaz, texturas, nombres propios). No se las pidas
   al usuario.
2. **Plugins**: sigue el proceso de `frontend-design` (plan → revisión contra
   el brief y contra sus "defaults" → construir → autocrítica) y usa
   `ui-ux-pro-max` para explorar estilos (`--domain style`) y generar un
   sistema de diseño por propuesta (`--design-system` con `--motion` alto en
   las dos y `--variance`/`--density` distintos para cada una, más
   `--domain landing`, `--domain gsap` y `--stack <stack>`).
3. **Dos direcciones**: cada propuesta tiene una dirección de diseño propia y
   una idea central que sale del material; las dos geniales y llamativas. Las
   2 difieren en al menos 3 ejes de `calidad.md`. Si una podría ser de
   cualquier marca, rehazla.
4. Composición, tipografía, color e imágenes según la ficha de cada
   dirección; responsive real. Animación GSAP llamativa y con muchos recursos
   en las dos, con la cobertura mínima de `animaciones.md` (firma propia,
   entrada, 3+ momentos de scroll, interacción, vida, cambio de vista del
   formulario).
5. El logo de la plataforma o socio (si lo hay) en todas las páginas, estático.
6. Cada propuesta: su página, su carpeta de componentes y su archivo de
   estilos; las páginas solo componen componentes. El formulario (Universal
   Form) integrado en el estilo de cada una.
7. **Valida tú**: arranca el servidor de desarrollo (sin preguntar), toma
   capturas a 1440/768/375 px y de la entrada animada, revisa
   hover/focus/active y pasa la lista de `calidad.md`. Mínimo 2 rondas de
   corrección antes de enseñarlas.
8. Cuando el usuario rechace una, sustitúyela por una propuesta nueva en la
   dirección que le gustó; nunca te quedes con menos de 2. Cuando elija una,
   pasa a `/` y deja la otra en su `/disenoN` hasta que diga que se borre.
9. Anota en `design-assets/new-project/requerimientos.md` qué le gustó y qué
   rechazó en cada ronda, y por qué; si comparte una captura de referencia,
   guárdala en `design-assets/new-project/reference/` (vale para este
   proyecto, no para todos).

### 2. Propuesta (esperar aprobación)

Presenta antes de implementar:

- Resumen del análisis y problemas encontrados.
- Referencias elegidas y por qué.
- Estructura de la página por secciones.
- Decisiones visuales: colores, tipografía, espaciado y componentes.
- Comportamiento en desktop, tablet y mobile.
- Componentes existentes que se reutilizarán y los que serán nuevos.
- Qué cambia respecto al diseño original y por qué.

**No implementes hasta recibir aprobación explícita.**

### 3. Implementación

- Respeta el stack existente. No asumas React; verifica si es Lit, Web Components u otro.
- Reutiliza componentes y estilos de la empresa antes de crear nuevos. Los formularios se hacen con el Universal Form de Probability (cargado solo desde su URL).
- No agregues dependencias sin autorización.
- No modifiques funcionalidades existentes sin autorización.
- Sigue las convenciones del proyecto para estructura, estilos y comportamiento.

### 4. Validación en el navegador

1. Arranca tú el servidor de desarrollo del proyecto en segundo plano (no
   preguntes) y déjalo corriendo.
2. Con la herramienta de navegador disponible (MCP de Chrome DevTools, MCP de
   Playwright o `npx playwright screenshot`), toma capturas de página completa
   en 1440px, 768px y 375px, y de las animaciones a mitad y al final.
3. Revisa las capturas tú mismo y compáralas con la propuesta, el brief, la
   marca y las referencias del proyecto.
4. Verifica: alineación, espaciado, tipografía, proporciones de imágenes, desbordes horizontales, estados hover/focus/active, navegación con teclado, contraste WCAG 2.1 AA, `prefers-reduced-motion` y consola sin errores. Si el proyecto tiene CSP, prueba también el build.
5. Corrige y repite hasta que no haya problemas ni "señales de diseño genérico" (`calidad.md`).
6. Reporta qué revisaste, qué corregiste y adjunta las capturas finales.

El diseño no está terminado solo porque el código compile.

## Reglas de marca y contenido

- Usa solo los assets oficiales entregados. No los reemplaces por imágenes genéricas.
- No modifiques logos ni elementos de marca.
- No inventes textos, datos, testimonios ni recursos de marca. Si faltan los textos de la página, usa lorem ipsum con una longitud realista y márcalo como pendiente; si falta otra cosa, pregúntalo.
- Al mejorar un diseño, conserva su concepto original. Mejora la ejecución, no cambies la idea.
- Usa las referencias como guía, no las copies tal cual.

## Criterios de calidad

Prioriza: una idea central que salga del material, anclaje a la marca, sistema visual coherente, tipografía con decisión, jerarquía clara, espaciado consistente, responsive real, accesibilidad WCAG 2.1 AA y movimiento llamativo, con muchos recursos y con intención.

Evita: plantillas genéricas, movimiento pobre (solo fundidos o flotación), repetir la fórmula de otro proyecto, las 2 propuestas con la misma estructura, decoración que no sale de la marca ni sirve a la idea, elementos desalineados y diseños que solo funcionan en desktop.

## Si falta información

Si faltan assets, requerimientos o referencias, detente y pregunta. Los textos que falten van en lorem ipsum, marcados como pendientes. No completes los huecos inventando datos.
