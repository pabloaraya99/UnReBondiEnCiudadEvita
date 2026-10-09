# Un Re Bondi En Ciudad Evita 🥊🚌

Juego web estilo **Smash Bros** con personajes del barrio (Ciudad Evita, La Matanza, Argentina).
Peleá en "Los Mormones": una calle con tráfico que te atropella, con el Templo de fondo.

**Stack:** Vite + Three.js · simulación determinista a 60 Hz · motor físico propio · deploy en Vercel

## Jugar

- **Online (deploy):** *(próximamente en Vercel)*
- **Local:**
  ```bash
  npm install
  npm run dev        # http://localhost:5173
  ```

### Controles (P1)

| Tecla | Acción |
|-------|--------|
| A / D | Moverse |
| F | Saltar (Pablo tiene 6 saltos aéreos) |
| G | Ataque |
| H | Especial / cambiar stance (gordo ↔ flaco ↔ normal) |
| ↑ + H | Sword Slash |
| ↓ + H | Block Form (piedra) |

Hasta 4 jugadores locales (teclado) o CPU con 3 dificultades. Se configura en el lobby.

## Desarrollo

```bash
npm run build      # build de producción → dist/
npm test           # 14 tests de simulación
```

- **`AGENTS.md`** — guía técnica para IAs y colaboradores (estructura, reglas, qué falta). **Leer antes de contribuir.**
- **`ART_DIRECTION.md`** — biblia visual: paleta "gangster de barrio verde", prompts para IAs de 3D, flujo de assets.

## Personajes

- **Kenai "Pablo QuemandoRuedas"** — el que pelea con blunt, cambia de forma (flaco/gordo), tira pizza
- **El Coco** · **Dr Faxo** · **Dj Domono** *(cápsulas provisorias, modelos en camino)*

## Colaborar

1. Leé `AGENTS.md` (reglas duras: simulación determinista, render de solo lectura, paso fijo).
2. `npm test` tiene que pasar antes de commitear cambios de lógica.
3. Los valores de gameplay viven en `src/config.js`.
