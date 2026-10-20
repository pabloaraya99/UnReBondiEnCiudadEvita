# 🎵 Música del juego

Poné acá tus canciones (cumbias 8-bit de Suno, o lo que quieras) y el juego las carga solo.

## Cómo funciona

1. **Copiá tus archivos de audio** en esta carpeta (`public/assets/music/`).
2. **Renombralos** según dónde querés que suenen:

| Nombre del archivo | Dónde suena |
|---|---|
| `menu.mp3` | Pantalla de título / menú principal |
| `battle.mp3` | Durante la pelea |
| `results.mp3` | Pantalla de resultados |

3. **Formatos aceptados**: `.mp3`, `.ogg`, `.wav` (el `.mp3` es el más compatible).

## Ejemplo

Si tu cumbia de Suno se llama `La Cumbia Del Barrio (Master).mp3`:

```
public/assets/music/
  menu.mp3        ← renombrá "La Cumbia Del Barrio (Master).mp3" a esto
  battle.mp3      ← otra cumbia para la pelea
  results.mp3     ← opcional: música de victoria
```

## Tips para Suno

- Exportá en **MP3 128kbps** (liviano, carga rápido)
- Loop-friendly: si la canción tiene intro/silencio al final, el juego la corta con fade
- El volumen se ajusta solo (el juego baja la música cuando hay SFX fuertes)

## Nota técnica

- Las canciones se cargan con `fetch()` + `decodeAudioData` (Web Audio API)
- Si no hay archivo, el juego simplemente no suena música (no crashea)
- El mute (tecla M) aplica a música y SFX
