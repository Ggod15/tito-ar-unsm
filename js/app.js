(() => {
  const C = window.CONTENT;
  const $ = (s) => document.querySelector(s);
  const scene = $("#scene");
  const mascotEl = $("#mascot");
  const mascot = () => mascotEl.components.mascot;

  let muted = false;
  let current = null;
  let subTimer = null;
  let factIdx = 0;

  /* ---------- Voz ---------- */
  let voice = null;
  const canSpeak = "speechSynthesis" in window;
  function pickVoice() {
    if (!canSpeak) return;
    const vs = speechSynthesis.getVoices();
    voice =
      vs.find((v) => /es[-_]PE/i.test(v.lang)) ||
      vs.find((v) => /es[-_](MX|US|419|AR|CO|CL)/i.test(v.lang)) ||
      vs.find((v) => /^es/i.test(v.lang)) || null;
  }
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function showSub(text) {
    const s = $("#subtitle");
    s.textContent = text;
    s.hidden = false;
    clearTimeout(subTimer);
  }
  function hideSubLater(ms = 2200) {
    clearTimeout(subTimer);
    subTimer = setTimeout(() => ($("#subtitle").hidden = true), ms);
  }
  function stopSpeech() {
    if (canSpeak) speechSynthesis.cancel();
    clearTimeout(subTimer);
    mascot() && mascot().setSpeaking(false);
  }
  function speak(text) {
    stopSpeech();
    showSub(text);
    const m = mascot();
    if (muted || !canSpeak) {
      m.setSpeaking(true);
      setTimeout(() => { m.setSpeaking(false); hideSubLater(); }, Math.min(9000, 1500 + text.length * 45));
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : "es-ES";
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.25; // voz más "simpática"
    u.onstart = () => m.setSpeaking(true);
    u.onend = u.onerror = () => { m.setSpeaking(false); hideSubLater(); };
    speechSynthesis.speak(u);
  }

  /* ---------- Menú y paneles ---------- */
  function buildMenu() {
    const nav = $("#menu");
    nav.innerHTML = "";
    C.sections.forEach((s) => {
      const b = document.createElement("button");
      b.textContent = `${s.icon} ${s.title}`;
      b.onclick = () => openSection(s.id);
      nav.appendChild(b);
    });
  }

  function renderBlock(b, host) {
    if (b.type === "p") host.insertAdjacentHTML("beforeend", `<p>${b.text}</p>`);
    else if (b.type === "list")
      host.insertAdjacentHTML("beforeend", `<ul>${b.items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
    else if (b.type === "cards")
      host.insertAdjacentHTML("beforeend",
        `<div class="cards">${b.items.map(([i, t, d]) => `<div class="c"><span>${i}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div>`);
    else if (b.type === "ciclos")
      host.insertAdjacentHTML("beforeend",
        b.data.map(([c, t]) => `<details><summary>Ciclo ${c}</summary><p>${t}</p></details>`).join(""));
    else if (b.type === "links")
      host.insertAdjacentHTML("beforeend",
        b.items.map(([t, u]) => `<a class="link" href="${u}" target="_blank" rel="noopener">${t}</a>`).join(""));
    else if (b.type === "quiz") renderQuiz(b.questions, host);
  }

  function renderQuiz(qs, host) {
    let i = 0, score = 0;
    const box = document.createElement("div");
    host.appendChild(box);
    const step = () => {
      if (i >= qs.length) {
        box.innerHTML = `<p class="quiz-score">🏆 Lograste <b>${score}/${qs.length}</b></p>
          <button class="ghost" id="quiz-again">Jugar otra vez</button>`;
        box.querySelector("#quiz-again").onclick = () => { i = 0; score = 0; step(); };
        const msg = score === qs.length ? "¡Perfecto! Eres un verdadero ingeniero de sistemas." : score >= 3 ? "¡Muy bien! Casi perfecto." : "¡Buen intento! Ven a estudiar con nosotros y lo dominas.";
        mascot().wave(); speak(msg);
        return;
      }
      const q = qs[i];
      box.innerHTML = `<p class="quiz-q">${i + 1}/${qs.length} · ${q.q}</p>` +
        q.o.map((o, k) => `<button class="quiz-o" data-k="${k}">${o}</button>`).join("");
      box.querySelectorAll(".quiz-o").forEach((btn) => {
        btn.onclick = () => {
          const k = +btn.dataset.k;
          box.querySelectorAll(".quiz-o").forEach((x) => (x.disabled = true));
          box.querySelector(`[data-k="${q.a}"]`).classList.add("ok");
          if (k === q.a) { score++; speak("¡Correcto!"); } else { btn.classList.add("bad"); speak("Ups, casi."); }
          i++;
          setTimeout(step, 1400);
        };
      });
    };
    step();
  }

  function openSection(id, { autospeak = true } = {}) {
    const s = C.sections.find((x) => x.id === id);
    if (!s) return;
    current = s;
    $("#panel-title").textContent = `${s.icon} ${s.title}`;
    const note = $("#panel-note");
    note.hidden = !s.note;
    note.textContent = s.note || "";
    const body = $("#panel-body");
    body.innerHTML = "";
    s.body.forEach((b) => renderBlock(b, body));
    $("#panel").hidden = false;
    $("#menu").hidden = true;
    $("#panel").scrollTop = 0;
    mascotEl.setAttribute("mascot", "lift", 0.55);
    mascot().wave(1800);
    if (autospeak) speak(s.speak);
    history.replaceState(null, "", `?s=${id}`);
  }

  function closePanel() {
    $("#panel").hidden = true;
    $("#menu").hidden = false;
    current = null;
    mascotEl.setAttribute("mascot", "lift", 0);
    stopSpeech();
    $("#subtitle").hidden = true;
    history.replaceState(null, "", location.pathname);
  }

  /* ---------- Inicio: cámara, giroscopio, mascota ---------- */
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, audio: false,
      });
      const v = $("#cam");
      v.srcObject = stream;
      await v.play().catch(() => {});
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
    } catch (e) { /* sin giroscopio: se usa arrastre táctil */ }
  }

  async function start() {
    const btn = $("#btn-start");
    btn.disabled = true;
    btn.textContent = "Iniciando…";
    // Desbloquea la voz con un gesto del usuario (iOS/Chrome)
    if (canSpeak) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); }
    await requestMotion();
    const camOk = await startCamera();
    if (!camOk) {
      const e = $("#splash-err");
      e.hidden = false;
      e.textContent = "No pude abrir la cámara (¿permiso denegado o conexión no segura?). Continuaré sin cámara.";
      await new Promise((r) => setTimeout(r, 1800));
    }
    $("#splash").classList.add("gone");
    $("#hud").hidden = false;
    mascotEl.setAttribute("visible", true);

    const param = new URLSearchParams(location.search).get("s");
    setTimeout(() => {
      mascot().wave(3200);
      if (param && C.sections.some((s) => s.id === param)) {
        speak(`¡Hola! Soy ${C.mascot.name}. ` + C.sections.find((s) => s.id === param).speak);
        openSection(param, { autospeak: false });
      } else {
        speak(C.mascot.welcome);
      }
    }, 500);
  }

  /* ---------- Eventos ---------- */
  $("#btn-start").onclick = start;
  $("#btn-close").onclick = closePanel;
  $("#btn-replay").onclick = () => current && speak(current.speak);
  $("#btn-mute").onclick = (e) => {
    muted = !muted;
    e.currentTarget.textContent = muted ? "🔇" : "🔊";
    if (muted) stopSpeech();
  };
  mascotEl.addEventListener("mascot-tap", () => {
    mascot().wave(2200);
    speak(C.mascot.funFacts[factIdx++ % C.mascot.funFacts.length]);
  });

  buildMenu();
})();
