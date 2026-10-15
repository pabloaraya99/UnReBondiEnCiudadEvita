# PROMPT AUTOCONTENIDO PARA SESIÓN DE ASSETS (anti error 8MB)

Copiá todo el bloque de abajo y pegalo como primer mensaje de la nueva sesión.
NO hace falta que la sesión lea NADA del repo: todo el contexto está acá.

---

```
# ROL Y REGLA DE ORO (LEER PRIMERO)

Sos un agente generador de imágenes (nano banana pro / Gemini image) trabajando en
assets para un videojuego web. Tu trabajo es GENERAR imágenes y GUARDARLAS en disco.

PROHIBIDO ABSOLUTO:
- NO uses la herramienta de lectura (Read/Get-Content/cat) sobre NINGÚN archivo del
  repositorio. Ni imágenes, ni texto, ni código. CERO lecturas.
- NO listes directorios recursivamente (ls -R / Get-ChildItem -Recurse).
- NO abras el repo de GitHub ni URLs.

TODO el contexto que necesitás está en ESTE mensaje. Si necesitás verificar que un
archivo generado existe, usá solo listado de nombres de UN directorio específico
(ej: Get-ChildItem "public/assets/ui/parallax/title" -Name). Nada más.

# EL JUEGO Y SU ESTÉTICA (contexto completo)

"Un Re Bondi En Ciudad Evita": juego web de pelea estilo Super Smash Bros, ambientado
en Ciudad Evita (La Matanza, Argentina). Estilo visual: CÓMIC/CARTOON ilustrado con
contorno negro grueso tipo graffiti, colores vibrantes saturados, poses dinámicas de
pelea, iluminación de atardecer/noche de barrio con neones.

Ambientación: barrio argentino — taller mecánico, paredes con graffiti, tendido
eléctrico colgando, faroles de sodio, pasto con tierra, latas en el piso, el colectivo
línea 56 (verde y blanco), templo blanco al fondo, carteles de calle y autopista.

PALETA OFICIAL:
- Verde barrio: #3FA34D / #2E8B3A / #4CC458
- Amarillo: #F2C94C
- Magenta: #E5449D
- Turquesa: #2DD4BF
- Negro cómic (contornos): #14161a
- Crema: #f4f1e8
- Rojo guantes: #d8352a

# LOS 4 PERSONAJES (canon, respetar siempre)

1. KENAI "Pablo QuemandoRuedas": joven con hoodie GRIS claro con gráfico azul/rojo,
   cargo negro baggy, zapatillas chunky negras/blancas, cadenas de plata, tatuajes en
   cuello y manos, fade con pelo marrón, aro en la oreja, sonrisa confiada. Elemento:
   brócoli/blunt gigante prendido fuego con estela de humo VERDE.

2. EL COCO (mecánico loco): torso DESNUDO flaco manchado de grasa, tatuajes por todos
   lados (tigre y "NEVER" en el pecho, manga tribal en brazos), cargo negro, botas de
   trabajo, ojos saltones mirando a lados distintos, sonrisa dentada, cigarrillo en la
   boca, pelo morocho despeinado. Sostiene LLAVE INGLESA GIGANTE. Su auto: Toyota
   Corolla azul con motor expuesto (patente COCO 56).

3. DJ DOMONO (el pesado): campera CAMUFLADA verde con parche rojo/blanco en el hombro,
   auriculares DJ negros al cuello, remera negra, jogger gris, zapatillas crema, reloj
   plateado grande, pelo corto oscuro encrespado, cejas gruesas, diente de oro. Usa
   consola PIONEER DJ completa (2 jog wheels, perillas, botones amarillos) sobre mesa.
   Ambiente: fiesta con neón rosa/azul, humo, confeti.

4. DR FAXO (fotógrafo flaco): flaco y alto, RULOS rubios/castaño claro abundantes,
   remera BEIGE, cargo beige, piel clara, ojos grandes castaños, cejas finas, sonrisa
   leve. CÁMARA profesional colgada del cuello con correa, flash con pantalla verde,
   polaroids flotando con brillo verde. Paleta personal: beige/crema.

# TAREAS (hacer en orden, guardar cada imagen apenas la generes)

## TAREA 1 — LOGO del juego (PNG transparente)
Generar 2 imágenes PNG con fondo transparente (mínimo 1200px de ancho):
- "logo-unre-bondi.png": el texto "UN RE BONDI" en estilo graffiti: letras gordas
  chunky, relleno verde degradado (#4CC458 a #2E8B3A), contorno negro grueso cómic,
  sombra magenta #E5449D desplazada abajo-izquierda, leve brillo blanco arriba.
- "logo-ciudad-evita.png": el texto "EN CIUDAD EVITA" con el mismo estilo pero
  relleno amarillo degradado (#FFD966 a #F2A81C), misma sombra magenta y contorno.
Guardar en: public/assets/ui/

## TAREA 2 — EL BONDI 56 (PNG transparente)
El colectivo argentino línea 56, vista lateral completa, verde y blanco, con "56"
grande en el frente y la palabra "bondi" arriba del parabrisas, estilo cómic con
contorno negro grueso, colores vibrantes. Fondo transparente. ~600px de ancho.
Guardar en: public/assets/ui/props/bondi-56.png

## TAREA 3 — Templo blanco (PNG transparente)
Templo mormón blanco simplificado vista frontal: cuerpo blanco con ventanales
verticales, techo a dos aguas, 1 torre alta central con aguja y ángel dorado arriba,
2 torres chicas a los lados. Estilo cómic con contorno negro. Fondo transparente.
Guardar en: public/assets/ui/props/templo-mormones.png

## TAREA 4 — Poste de luz con cables (PNG transparente)
Poste de luz de barrio con lámpara de sodio prendida (brillo cálido amarillo) y
cables de tendido eléctrico colgando en curva hacia los costados. Estilo cómic.
Fondo transparente. Guardar en: public/assets/ui/props/poste-cables.png

## TAREA 5 — Guante de boxeo (PNG transparente)
Guante de boxeo rojo (#d8352a) con muñequera crema (#f4f1e8), contorno negro grueso
cómic, vista 3/4, con 2-3 líneas de velocidad detrás. Fondo transparente.
Guardar en: public/assets/ui/props/guante-boxeo.png

# REGLAS DE GENERACIÓN

1. Si una imagen sale con fondo blanco, pedile al modelo "make the background fully
   transparent, keep only the subject" y reintentá.
2. Si un texto sale mal escrito, repetí el prompt poniendo el texto exacto entre
   comillas y agregá "text must be spelled exactly as written".
3. Guardar cada PNG apenas sale bien, con el nombre exacto indicado.
4. Al terminar TODAS las tareas: git add . && git commit -m "Assets generados por IA"
   && git push.
5. NO modificar archivos de código (src/) ni nada fuera de public/assets/.
6. Si una generación falla 3 veces, anotá el error y pasá a la siguiente tarea.

# CONFIRMACIÓN

Antes de generar nada, respondé SOLO: "Contexto entendido. Empiezo con el logo."
y arrancá. No expliques, no leas archivos, no explores el repo.
```

---

## Si la sesión actual ya está trabada con el error 8MB:

Cerrala y abrí una NUEVA sesión limpia con este prompt. La clave: el agente no
necesita leer NADA del repo — el contexto está todo en el mensaje.
