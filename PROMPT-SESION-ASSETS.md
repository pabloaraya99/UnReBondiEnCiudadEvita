# PROMPT PARA NUEVA SESIÓN DE OPENCODE (nano banana pro / OpenRouter)

Copiá todo el bloque de abajo y pegalo como primer mensaje de la nueva sesión:

---

```
# CONTEXTO DEL PROYECTO — "Un Re Bondi En Ciudad Evita"

Estás trabajando en los assets visuales de un juego web de pelea estilo Super Smash Bros,
ambientado en Ciudad Evita (La Matanza, Argentina). El juego corre con Vite + Three.js y
está deployado en Vercel. Tu tarea es generar y editar IMÁGENES (PNG con transparencia,
JPG y SVG) para toda la estética del juego usando nano banana pro (Gemini image).

Repo: https://github.com/pabloaraya99/UnReBondiEnCiudadEvita
Carpeta de trabajo: public/assets/

# LA ESTÉTICA QUE QUIERO (ART DIRECTION)

Estilo visual: CÓMIC / CARTOON ilustrado con contorno negro grueso estilo graffiti,
colores vibrantes saturados, poses dinámicas de pelea, iluminación de atardecer/noche
de barrio con neones. Referencia de tono: los splash arts que ya están en el repo
(public/assets/ui/pilots/*Splash Art*.jfif) — TODAS las imágenes nuevas deben
coincidir con ese mismo estilo.

Ambientación: barrio argentino real y querible — taller mecánico, paredes con graffiti,
tendido eléctrico colgando, faroles de sodio, pasto con tierra, latas en el piso,
el colectivo línea 56 (verde y blanco), el templo blanco de Los Mormones al fondo,
carteles de autopista y de la calle. Nada genérico: todo con identidad de Ciudad Evita.

PALETA OFICIAL (usar siempre estos colores):
- Verde barrio: #3FA34D / #2E8B3A / #4CC458
- Amarillo: #F2C94C
- Magenta: #E5449D
- Turquesa: #2DD4BF
- Negro cómic (contornos): #14161a
- Crema: #f4f1e8
- Rojo guantes: #d8352a

# LOS 4 PERSONAJES (canon, respetar siempre)

1. KENAI "Pablo QuemandoRuedas" (el protagonista):
   joven con hoodie GRIS claro con gráfico azul/rojo, cargo negro baggy, zapatillas
   chunky negras/blancas, cadenas de plata, tatuajes en cuello y manos, fade con pelo
   marrón, sonrisa confiada, aro en la oreja. Su elemento: el blunt/brócoli gigante
   prendido fuego con estela de humo VERDE. Stats: BARRIO PESADO / CALLEJERA / VERDURA POWER.

2. EL COCO (el mecánico loco):
   torso DESNUDO flaco manchado de grasa, tatuajes por todos lados (tigre y "NEVER" en
   el pecho, manga tribal en brazos), pantalón cargo negro, botas de trabajo, ojos
   saltones de loco mirando a lados distintos, sonrisa dentada ancha, cigarrillo en la
   boca, pelo morocho despeinado. Sostiene una LLAVE INGLESA GIGANTE. Su auto: Toyota
   Corolla azul con motor expuesto (patente COCO 56, taller "MECÁNICA EL COCO - TALLER 56").

3. DJ DOMONO (el pesado):
   campera verde CAMUFLADA con parche rojo/blanco en el hombro, auriculares DJ negros
   al cuello, remera negra, jogger gris, zapatillas crema, reloj plateado grande, pelo
   corto oscuro encrespado, cejas gruesas, diente de oro. Usa una consola PIONEER DJ
   completa (2 jog wheels, perillas, botones amarillos) sobre mesa plegable. Ambiente:
   fiesta con luces de neón rosa/azul, humo, confeti, carteles "DOMONO DJ BAILAN TODOS".

4. DR FAXO (el fotógrafo flaco):
   flaco y alto, RULOS rubios/castaño claro abundantes, remera BEIGE, pantalón cargo
   beige, zapatillas, piel clara, ojos grandes castaños, cejas finas, sonrisa leve.
   CÁMARA de fotos profesional colgada del cuello con correa, flash con pantalla verde,
   más polaroids flotando con brillo verde a su alrededor. Paleta personal: tonos beige/crema.

# TAREAS (en orden de prioridad)

## 1. Capas del TITLE SCREEN (el splash art del barrio)
En public/assets/ui/parallax/ está "Splash Art Title Screen.jfif": la escena completa
del title con los 4 personajes, el bondi, el corolla, la ciudad y el cielo nocturno.
Usando ESA imagen como referencia de entrada, generá 12 PNG con transparencia
(1376x768, cada elemento en su posición exacta original):

c0-cielo.png, c1-ciudad.png, c2-edificios.png, c3-bondi.png, c4-paredes.png,
c5-corolla.png, c6-suelo.png, c7a-faxo.png, c7b-kenai.png, c7c-coco.png,
c7d-domono.png, c8-polaroids.png

Guardarlos en public/assets/ui/parallax/title/. Los prompts exactos capa por capa
están en public/assets/ui/PROMPTS-NANO-BANANA.md — usalos tal cual.

## 2. LOGO del juego en PNG transparente
Generar el logo "UN RE BONDI" (y aparte "EN CIUDAD EVITA") en PNG con fondo
transparente, estilo graffiti: letras gordas chunky con relleno verde degradado,
contorno negro grueso cómic, sombra magenta desplazada. Que se pueda apoyar sobre
cualquier fondo. Tamaño mínimo 1200px de ancho. Guardar en public/assets/ui/ como
logo-unre-bondi.png y logo-ciudad-evita.png.

## 3. Assets sueltos para UI/escenarios (mismo estilo cómic, fondo transparente)
- El BONDI 56 (colectivo verde y blanco, vista lateral, con "56" y "bondi" visibles)
- El Templo de Los Mormones blanco (vista frontal simplificada, para fondo de escenarios)
- Poste de luz con cables de tendido eléctrico
- Guante de boxeo rojo con muñequera crema (ícono de pelea)
Guardar en public/assets/ui/props/.

## 4. Si queda tiempo: variantes de los splash arts
Versiones alternativas de los 4 splash arts de pilots (misma composición de tarjeta
con stats abajo, fondo de barrio, pero pose o expresión distinta) para tener variantes.
NO reemplazar los originales: guardar como "*-v2.jfif" en public/assets/ui/pilots/.

# REGLAS TÉCNICAS

1. Formato: PNG con transparencia real (alfa) para todo lo que se apila; JPG/JFIF
   para imágenes de fondo completas.
2. NO generar texto en inglés salvo que sea parte del diseño (el juego es en español).
3. Mantener el mismo canvas y posición cuando pida "misma posición que el original".
4. Si una imagen sale con fondo blanco en vez de transparente, pedile al modelo
   "make the background fully transparent" hasta que lo haga.
5. Si un personaje sale cortado, repetí el prompt agregando "keep the ENTIRE
   character visible, do not crop".
6. Commitear todo al repo (git add . && git commit) después de cada tarea terminada.
7. NO modificar el código del juego (src/) salvo que se pida explícitamente:
   tu trabajo es generar assets, no tocar lógica.

# VERIFICACIÓN RÁPIDA ANTES DE EMPEZAR

REGLA DE ORO — NO LEER BINARIOS:
- NUNCA abras/leas archivos binarios: .glb, .png, .jpg, .jfif, .webp, .svg con imágenes.
  Son enormes (el Kenai.glb pesa 15MB) y hacen explotar el límite de tokens.
- SOLO listá los NOMBRES de los archivos con un listado de directorio
  (Get-ChildItem / ls / git ls-files) sin abrir su contenido.
- SOLO leé archivos de TEXTO chicos: los .md de la carpeta public/assets/ui/.

Pasos:
1. Listá los nombres de archivos de public/assets/ (sin abrirlos).
2. Leé SOLO estos 2 archivos de texto:
   - public/assets/ui/RUTA-ASSETS-TITULO.md
   - public/assets/ui/PROMPTS-NANO-BANANA.md
3. Confirmá el contexto en 3 líneas y arrancá por la Tarea 1 (las 12 capas del title).
```

---

