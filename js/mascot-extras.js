// Interacción de Byte: escenas 3D a su lado, botones 3D para responder, reacciones (salto, baile, giro, "no") y giro con el dedo.
// Extiende el componente "mascot" de mascot.js (por eso este archivo debe cargarse después de él).
(function () {
  const THREE = AFRAME.THREE;
  const proto = AFRAME.components.mascot.Component.prototype;
  const init0 = proto.init, tick0 = proto.tick, hide0 = proto.hide;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const FONT = "system-ui, 'Segoe UI', Roboto, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  const SIDE = 0.55;          // cuánto se corre Byte (y cuánto se aparta la escena) cuando hay escena o botones
  const DUR = { jump: 900, spin: 900, dance: 3200, no: 800 };

  proto.init = function () {
    init0.call(this);
    this.slide = 0; this.slideTarget = 0;
    this.userYaw = 0; this.userYawT = 0;
    this.reactType = null; this.reactT0 = 0; this.reactIdx = -1;
    this.sceneObj = null; this.sceneT0 = 0; this.sceneOut = 0;
    this.choices = []; this.choicesT0 = 0;
    this.hitEl = this.el.querySelector(".clickable");
  };

  proto.hide = function () {
    hide0.call(this);
    this.hideScene(true);
    this.hideChoices(true);
    this.userYaw = 0; this.reactType = null; this.slide = 0; this.slideTarget = 0;
  };

  /* ---------- Escenas 3D ---------- */
  proto.showScene = function (type, data) {
    if (!window.SceneKit || !type) return;
    this.hideScene(true);
    const s = SceneKit.create(type, data);
    if (!s) return;
    s.group.position.set(-SIDE, 0, 0.1);
    s.group.scale.setScalar(0.001);
    this.el.object3D.add(s.group);
    this.sceneObj = s; this.sceneT0 = performance.now(); this.sceneOut = 0;
    this.slideTarget = SIDE;
  };
  proto.sceneStage = function (i, part) { if (this.sceneObj) this.sceneObj.setStage(i, part); };
  proto.hideScene = function (immediate) {
    const s = this.sceneObj;
    if (s) {
      if (immediate) { this.el.object3D.remove(s.group); s.dispose(); this.sceneObj = null; }
      else if (!this.sceneOut) this.sceneOut = performance.now();
    }
    if (!this.choices.length) this.slideTarget = 0;
  };

  /* ---------- Botones 3D ---------- */
  function drawChoice(mesh, state) {
    const cv = mesh.userData.cv, x = cv.getContext("2d"), W = cv.width, H = cv.height;
    const pal = {
      idle: ["#5b21b6", "#8b5cf6", "#c084fc"], ok: ["#15803d", "#22c55e", "#bbf7d0"],
      bad: ["#991b1b", "#ef4444", "#fecaca"], dim: ["#241638", "#2f1d4a", "#5b4a7a"],
    }[state];
    x.clearRect(0, 0, W, H);
    const gr = x.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    x.fillStyle = gr; x.beginPath(); x.roundRect(5, 5, W - 10, H - 10, 40); x.fill();
    x.lineWidth = 6; x.strokeStyle = pal[2]; x.stroke();
    let tx = 36;
    if (mesh.userData.letter) {
      x.fillStyle = "rgba(255,255,255,.2)"; x.beginPath(); x.arc(70, H / 2, 38, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#fff"; x.font = `800 44px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(mesh.userData.letter, 70, H / 2 + 3);
      tx = 124;
    }
    x.fillStyle = state === "dim" ? "#9d8bb8" : "#fff"; x.font = `700 34px ${FONT}`; x.textAlign = "left"; x.textBaseline = "middle";
    const maxW = W - tx - 26, words = mesh.userData.txt.split(" "), lines = [];
    let line = "";
    words.forEach((w) => { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    lines.push(line);
    const lh = 40, y0 = H / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => x.fillText(l, tx, y0 + i * lh + 2));
    mesh.userData.tex.needsUpdate = true;
  }

  proto.showChoices = function (labels, opts) {
    opts = opts || {};
    this.hideChoices(true);
    labels.forEach((txt, i) => {
      const cv = document.createElement("canvas"); cv.width = 520; cv.height = 150;
      const t = new THREE.CanvasTexture(cv);
      if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, (1.1 * 150) / 520),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthTest: false }));
      mesh.renderOrder = 12;
      mesh.userData = { choice: i, cv, tex: t, txt, letter: opts.letters === false ? null : "ABC"[i], press: 0 };
      drawChoice(mesh, "idle");
      mesh.position.set(-SIDE - 0.05, 1.5 - i * 0.4, 0.15);
      mesh.scale.setScalar(0.001);
      this.el.object3D.add(mesh);
      this.choices.push(mesh);
    });
    this.choicesT0 = performance.now();
    this.slideTarget = SIDE;
  };
  proto.markChoices = function (picked, correct) {
    this.choices.forEach((m, i) => drawChoice(m, i === correct ? "ok" : i === picked ? "bad" : "dim"));
  };
  proto.pressChoice = function (i) { const m = this.choices[i]; if (m) m.userData.press = performance.now(); };
  proto.hideChoices = function (immediate) {
    this.choices.forEach((m) => { this.el.object3D.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); });
    this.choices = [];
    if (!this.sceneObj || this.sceneOut) this.slideTarget = 0;
  };
  // objetos que se pueden tocar: primero los botones, luego el cuerpo de Byte
  proto.pickList = function () {
    const list = this.choices.slice();
    if (this.hitEl && this.hitEl.getObject3D("mesh")) list.push(this.hitEl.getObject3D("mesh"));
    return list;
  };

  /* ---------- Reacciones ---------- */
  proto.react = function (type) {
    const list = ["jump", "dance", "spin"];
    if (!type) { this.reactIdx = (this.reactIdx + 1) % list.length; type = list[this.reactIdx]; }
    this.reactType = type; this.reactT0 = performance.now();
  };
  proto.dragYaw = function (d) { this.userYaw += d; this.userYawT = performance.now(); };

  /* ---------- Cuadro a cuadro ---------- */
  proto.tick = function (time, dt) {
    tick0.call(this, time, dt);
    if (!this.active) return;
    const now = performance.now(), t = time / 1000, o = this.root.object3D;
    const k = Math.min(1, dt / 160);

    // Byte se corre a un lado cuando hay escena o botones
    this.slide += (this.slideTarget - this.slide) * k;
    o.position.x = this.slide;
    if (this.hitEl) this.hitEl.object3D.position.x = this.slide;

    // giro dado con el dedo: vuelve solo a mirarte
    if (now - this.userYawT > 2500) this.userYaw += (0 - this.userYaw) * Math.min(1, dt / 500);
    o.rotation.y += this.userYaw;

    // reacción en curso
    if (this.reactType) {
      const p = (now - this.reactT0) / DUR[this.reactType];
      if (p >= 1) { this.reactType = null; o.rotation.z = 0; }
      else {
        const env = Math.sin(Math.PI * clamp(p, 0, 1));
        if (this.reactType === "jump") { o.position.y += Math.sin(Math.PI * p) * 0.55; o.scale.y *= 1 + env * 0.05; }
        else if (this.reactType === "spin") { o.rotation.y += easeOutCubic(p) * Math.PI * 2; }
        else if (this.reactType === "dance") {
          o.rotation.z = Math.sin(t * 9) * 0.13 * Math.min(1, env * 2);
          o.position.y += Math.abs(Math.sin(t * 9)) * 0.07 * Math.min(1, env * 2);
          this.armR.object3D.rotation.z = 1.9 + Math.sin(t * 9) * 0.7;
          this.armL.object3D.rotation.z = -(1.9 + Math.sin(t * 9 + Math.PI) * 0.7);
          this.head.object3D.rotation.y = Math.sin(t * 4.5) * 0.5;
        } else if (this.reactType === "no") { this.head.object3D.rotation.y = Math.sin(p * Math.PI * 6) * 0.55; }
      }
    }

    const cam = this.camPos;
    this.el.sceneEl.camera.getWorldPosition(cam);

    // escena 3D
    const s = this.sceneObj;
    if (s) {
      let sc;
      if (this.sceneOut) {
        const p = (now - this.sceneOut) / 350;
        sc = 1 - clamp(p, 0, 1);
        if (p >= 1) { this.el.object3D.remove(s.group); s.dispose(); this.sceneObj = null; this.sceneOut = 0; if (!this.choices.length) this.slideTarget = 0; return; }
      } else sc = easeOutBack(clamp((now - this.sceneT0) / 450, 0, 1));
      s.group.scale.setScalar(Math.max(0.001, sc));
      s.update(t, now, cam, dt);
    }

    // botones 3D: aparecen escalonados, miran a la cámara y "se hunden" al tocarlos
    this.choices.forEach((m, i) => {
      let sc = easeOutBack(clamp((now - this.choicesT0 - i * 120) / 350, 0, 1));
      const pr = m.userData.press ? clamp((now - m.userData.press) / 220, 0, 1) : 1;
      sc *= 0.9 + 0.1 * pr;
      m.scale.setScalar(Math.max(0.001, sc));
      m.lookAt(cam);
    });
  };
})();
