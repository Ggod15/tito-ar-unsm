// Tito, el mono tocón: personaje 3D con primitivas de A-Frame, animación de aparición y tarjeta holográfica.
(function () {
  const THREE = AFRAME.THREE;
  const mk = (parent, tag, attrs) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

  const FUR = "#7b5a3c", FACE = "#f0a860", BELLY = "#f3dfc0";
  const INTRO_MS = 1300;

  function wrapText(ctx, text, maxW) {
    const words = text.split(" "), out = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    });
    if (line) out.push(line);
    return out;
  }

  AFRAME.registerComponent("mascot", {
    init() {
      this.active = false;
      this.t0 = 0;
      this.speaking = false;
      this.waveUntil = 0;
      this.arm = 0.15;
      this.nextBlink = 2000;
      this.blinkUntil = 0;
      this.cardOn = false;
      this.build();
      this.buildCard();
    },

    build() {
      const root = (this.root = mk(this.el, "a-entity", {}));

      mk(root, "a-circle", { radius: 0.4, rotation: "-90 0 0", position: "0 0.01 0", color: "#000", opacity: 0.25, shader: "flat" });
      mk(root, "a-sphere", { radius: 0.32, position: "0 0.55 0", scale: "1 1.15 0.9", color: FUR });
      mk(root, "a-sphere", { radius: 0.22, position: "0 0.52 0.2", scale: "1 1.1 0.5", color: BELLY });
      [-0.15, 0.15].forEach((x) => mk(root, "a-sphere", { radius: 0.12, position: `${x} 0.14 0.05`, scale: "1 1 1.4", color: FUR }));
      mk(root, "a-torus", { radius: 0.28, "radius-tubular": 0.045, arc: 220, position: "-0.05 0.45 -0.3", rotation: "0 90 60", color: FUR, "segments-tubular": 24 });

      const armL = mk(root, "a-entity", { position: "-0.34 0.82 0.02", rotation: "0 0 -8" });
      mk(armL, "a-cylinder", { radius: 0.06, height: 0.36, position: "0 -0.17 0", color: FUR });
      mk(armL, "a-sphere", { radius: 0.075, position: "0 -0.36 0", color: FACE });

      this.armR = mk(root, "a-entity", { position: "0.34 0.82 0.02" });
      mk(this.armR, "a-cylinder", { radius: 0.06, height: 0.36, position: "0 -0.17 0", color: FUR });
      mk(this.armR, "a-sphere", { radius: 0.075, position: "0 -0.36 0", color: FACE });

      const head = (this.head = mk(root, "a-entity", { position: "0 1.18 0" }));
      mk(head, "a-sphere", { radius: 0.32, color: FUR });
      mk(head, "a-sphere", { radius: 0.24, position: "0 -0.03 0.15", scale: "1.05 0.95 0.75", color: FACE });
      [-1, 1].forEach((s) => {
        mk(head, "a-sphere", { radius: 0.09, position: `${0.3 * s} 0.04 -0.02`, color: FUR });
        mk(head, "a-sphere", { radius: 0.05, position: `${0.31 * s} 0.04 0.03`, color: FACE });
      });
      this.eyes = mk(head, "a-entity", { position: "0 0.06 0" });
      [-1, 1].forEach((s) => {
        mk(this.eyes, "a-sphere", { radius: 0.055, position: `${0.095 * s} 0 0.295`, color: "#fff" });
        mk(this.eyes, "a-sphere", { radius: 0.03, position: `${0.095 * s} 0 0.34`, color: "#111" });
      });
      mk(head, "a-sphere", { radius: 0.025, position: "0 -0.02 0.355", scale: "1.4 1 1", color: "#3a2415" });
      this.mouth = mk(head, "a-sphere", { radius: 0.05, position: "0 -0.1 0.335", scale: "1.7 0.4 0.5", color: "#7a1f1f" });

      const cap = mk(head, "a-entity", { position: "0 0.3 0", rotation: "0 20 0" });
      mk(cap, "a-cylinder", { radius: 0.2, height: 0.12, position: "0 -0.02 0", color: "#1d3557" });
      mk(cap, "a-box", { width: 0.58, height: 0.035, depth: 0.58, position: "0 0.06 0", color: "#1d3557" });
      mk(cap, "a-cylinder", { radius: 0.006, height: 0.25, position: "0.26 -0.05 0.26", color: "#f4c430" });
      mk(cap, "a-sphere", { radius: 0.025, position: "0.26 -0.18 0.26", color: "#f4c430" });

      this.hologram = mk(root, "a-text", { value: "</>", align: "center", color: "#5eead4", width: 1.4, position: "-0.75 0.95 0.1", "wrap-count": 6 });

      const hit = mk(this.el, "a-sphere", { radius: 0.75, position: "0 0.85 0", class: "clickable", material: "opacity: 0; transparent: true" });
      hit.addEventListener("click", () => this.active && this.el.emit("mascot-tap"));
    },

    /* ---------- Tarjeta holográfica (la explica Tito, aquí solo se muestran los puntos clave) ---------- */
    buildCard() {
      this.cardCanvas = document.createElement("canvas");
      this.cardCanvas.width = 720; this.cardCanvas.height = 300;
      this.cardTex = new THREE.CanvasTexture(this.cardCanvas);
      const mat = new THREE.MeshBasicMaterial({ map: this.cardTex, transparent: true, side: THREE.DoubleSide, depthTest: false });
      this.card = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), mat);
      this.card.renderOrder = 10;
      this.card.visible = false;
      this.el.object3D.add(this.card);
      this.camPos = new THREE.Vector3();
    },

    showCard(title, lines) {
      const W = 720, pad = 36, lh = 44;
      const cv = this.cardCanvas, ctx = cv.getContext("2d");
      const font = "system-ui, 'Segoe UI', Roboto, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
      ctx.font = `600 31px ${font}`;
      const rows = [];
      lines.forEach((l) => wrapText(ctx, l, W - pad * 2 - 26).forEach((r, i) => rows.push({ t: r, first: i === 0 })));
      const H = Math.max(190, 112 + rows.length * lh + pad);
      cv.height = H;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8,24,36,0.93)";
      ctx.beginPath(); ctx.roundRect(6, 6, W - 12, H - 12, 34); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = "#5eead4"; ctx.stroke();
      ctx.fillStyle = "#5eead4"; ctx.font = `800 38px ${font}`; ctx.textBaseline = "alphabetic";
      ctx.fillText(title, pad, 70);
      ctx.font = `600 31px ${font}`; ctx.fillStyle = "#f1f6f9";
      rows.forEach((r, i) => {
        const y = 125 + (i + 1) * lh - 8;
        if (r.first && lines.length > 1) { ctx.fillStyle = "#f4c430"; ctx.fillText("•", pad, y); ctx.fillStyle = "#f1f6f9"; }
        ctx.fillText(r.t, pad + 26, y);
      });
      this.cardTex.needsUpdate = true;
      this.cardH = H / W;
      this.card.position.set(0, 1.78 + (1.5 * this.cardH) / 2, 0);
      this.cardT = performance.now();
      this.cardOn = true;
      this.card.visible = true;
    },
    hideCard() { this.cardOn = false; this.card.visible = false; },

    /* ---------- Aparición espectacular ---------- */
    appear() {
      this.active = true;
      this.t0 = performance.now() + 350;
      this.hideCard();
      this.fx();
      setTimeout(() => this.wave(2600), 350 + INTRO_MS + 300);
    },
    hide() { this.active = false; this.hideCard(); this.speaking = false; },

    fx() {
      const items = [];
      const add = (tag, attrs) => { const e = mk(this.el, tag, attrs); items.push(e); return e; };
      // anillos de portal
      for (let i = 0; i < 3; i++) {
        add("a-ring", {
          "radius-inner": 0.82, "radius-outer": 1, rotation: "-90 0 0", position: "0 0.03 0",
          material: "shader: flat; color: #5eead4; transparent: true; opacity: 0.95; side: double",
          animation: `property: scale; from: 0.2 0.2 0.2; to: 2.6 2.6 2.6; dur: 1000; delay: ${i * 200}; easing: easeOutQuad`,
          animation__o: `property: material.opacity; from: 0.95; to: 0; dur: 1000; delay: ${i * 200}; easing: easeInQuad`,
        });
      }
      // rayo de luz
      add("a-cylinder", {
        radius: 0.32, height: 2.6, "open-ended": true, position: "0 1.3 0",
        material: "shader: flat; color: #9ff5e6; transparent: true; opacity: 0.4; side: double",
        animation: "property: scale; from: 1 0.02 1; to: 1 1 1; dur: 450; easing: easeOutCubic",
        animation__o: "property: material.opacity; from: 0.4; to: 0; dur: 900; delay: 500; easing: easeInQuad",
      });
      // destello de luz
      add("a-entity", {
        light: "type: point; color: #5eead4; intensity: 0; distance: 8", position: "0 0.9 0.6",
        animation: "property: light.intensity; from: 0; to: 5; dur: 250",
        animation__b: "property: light.intensity; from: 5; to: 0; dur: 700; delay: 300",
      });
      // chispas
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 1.1, h = 0.3 + Math.random() * 1.7;
        const dur = 800 + Math.random() * 900;
        add("a-sphere", {
          radius: 0.03 + Math.random() * 0.03, position: "0 0.1 0",
          material: `shader: flat; color: ${Math.random() > 0.5 ? "#5eead4" : "#f4c430"}; transparent: true`,
          animation: `property: position; to: ${Math.cos(a) * r} ${h} ${Math.sin(a) * r}; dur: ${dur}; easing: easeOutQuad`,
          animation__o: `property: material.opacity; from: 1; to: 0; dur: ${dur}; easing: easeInQuad`,
        });
      }
      setTimeout(() => items.forEach((e) => e.parentNode && e.parentNode.removeChild(e)), 2600);
    },

    setSpeaking(on) { this.speaking = on; },
    wave(ms = 2600) { this.waveUntil = performance.now() + ms; },

    tick(time, dt) {
      const now = performance.now();
      const t = time / 1000;
      const o = this.root.object3D;

      // ---- entrada ----
      if (!this.active || now < this.t0) { o.scale.setScalar(0.0001); return; }
      const el = now - this.t0;
      let sc = 1, introY = 0, introRot = 0;
      if (el < INTRO_MS) {
        const p = el / INTRO_MS;
        sc = Math.max(0.0001, easeOutBack(Math.min(1, p * 1.1)));
        introY = Math.sin(Math.PI * p) * 0.9;           // sale disparado del QR
        introRot = (1 - easeOutCubic(p)) * Math.PI * 4;  // gira dos vueltas
      } else {
        const q = (el - INTRO_MS) / 1000;                // rebote al aterrizar
        if (q < 0.7) introY = Math.abs(Math.sin(q * Math.PI * 2.6)) * 0.14 * (1 - q / 0.7);
      }
      o.scale.setScalar(sc);
      o.rotation.y = introRot;
      o.position.y = introY + Math.sin(t * 2) * 0.03 + (this.speaking ? Math.abs(Math.sin(t * 9)) * 0.015 : 0);

      // ---- vida ----
      this.head.object3D.rotation.z = Math.sin(t * 1.3) * 0.06;
      this.head.object3D.rotation.y = Math.sin(t * 0.7) * 0.18;
      this.mouth.object3D.scale.y = this.speaking ? 0.3 + Math.abs(Math.sin(t * 13)) * 0.9 : 0.4;

      if (time > this.nextBlink) { this.blinkUntil = time + 130; this.nextBlink = time + 2500 + Math.random() * 2500; }
      this.eyes.object3D.scale.y = time < this.blinkUntil ? 0.1 : 1;

      const target = now < this.waveUntil ? 2.25 + Math.sin(t * 11) * 0.35 : 0.15;
      this.arm += (target - this.arm) * Math.min(1, dt / 90);
      this.armR.object3D.rotation.z = this.arm;

      this.hologram.object3D.position.y = 0.95 + Math.sin(t * 2.4) * 0.05;

      // ---- tarjeta: aparece con rebote y siempre mira a la cámara ----
      if (this.cardOn) {
        const s = easeOutBack(Math.min(1, (now - this.cardT) / 350));
        this.card.scale.set(Math.max(0.001, s), Math.max(0.001, s) * this.cardH, 1);
        this.el.sceneEl.camera.getWorldPosition(this.camPos);
        this.card.lookAt(this.camPos);
      }
    },
  });
})();
