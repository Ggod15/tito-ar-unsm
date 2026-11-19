// Estimador de movimiento hacia adelante/atras SIN ARCore, para cualquier telefono.
// Sigue pequenos parches de la imagen de la camara entre cuadros; cuando te acercas a la escena los puntos se "abren"
// desde el centro (expansion radial) y cuando te alejas se "cierran". Se quita el desplazamiento global (giros del celular)
// con la mediana, asi que el resultado casi no depende de si giras. Devuelve e = (escala - 1) entre cuadros.
window.MotionEstimator = (function () {
  const W = 160;       // ancho de trabajo (la imagen se reduce)
  const P = 12;        // lado del parche
  const R = 5;         // radio de busqueda en pixeles
  const STEP = 16;     // separacion entre parches
  const MIN_VAR = 36;  // parches sin textura se descartan

  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  let H = 0, ref = null, age = 0, grid = [];

  function buildGrid() {
    grid = [];
    const m = P / 2 + R + 1;
    for (let y = m; y <= H - m; y += STEP) for (let x = m; x <= W - m; x += STEP) grid.push([x | 0, y | 0]);
  }

  function toGray(video) {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    const h = Math.round((W * vh) / vw);
    if (cv.width !== W || cv.height !== h) { cv.width = W; cv.height = h; H = h; ref = null; buildGrid(); }
    ctx.drawImage(video, 0, 0, W, h);
    const d = ctx.getImageData(0, 0, W, h).data;
    const g = new Uint8Array(W * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
    return g;
  }

  function median(a) {
    const b = a.slice().sort((x, y) => x - y);
    const n = b.length;
    return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2;
  }

  function reset() { ref = null; age = 0; }

  // Devuelve { e, shift, n } o null si no hay suficiente informacion
  function step(video) {
    const g = toGray(video);
    if (!g) return null;
    if (!ref) { ref = g; age = 0; return null; }
    const p0 = ref;               // cuadro de referencia: se compara contra uno antiguo para detectar movimientos lentos

    const half = P / 2;
    const flows = [];
    for (let k = 0; k < grid.length; k++) {
      const cx = grid[k][0], cy = grid[k][1];
      // textura del parche
      let s = 0, s2 = 0;
      for (let y = -half; y < half; y++) {
        const row = (cy + y) * W + cx;
        for (let x = -half; x < half; x++) { const v = p0[row + x]; s += v; s2 += v * v; }
      }
      const n = P * P;
      if (s2 / n - (s / n) * (s / n) < MIN_VAR) continue;

      let best = 1e12, bdx = 0, bdy = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          let ssd = 0;
          for (let y = -half; y < half && ssd < best; y++) {
            const a = (cy + y) * W + cx, b = (cy + y + dy) * W + cx + dx;
            for (let x = -half; x < half; x++) { const d = p0[a + x] - g[b + x]; ssd += d * d; }
          }
          if (ssd < best) { best = ssd; bdx = dx; bdy = dy; }
        }
      }
      flows.push([cx - W / 2, cy - H / 2, bdx, bdy]);
    }
    if (flows.length < 10) return null;

    const mdx = median(flows.map((f) => f[2]));
    const mdy = median(flows.map((f) => f[3]));
    const ratios = [];
    for (const f of flows) {
      const px = f[0], py = f[1], r2 = px * px + py * py;
      if (r2 < 24 * 24) continue;                       // muy cerca del centro: no informa
      ratios.push(((f[2] - mdx) * px + (f[3] - mdy) * py) / r2);
    }
    if (ratios.length < 8) return null;
    const out = { e: median(ratios), shift: Math.hypot(mdx, mdy), n: flows.length };
    age++;
    // la referencia se renueva cuando hubo movimiento claro, un giro, o pasaron ~16 cuadros
    if (out.shift >= 4 || Math.abs(out.e) >= 0.015 || age >= 16) { ref = g; age = 0; return out; }
    return null;
  }

  return { step, reset };
})();
