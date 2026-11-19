// Tito, el mono tocón: personaje 3D construido con primitivas de A-Frame.
// Para usar un modelo propio, reemplaza build() por: <a-entity gltf-model="models/tito.glb">
(function () {
  const mk = (parent, tag, attrs) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };

  const FUR = "#7b5a3c";
  const FACE = "#f0a860";
  const BELLY = "#f3dfc0";

  AFRAME.registerComponent("mascot", {
    schema: { lift: { type: "number", default: 0 } },

    init() {
      this.speaking = false;
      this.waveUntil = 0;
      this.arm = 0.15;
      this.lift = 0;
      this.nextBlink = 2000;
      this.blinkUntil = 0;
      this.build();
    },

    build() {
      const root = (this.root = mk(this.el, "a-entity", {}));

      // sombra
      mk(root, "a-circle", { radius: 0.4, rotation: "-90 0 0", position: "0 0.01 0", color: "#000", opacity: 0.25, shader: "flat" });

      // cuerpo
      mk(root, "a-sphere", { radius: 0.32, position: "0 0.55 0", scale: "1 1.15 0.9", color: FUR });
      mk(root, "a-sphere", { radius: 0.22, position: "0 0.52 0.2", scale: "1 1.1 0.5", color: BELLY });
      // piernas
      [-0.15, 0.15].forEach((x) => {
        mk(root, "a-sphere", { radius: 0.12, position: `${x} 0.14 0.05`, scale: "1 1 1.4", color: FUR });
      });
      // cola
      mk(root, "a-torus", { radius: 0.28, "radius-tubular": 0.045, arc: 220, position: "-0.05 0.45 -0.3", rotation: "0 90 60", color: FUR, "segments-tubular": 24 });

      // brazo izquierdo (quieto)
      const armL = mk(root, "a-entity", { position: "-0.34 0.82 0.02", rotation: "0 0 -8" });
      mk(armL, "a-cylinder", { radius: 0.06, height: 0.36, position: "0 -0.17 0", color: FUR });
      mk(armL, "a-sphere", { radius: 0.075, position: "0 -0.36 0", color: FACE });

      // brazo derecho (saluda)
      this.armR = mk(root, "a-entity", { position: "0.34 0.82 0.02" });
      mk(this.armR, "a-cylinder", { radius: 0.06, height: 0.36, position: "0 -0.17 0", color: FUR });
      mk(this.armR, "a-sphere", { radius: 0.075, position: "0 -0.36 0", color: FACE });

      // cabeza
      const head = (this.head = mk(root, "a-entity", { position: "0 1.18 0" }));
      mk(head, "a-sphere", { radius: 0.32, color: FUR });
      mk(head, "a-sphere", { radius: 0.24, position: "0 -0.03 0.15", scale: "1.05 0.95 0.75", color: FACE });
      // orejas
      [-1, 1].forEach((s) => {
        mk(head, "a-sphere", { radius: 0.09, position: `${0.3 * s} 0.04 -0.02`, color: FUR });
        mk(head, "a-sphere", { radius: 0.05, position: `${0.31 * s} 0.04 0.03`, color: FACE });
      });
      // ojos
      this.eyes = mk(head, "a-entity", { position: "0 0.06 0" });
      [-1, 1].forEach((s) => {
        mk(this.eyes, "a-sphere", { radius: 0.055, position: `${0.095 * s} 0 0.295`, color: "#fff" });
        mk(this.eyes, "a-sphere", { radius: 0.03, position: `${0.095 * s} 0 0.34`, color: "#111" });
      });
      // nariz y boca
      mk(head, "a-sphere", { radius: 0.025, position: "0 -0.02 0.355", scale: "1.4 1 1", color: "#3a2415" });
      this.mouth = mk(head, "a-sphere", { radius: 0.05, position: "0 -0.1 0.335", scale: "1.7 0.4 0.5", color: "#7a1f1f" });

      // birrete de graduación
      const cap = mk(head, "a-entity", { position: "0 0.3 0", rotation: "0 20 0" });
      mk(cap, "a-cylinder", { radius: 0.2, height: 0.12, position: "0 -0.02 0", color: "#1d3557" });
      mk(cap, "a-box", { width: 0.58, height: 0.035, depth: 0.58, position: "0 0.06 0", color: "#1d3557" });
      mk(cap, "a-cylinder", { radius: 0.006, height: 0.25, position: "0.26 -0.05 0.26", color: "#f4c430" });
      mk(cap, "a-sphere", { radius: 0.025, position: "0.26 -0.18 0.26", color: "#f4c430" });

      // holograma </>
      this.hologram = mk(root, "a-text", {
        value: "</>", align: "center", color: "#5eead4", width: 1.6, position: "-0.7 1.45 0.1", "wrap-count": 6,
      });

      // zona táctil invisible
      const hit = mk(this.el, "a-sphere", { radius: 0.75, position: "0 0.85 0", class: "clickable", material: "opacity: 0; transparent: true" });
      hit.addEventListener("click", () => this.el.emit("mascot-tap"));
    },

    setSpeaking(on) { this.speaking = on; },
    wave(ms = 2600) { this.waveUntil = performance.now() + ms; },

    tick(time, dt) {
      const t = time / 1000;
      const k = Math.min(1, dt / 180);
      this.lift += (this.data.lift - this.lift) * k;
      this.root.object3D.position.y = Math.sin(t * 2) * 0.03 + this.lift + (this.speaking ? Math.abs(Math.sin(t * 9)) * 0.015 : 0);

      this.head.object3D.rotation.z = Math.sin(t * 1.3) * 0.06;
      this.head.object3D.rotation.y = Math.sin(t * 0.7) * 0.18;

      // boca
      const my = this.speaking ? 0.3 + Math.abs(Math.sin(t * 13)) * 0.9 : 0.4;
      this.mouth.object3D.scale.y = my;

      // parpadeo
      if (time > this.nextBlink) { this.blinkUntil = time + 130; this.nextBlink = time + 2500 + Math.random() * 2500; }
      this.eyes.object3D.scale.y = time < this.blinkUntil ? 0.1 : 1;

      // saludo
      const waving = performance.now() < this.waveUntil;
      const target = waving ? 2.25 + Math.sin(t * 11) * 0.35 : 0.15;
      this.arm += (target - this.arm) * Math.min(1, dt / 90);
      this.armR.object3D.rotation.z = this.arm;

      this.hologram.object3D.position.y = 1.45 + Math.sin(t * 2.4) * 0.05;
    },
  });
})();
