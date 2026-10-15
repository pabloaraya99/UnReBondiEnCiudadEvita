# RUTA DE ASSETS — TITLE SCREEN "UN RE BONDI EN CIUDAD EVITA"

Guía completa de assets para el title screen: fondo con parallax en capas,
título con movimiento, y elementos extra a diseñar. Todo lo marcado con ✅ ya
existe en el repo; lo demás es la lista de diseño.

---

## 1. FONDO EN CAPAS (PARALLAX)

La idea: el fondo se mueve en capas a distintas velocidades (efecto profundidad),
como los stages de Smash / juegos de pelea. Cuanto más cerca, más rápido se mueve.

### Estructura de capas (de atrás hacia adelante):

| Capa | Archivo | Contenido | Movimiento | Estado |
|------|---------|-----------|------------|--------|
| 0 | `parallax/capa-0-cielo.svg` | Cielo con degradado celeste | Fijo (no se mueve) | ✅ Listo |
| 1 | `parallax/capa-1-nubes.svg` | 5 nubes blancas | Deriva lenta → derecha (loop, ~60s) | ✅ Listo |
| 2 | `parallax/capa-2-pared.svg` | Paredón de ladrillo con grietas | Desplazamiento lento (~0.2x) | ✅ Listo |
| 3 | `parallax/capa-3-grafitis.svg` | Grafitis: tags magenta/turquesa/amarillo, hoja, "EVITA" | Un poco más rápido (~0.35x) | ✅ Listo |
| 4 | `parallax/capa-4-suelo.svg` | Pasto + arbustos + sombra | Rápido (~0.6x) | ✅ Listo |

**Todas las capas son SVG 1600×900 con transparencia** (excepto el cielo que es el fondo).
Se apilan con CSS (`position: absolute; inset: 0`) y cada una se anima con su propia
velocidad (`@keyframes` con `translateX` en loop).

### Capas NUEVAS a diseñar (para darle más vida al barrio):

| Capa | Nombre sugerido | Contenido | Dónde va |
|------|-----------------|-----------|----------|
| 1.5 | `capa-1b-silueta-barrio.svg` | Silueta oscura de casas, templo y antenas al fondo (entre nubes y pared) | Entre capa 1 y 2 |
| 3.5 | `capa-3b-postes-cables.svg` | Postes de luz + cables colgando del tendido eléctrico (muy barrio) | Entre capa 3 y 4 |
| 5 | `capa-5-bondi-56.svg` | 🚌 **EL BONDI 56 pasando cada tanto** (el ícono del juego): aparece de un lado, cruza, se va | Frente, con loop largo (~20s) |
| fx | `fx-pajaros.svg` | 2-3 pájaros en V cruzando el cielo | Sobre capa 1 |
| fx | `fx-hojas.svg` | Hojas verdes cayendo (ya existe en CSS como `.menu-leaf`, se puede mejorar con diseño) | Frente |

**Tip para diseñar el bondi**: usar como referencia el colectivo verde/blanco que
aparece en los splash arts de Kenai y Faxo (línea 56, con "bondi" arriba del parabrisas).

---

## 2. TÍTULO CON MOVIMIENTO

### Assets actuales:
- `titulo-logo.svg` — título completo estático (UN RE BONDI + nube + EN CIUDAD EVITA)
- En el juego actual el título se arma con CSS (fuentes Bungee + Rubik Spray Paint)
  y la nube de pelea es un SVG inline animado.

### Animaciones planeadas para el título:

| Animación | Qué hace | Asset necesario |
|-----------|----------|-----------------|
| **Bob flotante** | El título sube y baja suave (ya existe, mejorar easing) | CSS solamente |
| **Ola de letras** | Cada letra rebota con delay (U-N-R-E-B-O-N-D-I) | **Separar el título por letras** (`titulo-letras/`) |
| **Sombra pulsante** | La sombra magenta late detrás del verde | CSS solamente |
| **Guantes que salen** | Los guantes de la nube aparecen con pop escalonado | Ya animado en CSS (`glovePop`), mejorar |
| **Destellos random** | Estrellitas que titilan en posiciones variables | CSS con delays aleatorios |
| **"Wobble" grafiti** | Micro-rotación constante (±0.4°) como si estuviera recién pintado | CSS solamente |

### Asset a diseñar para la ola de letras:
- **`titulo-letras/`**: cada letra del título como SVG/PNG separado
  (U, N, R, E, B, O, N, D, I + E-N-C-I-U-D-A-D-E-V-I-T-A abajo)
  → así se animan individualmente con delays (efecto "cartel de pelea").
  Alternativa más simple: mantener el texto HTML actual y animar cada `<span>`
  por letra (no requiere assets nuevos, solo JS/CSS).

---

## 3. ELEMENTOS EXTRA SUGERIDOS (para diseñar después)

| Asset | Descripción | Prioridad |
|-------|-------------|-----------|
| **El Bondi 56** | Colectivo verde/blanco que cruza el fondo cada ~20s | ⭐ Alta (ícono del juego) |
| **Silueta del barrio** | Casas bajas, templo, antenas en el horizonte | Alta (da profundidad) |
| **Postes y cables** | Tendido eléctrico colgando (muy Ciudad Evita) | Media |
| **Humo/partículas** | Humito verde subiendo desde atrás de la pared (guiño al lore) | Media |
| **Personajes de fondo** | Mini siluetas de los 4 champs asomando detrás del paredón | Baja (ya están en el VS del centro) |
| **Perro del barrio** | Un perrito que pasa caminando cada tanto (easter egg) | Baja (cariño al barrio) |

---

## 4. FORMATOS Y ESPECIFICACIONES

- **Fondo/capas**: SVG (escala limpio) o PNG 1920×1080 con transparencia
- **El bondi**: SVG o PNG 400×200 con transparencia
- **Letras**: SVG individuales (si se separan) — mismo estilo del titulo-logo.svg
- **Colores del juego** (mantener paleta):
  - Verde `#3FA34D` / `#2E8B3A` / `#4CC458`
  - Amarillo `#F2C94C`
  - Magenta `#E5449D`
  - Turquesa `#2DD4BF`
  - Negro cómic `#14161a`
  - Crema `#f4f1e8`

---

## 5. ORDEN DE TRABAJO SUGERIDO

1. ✅ Separar el fondo actual en capas (hecho — carpeta `parallax/`)
2. Implementar el parallax en CSS (cada capa con su velocidad)
3. Diseñar la silueta del barrio (capa 1b) y postes/cables (capa 3b)
4. Diseñar EL BONDI 56 y animarlo cruzando
5. Animación del título por letras (ola) — con HTML/CSS, sin assets nuevos
6. Partículas: humito verde + mejorar las hojas que caen
7. Pulir: destellos random, wobble del título, guantes escalonados

---

**Notas de implementación** (para cuando lo codeemos):
- Las capas SVG se sirven desde `/assets/ui/parallax/` y se apilan con `z-index`.
- Cada capa usa `background-size: cover` + `@keyframes` propio con distinta duración
  → da el efecto parallax sin JavaScript.
- El bondi: `position: absolute` + `@keyframes bondiPasa { from { left: -30% } to { left: 110% } }`
  con duración ~20s y `animation-iteration-count: infinite`.
