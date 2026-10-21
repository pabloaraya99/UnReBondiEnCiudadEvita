# Material para Gemini (dirección de arte)

- **`unrebondi-assets-gemini.zip`** (15,8 MB, 36 archivos) — paquete de referencia para
  subir a Gemini Pro y arrancar la Fase 1 (análisis de estética) y Fase 2 (splash arts,
  title screens, bocetos). El ZIP incluye su propio `00-LEEME-PARA-GEMINI.md` con las consignas.

## Contenido del ZIP

```
00-LEEME-PARA-GEMINI.md   ← consignas (pegar resumen en el primer mensaje a Gemini)
01-direccion-de-arte/     ART_DIRECTION.md + README del juego
02-splash-arts/           5 splash arts (convertidos a .jpg)
03-title-y-logos/         title-splash, logos, texto del título, props
04-conceptos/             bocetos de Kenai + referencias del templo
05-prompts-existenes/     PROMPT-SESION-ASSETS.md, PROMPTS-NANO-BANANA.md, RUTA-ASSETS-TITULO.md
06-capturas/              4 capturas 1920×1080 del juego (título, lobby, 2 de pelea)
```

## Cómo se regeneró

Las capturas se tomaron con Chrome headless + CDP (script temporal fuera del repo):
navegaba a https://un-re-bondi-en-ciudad-evita.vercel.app, descartaba el overlay del
título, entraba al lobby y arrancaba la pelea (`Page.captureScreenshot`).
