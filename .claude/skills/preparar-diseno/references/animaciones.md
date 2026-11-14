# Animaciones: catálogo GSAP

Las dos propuestas son **llamativas y con mucho movimiento**, siempre. Lo que
cambia de una dirección a otra es el **tipo** de movimiento, no la cantidad:
una propuesta editorial puede ser tan espectacular como una ilustrada, con
máscaras, tipografía cinética y scroll narrativo en vez de partículas.

Este archivo es un **catálogo de recursos**, no una escena. No hay una
coreografía de serie: el movimiento de cada propuesta se diseña a partir de su
idea central, combinando varias familias de este catálogo. Aplicado por esta
skill, cuenta como animación pedida.

Antes de escribir el movimiento de una propuesta, consulta también
`ui-ux-pro-max`: `search.py "<efecto o sensación>" --domain gsap` (trae código
y notas de rendimiento) y `--design-system --motion <7–10>`.
Documentación: https://gsap.com/docs/v3/

## Reglas técnicas

- **GSAP solo en el navegador**: todo dentro del helper del proyecto
  (`proceso.md`, sección 4), que crea un `gsap.context()` limitado al
  componente y un `gsap.matchMedia()` con
  `(prefers-reduced-motion: no-preference)`, y hace `revert()` al desmontar.
  Los listeners (puntero, scroll) se quitan en la limpieza que devuelve el
  componente.
- **El CSS dibuja el estado final.** Sin JavaScript o con movimiento reducido,
  la página se ve completa. Los estados iniciales ocultos se ponen con GSAP
  (`gsap.set` / `gsap.from`) dentro del `matchMedia`, nunca en el CSS. Si
  animas `clip-path`, el estado final (`inset(0% 0% 0% 0%)`, `circle(75% at
  50% 50%)`…) va en el CSS para que GSAP pueda interpolar.
- **Plugins**: desde GSAP 3.13 todos vienen en el paquete `gsap`
  (ScrollTrigger, ScrollSmoother, SplitText, ScrambleText, Text, DrawSVG,
  MorphSVG, MotionPath, Flip, Draggable, Inertia, Observer, Physics2D,
  PhysicsProps, CustomEase, CustomWiggle, CustomBounce, ScrollTo). Regístralos
  en el navegador, solo los que uses:
  ```ts
  import { gsap } from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  import { SplitText } from "gsap/SplitText";
  gsap.registerPlugin(ScrollTrigger, SplitText);
  ```
- **Propiedades baratas**: `transform` (x, y, scale, rotation, skew),
  `opacity`/`autoAlpha`, `clip-path`, variables CSS, atributos SVG. Nunca
  width/height/top/left/margin. `filter` (blur) con moderación y nunca en
  bucle en móvil.
- **CSP**: GSAP escribe estilos por CSSOM (`el.style`), que la CSP permite. Lo
  que no se permite sin `'unsafe-inline'` es el atributo `style=""` en el HTML
  (`:style` de Vue o `style={}` de React en el render del servidor): usa
  clases y atributos `data-*`.
- **El formulario nunca espera**: la página es usable desde el primer
  momento; ningún `pin` ni animación bloquea el formulario ni sus campos.

## Cómo se diseña el movimiento de una propuesta

1. **Firma de movimiento.** Un recurso protagonista que sale de la idea central
   y la identifica (texto que se recompone, máscaras que abren imágenes,
   trazos que se dibujan, formas que se transforman, objetos con física,
   un recorrido por scroll…). Las 2 propuestas tienen firmas distintas.
2. **Cobertura mínima, en las dos propuestas:**
   - **Entrada** (≤ 3 s, algo se mueve antes de 300 ms) que combina al menos
     3 recursos de familias distintas y presenta la idea central.
   - **Scroll narrativo**: al menos 3 momentos distintos entre sí a lo largo
     de la página (no el mismo fundido repetido): scrub, pin corto, parallax,
     galería horizontal, cambio de tema, contador, trazo que avanza…
   - **Interacción** en todo lo que se toca: botones, enlaces, tarjetas,
     imágenes, campos con foco, envío.
   - **Vida**: algo que sigue respirando después de la entrada (marquesina,
     deriva, bucle, reacción al puntero) sin distraer del formulario.
   - **Cambio de vista** del formulario a gracias o error con su propia
     animación.
3. **Personalidad con el easing**: una curva propia por propuesta
   (`CustomEase`, `CustomBounce`, `CustomWiggle`) en vez de usar en todo
   `power2.out`.
4. **Llamativo no es caótico**: un recurso protagonista y los demás de apoyo;
   el texto se puede leer y el CTA se encuentra en todo momento.

## Ideas por tipo de dirección

Puntos de partida para combinar y mezclar, no recetas cerradas. Cualquier
dirección puede tomar recursos de otra fila.

| Dirección | Recursos que suelen lucirse |
| --- | --- |
| Editorial / lujo | líneas que suben con máscara (A1), imágenes que se abren con `clip-path` y escala inversa (B1), scroll scrub de escala (D1), marquesina tipográfica (H1), easing lento propio |
| Tipográfica / radical | titular cinético por letras (A1), ScrambleText (A2), skew por velocidad del scroll (D4), palabras que cambian en bucle (A3), texto que rueda al pasar el puntero (G4) |
| De producto / tech | pin con el producto que gira o se recompone (D2), Flip entre estados (E1), trazos de interfaz que se dibujan (C1), contadores (A4), inclinación 3D (G3) |
| Ilustrada / juguetona | MorphSVG (C2), objetos por trayectoria (C3), física y partículas con formas de la marca (F1), objetos arrastrables (F2), `CustomBounce` |
| Fotográfica | máscaras circulares o en persiana (B1–B2), zoom por scroll (D1), imagen que sigue al cursor (G2), galería horizontal (D3) |
| Retro / brutalista | cortes duros con `steps()`, desplazamientos en rejilla con `stagger: { grid }` (E2), ScrambleText, marquesinas que aceleran con el scroll (H1) |
| Escena / mundo | capas a distinta profundidad con parallax de puntero y scroll (G1, D1), entrada orquestada por timeline, física, trayectorias |

## A. Texto

**A1. Titular por letras, palabras o líneas, con máscara**
```ts
SplitText.create(".titular", {
  type: "lines,words,chars", mask: "lines", autoSplit: true,
  onSplit: (self) => gsap.from(self.chars, {
    yPercent: 120, rotation: 6, duration: 0.9, ease: "expo.out", stagger: 0.02,
  }),
});
```
Variantes: `stagger: { from: "center" }`, `rotationX: -90` con
`transformPerspective`, palabras que entran desde lados opuestos, párrafos
por líneas (`type: "lines"`). SplitText pone `aria-label`; se revierte con el
contexto.

**A2. Texto que se descifra (ScrambleText)**
```ts
gsap.to(".dato", { duration: 1.4, scrambleText: { text: "{original}", chars: "upperCase", revealDelay: 0.4, speed: 0.4 } });
```

**A3. Palabra que cambia en bucle** (las palabras salen del archivo de
contenido): un timeline con `repeat: -1` que saca una con `yPercent: -100` y
mete la siguiente desde `yPercent: 100`, dentro de un contenedor con
`overflow: hidden`.

**A4. Contadores** (solo con cifras reales del brief)
```ts
gsap.from(".cifra", { textContent: 0, snap: { textContent: 1 }, duration: 1.6, ease: "power2.out",
  scrollTrigger: { trigger: ".cifra", start: "top 80%", once: true } });
```

## B. Máscaras y revelados

**B1. Imagen que se abre** (persiana, con escala inversa del contenido)
```ts
const tl = gsap.timeline({ scrollTrigger: { trigger: ".marco", start: "top 75%", once: true } });
tl.from(".marco", { clipPath: "inset(100% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut" })
  .from(".marco img", { scale: 1.35, duration: 1.6, ease: "expo.out" }, "<");
```

**B2. Círculo o forma que se expande**: `clipPath: "circle(0% at 50% 50%)"`
→ estado final en el CSS; o `polygon(...)` para cortes diagonales. Sirve
para pasar de una sección a otra o para presentar el hero.

**B3. Cortina de color**: un bloque del color de la marca cruza la imagen o
el titular (`scaleX` 0 → 1 con `transformOrigin` a un lado, luego al otro) y
deja el contenido al descubierto.

## C. SVG

**C1. Trazos que se dibujan (DrawSVG)**: subrayados, flechas, firmas, líneas
de interfaz, contornos de la marca.
```ts
gsap.from(".trazo", { drawSVG: "0%", duration: 1.2, ease: "power2.inOut", stagger: 0.12 });
```

**C2. Formas que se transforman (MorphSVG)**: una forma de la marca que se
convierte en otra, un icono que cambia de estado, un fondo orgánico.
```ts
gsap.to("#forma-a", { morphSVG: "#forma-b", duration: 1.2, ease: "power2.inOut", repeat: -1, yoyo: true });
```

**C3. Recorridos (MotionPath)**: un objeto que recorre la página siguiendo
una ruta, ligado al scroll con `scrub` o en la entrada.
```ts
gsap.to(".viajero", { motionPath: { path: "#ruta", align: "#ruta", alignOrigin: [0.5, 0.5], autoRotate: true },
  ease: "none", scrollTrigger: { trigger: ".recorrido", start: "top center", end: "bottom center", scrub: 1 } });
```

## D. Scroll (ScrollTrigger)

**D1. Escenas con scrub**: un timeline ligado al scroll (escala, giro,
desplazamiento de capas a distintas velocidades).
```ts
const tl = gsap.timeline({ scrollTrigger: { trigger: ".escena", start: "top top", end: "+=120%", scrub: 1, pin: true } });
tl.to(".protagonista", { scale: 2.2, rotation: 8 }).to(".texto-lateral", { xPercent: -40 }, 0);
```
Pins cortos (≤ 150 % de la altura) y nunca en la sección del formulario.

**D2. Producto que se recompone**: dentro de un pin, piezas o capturas que se
separan, giran y vuelven a su sitio en pasos del timeline.

**D3. Galería horizontal**
```ts
const pista = root.querySelector<HTMLElement>(".pista")!;
const distancia = () => pista.scrollWidth - window.innerWidth;
gsap.to(pista, { x: () => -distancia(), ease: "none",
  scrollTrigger: { trigger: ".galeria", pin: true, scrub: 1, end: () => `+=${distancia()}`, invalidateOnRefresh: true } });
```
En móvil puede pasar a carrusel vertical con `gsap.matchMedia()`.

**D4. Inclinación por velocidad**
```ts
const skew = gsap.quickTo(".inclina", "skewY", { duration: 0.4, ease: "power3" });
ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -300)) });
ScrollTrigger.addEventListener("scrollEnd", () => skew(0));
```

**D5. Cambio de tema por sección**: cada sección lleva `data-fondo` y
`data-tinta` y GSAP anima las variables CSS del contenedor al entrar.
```ts
gsap.utils.toArray<HTMLElement>("[data-fondo]").forEach((sec) => ScrollTrigger.create({
  trigger: sec, start: "top 50%", end: "bottom 50%",
  onToggle: (s) => s.isActive && gsap.to(root, { "--fondo": sec.dataset.fondo, "--tinta": sec.dataset.tinta, duration: 0.6 }),
}));
```

**D6. Revelados en lote** (para listas y tarjetas, combinados con otros
recursos, nunca como único efecto de la página)
```ts
ScrollTrigger.batch(".revela", { start: "top 85%", once: true,
  onEnter: (b) => gsap.from(b, { autoAlpha: 0, y: 60, rotation: 2, stagger: 0.1, duration: 0.8, ease: "expo.out" }) });
```

## E. Layout

**E1. Flip**: transición entre dos estados del layout (rejilla → detalle,
filtro de tarjetas, pestañas, el formulario que se abre desde un botón).
```ts
const estado = Flip.getState(".tarjeta");
contenedor.classList.toggle("abierto");
Flip.from(estado, { duration: 0.8, ease: "power3.inOut", absolute: true, stagger: 0.04 });
```

**E2. Rejillas con stagger**: `stagger: { grid: "auto", from: "center",
amount: 0.8 }` para mosaicos de imágenes, iconos o letras.

## F. Física

**F1. Partículas con formas de la marca** (las formas y colores salen del
archivo de datos; ~40 en escritorio, ~16 en móvil)
```ts
function estallido(selector: string) {
  const tl = gsap.timeline();
  gsap.utils.toArray<HTMLElement>(selector).forEach((p) => tl.fromTo(p,
    { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: gsap.utils.random(0.6, 1.2) },
    { physics2D: { velocity: gsap.utils.random(250, 650), angle: gsap.utils.random(200, 340), gravity: 700 },
      rotation: gsap.utils.random(-360, 360), duration: gsap.utils.random(1.2, 2), ease: "none" }, 0));
  return tl;
}
```

**F2. Objetos arrastrables con inercia** (Draggable + Inertia), con límites y
sin bloquear el scroll en táctil.
```ts
Draggable.create(".pieza", { bounds: ".zona", inertia: true,
  onPress() { gsap.to(this.target, { scale: 1.1, duration: 0.2 }); },
  onRelease() { gsap.to(this.target, { scale: 1, duration: 0.3 }); } });
```

## G. Interacción

Con puntero fino (`(pointer: fine)` en `gsap.matchMedia`) para lo que sigue al
cursor; en táctil, el equivalente al tocar o al hacer scroll.

**G1. Parallax con el puntero**: cada capa a su profundidad con
`gsap.quickTo(capa, "x"/"y")`, en envoltorios distintos de los que tienen
otro movimiento, para que no peleen por `x`/`y`.

**G2. Cursor propio o imagen que sigue al cursor**
```ts
const x = gsap.quickTo(".sigue", "x", { duration: 0.35, ease: "power3" });
const y = gsap.quickTo(".sigue", "y", { duration: 0.35, ease: "power3" });
const mover = (e: PointerEvent) => { x(e.clientX); y(e.clientY); };
window.addEventListener("pointermove", mover);
return () => window.removeEventListener("pointermove", mover);
```

**G3. Inclinación 3D** de tarjetas o imágenes: `transformPerspective` y
`quickTo` de `rotationX`/`rotationY` según la posición del puntero; vuelta a 0
al salir.

**G4. Texto que rueda**: el botón o enlace lleva su texto dos veces (en el
HTML, una oculta a lectores de pantalla); al pasar el puntero o al enfocar, las
dos suben `yPercent: -100`.

**G5. Botón magnético**: `quickTo` de `x`/`y` hacia el puntero dentro de un
radio, vuelta a 0 al salir; con un pequeño `scale` al pulsar.

**G6. Campos y foco**: la etiqueta, el borde o un trazo reaccionan al foco de
cada campo del formulario (si el formulario expone sus elementos).

## H. Vida (bucles)

**H1. Marquesina** de palabras, logos o imágenes (contenido duplicado en el
HTML), que acelera o invierte con la velocidad del scroll:
```ts
const loop = gsap.to(".marquesina-pista", { xPercent: -50, ease: "none", duration: 20, repeat: -1 });
ScrollTrigger.create({ onUpdate: (s) => gsap.to(loop, { timeScale: s.direction * gsap.utils.clamp(1, 4, Math.abs(s.getVelocity()) / 400), duration: 0.3, overwrite: true }) });
```

**H2. Deriva y respiración**: luces, formas o imágenes que derivan
(`sine.inOut`, `yoyo`, `repeat: -1`, duraciones aleatorias de 3–8 s) o
tiemblan con `CustomWiggle` al interactuar.

## I. Entrada orquestada (timeline)

La entrada es un timeline que combina familias. Esquema (los selectores y
recursos dependen de la dirección):
```ts
const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1 } });
tl.add(/* B2: el hero se abre */)
  .add(/* A1: el titular se compone */, "-=0.5")
  .add(/* C1 o C2: trazo o forma de la marca */, "<0.2")
  .add(/* F1, E2 o G1: lo que da vida a la composición */, "-=0.4")
  .from(".cta", { autoAlpha: 0, y: 20, duration: 0.5 }, "-=0.6");
```
Al terminar, enlaza con la vida (H) y el parallax (G1).

## J. Cambio de vista del formulario

Al enviarse, el formulario sale con la firma de la propuesta (máscara,
Flip, morph…) y la vista de gracias entra en su lugar, con el foco en su
título; si encaja, una celebración breve con los recursos de la propuesta. La
vista de error, con el mismo lenguaje y sin celebración.

## Rendimiento y móvil

- 60 fps: propiedades baratas, `quickTo` para lo que sigue al puntero,
  `will-change: transform` solo en lo que se mueve mucho.
- En móvil (`gsap.matchMedia`): menos partículas, pins más cortos o
  sustituidos, sin efectos de cursor; la firma de movimiento se mantiene.
- `ScrollTrigger.refresh()` tras cargar fuentes e imágenes si cambian alturas.

## Comprobar en el navegador

- Capturas de la entrada a mitad y al final, y de cada momento de scroll
  (o inspecciona el progreso de los timelines con un script).
- Consola sin errores ni avisos de GSAP ("target not found").
- Con `prefers-reduced-motion: reduce` (emúlalo) la página está completa.
- En móvil, nada se sale del ancho y el scroll no se atasca.
