// Byte, el robot guía: personaje 3D construido en código con A-Frame/three.js (sin archivos de modelo).
// Cara de píxeles en un visor, antena luminosa, logo de la facultad en el pecho, animación de aparición y tarjeta holográfica.
// Para usar un modelo propio (.glb) bastaría reemplazar build().
(function () {
  const THREE = AFRAME.THREE;
  const mk = (parent, tag, attrs) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  // pieza con material plástico por defecto
  const P = (parent, tag, attrs) => mk(parent, tag, Object.assign({ roughness: 0.42, metalness: 0.12 }, attrs));
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

  const PURPLE = "#6d4aa8", DPURPLE = "#4a3279", BLACK = "#15131c", NEON = "#c084fc";
  const INTRO_MS = 1300;
  const VANISH_MS = 800;
  const REST = 0.32; // ángulo de reposo de los brazos (rad)

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
      this.arm = REST;
      this.nextBlink = 2000;
      this.blinkUntil = 0;
      this.faceKey = "";
      this.cardOn = false;
      this.build();
      this.buildFace();
      this.buildCard();
    },

    build() {
      const root = (this.root = mk(this.el, "a-entity", {}));

      // sombra
      mk(root, "a-circle", { radius: 0.4, rotation: "-90 0 0", position: "0 0.01 0", color: "#000", opacity: 0.25, shader: "flat" });

      // piernas y botas
      [-1, 1].forEach((s) => {
        P(root, "a-sphere", { radius: 0.085, position: `${0.13 * s} 0.4 0`, color: BLACK });
        P(root, "a-cylinder", { radius: 0.075, height: 0.22, position: `${0.13 * s} 0.27 0`, color: PURPLE });
        P(root, "a-sphere", { radius: 0.07, position: `${0.13 * s} 0.16 0.01`, color: BLACK });
        P(root, "a-sphere", { radius: 0.115, position: `${0.13 * s} 0.07 0.05`, scale: "1 0.62 1.45", color: BLACK });
        P(root, "a-sphere", { radius: 0.08, position: `${0.13 * s} 0.085 0.13`, scale: "1.15 0.5 0.8", color: DPURPLE });
      });

      // torso
      this.torso = P(root, "a-entity", { position: "0 0 0" });
      P(this.torso, "a-sphere", { radius: 0.3, position: "0 0.66 0", scale: "1 0.82 0.8", color: PURPLE });
      P(this.torso, "a-cylinder", { radius: 0.255, height: 0.07, position: "0 0.5 0", scale: "1 1 0.8", color: BLACK });          // cinturón negro
      P(this.torso, "a-sphere", { radius: 0.22, position: "0 0.69 0.13", scale: "1.15 0.82 0.42", color: DPURPLE });               // placa del pecho
      // logo de la facultad (insignia circular)
      mk(this.torso, "a-torus", { radius: 0.135, "radius-tubular": 0.016, position: "0 0.69 0.235", color: BLACK, "segments-tubular": 32, roughness: 0.3, metalness: 0.4 });
      mk(this.torso, "a-circle", { radius: 0.135, position: "0 0.69 0.234", material: "src: assets/logo.png; shader: flat; transparent: true", segments: 40 });
      // franjas decorativas
      P(this.torso, "a-box", { width: 0.2, height: 0.025, depth: 0.03, position: "0 0.55 0.2", color: BLACK });
      mk(this.torso, "a-sphere", { radius: 0.014, position: "-0.21 0.69 0.2", material: `shader: flat; color: ${NEON}` });
      mk(this.torso, "a-sphere", { radius: 0.014, position: "0.21 0.69 0.2", material: `shader: flat; color: ${NEON}` });

      // cuello
      P(root, "a-cylinder", { radius: 0.09, height: 0.1, position: "0 0.92 0", color: BLACK });

      // brazos
      const arm = (s) => {
        P(root, "a-sphere", { radius: 0.105, position: `${0.37 * s} 0.84 0`, color: PURPLE });
        const piv = mk(root, "a-entity", { position: `${0.37 * s} 0.84 0` });
        P(piv, "a-sphere", { radius: 0.07, color: BLACK });
        P(piv, "a-cylinder", { radius: 0.068, height: 0.22, position: "0 -0.14 0", color: PURPLE });
        P(piv, "a-sphere", { radius: 0.058, position: "0 -0.27 0", color: BLACK });
        const hand = mk(piv, "a-entity", { position: "0 -0.34 0" });
        P(hand, "a-sphere", { radius: 0.055, color: BLACK });
        [[-0.032, 14], [0, 0], [0.032, -14]].forEach(([x, r]) =>
          P(hand, "a-cylinder", { radius: 0.013, height: 0.075, position: `${x} -0.06 0.012`, rotation: `0 0 ${r}`, color: BLACK }));
        return piv;
      };
      this.armL = arm(-1);
      this.armR = arm(1);

      // cabeza
      const head = (this.head = mk(root, "a-entity", { position: "0 1.3 0", scale: "1.2 1.2 1.2" }));
      P(head, "a-sphere", { radius: 0.42, scale: "1.05 0.92 0.95", color: PURPLE, roughness: 0.35 });
      // auriculares laterales
      [-1, 1].forEach((s) => {
        P(head, "a-cylinder", { radius: 0.15, height: 0.12, position: `${0.45 * s} 0 0`, rotation: "0 0 90", color: DPURPLE });
        P(head, "a-cylinder", { radius: 0.09, height: 0.13, position: `${0.455 * s} 0 0`, rotation: "0 0 90", color: BLACK });
        mk(head, "a-cylinder", { radius: 0.04, height: 0.14, position: `${0.46 * s} 0 0`, rotation: "0 0 90", material: `shader: flat; color: ${NEON}` });
      });
      // placa superior y antena
      P(head, "a-sphere", { radius: 0.2, position: "0 0.36 0", scale: "1.2 0.4 1.1", color: DPURPLE });
      P(head, "a-cone", { "radius-bottom": 0.06, "radius-top": 0.025, height: 0.07, position: "0 0.42 0", color: BLACK });
      P(head, "a-cylinder", { radius: 0.011, height: 0.12, position: "0 0.5 0", color: BLACK });
      this.orb = mk(head, "a-sphere", { radius: 0.055, position: "0 0.59 0", material: `shader: flat; color: ${NEON}` });
      this.glow = mk(head, "a-sphere", { radius: 0.09, position: "0 0.59 0", material: `shader: flat; color: ${NEON}; transparent: true; opacity: 0.25` });

      const hit = mk(this.el, "a-sphere", { radius: 0.8, position: "0 0.95 0", class: "clickable", material: "opacity: 0; transparent: true" });
      hit.addEventListener("click", () => this.active && this.el.emit("mascot-tap"));
    },

    /* ---------- Visor con cara de píxeles (ojos, sonrisa, parpadeo, boca al hablar) ---------- */
    buildFace() {
      const W = 256, H = 192;
      this.faceCv = document.createElement("canvas"); this.faceCv.width = W; this.faceCv.height = H;
      this.shapeCv = document.createElement("canvas"); this.shapeCv.width = W; this.shapeCv.height = H;
      this.dotCv = document.createElement("canvas"); this.dotCv.width = W; this.dotCv.height = H;
      const d = this.dotCv.getContext("2d");
      d.fillStyle = "#fff";
      for (let y = 3; y < H; y += 6) for (let x = 3; x < W; x += 6) { d.beginPath(); d.arc(x, y, 2.3, 0, Math.PI * 2); d.fill(); }

      this.faceTex = new THREE.CanvasTexture(this.faceCv);
      this.faceTex.colorSpace = THREE.SRGBColorSpace || this.faceTex.colorSpace;
      // marco negro brillante + pantalla (casquetes de esfera aplastada, miran hacia +z)
      const cap = (a, b) => new THREE.SphereGeometry(0.3, 40, 28, Math.PI / 2 - a, 2 * a, Math.PI / 2 - b, 2 * b);
      const frame = new THREE.Mesh(cap(1.08, 0.98), new THREE.MeshStandardMaterial({ color: 0x0b0a12, roughness: 0.25, metalness: 0.45 }));
      const screen = new THREE.Mesh(cap(0.97, 0.86), new THREE.MeshBasicMaterial({ map: this.faceTex, toneMapped: false }));
      [frame, screen].forEach((m, i) => { m.position.set(0, -0.02, 0.3); m.scale.set(1.12 + i * 0.006, 0.9 + i * 0.006, 0.4 + i * 0.012); this.head.object3D.add(m); });
      this.drawFace(0, 0);
    },

    drawFace(blink, talk) {
      const W = 256, H = 192;
      const sh = this.shapeCv.getContext("2d");
      sh.clearRect(0, 0, W, H);
      sh.fillStyle = "#c9a8ff"; sh.strokeStyle = "#c9a8ff"; sh.lineCap = "round";
      // ojos (arco redondeado que se cierra al parpadear)
      [74, 182].forEach((cx) => {
        const h = 48 * (1 - blink * 0.88);
        sh.beginPath();
        sh.ellipse(cx, 78, 30, h / 2 + 4, 0, Math.PI, 0);          // parte superior curva
        sh.lineTo(cx + 30, 78 + h * 0.36); sh.lineTo(cx - 30, 78 + h * 0.36);
        sh.closePath(); sh.fill();
      });
      // boca: sonrisa o abierta al hablar
      if (talk > 0.12) {
        sh.beginPath(); sh.ellipse(128, 138, 24, 5 + talk * 17, 0, 0, Math.PI * 2); sh.fill();
      } else {
        sh.lineWidth = 9; sh.beginPath(); sh.arc(128, 118, 30, Math.PI * 0.18, Math.PI * 0.82); sh.stroke();
      }
      sh.globalCompositeOperation = "destination-in"; sh.drawImage(this.dotCv, 0, 0); sh.globalCompositeOperation = "source-over";

      const x = this.faceCv.getContext("2d");
      x.fillStyle = "#07060d"; x.fillRect(0, 0, W, H);
      x.save(); x.shadowColor = "#b46bff"; x.shadowBlur = 22; x.drawImage(this.shapeCv, 0, 0); x.restore();
      x.drawImage(this.shapeCv, 0, 0); x.drawImage(this.shapeCv, 0, 0);
      this.faceTex.needsUpdate = true;
    },

    /* ---------- Tarjeta holográfica (la explica Byte, aquí solo se muestran los puntos clave) ---------- */
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
      ctx.fillStyle = "rgba(14,10,28,0.93)";
      ctx.beginPath(); ctx.roundRect(6, 6, W - 12, H - 12, 34); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = NEON; ctx.stroke();
      ctx.fillStyle = NEON; ctx.font = `800 38px ${font}`; ctx.textBaseline = "alphabetic";
      ctx.fillText(title, pad, 70);
      ctx.font = `600 31px ${font}`; ctx.fillStyle = "#f5f0ff";
      rows.forEach((r, i) => {
        const y = 125 + (i + 1) * lh - 8;
        if (r.first && lines.length > 1) { ctx.fillStyle = "#f4c430"; ctx.fillText("•", pad, y); ctx.fillStyle = "#f5f0ff"; }
        ctx.fillText(r.t, pad + 26, y);
      });
      if (this.cardLastH !== H) { this.cardTex.dispose(); this.cardLastH = H; } // al cambiar de tamaño la textura se recrea (si no, quedan restos)
      this.cardTex.needsUpdate = true;
      this.cardH = H / W;
      this.card.position.set(0, 2.2 + (1.5 * this.cardH) / 2, 0);
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
    hide() { this.active = false; this.vanishing = false; this.hideCard(); this.speaking = false; },

    // Salida por portal: Byte gira, se encoge hacia arriba y desaparece; luego se llama a cb.
    vanish(cb) {
      if (!this.active || this.vanishing) { cb && cb(); return; }
      this.hideCard();
      this.vanishing = true;
      this.vt0 = performance.now() + 450;   // deja que el portal se abra antes
      this.vcb = cb;
      this.fxOut();
    },

    fxOut() {
      const items = [];
      const add = (tag, attrs) => { const e = mk(this.el, tag, attrs); items.push(e); return e; };
      // anillos que se cierran
      for (let i = 0; i < 3; i++) {
        add("a-ring", {
          "radius-inner": 0.82, "radius-outer": 1, rotation: "-90 0 0", position: "0 0.03 0",
          material: `shader: flat; color: ${NEON}; transparent: true; opacity: 0; side: double`,
          animation: `property: scale; from: 2.6 2.6 2.6; to: 0.2 0.2 0.2; dur: 900; delay: ${i * 160}; easing: easeInQuad`,
          animation__o: `property: material.opacity; from: 0.95; to: 0; dur: 900; delay: ${i * 160}; easing: easeInQuad`,
        });
      }
      // rayo de luz que se lleva a Byte
      add("a-cylinder", {
        radius: 0.32, height: 2.6, "open-ended": true, position: "0 1.3 0",
        material: "shader: flat; color: #e4c8ff; transparent: true; opacity: 0.45; side: double",
        animation: "property: scale; from: 1 0.02 1; to: 1 1 1; dur: 350; delay: 350; easing: easeOutCubic",
        animation__o: "property: material.opacity; from: 0.45; to: 0; dur: 500; delay: 900; easing: easeInQuad",
      });
      add("a-entity", {
        light: `type: point; color: ${NEON}; intensity: 0; distance: 8`, position: "0 0.9 0.6",
        animation: "property: light.intensity; from: 0; to: 5; dur: 300; delay: 700",
        animation__b: "property: light.intensity; from: 5; to: 0; dur: 500; delay: 1000",
      });
      // chispas que suben y se juntan
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 1.0, h = 0.2 + Math.random() * 1.2;
        const dur = 600 + Math.random() * 500, delay = Math.random() * 350;
        add("a-sphere", {
          radius: 0.03 + Math.random() * 0.03, position: `${Math.cos(a) * r} ${h} ${Math.sin(a) * r}`,
          material: `shader: flat; color: ${Math.random() > 0.5 ? NEON : "#7dd3fc"}; transparent: true`,
          animation: `property: position; to: 0 ${1.2 + Math.random() * 0.8} 0; dur: ${dur}; delay: ${delay}; easing: easeInQuad`,
          animation__o: `property: material.opacity; from: 1; to: 0; dur: ${dur}; delay: ${delay}; easing: easeInQuad`,
        });
      }
      setTimeout(() => items.forEach((e) => e.parentNode && e.parentNode.removeChild(e)), 2200);
    },

    fx() {
      const items = [];
      const add = (tag, attrs) => { const e = mk(this.el, tag, attrs); items.push(e); return e; };
      for (let i = 0; i < 3; i++) {
        add("a-ring", {
          "radius-inner": 0.82, "radius-outer": 1, rotation: "-90 0 0", position: "0 0.03 0",
          material: `shader: flat; color: ${NEON}; transparent: true; opacity: 0.95; side: double`,
          animation: `property: scale; from: 0.2 0.2 0.2; to: 2.6 2.6 2.6; dur: 1000; delay: ${i * 200}; easing: easeOutQuad`,
          animation__o: `property: material.opacity; from: 0.95; to: 0; dur: 1000; delay: ${i * 200}; easing: easeInQuad`,
        });
      }
      add("a-cylinder", {
        radius: 0.32, height: 2.6, "open-ended": true, position: "0 1.3 0",
        material: "shader: flat; color: #e4c8ff; transparent: true; opacity: 0.4; side: double",
        animation: "property: scale; from: 1 0.02 1; to: 1 1 1; dur: 450; easing: easeOutCubic",
        animation__o: "property: material.opacity; from: 0.4; to: 0; dur: 900; delay: 500; easing: easeInQuad",
      });
      add("a-entity", {
        light: `type: point; color: ${NEON}; intensity: 0; distance: 8`, position: "0 0.9 0.6",
        animation: "property: light.intensity; from: 0; to: 5; dur: 250",
        animation__b: "property: light.intensity; from: 5; to: 0; dur: 700; delay: 300",
      });
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 1.1, h = 0.3 + Math.random() * 1.7;
        const dur = 800 + Math.random() * 900;
        add("a-sphere", {
          radius: 0.03 + Math.random() * 0.03, position: "0 0.1 0",
          material: `shader: flat; color: ${Math.random() > 0.5 ? NEON : "#7dd3fc"}; transparent: true`,
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
      if (this.vanishing) {
        const p = Math.min(1, Math.max(0, (now - this.vt0) / VANISH_MS));
        sc = Math.max(0.0001, 1 - p * p * p);
        introY = p * p * 1.1;
        introRot = p * p * Math.PI * 5;
        if (p >= 1) {
          this.vanishing = false; this.active = false;
          const cb = this.vcb; this.vcb = null;
          if (cb) cb();
        }
      } else if (el < INTRO_MS) {
        const p = el / INTRO_MS;
        sc = Math.max(0.0001, easeOutBack(Math.min(1, p * 1.1)));
        introY = Math.sin(Math.PI * p) * 0.9;
        introRot = (1 - easeOutCubic(p)) * Math.PI * 4;
      } else {
        const q = (el - INTRO_MS) / 1000;
        if (q < 0.7) introY = Math.abs(Math.sin(q * Math.PI * 2.6)) * 0.14 * (1 - q / 0.7);
      }
      o.scale.setScalar(sc);
      o.rotation.y = introRot;
      o.position.y = introY + Math.sin(t * 2) * 0.025 + (this.speaking ? Math.abs(Math.sin(t * 9)) * 0.012 : 0);

      // ---- vida ----
      this.head.object3D.rotation.z = Math.sin(t * 1.3) * 0.05;
      this.head.object3D.rotation.y = Math.sin(t * 0.7) * 0.2;
      this.head.object3D.rotation.x = this.speaking ? Math.sin(t * 6) * 0.045 : Math.sin(t * 0.9) * 0.02;
      this.torso.object3D.scale.y = 1 + Math.sin(t * 2.2) * 0.012;

      // antena que respira
      const pulse = 1 + Math.sin(t * 4) * 0.18 + (this.speaking ? Math.abs(Math.sin(t * 12)) * 0.25 : 0);
      this.orb.object3D.scale.setScalar(pulse);
      this.glow.object3D.scale.setScalar(pulse * (1.1 + Math.sin(t * 4) * 0.2));

      // cara: parpadeo y boca
      if (time > this.nextBlink) { this.blinkUntil = time + 140; this.nextBlink = time + 2400 + Math.random() * 2600; }
      const blink = time < this.blinkUntil ? 1 : 0;
      const talk = this.speaking ? Math.abs(Math.sin(t * 13)) : 0;
      const key = blink + "|" + Math.round(talk * 6);
      if (key !== this.faceKey) { this.faceKey = key; this.drawFace(blink, Math.round(talk * 6) / 6); }

      // brazos: balanceo suave y saludo
      const waving = now < this.waveUntil;
      const target = waving ? 2.3 + Math.sin(t * 11) * 0.35 : REST + Math.sin(t * 1.7 + 1) * 0.04;
      this.arm += (target - this.arm) * Math.min(1, dt / 90);
      this.armR.object3D.rotation.z = this.arm;
      this.armL.object3D.rotation.z = -(REST + Math.sin(t * 1.7) * 0.04);

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
