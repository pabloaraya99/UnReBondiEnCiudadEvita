# Un Re Bondi En Ciudad Evita 🥊🚌

Juego web estilo **Smash Bros** con personajes del barrio (Ciudad Evita, La Matanza, Argentina).
5 peleadores, hasta 10 jugadores en la misma sala, online con código y rollback netcode.

**Stack:** Vite + Three.js · simulación determinista a 60 Hz · motor físico propio · PeerJS (online) · deploy en Vercel

## Jugar

- **Online:** https://un-re-bondi-en-ciudad-evita.vercel.app
- **Local:**
  ```bash
  npm install
  npm run dev        # http://localhost:5173
  ```

### Controles

| P1 (WASD) | Acción |
|-----------|--------|
| A / D | Moverse |
| W / S | Arriba / abajo (plataformas) |
| ESPACIO | Saltar (Kenai tiene 6 saltos aéreos) |
| G | Ataque |
| H | Especial (↑+H recovery · ↓+H especial de defensa · ←/→+H costado) |

- **P2-P6:** Flechas · IJKL+UOP · Numpad · 1-7 (teclados distintos)
- **Joystick (Gamepad API):** stick/d-pad moverse · A saltar · X atacar · B/Y especial
- **Teclas globales:** M silencia · F1 hitboxes de debug · ESC pausa (partida local)

### Modos

- **Local:** lobby hasta 10 puertos (humanos + CPUs con 3 dificultades), selector de mapa
  ("Los Mormones" con tráfico que atropella / "El Escritorio"), HUD con % por color de texto,
  pausa con ESC, resultados con podium y tabla de KOs/daño.
- **Online:** sala con código de 6 letras, hasta 10 jugadores, CPUs agregables por el anfitrión,
  rollback (predicción + corrección), revancha.
- **Peleadores:** galería con lore, habilidades, stats y una cumbia 8-bit propia por peleador.

## Personajes (5, modelos 3D con primitivas THREE)

- **Kenai "Pablo QuemandoRuedas"** — Kirby: stances (gordo/flaco/normal), inhale, hammer, stone
- **El Coco** — Ike: eruption, counter, quickDraw
- **Dj Domono** — Ness: pkFire, pkThunder, pkMagnet
- **Dr Faxo** — Richter: holyWater, whip, axe, uppercut
- **Chubitcoin** — Pac-Man: Bonus Fruit, Power Pellet, Pac-Jump, Fire Hydrant

## Desarrollo

```bash
npm run build      # build de producción → dist/
npm test           # 28 tests (24 simulación + 4 red)
```

- **`AGENTS.md`** — guía técnica para IAs y colaboradores (estructura, reglas, qué falta). **Leer antes de contribuir.**
- **`ART_DIRECTION.md`** — biblia visual: paleta "gangster de barrio verde", prompts para IAs de 3D, flujo de assets.
- **`public/assets/music/LEEME.md`** — mapeo de música (title, batalla, galería…).

### Estado (v5)

- Rediseño UI **Cyber-Cumbia / Noche de Barrio** completo (6 fases): design tokens, botones
  inclinados, title screen con partículas, lobby champion-select, HUD rediseñado, pausa,
  resultados con contadores de KO/daño en el sim, sonidos de UI sintetizados.
- Música con loop (title = "La Resaka" chiptune), audio desbloqueado con el primer gesto.
- **Pendiente:** probar online con 2 browsers reales (fue testeado con red simulada en Node).

## Colaborar

1. Leé `AGENTS.md` (reglas duras: simulación determinista, render de solo lectura, paso fijo).
2. `npm test` tiene que pasar antes de commitear cambios de lógica.
3. Los valores de gameplay viven en `src/config.js`.
