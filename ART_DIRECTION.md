# Dirección de Arte — Un Re Bondi En Ciudad Evita

## Concepto general

**"Gangster de barrio" verde y colorido**: la estética de una esquina de Ciudad Evita
(La Matanza, Buenos Aires) llevada a un Smash. Grafitti, bondis, pizzería, almacén,
humo, personajes con actitud pero amigables. Nada oscuro ni edgy: es una joda entre
amigos del barrio, con colores saturados como mural de barrio.

Referencias de estilo: **Jet Set Radio** (cel-shading urbano vibrante),
murales de **La Boca/Caminito** modernizados, **GTA San Andreas** caricaturizado,
stickers de WhatsApp argentinos.

---

## Paleta de colores (usar estos hex en TODOS los prompts)

| Color | Hex | Uso |
|-------|-----|-----|
| Verde barrio | `#3FA34D` | Color principal: humo, hojas, detalles, branding |
| Verde oscuro | `#1E5B2E` | Sombras verdosas, fondos |
| Amarillo bondi | `#F2C94C` | Colectivos, cordón de vereda, carteles (ya en el juego) |
| Naranja Pablo | `#FF8A1F` | Pablo / acentos cálidos (ya en el juego) |
| Celeste cielo | `#9FC6E8` | Cielo, fondo del escenario (ya en el juego) |
| Terracota | `#C96F4A` | Ladrillos, techos, paredes |
| Crema | `#F4F1E8` | Textos, paredes claras |
| Grafiti magenta | `#E5449D` | Grafitis, neón, detalles pop |
| Neón turquesa | `#2DD4BF` | Carteles de neón, kiosco |
| Asfalto | `#6B6F76` | Calle, cemento (ya en el juego) |

Regla: **todo asset debe tener al menos un toque de verde** (`#3FA34D` o `#1E5B2E`)
para mantener la identidad "verde" del juego.

---

## Frase guía para todos los prompts (estilo base)

> *"stylized low-poly 3D game asset, Argentine barrio street-gangster cartoon vibe,
> vibrant saturated colors, Jet Set Radio inspired, friendly not edgy, sunny day,
> touches of vibrant green #3FA34D, game-ready, white/neutral background"*

---

# ASSETS NECESARIOS (en orden de prioridad)

## 1. ESCENARIO "La Parada" (la esquina del barrio)

El escenario actual ya tiene la geometría: 1 plataforma principal (la calle/vereda)
+ 3 plataformas flotantes (techos/balcones). El arte tiene que respetar eso:
**una zona plana central + plataformas arriba**.

### Prompt para concept 2D (Kimi / Qwen / Claude):

```
Argentine barrio street corner diorama, "La Parada" bus stop in Ciudad Evita Buenos Aires:
colorful graffiti-covered brick wall, small pizzeria with neon sign "PIZZERÍA",
corner store "ALMACÉN" with turquoise awning, a bus stop sign, yellow bus passing
in background, cables and light pole, vibrant green plants and weed leaves details,
smoke wisps, sunny day, warm terracotta and cream buildings, magenta and turquoise
graffiti tags, Jet Set Radio cel-shaded style, platform fighting game arena layout:
one main street platform plus 2-3 rooftop/balcony floating platforms, side view,
game concept art, vibrant colors #3FA34D #F2C94C #C96F4A #9FC6E8
```

### Prompt para modelo 3D (Meshy / Tripo3D / Luma Genie — imagen a 3D):

```
Low-poly 3D diorama of an Argentine barrio street corner: main flat street platform
(vereda with yellow curb), background wall with colorful graffiti, small pizzeria
with neon sign, corner store with green awning, bus stop pole, 2 floating rooftop
platforms above (a balcony and a water tank roof), cartoon gangster-neighborhood
style, vibrant saturated colors, green plants growing on walls, sunny lighting,
Jet Set Radio inspired, clean topology, game-ready arena, under 15k triangles
```

### Props del escenario (se pueden generar por separado):

```
- Bus stop sign "PARADA": rusty metal pole with round blue sign, sticker-covered
- Pizzeria storefront: red/white checkered curtain, neon "PIZZA" sign, pizza boxes stacked
- Almacén corner store: green awning, bottles in window, "ALMACÉN" hand-painted sign
- Graffiti wall: brick wall with colorful tags, weed leaf stencil, "CIUDAD EVITA" mural
- Bondi (bus): classic Argentine city bus, yellow/orange with green line, worn stickers
- Water tank (tanque de agua): rooftop black plastic tank, typical Argentine terrace
```

---

## 2. PERSONAJES (4)

Todos: *"low-poly 3D character, T-pose, game-ready, cartoon Argentine barrio style,
vibrant colors, Jet Set Radio inspired, friendly gangster look, white background"*

### Pablo — "PabloQuemandoRuedas" (protagonista, naranja #FF8A1F)

```
Chubby friendly Argentine barrio guy, baggy beige pants, oversized vibrant green
hoodie #3FA34D, gold chain, orange snapback cap backwards #FF8A1F, big confident
smile, holding a blunt with a stylized green smoke trail curling up, chunky
sneakers, relaxed pose, cartoon proportions (big head, stocky body),
Jet Set Radio style, vibrant saturated colors
Variantes necesarias después: versión GORDO (más ancho, remera de pizza) y
versión FLACO (flaco, musculosa, gorra visera)
```

### El Coco (azul #4D8BFF)

```
Slim tall Argentine barrio teenager, blue tracksuit with white stripes #4D8BFF,
curly dark hair under a headband, confident grin, gold watch, hands in pockets
leaning back, cartoon proportions, friendly troublemaker look,
green accents on sneakers #3FA34D, Jet Set Radio style
```

### Dr Faxo (gris #9AA0A6)

```
Older skinny barrio guy, grey lab coat over football jersey (any Argentine club),
reading glasses low on nose, gray stubble, flip-flops with socks, holding a
mate (Argentine gourd) in one hand, wise but mischievous smile,
green pen in coat pocket #3FA34D, cartoon proportions, Jet Set Radio style
```

### Dj Domono (blanco/crema #F3F0E8)

```
Stocky Argentine barrio DJ, cream oversized t-shirt with boombox graphic,
headphones around neck, short dreads, gold tooth smile, chunky rings,
cream and green color scheme #F3F0E8 #3FA34D, holding a vinyl record,
cartoon proportions, party host vibe, Jet Set Radio style
```

---

## 3. TÍTULO / LOGO (para menú principal)

```
Game logo text "UN RE BONDI EN CIUDAD EVITA", bold Argentine street graffiti
lettering, spray-paint texture, vibrant green and yellow #3FA34D #F2C94C with
magenta outline #E5449D, a cartoon city bus (bondi) integrated into the letters,
brick wall texture behind letters, sticker style with thick white border,
transparent background, game title screen asset
```

### Versión corta (para favicon / íconos):

```
Minimalist game icon: cartoon yellow-green Argentine bus wheel with smoke trail,
circle badge, vibrant green background #3FA34D, bold sticker style, transparent PNG
```

---

## 4. LOBBY / UI (fondos y marcos genéricos)

```
- Menu background: blurred panoramic view of the barrio corner at golden hour,
  graffiti wall, bus passing, green smoke haze, vibrant colors
- Character select cards: rectangular frames with spray-paint border, brick texture,
  neon corner details, green and yellow #3FA34D #F2C94C
- "VS" splash: bold graffiti letters with paint drips, magenta and turquoise
- Health/stock icons: small cartoon blunt / pizza slice / mate icons, sticker style
```

---

# FLUJO DE TRABAJO CON LAS IAs

```
PASO 1: Concept 2D
  → Pegar los prompts de "concept 2D" en Kimi k3 / Qwen / Claude / etc.
  → Guardar las mejores imágenes en:  public/assets/concept/

PASO 2: Imagen → 3D (solo para escenario y personajes)
  → Subir el concept a Meshy.ai / Tripo3D / Luma Genie (imagen a 3D)
  → Refinar con el prompt "modelo 3D" de arriba
  → Exportar GLB (formato glTF binario) y ponerlo en:  public/assets/models/

PASO 3: Assets 2D (título, UI, íconos)
  → Los PNG con transparencia van directo a:  public/assets/ui/

PASO 4: Integración al juego (la hacemos nosotros cuando tengas los archivos)
  → Three.js carga GLB con GLTFLoader
  → Se reemplazan las cápsulas provisorias en render/Renderer.js
  → El logo/fondos se enchufan en ui/UI.js y ui/ui.css
```

---

# ESTRUCTURA DE CARPETAS (ya creada)

```
public/assets/
  models/    → GLB de personajes y escenario (Meshy/Tripo/Luma)
  textures/  → texturas sueltas (graffiti walls, piso, carteles)
  ui/        → logo, fondos de menú/lobby, íconos (PNG transparente)
  concept/   → imágenes concept de las IAs (referencia, no las carga el juego)
```

# NOTAS TÉCNICAS PARA LA INTEGRACIÓN (futura)

- Formato 3D: **GLB** (glTF binario). Three.js lo carga con `GLTFLoader`.
- Tamaño objetivo: personajes < 8k triángulos, escenario < 15k triángulos.
- Escala: el juego usa **metros**. Personaje ≈ 1.8 de alto (el fighter tiene
  width/height en config.js). El modelo debe calzar en esa caja.
- Los personajes tienen variantes visuales por stance (Pablo gordo/flaco):
  se puede resolver con 2-3 modelos, o con escala del mismo modelo (ya el
  Renderer escala la cápsula según el stance — un solo modelo también sirve).
- Animación: la v1 puede ser modelo estático + inclinaciones por código
  (el Renderer ya hace lean/squash sobre el pivot). Rigging queda para después.
