// Escenas 3D que acompañan la explicación de Byte (una por zona).
//   logo  -> logo de la facultad girando
//   orbit -> íconos (carreras / áreas) girando alrededor; Byte resalta los que va nombrando
//   tower -> la malla curricular como una torre de 10 pisos
//   lab   -> una PC que se desarma y luego una red con paquetes viajando
// Cada escena devuelve { group, update(t, now, cam, dt), setStage(i, part), dispose() }.
window.SceneKit = (function () {
  const THREE = AFRAME.THREE;
  const V3 = THREE.Vector3;
  const NEON = 0xc084fc, PUR = 0x6d4aa8, DPUR = 0x4a3279, BLK = 0x15131c, GOLD = 0xf4c430, CYAN = 0x7dd3fc;
  const FONT = "system-ui, 'Segoe UI', Roboto, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";

  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.15 }, o || {}));
  const bas = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 16), m);

  function tex(w, h, draw) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const rr = (x, X, Y, W, H, R) => { x.beginPath(); x.roundRect(X, Y, W, H, R); };

  function label(text, w) {
    w = w || 0.5;
    const t = tex(384, 100, (x, W, H) => {
      x.fillStyle = "rgba(18,10,36,.9)"; rr(x, 3, 3, W - 6, H - 6, 26); x.fill();
      x.lineWidth = 4; x.strokeStyle = "#c084fc"; x.stroke();
      x.fillStyle = "#fff"; x.font = `700 44px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(text, W / 2, H / 2 + 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.26), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.renderOrder = 8; m.userData.bill = true;
    return m;
  }

  function icon(emoji, text) {
    const t = tex(256, 256, (x, W, H) => {
      const gr = x.createRadialGradient(W / 2, 110, 10, W / 2, 110, 110);
      gr.addColorStop(0, "rgba(124,58,237,.95)"); gr.addColorStop(1, "rgba(30,12,60,.92)");
      x.fillStyle = gr; x.beginPath(); x.arc(W / 2, 110, 104, 0, Math.PI * 2); x.fill();
      x.lineWidth = 6; x.strokeStyle = "#c084fc"; x.stroke();
      x.font = `110px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff";
      x.fillText(emoji, W / 2, 118);
      x.font = `700 32px ${FONT}`; x.fillStyle = "#fff";
      x.fillText(text, W / 2, 232);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.renderOrder = 7; m.userData.bill = true;
    return m;
  }

  function link(a, b, color, op) {
    const d = new V3().subVectors(b, a), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, len, 6), bas(color || NEON, { transparent: true, opacity: op || 0.7 }));
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    return m;
  }

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
  }

  function base(g) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.5, 48), bas(NEON, { transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  }

  const bills = (g, cam) => g.traverse((o) => { if (o.userData.bill) o.lookAt(cam); });

  /* ---------------- logo ---------------- */
  function logo() {
    const g = new THREE.Group();
    const t = new THREE.TextureLoader().load("assets/logo.png");
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    const holder = new THREE.Group(); holder.position.y = 0.95; g.add(holder);
    holder.add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: true })));
    holder.add(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.02, 12, 64), bas(NEON)));
    base(g);
    const orbs = [0, 1, 2].map((i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), bas(i % 2 ? CYAN : GOLD)); g.add(s); return s; });
    return {
      group: g,
      update(time) {
        holder.rotation.y = Math.sin(time * 0.8) * 0.75;
        holder.position.y = 0.95 + Math.sin(time * 1.6) * 0.03;
        orbs.forEach((s, i) => { const a = time * 1.2 + (i * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 0.62, 0.95 + Math.sin(a * 1.3) * 0.15, Math.sin(a) * 0.62); });
      },
      setStage() {},
      dispose() { disposeGroup(g); },
    };
  }

  /* ---------------- orbit (íconos girando) ---------------- */
  function orbit(data) {
    const items = data.items || [];
    const n = items.length || 1;
    const g = new THREE.Group();
    base(g);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), bas(NEON, { wireframe: true }));
    core.position.y = 0.95; g.add(core);
    const cards = items.map((it) => { const m = icon(it.i, it.t); g.add(m); return m; });
    let focus = [];
    return {
      group: g,
      update(time, now, cam) {
        core.rotation.y = time; core.rotation.x = time * 0.6;
        cards.forEach((m, i) => {
          const a = time * 0.55 + (i * Math.PI * 2) / n;
          m.position.set(Math.cos(a) * 0.52, 0.95 + Math.sin(time * 1.3 + i) * 0.05, Math.sin(a) * 0.52);
          const on = focus.length ? focus.includes(i) : true;
          const target = focus.length ? (on ? 1.45 : 0.7) : 1;
          const s = m.scale.x + (target - m.scale.x) * 0.12;
          m.scale.setScalar(s);
          m.material.opacity = m.material.opacity + ((on ? 1 : 0.45) - m.material.opacity) * 0.12;
        });
        bills(g, cam);
      },
      setStage(i, part) { focus = (part && part.focus) || []; },
      dispose() { disposeGroup(g); },
    };
  }

  /* ---------------- tower (malla curricular) ---------------- */
  function tower() {
    const g = new THREE.Group();
    const N = 10, roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    const ranges = [[], [0, 1, 2], [3, 4, 5], [6, 7, 8], [9]];
    let stage = 0, t0 = performance.now();
    const slab = box(0.72, 0.04, 0.52, std(BLK)); slab.position.y = 0.06; g.add(slab);
    const floors = [];
    for (let i = 0; i < N; i++) {
      const col = new THREE.Color("#4c1d95").lerp(new THREE.Color("#e9d5ff"), i / (N - 1));
      const mat = std(col, { emissive: 0x000000 });
      const m = box(0.58, 0.082, 0.42, mat);
      m.position.set(0, 0.14 + i * 0.1, 0);
      const lt = tex(128, 64, (x, W, H) => {
        x.fillStyle = "rgba(15,8,30,.82)"; rr(x, 2, 2, W - 4, H - 4, 14); x.fill();
        x.fillStyle = "#fff"; x.font = `800 42px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(roman[i], W / 2, H / 2 + 2);
      });
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.07), new THREE.MeshBasicMaterial({ map: lt, transparent: true }));
      lab.position.z = 0.212; m.add(lab);
      g.add(m);
      floors.push({ m, mat, base: col.clone(), y: 0.14 + i * 0.1 });
    }
    // birrete en la cima
    const cap = new THREE.Group();
    cap.add(cyl(0.09, 0.07, std(BLK)));
    const board = box(0.34, 0.02, 0.34, std(BLK)); board.position.y = 0.05; cap.add(board);
    const tassel = cyl(0.006, 0.12, bas(GOLD), 6); tassel.position.set(0.15, -0.0, 0.15); cap.add(tassel);
    g.add(cap);
    return {
      group: g,
      update(time, now) {
        g.rotation.y = 0.35 + Math.sin(time * 0.5) * 0.3;
        const age = (now - t0) / 1000;
        const hi = ranges[stage] || [];
        floors.forEach((f, i) => {
          const p = clamp((age - i * 0.14) / 0.4, 0, 1);
          f.m.scale.y = Math.max(0.001, easeOutBack(p));
          const on = hi.includes(i), dim = hi.length && !on;
          f.m.position.z += ((on ? 0.07 : 0) - f.m.position.z) * 0.15;
          f.mat.emissive.setHex(on ? 0x6d28d9 : 0x000000);
          f.mat.color.copy(f.base).multiplyScalar(dim ? 0.5 : 1);
        });
        const topP = clamp((age - N * 0.14) / 0.4, 0, 1);
        cap.scale.setScalar(Math.max(0.001, easeOutBack(topP)));
        cap.position.set(0, 0.14 + (N - 1) * 0.1 + 0.16 + Math.sin(time * 2) * 0.02, 0);
        cap.rotation.y = time * 0.8;
      },
      setStage(i) { stage = clamp(i, 0, 4); },
      dispose() { disposeGroup(g); },
    };
  }

  /* ---------------- lab (PC que se desarma + red con paquetes) ---------------- */
  function lab() {
    const g = new THREE.Group();
    base(g);
    let stage = 0, t0 = performance.now();

    // ===== PC =====
    const pc = new THREE.Group(); g.add(pc);
    const parts = [];
    const add = (obj, home, away, text) => {
      obj.position.copy(home); pc.add(obj);
      let l = null;
      if (text) { l = label(text, 0.46); l.scale.setScalar(0.001); pc.add(l); }
      parts.push({ obj, home, away, l });
    };
    // monitor
    const monitor = new THREE.Group();
    monitor.add(box(0.54, 0.34, 0.03, std(BLK)));
    const scr = tex(256, 160, (x, W, H) => {
      x.fillStyle = "#0b0716"; x.fillRect(0, 0, W, H);
      const cols = ["#c084fc", "#7dd3fc", "#f4c430", "#86efac"];
      for (let i = 0; i < 9; i++) { x.fillStyle = cols[i % 4]; x.fillRect(16 + (i % 3) * 14, 14 + i * 15, 40 + ((i * 37) % 120), 6); }
    });
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), bas(0xffffff, { map: scr })); disp.position.z = 0.017; monitor.add(disp);
    const stand = cyl(0.02, 0.1, std(BLK)); stand.position.y = -0.21; monitor.add(stand);
    const foot = box(0.2, 0.015, 0.1, std(BLK)); foot.position.y = -0.265; monitor.add(foot);
    add(monitor, new V3(-0.1, 0.78, 0), new V3(-0.2, 1.36, 0), "Monitor");
    // gabinete (se vuelve transparente)
    const caseMat = std(DPUR, { transparent: true, opacity: 1 });
    const pcase = box(0.2, 0.44, 0.38, caseMat);
    add(pcase, new V3(0.36, 0.3, 0), new V3(0.4, 0.3, 0), "Gabinete");
    // teclado
    add(box(0.42, 0.02, 0.14, std(BLK)), new V3(-0.1, 0.1, 0.22), new V3(-0.18, 0.06, 0.42), null);
    // componentes internos (salen del gabinete)
    const inner = new V3(0.36, 0.3, 0);
    const mobo = box(0.26, 0.016, 0.26, std(0x2d1b69)); const chip = box(0.06, 0.02, 0.06, std(BLK)); chip.position.set(0.04, 0.016, 0.03); mobo.add(chip);
    add(mobo, inner.clone(), new V3(0.42, 1.0, 0.05), "Placa madre");
    const cpu = box(0.08, 0.025, 0.08, std(BLK)); const gold = box(0.09, 0.008, 0.09, std(GOLD, { metalness: 0.6 })); gold.position.y = -0.016; cpu.add(gold);
    add(cpu, inner.clone(), new V3(-0.34, 0.78, 0.1), "CPU");
    const ram = new THREE.Group(); [0, 1].forEach((k) => { const s = box(0.014, 0.1, 0.06, std(0x1f7a4c)); s.position.x = k * 0.04; ram.add(s); });
    add(ram, inner.clone(), new V3(-0.08, 0.64, 0.1), "RAM");
    const ssd = box(0.13, 0.016, 0.09, std(0x9ca3af, { metalness: 0.5 }));
    add(ssd, inner.clone(), new V3(-0.32, 0.42, 0.1), "SSD");

    // ===== Red =====
    const net = new THREE.Group(); net.scale.setScalar(0.001); g.add(net);
    const P = { net: new V3(0, 1.42, 0), router: new V3(0, 1.1, 0), sw: new V3(0, 0.78, 0) };
    const pcs = [new V3(-0.46, 0.4, 0), new V3(-0.16, 0.34, 0.12), new V3(0.16, 0.34, 0.12)];
    const srv = new V3(0.46, 0.42, 0);
    // nube
    [[-0.09, 0], [0.09, 0], [0, 0.05]].forEach(([x, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), bas(0xe9d5ff)); s.position.set(P.net.x + x, P.net.y + y, 0); net.add(s); });
    const rtr = box(0.24, 0.06, 0.14, std(DPUR)); rtr.position.copy(P.router); net.add(rtr);
    [-0.08, 0.08].forEach((x) => { const a = cyl(0.008, 0.12, std(BLK), 6); a.position.set(P.router.x + x, P.router.y + 0.09, 0); a.rotation.z = x * 2; net.add(a); });
    const sw = box(0.32, 0.05, 0.12, std(BLK)); sw.position.copy(P.sw); net.add(sw);
    [-0.1, -0.033, 0.033, 0.1].forEach((x) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), bas(NEON)); d.position.set(P.sw.x + x, P.sw.y + 0.03, 0.062); net.add(d); });
    pcs.forEach((p) => {
      const m = new THREE.Group();
      m.add(box(0.15, 0.1, 0.02, std(BLK)));
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.08), bas(0xffffff, { map: scr })); d.position.z = 0.011; m.add(d);
      const f = box(0.06, 0.012, 0.05, std(BLK)); f.position.y = -0.065; m.add(f);
      m.position.copy(p); net.add(m);
    });
    const server = box(0.14, 0.22, 0.12, std(DPUR)); server.position.copy(srv); net.add(server);
    [0.07, 0.02, -0.03, -0.08].forEach((y) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), bas(GOLD)); d.position.set(srv.x - 0.04, srv.y + y, 0.062); net.add(d); });
    const nl = [["Internet", P.net, 0.19], ["Router", P.router, 0.1], ["Switch", P.sw, 0.08], ["Servidor", srv, 0.19]];
    nl.forEach(([t, p, dy]) => { const l = label(t, 0.4); l.position.set(p.x, p.y + dy + 0.08, 0.05); net.add(l); });
    const pl = label("PCs", 0.3); pl.position.set(-0.3, 0.16, 0.12); net.add(pl);

    const links = [[P.net, P.router], [P.router, P.sw], [P.sw, pcs[0]], [P.sw, pcs[1]], [P.sw, pcs[2]], [P.sw, srv]];
    links.forEach(([a, b]) => net.add(link(a, b)));
    const packets = [];
    links.forEach(([a, b], li) => {
      for (let k = 0; k < 2; k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), bas([NEON, CYAN, GOLD][(li + k) % 3]));
        net.add(s);
        packets.push({ s, a, b, ph: k * 0.5 + li * 0.13, sp: 0.35 + (li % 3) * 0.1, dir: k ? -1 : 1 });
      }
    });

    return {
      group: g,
      update(time, now, cam, dt) {
        const k = Math.min(1, (dt || 16) / 180);
        const pcT = stage === 0 ? 1 : 0, netT = stage === 1 ? 1 : 0;
        pc.scale.setScalar(Math.max(0.001, pc.scale.x + (pcT - pc.scale.x) * k));
        net.scale.setScalar(Math.max(0.001, net.scale.x + (netT - net.scale.x) * k));
        pc.visible = pc.scale.x > 0.01; net.visible = net.scale.x > 0.01;
        g.rotation.y = Math.sin(time * 0.5) * 0.4;

        if (pc.visible) {
          const age = (now - t0) / 1000;
          const p = easeInOut(clamp((age - 1.6) / 1.4, 0, 1));
          caseMat.opacity = 1 - p * 0.85;
          parts.forEach((q, i) => {
            q.obj.position.lerpVectors(q.home, q.away, p);
            if (p > 0.95) q.obj.position.y += Math.sin(time * 1.5 + i) * 0.015;
            if (q.l) {
              q.l.position.set(q.obj.position.x, q.obj.position.y + 0.2, q.obj.position.z + 0.1);
              const ls = clamp((p - 0.85) / 0.15, 0, 1);
              q.l.scale.setScalar(Math.max(0.001, easeOutBack(ls)));
            }
          });
          mobo.rotation.y = p * time * 0.4; cpu.rotation.y = p * time * 0.8;
        }
        if (net.visible) {
          packets.forEach((q) => {
            let u = (time * q.sp + q.ph) % 1; if (q.dir < 0) u = 1 - u;
            q.s.position.lerpVectors(q.a, q.b, u);
          });
        }
        bills(g, cam);
      },
      setStage(i) { if (i !== stage) { stage = i === 1 ? 1 : 0; if (stage === 0) t0 = performance.now(); } },
      dispose() { disposeGroup(g); },
    };
  }

  function create(type, data) {
    switch (type) {
      case "logo": return logo();
      case "orbit": return orbit(data || {});
      case "tower": return tower();
      case "lab": return lab();
      default: return null;
    }
  }
  return { create };
})();
