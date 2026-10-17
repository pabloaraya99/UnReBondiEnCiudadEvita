/**
 * Matemática determinista para la simulación.
 *
 * La spec de IEEE-754 garantiza que +, -, *, / y Math.floor den EXACTAMENTE el
 * mismo bit en todo motor JS. En cambio Math.sin / Math.cos / Math.pow pueden
 * diferir en el último bit entre V8, JSC y SpiderMonkey. Como el online compara
 * snapshots byte a byte entre máquinas (y puede cruzar navegadores), la
 * simulación no puede depender de esas funciones.
 *
 * - sin/cos: tabla fija en punto fijo Q30 (enteros literales, sin Math.sin en
 *   el hot path) + interpolación lineal. Redondeo entero → idéntico en todo motor.
 * - powInt: multiplicación en bucle (enteros exactos). Para exponentes chicos.
 *
 * Fuera de la simulación (render, cámara, audio) se puede seguir usando
 * Math.sin/cos normal: ahí no hace falta determinismo bit a bit.
 */

// Cuarto de onda de seno en Q30 (|sin| ≤ 1 → cabe en 2^30). 257 muestras de
// 0 a π/2. Los literales enteros se parsean igual en todo motor.
const SIN_Q30 = [
  0, 6588356, 13176464, 19764076, 26350943, 32936819, 39521455, 46104602,
  52686014, 59265442, 65842639, 72417357, 78989349, 85558366, 92124163, 98686491,
  105245103, 111799753, 118350194, 124896179, 131437462, 137973796, 144504935, 151030634,
  157550647, 164064728, 170572633, 177074115, 183568930, 190056834, 196537583, 203010932,
  209476638, 215934457, 222384147, 228825464, 235258165, 241682010, 248096755, 254502159,
  260897982, 267283981, 273659918, 280025552, 286380643, 292724951, 299058239, 305380268,
  311690799, 317989595, 324276419, 330551034, 336813204, 343062693, 349299266, 355522689,
  361732726, 367929144, 374111709, 380280190, 386434353, 392573967, 398698801, 404808624,
  410903207, 416982319, 423045732, 429093217, 435124548, 441139496, 447137835, 453119340,
  459083786, 465030947, 470960600, 476872522, 482766489, 488642281, 494499676, 500338453,
  506158392, 511959275, 517740883, 523502998, 529245404, 534967884, 540670223, 546352205,
  552013618, 557654248, 563273883, 568872310, 574449320, 580004702, 585538248, 591049748,
  596538995, 602005783, 607449906, 612871159, 618269338, 623644239, 628995660, 634323400,
  639627258, 644907034, 650162530, 655393548, 660599890, 665781362, 670937767, 676068911,
  681174602, 686254647, 691308855, 696337036, 701339000, 706314559, 711263525, 716185713,
  721080937, 725949013, 730789757, 735602987, 740388522, 745146182, 749875788, 754577161,
  759250125, 763894504, 768510122, 773096806, 777654384, 782182683, 786681534, 791150767,
  795590213, 799999706, 804379079, 808728167, 813046808, 817334838, 821592095, 825818421,
  830013654, 834177638, 838310216, 842411232, 846480531, 850517961, 854523370, 858496606,
  862437520, 866345964, 870221790, 874064853, 877875009, 881652112, 885396022, 889106597,
  892783698, 896427186, 900036924, 903612776, 907154608, 910662286, 914135678, 917574653,
  920979082, 924348837, 927683790, 930983817, 934248793, 937478595, 940673101, 943832191,
  946955747, 950043650, 953095785, 956112036, 959092290, 962036435, 964944360, 967815955,
  970651112, 973449725, 976211688, 978936898, 981625251, 984276646, 986890984, 989468165,
  992008094, 994510675, 996975812, 999403415, 1001793390, 1004145648, 1006460100, 1008736660,
  1010975242, 1013175761, 1015338134, 1017462281, 1019548121, 1021595575, 1023604567, 1025575020,
  1027506862, 1029400018, 1031254418, 1033069992, 1034846671, 1036584389, 1038283080, 1039942680,
  1041563127, 1043144360, 1044686319, 1046188946, 1047652185, 1049075980, 1050460278, 1051805027,
  1053110176, 1054375676, 1055601479, 1056787540, 1057933813, 1059040255, 1060106826, 1061133483,
  1062120190, 1063066909, 1063973603, 1064840240, 1065666786, 1066453210, 1067199483, 1067905576,
  1068571464, 1069197120, 1069782521, 1070327646, 1070832474, 1071296985, 1071721163, 1072104991,
  1072448455, 1072751542, 1073014240, 1073236540, 1073418433, 1073559913, 1073660973, 1073721611,
  1073741824,
];

const Q = 30;
const SCALE = 1 << Q; // 2^30
const NSEG = SIN_Q30.length - 1; // 256 segmentos en el cuarto de onda
const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;

/** Reduce un ángulo a [0, TAU) usando solo operaciones exactas. */
function normalizeAngle(a) {
  const turns = a / TAU; // a / 2π
  const k = Math.floor(turns);
  return a - k * TAU;
}

/** Interpola la tabla de un cuarto de onda para t ∈ [0, 1] (Q30 → número). */
function quarterSin(t) {
  const pos = t * NSEG; // [0, NSEG]
  const i = Math.floor(pos);
  const frac = pos - i;
  const a = SIN_Q30[i];
  const b = SIN_Q30[Math.min(i + 1, NSEG)];
  // lerp en Q30, luego escalar. Todas las ops son + - * / (exactas).
  return (a + (b - a) * frac) / SCALE;
}

/**
 * Seno determinista. Igual que Math.sin dentro de ~5e-6 (más que suficiente
 * para knockback en grados enteros) y bit-idéntico en todo motor.
 */
export function sin(a) {
  let x = normalizeAngle(a);
  // cuadrante → [0, TAU)
  if (x < 0) x += TAU;
  if (x < HALF_PI) return quarterSin(x / HALF_PI);
  if (x < Math.PI) return quarterSin((Math.PI - x) / HALF_PI);
  if (x < Math.PI + HALF_PI) return -quarterSin((x - Math.PI) / HALF_PI);
  return -quarterSin((TAU - x) / HALF_PI);
}

/**
 * Coseno determinista. Igual que Math.cos dentro de ~5e-6.
 */
export function cos(a) {
  return sin(a + HALF_PI);
}

/**
 * base^exp para enteros small (1..~5), vía multiplicación en bucle.
 * Determinista y exacta donde Math.pow podría no serlo entre motores.
 */
export function powInt(base, exp) {
  let r = 1;
  for (let i = 0; i < exp; i++) r *= base;
  return r;
}
