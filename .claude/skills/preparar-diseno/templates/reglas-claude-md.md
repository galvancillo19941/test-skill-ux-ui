<!--
Bloques para CLAUDE.md. Copia solo los de las reglas que el usuario eligió y
cambia <imagenes>, <fuentes>, <gestor> y <dev> (comando del servidor de
desarrollo) por los del proyecto.
-->

## Diseño

- Para crear o mejorar páginas usa la skill `company-ui-design` y **usa**
  `frontend-design` (su proceso de plan → revisión → construcción →
  autocrítica) y `ui-ux-pro-max` (sistema de diseño y presets GSAP). Assets y
  requerimientos en `design-assets/new-project/`; referencias en
  `docs/design-references/`; listón, recetas de animación y de assets en
  `.claude/skills/preparar-diseno/references/`.
- **Haz solo lo que se pide.** Nada de efectos, secciones o "mejoras" extra;
  sugiérelas en vez de hacerlas.
- **Componentes:** uno por archivo; las páginas solo componen componentes.
- Para validar propuestas de diseño, arranca tú el servidor de desarrollo
  (`<dev>`) en segundo plano, sin preguntar, y déjalo corriendo. Fuera de eso,
  no arranques servidores de larga duración sin preguntar.

## Propuestas de diseño: rutas reales

- Solo 2 propuestas por ronda, cada una como ruta visible en localhost
  (`/diseno1` y `/diseno2`), con su página, su carpeta de componentes y su
  archivo de estilos.
- Las rutas `/disenoN` no van al sitemap y se borran cuando se elige la final.
- Cada propuesta tiene una dirección de diseño propia, con una idea central
  sacada de la marca y del producto (sin estilo de serie); las 2 difieren en
  al menos 3 ejes (estilo, composición, ambiente, tipografía, movimiento,
  formulario).
- No se enseña nada sin capturas a 1440/768/375 px revisadas: hover, focus,
  active, animaciones y la lista de "señales de diseño genérico".

## Imágenes: solo WebP

- Toda imagen que usa el sitio es un `.webp` en `<imagenes>` (o un `.svg`
  dibujado para el sitio). Convierte cualquier PNG/JPG antes de usarlo,
  recortado y al tamaño en que se ve; nunca publiques el original.
- Conversión con ffmpeg (trae libwebp):
  `ffmpeg -i input.png -c:v libwebp -quality 85 output.webp`
  (usa `-lossless 1` para logos y gráficos planos con transparencia).
- Los originales se quedan en `design-assets/`, no en `<imagenes>`.

## Animaciones: solo GSAP

- Toda animación se hace con [GSAP](https://gsap.com/docs/v3/): nada de
  `@keyframes`/transiciones CSS, Web Animations API ni otras librerías.
- Se instala con el gestor del proyecto (`<gestor> add gsap`) para que vaya en
  los assets del sitio: nunca desde un CDN.
- Anima solo lo que se pidió, como se pidió: sin efectos, duraciones, easings
  ni elementos de tu cosecha. En las propuestas de diseño, las recetas de
  `.claude/skills/preparar-diseno/references/animaciones.md` cuentan como
  pedidas (todo su catálogo: texto, máscaras, SVG, scroll, layout, física,
  interacción y bucles), con su cobertura mínima en cada propuesta.
- Plugins de GSAP (ScrollTrigger, SplitText, ScrambleText, DrawSVG, MorphSVG,
  MotionPath, Flip, Draggable, Physics2D, CustomEase…)
  desde el paquete `gsap` (3.13+), registrados solo en el navegador.
- GSAP solo en el navegador: crea los tweens al montar el componente dentro de
  un `gsap.context()` limitado al componente, con `gsap.matchMedia()` para
  respetar `prefers-reduced-motion`, y haz `revert()` al desmontarlo.

## Fuentes y terceros

- Fuentes autoalojadas (woff2) en `<fuentes>`; nada de Google Fonts ni otros
  CDN. Sin scripts, fuentes ni trackers de terceros salvo los que se aprueben.

## Textos

- Los textos salen del brief y viven en el archivo de contenido, no en los
  componentes. Los que falten van en lorem ipsum, con longitud realista,
  marcados como pendientes. Nunca inventes datos que parezcan reales.

## Formularios: Universal Form de Probability

- Se carga solo desde
  `https://universal-form.onprobability.com/v1/dist/index.js` en un
  `<script type="module">` en el `<head>`: nunca por npm, importado ni copiado
  al repo. Siempre con `env` (`test` mientras se construye, `prod` en vivo).
- Documentación: https://universal-form.onprobability.com/
