// True-value greyscale (CIE L*), used by the Image sampler's grisaille view.
// Precomputed tables keep the per-pixel loop free of pow/cbrt.

function lin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) LIN[i] = lin(i);

const yToL = (y: number) => (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y);
const lToY = (L: number) => {
  const f = (L + 16) / 116;
  return f ** 3 > 0.008856 ? f ** 3 : L / 903.3;
};
const yToByte = (y: number) => {
  const v = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

/** Quantise L* into N steps (0 = continuous; 2 = pure black / white). */
export function quantL(L: number, steps: number): number {
  if (!steps) return L;
  if (steps === 2) return L < 50 ? 0 : 100;
  const i = Math.min(steps - 1, Math.floor((L / 100) * steps));
  return ((i + 0.5) / steps) * 100;
}

const OUT_N = 4096;
const tables = new Map<number, Uint8Array>();
function outTable(steps: number): Uint8Array {
  let t = tables.get(steps);
  if (!t) {
    t = new Uint8Array(OUT_N);
    for (let k = 0; k < OUT_N; k++) t[k] = yToByte(lToY(quantL(yToL(k / (OUT_N - 1)), steps)));
    tables.set(steps, t);
  }
  return t;
}

/** Convert an RGBA buffer to value-grey in place (steps: 0, 2, 5, 9…). */
export function toValueGrey(data: Uint8ClampedArray, steps = 0) {
  const out = outTable(steps);
  const top = OUT_N - 1;
  for (let i = 0; i < data.length; i += 4) {
    let y = 0.2126 * LIN[data[i]] + 0.7152 * LIN[data[i + 1]] + 0.0722 * LIN[data[i + 2]];
    if (y > 1) y = 1;
    data[i] = data[i + 1] = data[i + 2] = out[(y * top) | 0];
  }
}
