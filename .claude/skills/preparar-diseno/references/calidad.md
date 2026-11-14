# Calidad: el listón de las propuestas

Una propuesta no está lista porque compile ni porque "se vea limpia". Está
lista cuando alguien del cliente diría "esto es nuestra marca" y "esto tiene
una idea", y cuando está bien ejecutada en todos los anchos.

El listón no es un estilo: es que las dos sean **geniales, muy atractivas y
llamativas**. Una propuesta editorial y una ilustrada pueden pasarlo las dos,
cada una con su lenguaje y las dos con mucho movimiento; lo que no lo pasa es
lo genérico, lo que podría ser de cualquier marca, lo que se queda quieto y lo
que nadie ha visto en el navegador. `frontend-design`
pide gastar la audacia en un sitio: cada dirección decide cuál es el suyo.

## Lo que hace buena una propuesta

1. **Una idea central.** Algo memorable que se puede decir en una frase y que
   sale del material (el producto, la marca, el público, el tono del brief):
   una composición tipográfica, una imagen tratada de una forma concreta, un
   objeto del producto, una escena, un recorrido, un sistema de color. No es
   decoración añadida al final.
2. **Anclada a la marca.** Usa los assets oficiales, los colores de la guía y
   del asset principal, y la personalidad que transmiten. Nada de imágenes
   genéricas ni efectos que la marca no tiene.
3. **Sistema visual coherente.** Tokens de color, escala tipográfica,
   espaciado, radios y sombras definidos una vez y usados con criterio; la
   dirección se reconoce en cada sección, no solo en el hero.
4. **Tipografía con decisión.** Familias elegidas por la dirección (de la
   marca o sustitutas con su personalidad), jerarquía clara y un tratamiento
   pensado para el titular. Nunca la fuente del sistema por omisión.
5. **Composición pensada.** El hero y el ritmo de la página responden a la
   dirección (centrado, asimétrico, editorial, a sangre, en rejilla, por
   capas…), con jerarquía clara y el CTA o formulario fácil de encontrar.
6. **El formulario dentro del diseño.** Con los colores y la tipografía de la
   propuesta (variables `--uf-*`), en una sección que le da su sitio; sus
   vistas de gracias y error con el mismo estilo.
7. **Movimiento llamativo y con muchos recursos** (`animaciones.md`): una
   firma propia, una entrada que combina varias familias (texto, máscaras,
   SVG, física…), scroll narrativo con momentos distintos, interacción en todo
   lo que se toca, vida después de la entrada y el formulario animado al
   cambiar de vista. Con intención: cada recurso sirve a la idea central. Sin
   movimiento, la página se ve completa.
8. **Ejecución.** Alineación, espaciado, contraste, responsive real y
   accesibilidad.

## Ejes: las 2 propuestas difieren en al menos 3

| Eje | Ejemplos de valores |
| --- | --- |
| Idea central | pieza distinta del material en cada una |
| Estilo | editorial / minimalista / tipográfico / ilustrado / fotográfico / de producto / retro / brutalista / lujo / juguetón / escena animada |
| Composición del hero | centrada / asimétrica / a sangre / collage / rejilla / objeto protagonista / texto protagonista |
| Ambiente y color | claro / oscuro / color pleno de la marca / neutro con acento / material o textura |
| Tipografía | serif editorial / sans geométrica / condensada / display expresiva / rotulada |
| Densidad y ritmo | espaciosa / compacta / secciones alternas / recorrido continuo |
| Firma de movimiento | tipografía cinética / máscaras y revelados / trazos y morph SVG / recorrido por scroll / física y partículas / Flip y layout / parallax por capas |
| Presentación del formulario | sección propia / tarjeta / panel integrado / pieza del producto |

Cambiar solo la paleta o el fondo **no** cuenta como propuesta distinta.

## Tipografía cuando falta la fuente de marca

- Pide la fuente con licencia (paso 1). Si es comercial y no llega, no la
  descargues de sitios no oficiales.
- Sustituta provisional con licencia abierta y la misma personalidad
  (estructura, peso, anchura, estilo). Nunca la fuente del sistema en
  titulares.

## Señales de diseño genérico (si aparece una, itera)

- La propuesta podría ser de cualquier marca: no hay nada que salga del
  material.
- Las 2 propuestas comparten estructura y solo cambia el color.
- Se repite una fórmula de otro proyecto (misma composición, mismos efectos)
  en vez de salir de este material.
- Fuente del sistema o tipografía sin jerarquía ni decisión.
- Decoración al azar (blobs, degradados, sombras, partículas) que no sirve a
  la idea central ni sale de la marca.
- La misma tarjeta con la misma sombra para todo.
- Movimiento pobre: solo fundidos al hacer scroll, "las cosas flotan", el
  mismo efecto repetido en todas las secciones, o no cumple la cobertura
  mínima de `animaciones.md`.
- Las 2 propuestas con la misma firma de movimiento.
- Movimiento sin intención (efectos sueltos que no cuentan la idea central)
  o que tapa el texto o el formulario.
- Nadie ha visto una captura de la página.

## Revisión antes de entregar

Con capturas a 1440, 768 y 375 px de cada propuesta:

1. **Puntúa del 1 al 5**: idea central, anclaje a la marca y al producto,
   coherencia del sistema visual, tipografía, composición, movimiento,
   integración del formulario. Si algo baja de 4, itera. Anota la puntuación
   en `requerimientos.md`.
2. **Pregúntate si es genial**: ¿la enseñarías como la mejor propuesta del
   estudio? Si no, di qué le falta (idea, impacto del hero, recursos de
   movimiento, tipografía) y súbela.
3. **Compara** con la ficha de la dirección, el brief, la guía de marca y la
   plantilla o referencias que dio el usuario (si las hay): di en qué se queda
   corta y corrígelo.
4. **Técnica**:
   - alineación, espaciado, sin desbordes horizontales en ningún ancho;
   - contraste WCAG 2.1 AA en textos (los textos grandes pueden ir a 3:1);
   - hover, focus visible y active en cada botón y enlace; teclado completo;
   - `prefers-reduced-motion`: sin animación y con todo en su sitio;
   - consola sin errores; formulario cargado (y con la CSP real si existe);
   - imágenes en WebP con `width`/`height` (sin saltos de maquetación), cada
     una idealmente < 300 KB;
   - en móvil, la composición se recompone, no se encoge sin más.
5. **Autocrítica final** (como pide `frontend-design`): quita lo que no sirva a
   la idea central.
