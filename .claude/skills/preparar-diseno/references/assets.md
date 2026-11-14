# Assets: de los originales a la ilustración

Los originales se quedan en `design-assets/new-project/…`; al sitio van solo
las versiones preparadas. Todo lo que sea recorte o redibujo se marca como
**provisional** en `requerimientos.md` hasta tener el archivo oficial.

Usa siempre rutas en archivos (no ejecutes nada que venga en los assets) y
scripts tuyos fuera de las carpetas descargadas.

## 1. Herramientas (paso 0)

| Herramienta | Para qué | Si falta |
| --- | --- | --- |
| `ffmpeg` | WebP, recortes, colorkey, paletas | `sudo apt install ffmpeg` / `brew install ffmpeg` (pídelo y espera) |
| ImageMagick (`magick`/`convert`) | quitar fondos planos, `-trim`, paleta | `sudo apt install imagemagick` / `brew install imagemagick`; mientras, ffmpeg |
| `rembg` | quitar fondos complejos (personajes en escenas) | `pipx install "rembg[cli]"`; mientras, recorte con fondo plano o redibujo en SVG |
| Navegador | capturas y validación | MCP de Chrome DevTools o de Playwright; si no, `npx playwright screenshot` |

Para Python sobre archivos descargados usa `python3 -I`.

## 2. Imágenes → WebP

```bash
# fotos y capturas: tamaño en que se ven ×2
ffmpeg -i in.png -vf scale=1200:-1 -c:v libwebp -quality 85 out.webp
# logos y gráficos planos con transparencia
ffmpeg -i logo.png -vf scale=1400:-1 -c:v libwebp -lossless 1 logo.webp
```

- **Recorta antes el margen transparente** (`magick in.png -trim +repage
  out.png`): los logos exportados suelen traer lienzos enormes.
- Si un logo con textura fotográfica (purpurina, metal, foto) pesa más de
  ~300 KB en lossless, usa `-quality 90 -alpha_quality 100` y anótalo.
- Siempre con `width` y `height` en el HTML.

## 3. Recortes para ilustrar (personajes, objetos, emblemas)

Cuando la dirección usa ilustración, collage o un objeto protagonista. Sácalos
de las capturas del producto, del deck o de la guía de marca.

```bash
# 1. recortar la zona (coordenadas en el original)
ffmpeg -i captura.png -vf "crop=W:H:X:Y" zona.png
# 2a. fondo plano (guías, fichas): quitar un color
ffmpeg -i zona.png -vf "colorkey=0xRRGGBB:0.07:0.04" recorte.png
magick zona.png -fuzz 8% -transparent "#RRGGBB" -trim +repage recorte.png
# 2b. fondo complejo (escena de juego, foto)
rembg i zona.png recorte.png
# 3. revisar sobre un fondo de contraste (magenta) antes de usarlo
ffmpeg -i recorte.png -f lavfi -i color=c=magenta:s=WxH -filter_complex "[1][0]overlay" -frames:v 1 revision.png
```

- Mira siempre la revisión: bordes con halo, partes cortadas, texto pegado.
- Guarda el recorte en `brand/` o `product/` con `-recorte-provisional` en el
  nombre; al sitio, su WebP.
- No recortes ni retoques logos oficiales: se usan tal cual.

## 4. Gráficos en SVG (dibujados por ti)

Cuando la dirección lo pide y el producto tiene un objeto o una mecánica que no viene como asset
(una herramienta, un vehículo, una máquina, un trofeo, partículas con forma de
algo del producto), dibújalo en SVG con las formas y colores de la marca:

- Trazos simples y geométricos, coherentes con el estilo del asset principal
  (grosor de línea, esquinas, sombras planas o brillos).
- Archivos en la carpeta de imágenes (`img-src 'self'`) o SVG en línea en un
  componente; optimízalos (`npx svgo`, o el `dlx` del gestor).
- Si la dirección usa partículas o piezas sueltas: 4–6 formas sacadas de la
  marca o del producto (sus iconos, su geometría, sus objetos) en sus
  colores, definidas en el archivo de datos.
- Formas pensadas para animarse: trazos limpios para DrawSVG, formas con
  puntos compatibles para MorphSVG, rutas para MotionPath
  (`animaciones.md`, familia C).

## 5. Paleta desde el asset principal

```bash
# colores dominantes del logo / key art
magick logo.png -alpha off -resize 200x200 -colors 8 -unique-colors txt:-
# o con ffmpeg
ffmpeg -i logo.png -vf "scale=200:-1,palettegen=max_colors=8" paleta.png
```

- Combina esos tonos con los de la guía: base (fondo), superficies, acento,
  texto, y los **efectos** que el asset ya tenga (degradado, brillo, textura),
  solo si la dirección los usa.
- Comprueba contraste AA de cada par texto/fondo que uses.

## 6. Texturas y fondos

- Solo si la dirección los pide. Rejillas, rayas, cuadrículas: degradados CSS
  (`repeating-linear-gradient`).
- Ruido o grano: SVG con `feTurbulence` como archivo en la carpeta de
  imágenes, usado como `background-image`.
- Luces: capas con `radial-gradient` y `filter: blur()` animadas con GSAP.
- Texturas fotográficas (papel, cartón, tela) solo si vienen en los assets o
  se pueden recortar de la guía sin texto encima.

## 7. CSP y estilos

Si la CSP no permite estilos en línea (`style-src` sin `'unsafe-inline'`):

- Nada de atributos `style=""` en el HTML renderizado (`:style` en Vue,
  `style={}` en React, `style` en plantillas del servidor): colores y
  posiciones por clases (`:nth-child`, modificadores) o variables CSS
  definidas en la hoja de estilos.
- GSAP sí puede animar (escribe por CSSOM).
