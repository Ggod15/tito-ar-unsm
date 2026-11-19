(() => {
  const C = window.CONTENT;
  const AR = C.ar;
  const THREE = AFRAME.THREE;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const video = $("#cam");
  const mascotEl = $("#mascot");
  const camEl = $("#cam3d");
  const mascot = () => mascotEl.components.mascot;
  const sec = (id) => C.sections.find((s) => s.id === id);
  const tourList = C.sections.filter((s) => !s.quiz);

  let state = "idle"; // idle | scan | live
  let muted = false;
  let speaking = false;
  let tour = 0;       // token: al cambiarlo se cancela lo que Tito estaba explicando
  let tourIdx = 0;
  let answerResolve = null;
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

  // Tito dice algo y la promesa se cumple cuando termina de hablar.
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

  function chime() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = "sine";
      o.frequency.setValueAtTime(260, t);
      o.frequency.exponentialRampToValueAtTime(1300, t + 0.55);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.85);
    } catch (e) { /* sin audio */ }
  }

  /* ================= Explicaciones de Tito ================= */
  function cancelAll() {
    tour++;
    stopSpeech();
    if (answerResolve) { answerResolve(-1); answerResolve = null; }
    $("#answers").hidden = true;
    return tour;
  }

  async function playSection(s, token) {
    for (const part of s.parts) {
      if (token !== tour) return false;
      mascot().showCard(`${s.icon} ${s.title}`, part.lines);
      await say(part.say);
      if (token !== tour) return false;
      await sleep(350);
    }
    return token === tour;
  }

  async function runTour(from, token) {
    $("#btn-skip").hidden = false;
    for (let i = from; i < tourList.length; i++) {
      tourIdx = i;
      mascot().wave(1200);
      if (!(await playSection(tourList[i], token))) return;
    }
    $("#btn-skip").hidden = true;
    mascot().hideCard();
    await say(C.mascot.outro);
  }

  async function jump(id) {
    const token = cancelAll();
    $("#btn-skip").hidden = true;
    const s = sec(id);
    mascot().wave(1500);
    if (s.quiz) return playQuiz(s, token);
    if (!(await playSection(s, token))) return;
    mascot().hideCard();
    await say(C.mascot.askMore);
  }

  function waitAnswer() { return new Promise((r) => (answerResolve = r)); }

  async function playQuiz(s, token) {
    mascot().showCard(`${s.icon} ${s.title}`, ["¡Responde las preguntas!"]);
    await say(s.intro);
    let score = 0;
    const box = $("#answers");
    for (let i = 0; i < s.questions.length; i++) {
      if (token !== tour) return;
      const q = s.questions[i];
      mascot().showCard(`Pregunta ${i + 1} de ${s.questions.length}`, [q.q]);
      box.innerHTML = "";
      q.o.forEach((txt, k) => {
        const b = document.createElement("button");
        b.textContent = txt;
        b.dataset.k = k;
        b.onclick = () => { if (answerResolve) { const r = answerResolve; answerResolve = null; r(k); } };
        box.appendChild(b);
      });
      box.hidden = false;
      const p = waitAnswer();
      say(q.q);
      const k = await p;
      if (token !== tour || k < 0) return;
      box.querySelectorAll("button").forEach((b) => (b.disabled = true));
      box.querySelector(`[data-k="${q.a}"]`).classList.add("ok");
      if (k === q.a) { score++; mascot().wave(1200); } else box.querySelector(`[data-k="${k}"]`).classList.add("bad");
      await say(k === q.a ? "¡Correcto!" : `Casi. La respuesta era: ${q.o[q.a]}.`);
      box.hidden = true;
    }
    if (token !== tour) return;
    const n = s.questions.length;
    mascot().showCard("🏆 Resultado", [`Lograste ${score} de ${n}`]);
    mascot().wave(2500);
    await say(score === n ? "¡Perfecto! Eres un verdadero ingeniero de sistemas." : score >= 3 ? "¡Muy bien! Casi perfecto." : "¡Buen intento! Ven a estudiar con nosotros y lo dominas.");
    if (token !== tour) return;
    mascot().hideCard();
  }

  /* ================= Posicionamiento AR ================= */
  const camQ = new THREE.Quaternion();
  const camP = new THREE.Vector3();
  function camPose() { camEl.object3D.updateMatrixWorld(true); camEl.object3D.getWorldQuaternion(camQ); camEl.object3D.getWorldPosition(camP); }

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

  // Convierte la posición del QR en pantalla en un punto del mundo (a la distancia estimada por su tamaño).
  function worldFromQR(code, cw) {
    const vw = video.videoWidth, vh = video.videoHeight, W = innerWidth, H = innerHeight;
    const f = vw / cw;
    const L = code.location;
    const pts = [L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner];
    const cx = pts.reduce((a, p) => a + p.x, 0) / 4 * f;
    const cy = pts.reduce((a, p) => a + p.y, 0) / 4 * f;
    const widthPx = Math.hypot(L.topRightCorner.x - L.topLeftCorner.x, L.topRightCorner.y - L.topLeftCorner.y) * f;
    const k = Math.max(W / vw, H / vh);                 // object-fit: cover
    const sx = cx * k + (W - vw * k) / 2;
    const sy = cy * k + (H - vh * k) / 2;
    const nx = (sx / W) * 2 - 1, ny = -((sy / H) * 2 - 1);

    const tY = Math.tan(THREE.MathUtils.degToRad(AR.camFov) / 2), tX = tY * (W / H);
    const angW = ((widthPx * k) / W) * 2 * Math.atan(tX);
    const d = THREE.MathUtils.clamp(AR.qrSizeM / (2 * Math.tan(angW / 2)), AR.minDist, AR.maxDist);

    camPose();
    const dir = new THREE.Vector3(nx * tX, ny * tY, -1).normalize().applyQuaternion(camQ);
    return camP.clone().add(dir.multiplyScalar(d)).add(new THREE.Vector3(0, -0.45, 0)); // los pies quedan un poco bajo el QR
  }

  function worldInFront() {
    camPose();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camQ);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    return camP.clone().add(fwd.multiplyScalar(1.8)).add(new THREE.Vector3(0, -0.8, 0));
  }

  /* ================= Escaneo de QR ================= */
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let lastScan = 0, lastSeen = 0, hintUntil = 0;

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

  function loop(ts) {
    requestAnimationFrame(loop);
    if (state === "idle" || ts - lastScan < 110) return;
    lastScan = ts;
    if (state === "scan" && hintUntil && performance.now() > hintUntil) {
      hintUntil = 0;
      $("#scan-text").innerHTML = "Apunta la cámara al <b>código QR</b> para despertar a Tito";
    }
    if (!video.srcObject || video.readyState < 2 || !video.videoWidth) return;

    const cw = 640, ch = Math.round((cw * video.videoHeight) / video.videoWidth);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.drawImage(video, 0, 0, cw, ch);
    const code = window.jsQR && jsQR(ctx.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: "dontInvert" });
    if (!code) return;

    const info = parseQR(code.data);
    if (!info) { if (state === "scan") hint("Ese QR no es de Tito 🙈 Busca el código de la facultad"); return; }

    const pos = worldFromQR(code, cw);
    if (state === "scan") spawn(pos, info.zone);
    else if (state === "live") { place(pos, false); lastSeen = performance.now(); } // mientras lo veas, Tito sigue al QR; al perderlo se queda fijo
  }

  /* ================= Flujo ================= */
  async function spawn(pos, zone) {
    state = "live";
    $("#scan").hidden = true;
    $("#menu").hidden = false;
    $("#btn-rescan").hidden = false;
    mascotEl.object3D.scale.setScalar(AR.scale);
    place(pos, true);
    mascotEl.setAttribute("visible", true);
    mascot().appear();
    chime();
    if (navigator.vibrate) navigator.vibrate([60, 40, 140]);
    lastSeen = performance.now();

    const token = cancelAll();
    await sleep(1900);
    if (token !== tour) return;
    mascot().wave(2800);
    const s = zone && sec(zone);
    if (s && !s.quiz) {
      await say(`¡Hola! Soy ${C.mascot.name}.`);
      if (token !== tour) return;
      if (!(await playSection(s, token))) return;
      mascot().hideCard();
      await say(C.mascot.askMore);
    } else {
      await say(C.mascot.welcome);
      if (token !== tour) return;
      runTour(0, token);
    }
  }

  function rescan() {
    cancelAll();
    mascot().hide();
    mascotEl.setAttribute("visible", false);
    $("#subtitle").hidden = true;
    $("#menu").hidden = true;
    $("#btn-rescan").hidden = true;
    $("#btn-skip").hidden = true;
    $("#scan").hidden = false;
    state = "scan";
  }

  function buildMenu() {
    const nav = $("#menu");
    nav.innerHTML = "";
    C.sections.forEach((s) => {
      const b = document.createElement("button");
      b.textContent = `${s.icon} ${s.title}`;
      b.onclick = () => jump(s.id);
      nav.appendChild(b);
    });
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
      e.textContent = "No pude abrir la cámara (¿permiso denegado o conexión no segura?). Puedes invocar a Tito sin QR.";
      await sleep(1600);
      $("#scan-text").innerHTML = "Sin cámara: usa el botón para invocar a Tito";
    }
    $("#splash").classList.add("gone");
    $("#hud").hidden = false;
    $("#scan").hidden = false;
    state = "scan";
  }

  /* ================= Eventos ================= */
  $("#btn-start").onclick = start;
  $("#btn-summon").onclick = () => {
    if (state !== "scan") return;
    spawn(worldInFront(), zoneParam);
  };
  $("#btn-rescan").onclick = rescan;
  $("#btn-skip").onclick = () => { const token = cancelAll(); mascot().hideCard(); runTour(tourIdx + 1, token); };
  $("#btn-mute").onclick = (e) => {
    muted = !muted;
    e.currentTarget.textContent = muted ? "🔇" : "🔊";
    if (muted) { stopSpeech(); }
  };
  let fact = 0;
  mascotEl.addEventListener("mascot-tap", () => {
    mascot().wave(1800);
    if (!speaking) say(C.mascot.funFacts[fact++ % C.mascot.funFacts.length]);
  });

  buildMenu();
  requestAnimationFrame(loop);
})();
