# Proceso de diseño

El proceso, paso a paso, para llevar un proyecto de cero a una landing final
aprobada. Sirve para cualquier proyecto: el aspecto de cada propuesta sale de
su material, no de este documento.

## 1. Preparación

1. Plugins `frontend-design` y `ui-ux-pro-max` instalados solo en el proyecto
   **y usados**: el primero dirige el proceso de diseño (plan → revisión contra
   el brief → construcción → autocrítica con capturas); el segundo propone
   estilos y genera el sistema de diseño de cada propuesta y los presets de
   animación.
2. Skill `company-ui-design` en `.claude/skills/`: analizar, proponer,
   implementar y validar con capturas a 1440/768/375 px.
3. `design-assets/new-project/` con `requerimientos.md` y los assets
   originales: marca (logos, guía, colores, tipografías), referencias,
   capturas o presentación del producto, y `capturas/` para la validación.
4. `docs/design-references/` (README, design-system, screenshots) para
   documentar los proyectos anteriores de la empresa.
5. Reglas en `CLAUDE.md`: solo WebP, solo GSAP (instalado como dependencia,
   nunca por CDN), un componente por archivo, hacer solo lo pedido, la skill
   arranca el servidor para validar.
6. Fuentes de la guía de marca autoalojadas en woff2 si el sitio no permite
   terceros.
7. Formulario con el Universal Form de Probability, cargado solo desde su URL
   (`universal-form.md`).

## 2. Assets: de dónde salen y adónde van

Detalle y comandos en `assets.md`.

- Los originales siempre en `design-assets/new-project/…`; al sitio solo la
  versión WebP (`-quality 85` en fotos y capturas, `-lossless 1` en logos y
  gráficos planos con transparencia), recortada y al tamaño en que se ve.
- Logos oficiales: del archivo oficial, con el color exacto del archivo. Nunca
  redibujarlos ni cambiarlos.
- Recortes (personajes, objetos, emblemas) y SVG dibujados a partir del
  producto, solo cuando la dirección los usa; provisionales hasta tener los
  originales.
- Paleta de la guía más la del asset principal.
- Las listas de elementos que se repiten (imágenes, tarjetas, colores,
  partículas) viven en un archivo de datos que los componentes recorren.
- Si falta un asset (logo, fuente), se pregunta; no se inventa. Los textos que
  el brief no trae van en lorem ipsum, con longitud realista, en el archivo de
  contenido (no en el código) y marcados como pendientes.

## 3. Rondas de propuestas

1. **Primera ronda** — Solo 2 propuestas, cada una como ruta real
   (`/diseno1` y `/diseno2`) que se ve en localhost. Cada una nace de:
   lectura del material → estilos y sistema visual con los plugins → dirección
   con una idea central → construcción → validación con capturas
   (`calidad.md`).
2. **Subir el nivel** — Si una propuesta se ve genérica, suele ser porque no
   sale del material (podría ser de cualquier marca), porque las 2 comparten
   estructura, por tipografía sin decisión, por decoración al azar o por
   movimiento pobre. Se arregla volviendo al material y a los plugins, y
   diseñando el movimiento con el catálogo de `animaciones.md` (firma propia,
   varias familias combinadas), no pegando efectos sueltos. Se
   comprueba **antes** de enseñar nada, con las señales de `calidad.md`.
3. **Anclar a la marca** — Cada dirección sale de lo que la marca y el
   producto son. Se descarta lo que no tiene que ver aunque se vea bien.
4. **Elegir y depurar** — El usuario elige una; se ajusta según lo que pida.
5. **Mezclar** — Si pide combinar propuestas (la base de una con piezas de
   otra), se hace como propuesta nueva. La elegida pasa a `/` y la anterior
   queda en una ruta `/disenoN` hasta que se diga que se borre.

Reglas de las rondas:

- Siempre 2 propuestas por ronda, como rutas reales. Cuando rechaza una, se
  sustituye por una nueva en la dirección que gustó; nunca se deja con menos
  de 2.
- Las 2 difieren en al menos 3 ejes (`calidad.md`); cambiar el color no cuenta.
- Lo que el usuario pida en un proyecto (una referencia, un estilo, un
  rechazo) vale para ese proyecto: se anota en su `requerimientos.md` y sus
  referencias en `design-assets/new-project/reference/`, nunca dentro de la
  skill.
- No duplicar la misma idea dentro de una página.
- La skill arranca el servidor, prueba las animaciones en el navegador y
  revisa hover, focus y active de cada botón y enlace antes de enseñar nada.
- Logo de la plataforma o socio (si lo hay) en todas las páginas, estático.

## 4. Patrón técnico de animación (adaptar al stack)

Un helper de animación por proyecto que:

- Corre solo en el navegador, al montar el componente (seguro con
  prerender/SSR).
- Registra los plugins de GSAP que se usen (ScrollTrigger, SplitText,
  MotionPath, DrawSVG, Physics2D…) en el navegador.
- Crea un `gsap.context(…, root)` limitado al componente y, dentro,
  `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", …)`.
- Deja que el componente devuelva una limpieza (listeners); al desmontarse hace
  `revert()` de todo.

El catálogo (texto, máscaras, SVG, scroll, layout, física, interacción,
bucles) y la cobertura mínima de movimiento por propuesta están en
`animaciones.md`; cada propuesta combina varias familias según su dirección.

Sin movimiento, la página se ve completa y en su sitio (el estado final es el
del CSS).

## 5. Estructura del código

- Una carpeta de componentes y un archivo de estilos por propuesta, importados
  desde un archivo de tema común (tokens, fuentes).
- Páginas que solo componen componentes; las rutas `/disenoN` fuera del
  sitemap.
- Textos en un archivo de contenido; el código solo cambia para cambiar
  comportamiento.
- Las vistas de gracias y de error usan los mismos elementos del diseño: el
  formulario se va y la vista nueva toma su lugar.

## 6. Validación (siempre, antes de entregar)

1. La skill arranca el servidor de desarrollo en segundo plano y lo deja
   corriendo.
2. Capturas de página completa a 1440, 768 y 375 px de cada propuesta, más la
   entrada animada a mitad y al final, en `design-assets/new-project/capturas/`.
3. Revisión con `calidad.md` (puntuación, comparación con la ficha, el brief y
   la marca, técnica). Si el proyecto tiene CSP, se prueba también el build.
4. Mínimo 2 rondas de captura → autocrítica → cambios.
