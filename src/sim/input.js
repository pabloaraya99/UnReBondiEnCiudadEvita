// Máscara de bits de entrada: cada botón es un bit.
// Tanto el teclado humano como la CPU devuelven una máscara de estos bits.
export const IN = {
  LEFT: 1 << 0,
  RIGHT: 1 << 1,
  UP: 1 << 2,
  DOWN: 1 << 3,
  JUMP: 1 << 4,
  ATTACK: 1 << 5,
  SPECIAL: 1 << 6,
};

// Verifica si un bit está presente en la máscara.
export function has(mask, bit) {
  return (mask & bit) !== 0;
}
