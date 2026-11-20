(() => {
  const C = window.CONTENT;
  const AR = C.ar;
  const THREE = AFRAME.THREE;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const video = $("#cam");
  const mascotEl = $("#mascot");
  const camEl = $("#cam3d");
  const scene = $("#scene");
  const mascot = () => mascotEl.components.mascot;
  const sec = (id) => C.sections.find((s) => s.id === id);
  const tourList = C.sections.filter((s) => !s.quiz);

  let state = "idle"; // idle | scan | live
  let muted = false;
  let speaking = false;
  let tour = 0;       // token: al cambiarlo se cancela lo que Byte estaba explicando
  let tourIdx = 0;
  let choiceResolve = null;   // promesa pendiente de una respuesta con botones 3D
  let userMult = 1;           // tamaño extra que da el usuario al pellizcar
  let fallbackTimer = null;
  const zoneParam = new URLSearchParams(location.search).get("s");

  /* ================= Voz ================= */
  const canSpeak = "speechSynthesis" in window;
  let voice = null;
  function pickVoice() {
    if (!canSpeak) return;
    const vs = speechSynthesis.getVoices();
    voice =
      vs.find((v) => /es[-_]PE/i.test(v.lang)) ||
      vs.find((v) => /es[-_](MX|US|419|AR|CO|CL)/i.test(v.lang)) ||
      vs.find((v) => /^es/i.test(v.lang)) || null;
  }
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function showSub(text) { const s = $("#subtitle"); s.textContent = text; s.hidden = false; }
  function stopSpeech() {
    clearTimeout(fallbackTimer);
    if (canSpeak) speechSynthesis.cancel();
    speaking = false;
    mascot() && mascot().setSpeaking(false);
  }

  // Byte dice algo y la promesa se cumple cuando termina de hablar.
  function say(text) {
    return new Promise((resolve) => {
      stopSpeech();
      showSub(text);
      const m = mascot();
      speaking = true;
      const finish = () => { clearTimeout(fallbackTimer); speaking = false; m.setSpeaking(false); resolve(); };
      const timed = () => { m.setSpeaking(true); fallbackTimer = setTimeout(finish, 1200 + text.length * 55); };
      if (muted || !canSpeak) return timed();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : "es-ES";
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.pitch = 1.25;
      let started = false;
      u.onstart = () => { started = true; m.setSpeaking(true); };
      u.onend = u.onerror = finish;
      speechSynthesis.speak(u);
      // si el navegador bloquea la voz, seguimos con subtítulos y tiempos
      fallbackTimer = setTimeout(() => { if (!started) { speechSynthesis.cancel(); timed(); } }, 2500);
    });
  }

  function chime(down) {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = "sine";
      o.frequency.setValueAtTime(down ? 1300 : 260, t);
      o.frequency.exponentialRampToValueAtTime(down ? 260 : 1300, t + 0.55);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.85);
    } catch (e) { /* sin audio */ }
  }

  /* ================= Explicaciones de Byte ================= */
  function cancelAll() {
    tour++;
    stopSpeech();
    if (choiceResolve) { const r = choiceResolve; choiceResolve = null; r(-1); }
    if (mascot()) { mascot().hideChoices(true); mascot().hideScene(true); }
    $("#answers").hidden = true;
    return tour;
  }

  async function playSection(s, token) {
    if (s.scene) mascot().showScene(s.scene, s);          // escena 3D de la zona, junto a Byte
    for (let i = 0; i < s.parts.length; i++) {
      if (token !== tour) return false;
      const part = s.parts[i];
      mascot().sceneStage(part.stage !== undefined ? part.stage : i, part);
      mascot().showCard(`${s.icon} ${s.title}`, part.lines);
      await say(part.say);
      if (token !== tour) return false;
      await sleep(350);
    }
    if (token !== tour) return false;
    mascot().hideScene();
    return true;
  }

  async function runTour(from, token) {
    for (let i = from; i < tourList.length; i++) {
      tourIdx = i;
      mascot().wave(1200);
      if (!(await playSection(tourList[i], token))) return;
    }
    mascot().hideCard();
    await offerTrivia(token);
    if (token !== tour) return;
    await say(C.mascot.outro);
    if (token !== tour) return;
    await sleep(300);
    leave(token);
  }

  /* ---- Respuestas con botones 3D flotando junto a Byte (en AR real también hay botones normales de respaldo) ---- */
  function answer(k) { if (!choiceResolve) return; const r = choiceResolve; choiceResolve = null; r(k); }

  function hideChoicesUI() { mascot().hideChoices(true); $("#answers").hidden = true; }

  function ask(labels, timeoutMs) {
    return new Promise((resolve) => {
      let timer = null;
      choiceResolve = (k) => { clearTimeout(timer); resolve(k); };
      mascot().showChoices(labels);
      if (mode === "xr") {
        const box = $("#answers");
        box.innerHTML = "";
        labels.forEach((t, k) => {
          const b = document.createElement("button");
          b.textContent = t;
          b.onclick = () => answer(k);
          b.addEventListener("beforexrselect", (e) => e.preventDefault());
          box.appendChild(b);
        });
        box.hidden = false;
      }
      if (timeoutMs) timer = setTimeout(() => answer(-2), timeoutMs);
    });
  }

  // Al terminar el recorrido Byte propone la trivia con dos botones 3D
  async function offerTrivia(token) {
    const s = sec("trivia");
    if (!s) return;
    mascot().showCard("\u{1F3AE} Trivia", ["¿Jugamos?"]);
    const p = ask(["¡Sí, jugar!", "No, gracias"], 14000);
    say("Antes de irme, ¿te animas a jugar una trivia? Toca un botón.");
    const k = await p;
    if (token !== tour || k === -1) return;
    hideChoicesUI();
    if (k === 0) await playQuiz(s, token); else mascot().hideCard();
  }

  async function playQuiz(s, token) {
    mascot().showCard(`${s.icon} ${s.title}`, ["¡Responde las preguntas!"]);
    await say(s.intro);
    let score = 0;
    for (let i = 0; i < s.questions.length; i++) {
      if (token !== tour) return;
      const q = s.questions[i];
      mascot().showCard(`Pregunta ${i + 1} de ${s.questions.length}`, [q.q]);
      const p = ask(q.o);
      say(q.q);
      const k = await p;
      if (token !== tour || k < 0) return;
      mascot().markChoices(k, q.a);
      if (k === q.a) { score++; mascot().react("jump"); } else mascot().react("no");
      await say(k === q.a ? "¡Correcto!" : `Casi. La respuesta era: ${q.o[q.a]}.`);
      if (token !== tour) return;
      await sleep(250);
      hideChoicesUI();
    }
    if (token !== tour) return;
    const n = s.questions.length;
    mascot().showCard("\u{1F3C6} Resultado", [`Lograste ${score} de ${n}`]);
    mascot().react(score >= 3 ? "dance" : "jump");
    mascot().wave(2500);
    await say(score === n ? "¡Perfecto! Eres un verdadero ingeniero de sistemas." : score >= 3 ? "¡Muy bien! Casi perfecto." : "¡Buen intento! Ven a estudiar con nosotros y lo dominas.");
    if (token !== tour) return;
    mascot().hideCard();
  }

  /* ================= Posicionamiento AR ================= */
  const camQ = new THREE.Quaternion();
  const camP = new THREE.Vector3();
  function camPose() { const c = scene.camera || camEl.object3D; c.updateMatrixWorld(true); c.getWorldQuaternion(camQ); c.getWorldPosition(camP); }

  function faceCamera() {
    camPose();
    const p = mascotEl.object3D.position;
    mascotEl.object3D.rotation.y = Math.atan2(camP.x - p.x, camP.z - p.z);
  }
  function place(pos, first) {
    const o = mascotEl.object3D;
    if (first) o.position.copy(pos); else o.position.lerp(pos, 0.35);
    faceCamera();
  }

  // Convierte la posición del QR en pantalla en un punto del mundo, a la distancia que indica su tamaño aparente.
  function worldFromQR(pts) {
    const vw = video.videoWidth, vh = video.videoHeight, W = innerWidth, H = innerHeight;
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const widthPx = (Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) + Math.hypot(pts[2].x - pts[3].x, pts[2].y - pts[3].y)) / 2;
    const k = Math.max(W / vw, H / vh);                 // object-fit: cover
    const sx = cx * k + (W - vw * k) / 2;
    const sy = cy * k + (H - vh * k) / 2;
    const nx = (sx / W) * 2 - 1, ny = -((sy / H) * 2 - 1);

    const tY = Math.tan(THREE.MathUtils.degToRad(AR.camFov) / 2), tX = tY * (W / H);
    const angW = ((widthPx * k) / W) * 2 * Math.atan(tX);
    const d = THREE.MathUtils.clamp(AR.qrSizeM / (2 * Math.tan(angW / 2)), AR.minDist, AR.maxDist);

    camPose();
    const dir = new THREE.Vector3(nx * tX, ny * tY, -1).normalize().applyQuaternion(camQ);
    return { pos: camP.clone().add(dir.multiplyScalar(d)), d };
  }

  function worldInFront() {
    camPose();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camQ);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    return camP.clone().add(fwd.multiplyScalar(1.8)).add(new THREE.Vector3(0, -0.4, 0));
  }

  /* ================= Escaneo de QR ================= */
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const bd = "BarcodeDetector" in window ? new BarcodeDetector({ formats: ["qr_code"] }) : null; // nativo y rápido (Chrome/Android)
  let bdOk = !!bd;
  let lastScan = 0, hintUntil = 0, busy = false;
  let needClear = false, lastQrSeen = 0; // tras irse, Byte no reaparece hasta que el QR salga de la vista
  let floorEnabled = false, lastFloorMsg = "";   // "AR simulado": piso estimado con el giroscopio (sin ARCore)
  function resetScanText() {
    if (floorEnabled) lastFloorMsg = "";
    else $("#scan-text").innerHTML = "Apunta la cámara al <b>código QR</b> para despertar a Byte";
  }

  function parseQR(data) {
    try {
      const u = new URL(data);
      if (u.host === location.host || /tito-ar/i.test(u.href)) return { zone: u.searchParams.get("s") };
    } catch (e) { /* no es URL */ }
    return null;
  }
  function hint(text, ms = 2200) {
    $("#scan-text").innerHTML = text;
    hintUntil = performance.now() + ms;
  }

  // Devuelve { data, pts:[4 esquinas en píxeles del video] } o null
  async function detectQR() {
    if (bdOk) {
      try {
        const codes = await bd.detect(video);
        return codes.length ? { data: codes[0].rawValue, pts: codes[0].cornerPoints } : null;
      } catch (e) { bdOk = false; }
    }
    if (!window.jsQR) return null;
    const cw = 800, ch = Math.round((cw * video.videoHeight) / video.videoWidth);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.drawImage(video, 0, 0, cw, ch);
    const code = jsQR(ctx.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: "dontInvert" });
    if (!code) return null;
    const f = video.videoWidth / cw, L = code.location;
    const pts = [L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner].map((p) => ({ x: p.x * f, y: p.y * f }));
    return { data: code.data, pts };
  }

  function onQR(r) {
    const info = parseQR(r.data);
    if (!info) { if (state === "scan") hint("Ese QR no es de Byte 🙈 Busca el código de la facultad"); return; }
    const { pos, d } = worldFromQR(r.pts);
    if (state === "scan") spawn(pos, d, info.zone);
    else if (state === "live" && anchorFromQR) refine(pos); // con el QR a la vista se corrige la posicion
  }

  async function loop(ts) {
    requestAnimationFrame(loop);
    if (state === "idle" || busy || ts - lastScan < 90) return;
    if (state === "scan" && hintUntil && performance.now() > hintUntil) {
      hintUntil = 0;
      resetScanText();
    }
    if (!video.srcObject || video.readyState < 2 || !video.videoWidth) return;
    lastScan = ts;
    if (state === "live") { liveTick++; motionStep(); turnToCamera(); if (liveTick % 3) return; } // QR cada 3 cuadros
    else if (state === "scan" && floorEnabled && window.MotionEstimator) MotionEstimator.step(video); // alimenta la nube de puntos
    busy = true;
    try {
      const r = await detectQR();
      if (r) { if (needClear) lastQrSeen = performance.now(); else onQR(r); }
      else if (needClear && performance.now() - lastQrSeen > 1600) {
        needClear = false;
        resetScanText();
      }
    } finally { busy = false; }
  }

  /* ================= Flujo ================= */
  let worldScale = AR.scale;
  const curScale = () => worldScale * userMult;
  const feet = (p) => { p.y -= 0.8 * curScale(); return p; }; // los pies quedan un poco bajo el QR

  const qrAnchor = new THREE.Vector3();
  let anchorFromQR = true;                // si el ancla viene del QR se corrige con él; si viene del piso, no   // punto del mundo donde esta el QR (Byte se queda aqui)
  let liveTick = 0;

  // Acercar/alejar sin ARCore: la expansion de los puntos de la imagen mueve una camara virtual hacia adelante/atras.
  function motionStep() {
    const r = window.MotionEstimator && MotionEstimator.step(video);
    if (!r || r.shift > 5) return;                    // giro rapido o poca informacion: no se fia
    if (Math.abs(r.e) < 0.004) return;                // ruido
    const e = THREE.MathUtils.clamp(r.e, -0.12, 0.12);
    camPose();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camQ);
    fwd.y = 0;
    if (fwd.lengthSq() < 0.05) return;
    fwd.normalize();
    const Z = Math.max(0.6, Math.hypot(qrAnchor.x - camP.x, qrAnchor.z - camP.z));
    const delta = Z * (1 - 1 / (1 + e));              // e>0: te acercas
    const next = camEl.object3D.position.clone().addScaledVector(fwd, delta);
    const dist = Math.hypot(qrAnchor.x - next.x, qrAnchor.z - next.z);
    if (dist > 0.4 && dist < 9) camEl.object3D.position.copy(next);
  }

  // Mientras se ve el QR se corrige la deriva: el giro ajusta la direccion del ancla y la distancia corrige la camara virtual.
  function refine(pos) {
    camPose();
    const da = qrAnchor.clone().sub(camP), dm = pos.clone().sub(camP);
    const ra = da.length(), rm = dm.length();
    if (ra < 1e-3 || rm < 1e-3) return;
    const dir = da.clone().normalize().lerp(dm.clone().normalize(), 0.35).normalize();
    qrAnchor.copy(camP).addScaledVector(dir, ra);
    camEl.object3D.position.addScaledVector(dir, (ra - rm) * 0.35);
    const o = mascotEl.object3D.position;
    o.copy(qrAnchor); o.y -= 0.8 * curScale();
  }

  // Byte gira suavemente para seguir mirandote
  function turnToCamera() {
    camPose();
    const o = mascotEl.object3D, p = o.position;
    const target = Math.atan2(camP.x - p.x, camP.z - p.z);
    const diff = Math.atan2(Math.sin(target - o.rotation.y), Math.cos(target - o.rotation.y));
    o.rotation.y += diff * 0.08;
  }

  async function spawn(pos, d, zone) {
    userMult = 1;
    anchorFromQR = true;
    // Tamaño real de Byte fijado al aparecer: así, al alejarte se ve más chico y al acercarte, más grande.
    worldScale = THREE.MathUtils.clamp((AR.scale * d) / AR.refDist, 0.12, 1.5);
    state = "live";
    $("#scan").hidden = true;
    $("#btn-rescan").hidden = false;
    mascotEl.object3D.scale.setScalar(worldScale);
    qrAnchor.copy(pos);
    if (window.MotionEstimator) MotionEstimator.reset();
    place(feet(pos.clone()), true);
    mascotEl.setAttribute("visible", true);
    return runIntro(zone);
  }

  // Vista previa fija para ensayar: ?demo=universidad|carrera|malla|laboratorios|laboral|contacto|trivia  (&stage=N para elegir etapa)
  const qs = new URLSearchParams(location.search);
  const demoKind = qs.get("demo");
  function runDemo() {
    const s = sec(demoKind);
    if (!s) return;
    if (s.quiz) { mascot().showCard("\u{1F3AE} Trivia", ["Demo de botones 3D"]); ask(s.questions[0].o).then((k) => { mascot().markChoices(k, s.questions[0].a); mascot().react(k === s.questions[0].a ? "jump" : "no"); }); return; }
    const st = parseInt(qs.get("stage") || "0", 10);
    const part = s.parts[Math.min(st, s.parts.length - 1)];
    if (s.scene) { mascot().showScene(s.scene, s); mascot().sceneStage(st, part); }
    mascot().showCard(`${s.icon} ${s.title}`, part.lines);
    mascot().wave(1500);
  }

  // Aparicion de Byte + explicacion (la usan el modo QR y el modo AR real)
  async function runIntro(zone) {
    $("#btn-rescan").hidden = false;
    mascot().appear();
    chime();
    if (navigator.vibrate) navigator.vibrate([60, 40, 140]);
    lastSeen = performance.now();

    const token = cancelAll();
    await sleep(1900);
    if (token !== tour) return;
    if (demoKind) { runDemo(); return; }
    mascot().wave(2800);
    showTip();
    const s = zone && sec(zone);
    if (s && s.quiz) {
      await say(`¡Hola! Soy ${C.mascot.name}.`);
      if (token !== tour) return;
      await playQuiz(s, token);
      if (token !== tour) return;
      await say(C.mascot.outro);
      if (token !== tour) return;
      await sleep(300);
      leave(token);
    } else if (s) {
      await say(`¡Hola! Soy ${C.mascot.name}.`);
      if (token !== tour) return;
      if (!(await playSection(s, token))) return;
      mascot().hideCard();
      await say(C.mascot.askMore);
      if (token !== tour) return;
      await sleep(300);
      leave(token);
    } else {
      await say(C.mascot.welcome);
      if (token !== tour) return;
      runTour(0, token);
    }
  }

  // Fin del módulo: Byte se despide y se va por un portal; vuelve el modo escaneo.
  function leave(token) {
    if (token !== tour) return;
    state = "leaving";
    $("#subtitle").hidden = true;
    mascot().hideCard();
    mascot().wave(900);
    chime(true);
    mascot().vanish(() => {
      if (state !== "leaving") return;
      rescan();
      if (mode === "xr") { xrHint("¡Hasta pronto! 👋 Toca la pantalla para llamar a Byte otra vez"); return; }
      needClear = true;
      lastQrSeen = performance.now();
      $("#scan-text").innerHTML = "¡Hasta pronto! 👋 Para llamarme otra vez, apunta al piso y toca la pantalla (o vuelve a apuntar a un QR)";
    });
  }

  function rescan() {
    cancelAll();
    mascot().hide();
    userMult = 1;
    $("#tip").hidden = true;
    mascotEl.setAttribute("visible", false);
    $("#subtitle").hidden = true;
    $("#btn-rescan").hidden = true;
    if (mode !== "xr") camEl.object3D.position.set(0, 1.4, 0);
    if (mode === "xr") { state = "xr-find"; xrHint(hitFound ? "Toca la pantalla para llamar a Byte aquí 👇" : "Busco el piso… mueve el celular despacio"); return; }
    $("#scan").hidden = false;
    state = "scan";
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      return true;
    } catch (e) {
      document.body.classList.add("nocam");
      return false;
    }
  }
  async function requestMotion() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function")
        await DeviceOrientationEvent.requestPermission();
    } catch (e) { /* sin giroscopio: se usa arrastre */ }
  }

  async function start() {
    const btn = $("#btn-start");
    btn.disabled = true;
    btn.textContent = "Iniciando…";
    if (canSpeak) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } // desbloquea la voz
    await requestMotion();
    const camOk = await startCamera();
    if (!camOk) {
      const e = $("#splash-err");
      e.hidden = false;
      e.textContent = "No pude abrir la cámara (¿permiso denegado o conexión no segura?). Puedes invocar a Byte sin QR.";
      await sleep(1600);
      $("#scan-text").innerHTML = "Sin cámara: usa el botón para invocar a Byte";
    }
    $("#splash").classList.add("gone");
    $("#hud").hidden = false;
    $("#scan").hidden = false;
    floorEnabled = camOk || qs.get("floor") === "1";
    $("#scan").classList.toggle("floor", floorEnabled);
    if (floorEnabled) lastFloorMsg = "";
    state = "scan";
  }

  /* ================= Gestos: tocar, girar con un dedo, pellizcar =================
     Tocar a Byte -> salto / baile / giro. Arrastrar sobre Byte -> lo giras. Pellizcar (o la rueda del mouse) -> lo agrandas o achicas.
     Tocar un botón 3D -> respuesta. */
  const ray = new THREE.Raycaster();
  const ptrs = new Map();
  let gest = null;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const applyScale = () => mascotEl.object3D.scale.setScalar(curScale());
  const interactive = () => (state === "live" || state === "xr-live") && mascot().active && !mascot().vanishing;
  const lookMouse = (on) => camEl.setAttribute("look-controls", "mouseEnabled", on);

  function pickWithRay() {
    const hits = ray.intersectObjects(mascot().pickList(), false);
    if (!hits.length) return null;
    const o = hits[0].object;
    return o.userData && o.userData.choice !== undefined ? { kind: "choice", index: o.userData.choice } : { kind: "byte" };
  }
  function pickAt(x, y) {
    const r = scene.canvas.getBoundingClientRect();
    ray.setFromCamera({ x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }, scene.camera);
    return pickWithRay();
  }
  function handleHit(hit) {
    if (!hit) return;
    if (hit.kind === "choice") { mascot().pressChoice(hit.index); answer(hit.index); }
    else mascotEl.emit("mascot-tap");
  }

  function onDown(e) {
    if (!interactive()) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    if (ptrs.size === 1) {
      gest = { hit: pickAt(e.clientX, e.clientY), moved: false, pinch: false };
      if (gest.hit && gest.hit.kind === "byte") lookMouse(false);
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      gest = { pinch: true, moved: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: userMult };
      lookMouse(false);
    }
  }
  function onMove(e) {
    const p = ptrs.get(e.pointerId);
    if (!p || !gest) return;
    const dx = e.clientX - p.x;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) gest.moved = true;
    if (gest.pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      userMult = clamp(gest.m0 * (Math.hypot(a.x - b.x, a.y - b.y) / gest.d0), 0.4, 2.2);
      applyScale();
    } else if (gest.hit && gest.hit.kind === "byte" && gest.moved) mascot().dragYaw(dx * 0.012);
  }
  function onUp(e) {
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (!p || !gest) return;
    if (!gest.pinch && !gest.moved && performance.now() - p.t < 450) handleHit(gest.hit);
    if (!ptrs.size) { gest = null; lookMouse(true); }
  }
  function onWheel(e) {
    if (!interactive()) return;
    userMult = clamp(userMult * (e.deltaY < 0 ? 1.08 : 0.92), 0.4, 2.2);
    applyScale();
  }
  function bindGestures() {
    const el = scene.canvas;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerdown", floorDown);
    el.addEventListener("pointerup", floorUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
  }
  if (scene.hasLoaded) bindGestures(); else scene.addEventListener("loaded", bindGestures);

  let tipTimer = null;
  function showTip() {
    const t = $("#tip");
    t.hidden = false;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => { t.hidden = true; }, 8000);
  }

  /* ================= "AR simulado": piso estimado SIN ARCore =================
     Sin ARCore no se puede reconocer el piso de verdad, pero se puede estimar: con el giroscopio se sabe hacia dónde apunta la cámara y,
     suponiendo que el teléfono está a ~1,4 m del suelo, el cruce de la mirada con el plano del piso da un punto de piso creíble.
     Sobre eso se reproduce la experiencia visual de ARCore: nube de puntos (los puntos con textura que sigue motion.js),
     reconocimiento del piso con una malla de puntos que se expande, círculo guía y colocación con un toque. */
  const ret3 = $("#reticle").object3D;
  const floorPoint = new THREE.Vector3();
  const fwdTmp = new THREE.Vector3();
  let floorPhase = "none", floorT = 0, floorLost = 0, floorReady = false;

  // malla de puntos que "reconoce" el piso (textura radial que se desvanece hacia afuera)
  const gridMesh = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const x = cv.getContext("2d"), R = 256, step = 46;
    x.fillStyle = "#f3e8ff";
    for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
      const px = R + col * step + (row & 1 ? step / 2 : 0), py = R + row * step * 0.866, r = Math.hypot(px - R, py - R);
      if (r > R - 8) continue;
      x.globalAlpha = Math.pow(1 - r / R, 1.1) * 0.95;
      x.beginPath(); x.arc(px, py, 7, 0, Math.PI * 2); x.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = 2; m.visible = false;
    ret3.add(m);
    return m;
  })();

  // nube de puntos sobre la imagen de la cámara
  const ptsCv = $("#pts"), ptsCtx = ptsCv.getContext("2d");
  const cloud = new Map();
  let lastCloudT = 0, ptsShown = false;
  function drawCloud(now) {
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (ptsCv.width !== Math.round(W * dpr) || ptsCv.height !== Math.round(H * dpr)) { ptsCv.width = Math.round(W * dpr); ptsCv.height = Math.round(H * dpr); }
    ptsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ptsCtx.clearRect(0, 0, W, H);
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    const mp = window.MotionEstimator && MotionEstimator.points();
    if (mp && mp.t !== lastCloudT) {
      lastCloudT = mp.t;
      mp.pts.forEach(([u, v]) => cloud.set(Math.round(u * 160) + "_" + Math.round(v * 160), { u, v, t: now }));
    }
    const k = Math.max(W / vw, H / vh), ox = (W - vw * k) / 2, oy = (H - vh * k) / 2;
    ptsCtx.fillStyle = "#f3e8ff"; ptsCtx.shadowColor = "#c084fc"; ptsCtx.shadowBlur = 8;
    for (const [key, p] of cloud) {
      const a = 1 - (now - p.t) / 1800;
      if (a <= 0) { cloud.delete(key); continue; }
      ptsCtx.globalAlpha = a * 0.9;
      ptsCtx.beginPath(); ptsCtx.arc(p.u * vw * k + ox, p.v * vh * k + oy, 2.4, 0, Math.PI * 2); ptsCtx.fill();
    }
    ptsCtx.globalAlpha = 1; ptsCtx.shadowBlur = 0;
    ptsShown = true;
  }
  function clearCloud() {
    if (!ptsShown) return;
    ptsCtx.clearRect(0, 0, ptsCv.width, ptsCv.height);
    cloud.clear(); ptsShown = false;
  }

  AFRAME.registerComponent("floor-scan", {
    tick() {
      const active = mode === "qr" && state === "scan" && floorEnabled;
      if (!active) {
        if (mode === "qr" && ret3.visible) ret3.visible = false;
        gridMesh.visible = false; floorPhase = "none"; floorReady = false; clearCloud();
        return;
      }
      const now = performance.now();
      drawCloud(now);
      camPose();
      fwdTmp.set(0, 0, -1).applyQuaternion(camQ);
      const pitchOk = fwdTmp.y < -0.34 && fwdTmp.y > -0.84;     // mirando entre ~20° y ~57° hacia abajo
      let msg;
      if (pitchOk) {
        floorPoint.copy(camP).addScaledVector(fwdTmp, camP.y / -fwdTmp.y);
        floorPoint.y = 0;
        floorLost = 0;
        if (floorPhase === "none") { floorPhase = "detecting"; floorT = now; }
        const age = now - floorT;
        ret3.visible = true; gridMesh.visible = true;
        ret3.position.copy(floorPoint);
        gridMesh.rotation.z += 0.004;
        if (floorPhase === "detecting") {
          const k = Math.min(1, age / 1400);
          gridMesh.scale.setScalar(0.15 + 0.85 * (1 - Math.pow(1 - k, 3)));
          ret3.scale.setScalar(0.8 + Math.abs(Math.sin(now / 160)) * 0.3);
          if (age > 1400) floorPhase = "ready";
          msg = "Reconociendo el piso…";
        } else {
          ret3.scale.setScalar(1 + Math.sin(now / 220) * 0.07);
          msg = "Toca la pantalla para colocar a Byte \u{1F447}";
        }
        floorReady = floorPhase === "ready";
      } else {
        floorReady = false; ret3.visible = false; gridMesh.visible = false;
        if (floorPhase !== "none") { if (!floorLost) floorLost = now; if (now - floorLost > 500) floorPhase = "none"; }
        msg = fwdTmp.y >= -0.34 ? "\u{1F4F1} Mueve el celular despacio y apunta al piso" : "Aleja un poco la cámara de tus pies";
      }
      if (!needClear && !hintUntil && msg !== lastFloorMsg) { lastFloorMsg = msg; $("#scan-text").innerHTML = msg; }
    },
  });
  scene.setAttribute("floor-scan", "");

  // un toque corto cuando el piso está "reconocido" coloca a Byte ahí
  let tapDown = null;
  function floorDown(e) { if (state === "scan" && floorReady) tapDown = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function floorUp(e) {
    const d = tapDown; tapDown = null;
    if (!d || state !== "scan" || !floorReady) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12 && performance.now() - d.t < 600) spawnFloor(floorPoint.clone());
  }
  function spawnFloor(pos) {
    userMult = 1; anchorFromQR = false;
    worldScale = AR.scale;                     // tamaño físico fijo, como en AR real
    state = "live";
    $("#scan").hidden = true;
    $("#btn-rescan").hidden = false;
    mascotEl.object3D.scale.setScalar(worldScale);
    qrAnchor.copy(pos);                        // el estimador de movimiento usa este punto como referencia de distancia
    if (window.MotionEstimator) MotionEstimator.reset();
    place(pos, true);                          // los pies quedan en el piso estimado
    mascotEl.setAttribute("visible", true);
    return runIntro(zoneParam);
  }

  /* ================= AR real con WebXR (Android + Chrome) =================
     Byte queda anclado al piso (ARCore): al caminar se ve mas grande o mas chico de verdad.
     Flujo: el QR (leido con la camara del telefono) abre esta pagina con ?s=zona -> "AR real" -> se detecta el piso
     -> un toque coloca a Byte. */
  let mode = "qr";                    // qr | xr
  let hitSource = null, hitFound = false;
  const hitPos = new THREE.Vector3();
  const mock = new URLSearchParams(location.search).get("xrmock") === "1"; // simulacion para probar en PC
  const reticle = $("#reticle");

  function xrHint(t) { const h = $("#xr-hint"); h.textContent = t || ""; h.hidden = !t; }
  async function xrSupported() {
    try { return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar"))); } catch (e) { return false; }
  }

  AFRAME.registerComponent("xr-hit", {
    tick() {
      if (mode !== "xr") return;
      if (state !== "xr-find") { reticle.object3D.visible = false; return; }
      if (mock) { reticle.object3D.position.copy(hitPos); reticle.object3D.visible = true; return; }
      const frame = scene.frame;
      if (!hitSource || !frame) { reticle.object3D.visible = false; return; }
      const res = frame.getHitTestResults(hitSource);
      const pose = res.length ? res[0].getPose(scene.renderer.xr.getReferenceSpace()) : null;
      if (pose) {
        const p = pose.transform.position;
        hitPos.set(p.x, p.y, p.z);
        reticle.object3D.position.copy(hitPos);
        reticle.object3D.visible = true;
        const k = 1 + Math.sin(performance.now() / 250) * 0.06;
        reticle.object3D.scale.set(k, k, k);
        if (!hitFound) { hitFound = true; xrHint("Toca la pantalla para llamar a Byte aquí \u{1F447}"); }
      } else {
        reticle.object3D.visible = false;
        if (hitFound) { hitFound = false; xrHint("Busco el piso… mueve el celular despacio"); }
      }
    },
  });
  scene.setAttribute("xr-hit", "");

  // Si el telefono no logra detectar el piso, se coloca frente a ti, a la altura del suelo estimada.
  function fallbackFloor() {
    camPose();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camQ);
    fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    return camP.clone().add(fwd.multiplyScalar(1.8)).setY(Math.max(0, camP.y - 1.3));
  }

  function onSelect(evt) {
    if (mode !== "xr") return;
    if (state === "xr-live") {                      // toque sobre un botón 3D o sobre Byte (rayo del dedo en WebXR)
      const frame = evt && evt.frame, src = evt && evt.inputSource;
      if (!frame || !src || !src.targetRaySpace || !interactive()) return;
      const pose = frame.getPose(src.targetRaySpace, scene.renderer.xr.getReferenceSpace());
      if (!pose) return;
      const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
      ray.set(new THREE.Vector3().setFromMatrixPosition(m), new THREE.Vector3(0, 0, -1).transformDirection(m));
      handleHit(pickWithRay());
      return;
    }
    if (state !== "xr-find") return;
    userMult = 1;
    const p = hitFound ? hitPos.clone() : fallbackFloor();
    state = "xr-live";
    xrHint("");
    reticle.object3D.visible = false;
    worldScale = AR.scale;
    mascotEl.object3D.scale.setScalar(worldScale);
    place(p, true);
    mascotEl.setAttribute("visible", true);
    runIntro(zoneParam);
  }

  scene.addEventListener("enter-vr", () => {
    if (mode !== "xr" || !scene.is("ar-mode")) return;
    camEl.object3D.position.set(0, 0, 0); // en WebXR la altura real la da el telefono
    const session = scene.renderer.xr.getSession();
    session.requestReferenceSpace("viewer")
      .then((vs) => session.requestHitTestSource({ space: vs }))
      .then((src) => { hitSource = src; })
      .catch(() => xrHint("No pude detectar el piso; toca la pantalla para colocar a Byte frente a ti"));
    session.addEventListener("select", onSelect);
    session.addEventListener("end", () => location.reload());
  });

  function xrFail() {
    mode = "qr"; state = "idle";
    xrHint("");
    $("#hud").hidden = true;
    $("#splash").classList.remove("gone");
    document.body.classList.remove("nocam");
    const e = $("#splash-err");
    e.hidden = false;
    e.textContent = "No se pudo iniciar el AR real en este teléfono. Usa el modo compatible (escanear el QR).";
  }

  function startXR() {
    mode = "xr";
    if (canSpeak) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); }
    $("#splash").classList.add("gone");
    $("#hud").hidden = false;                 // debe estar visible: es la capa de interfaz sobre la camara AR
    $("#scan").hidden = true;
    $("#btn-rescan").hidden = true;
    document.body.classList.add("nocam");     // la camara la pone WebXR, no el <video>
    state = "xr-find";
    xrHint("Apunta al piso y mueve el celular despacio…");
    if (mock) { hitFound = true; hitPos.set(0, -0.6, -2); xrHint("Toca la pantalla para llamar a Byte aquí \u{1F447}"); return; }
    try { const p = scene.enterAR(); if (p && p.catch) p.catch(xrFail); } catch (e) { xrFail(); }
  }

  xrSupported().then((ok) => {
    if (!ok && !mock) return;
    $("#btn-start-xr").hidden = false;
    $("#btn-start").classList.add("alt");
    $("#btn-start").textContent = "Modo compatible: escanear el QR (iPhone y otros)";
  });
  $("#btn-start-xr").onclick = startXR;
  document.querySelectorAll("#hud button").forEach((b) => b.addEventListener("beforexrselect", (e) => e.preventDefault()));
  if (mock) document.addEventListener("click", (e) => { if (!e.target.closest("button")) onSelect(); });

  /* ================= Eventos ================= */
  $("#btn-start").onclick = start;
  $("#btn-summon").onclick = () => {
    if (state !== "scan") return;
    spawn(worldInFront(), AR.refDist, zoneParam);
  };
  $("#btn-rescan").onclick = () => {
    needClear = false;
    resetScanText();
    rescan();
  };
  $("#btn-mute").onclick = (e) => {
    muted = !muted;
    e.currentTarget.textContent = muted ? "🔇" : "🔊";
    if (muted) { stopSpeech(); }
  };
  let fact = 0;
  mascotEl.addEventListener("mascot-tap", () => mascot().react());

  requestAnimationFrame(loop);
})();
