# PROMPTS LISTOS PARA NANO BANANA PRO (copiar y pegar)

**Cómo usar**: Abrí nano banana pro (Gemini), subí `Splash Art Title Screen.jfif`
(que está en `public/assets/ui/parallax/`) y pegá cada prompt uno a uno.
Cada prompt devuelve un PNG con transparencia.

Guardar los resultados en `public/assets/ui/parallax/title/` con estos nombres:

```
c0-cielo.png, c1-ciudad.png, c2-edificios.png, c3-bondi.png, c4-paredes.png,
c5-corolla.png, c6-suelo.png, c7a-faxo.png, c7b-kenai.png, c7c-coco.png,
c7d-domono.png, c8-polaroids.png
```

---

## C0 — CIELO (noche con nubes)

```
Using the attached image as reference, isolate ONLY the night sky with its clouds and stars on a fully transparent background. Keep the exact same comic art style, colors, gradient and lighting. Remove ALL buildings, characters, vehicles, signs, ground and objects. Output as PNG with transparency, keep the same 1376x768 canvas size, sky positioned exactly as in the original image.
```

## C1 — CIUDAD LEJANA (edificio-templo + cartel autopista)

```
Using the attached image as reference, isolate ONLY the distant city skyline: the tall municipal tower building in the center background, the small buildings around it, and the blue highway sign on the left with its posts. Keep the exact same comic art style, colors, outlines and lighting. Remove the sky, clouds, characters, vehicles, ground and all foreground elements. Output as PNG with transparency, keep the same 1376x768 canvas size, elements positioned exactly as in the original image.
```

## C2 — EDIFICIOS LATERALES + FAROL + CABLES

```
Using the attached image as reference, isolate ONLY the brick buildings on the left and right edges, the street lamp that is turned on at the top right, and all the hanging power lines and cables crossing the sky. Keep the exact same comic art style, colors, outlines and lighting. Remove the sky, distant city, characters, vehicles and ground. Output as PNG with transparency, keep the same 1376x768 canvas size, elements positioned exactly as in the original image.
```

## C3 — EL BONDI (colectivo rosa con humo)

```
Using the attached image as reference, isolate ONLY the pink bus with its magenta smoke trail swirling around it. Keep the exact same comic art style, colors, outlines, glow and lighting. Remove the sky, buildings, characters, ground and all other elements. Output as PNG with transparency, keep the same 1376x768 canvas size, bus positioned exactly as in the original image.
```

## C4 — PAREDES Y CARTELES (derecha)

```
Using the attached image as reference, isolate ONLY the right-side wall elements: the "¡DALE GAS! ¡BARRIO" graffiti wall, the "TALLER 56" hanging sign, and the "DOMONO DJ BAILAN TODOS" neon sign. Keep the exact same comic art style, colors, neon glow, outlines and lighting. Remove the sky, buildings, characters, vehicles and ground. Output as PNG with transparency, keep the same 1376x768 canvas size, elements positioned exactly as in the original image.
```

## C5 — EL COROLLA (auto azul)

```
Using the attached image as reference, isolate ONLY the blue Toyota sedan car in the center of the scene. Keep the exact same comic art style, colors, outlines, graffiti on its side, reflections and lighting. Remove the sky, buildings, characters, ground and all other elements. Output as PNG with transparency, keep the same 1376x768 canvas size, car positioned exactly as in the original image.
```

## C6 — SUELO (pasto, tierra, basura)

```
Using the attached image as reference, isolate ONLY the ground: the grass, dirt patches, flying dust, cans and trash on the floor. Keep the exact same comic art style, colors, outlines and lighting. Remove the sky, buildings, characters, vehicles and all other elements. Output as PNG with transparency, keep the same 1376x768 canvas size, ground positioned exactly as in the original image.
```

## C7a — FAXO (cámara con flash verde, izquierda)

```
Using the attached image as reference, isolate ONLY the character on the far left: the curly haired young man with beige cargo pants and jacket holding a camera with a green flash (Faxo), full body in his fighting pose. Keep the exact same comic art style, colors, outlines and lighting. Remove everything else: sky, buildings, other characters, vehicles, ground and objects. Output as PNG with transparency, keep the same 1376x768 canvas size, character positioned exactly as in the original image.
```

## C7b — KENAI (broccoli gigante en llamas, centro)

```
Using the attached image as reference, isolate ONLY the character in the center: the young man with grey hoodie and black cargo pants holding the giant flaming broccoli with both hands (Kenai), full body in his fighting pose, including the flames and fire trail of the broccoli. Keep the exact same comic art style, colors, outlines and lighting. Remove everything else: sky, buildings, other characters, vehicles, ground and objects. Output as PNG with transparency, keep the same 1376x768 canvas size, character positioned exactly as in the original image.
```

## C7c — EL COCO (llave gigante, arriba del auto)

```
Using the attached image as reference, isolate ONLY the shirtless tattooed character jumping in the air holding a giant wrench above his head (El Coco), full body with his crazy wide eyes, cigarette and dark cargo pants. Keep the exact same comic art style, colors, outlines, tattoos and lighting. Remove everything else: sky, buildings, other characters, vehicles, ground and objects. Output as PNG with transparency, keep the same 1376x768 canvas size, character positioned exactly as in the original image.
```

## C7d — DOMONO (consola DJ, derecha)

```
Using the attached image as reference, isolate ONLY the character on the right: the young man with camo jacket, headphones around his neck and silver watch, using the Pioneer DJ controller on the table with its speakers (Domono), full body including the DJ table and equipment. Keep the exact same comic art style, colors, outlines and lighting. Remove everything else: sky, buildings, other characters, vehicles, ground and objects. Output as PNG with transparency, keep the same 1376x768 canvas size, character positioned exactly as in the original image.
```

## C8 — POLAROIDS FLOTANDO

```
Using the attached image as reference, isolate ONLY the floating polaroid photos with green glowing borders scattered around the scene. Keep the exact same comic art style, colors, glow effect and lighting. Remove everything else: sky, buildings, characters, vehicles, ground and objects. Output as PNG with transparency, keep the same 1376x768 canvas size, polaroids positioned exactly as in the original image.
```

---

## Después: el movimiento (lo implemento yo)

Una vez que tengas los 12 PNGs en `public/assets/ui/parallax/title/`, yo los
apilo con CSS parallax y animo:

- **C0-C6**: velocidades distintas (efecto profundidad, cuanto más cerca más rápido)
- **C3 (bondi)**: humo rosa animado con ondas
- **C7 (personajes)**: bob individual estilo pelea (cada uno con delay distinto)
- **C7b (Kenai)**: el fuego del broccoli titilando (glow pulsante)
- **C8 (polaroids)**: flotando con rotación suave
- **C2 (farol)**: la luz parpadeando cada tanto (efecto farola de barrio)
