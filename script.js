(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  function requestFullscreen(element) {
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  // Player sob demanda: nenhum iframe ou recurso do YouTube é criado antes do clique.
  const videoItems = $$(".video-item");
  const screen = $("#video-screen");
  const playButton = $("#play-video");
  let selectedVideo = videoItems[0]?.dataset.id || "";

  function placeholderMarkup(category) {
    return `
      <div class="video-scanlines" aria-hidden="true"></div>
      <div class="video-placeholder">
        <span class="signal-label">${category}</span>
        <button class="play-button" id="play-video" type="button" aria-label="Reproduzir vídeo selecionado"><span aria-hidden="true">▶</span></button>
        <p>O player será conectado após o clique.</p>
      </div>`;
  }

  function loadVideo() {
    if (!selectedVideo) return;
    const title = $("#video-title").textContent;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${selectedVideo}?autoplay=1&rel=0`;
    iframe.title = title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    screen.replaceChildren(iframe);
  }

  playButton?.addEventListener("click", loadVideo);

  videoItems.forEach((item) => {
    item.addEventListener("click", () => {
      videoItems.forEach((button) => button.classList.remove("active"));
      item.classList.add("active");
      selectedVideo = item.dataset.id;
      $("#video-category").textContent = item.dataset.category;
      $("#video-title").textContent = item.dataset.title;
      $("#video-duration").textContent = item.dataset.duration;
      $("#video-channel").textContent = item.dataset.channel;
      $("#video-source").textContent = item.dataset.channel.toUpperCase();
      $("#video-description").textContent = item.dataset.description;
      $("#video-external").href = `https://www.youtube.com/watch?v=${selectedVideo}`;
      screen.innerHTML = placeholderMarkup(item.dataset.category);
      $("#play-video")?.addEventListener("click", loadVideo);
    });
  });

  $("#video-fullscreen")?.addEventListener("click", () => requestFullscreen($("#video-shell")));

  // Simulação visual de floresta.
  const canvas = $("#forest-canvas");
  const ctx = canvas?.getContext("2d");
  const totalTrees = 180;
  let treeCount = totalTrees;
  let paused = false;
  let simulationTimer = null;
  let mode = "idle";
  let animationFrame = 0;

  function mulberry32(seed) {
    return function random() {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  const random = mulberry32(20260921);
  const trees = Array.from({ length: totalTrees }, (_, index) => {
    const depth = Math.pow(random(), .78);
    return {
      index,
      x: .04 + random() * .92,
      depth,
      crown: .78 + random() * .52,
      hue: 91 + random() * 28,
      sway: random() * Math.PI * 2
    };
  }).sort((a, b) => a.depth - b.depth);

  const removalOrder = [...Array(totalTrees).keys()];
  for (let i = removalOrder.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [removalOrder[i], removalOrder[j]] = [removalOrder[j], removalOrder[i]];
  }
  const removalRank = new Map(removalOrder.map((treeIndex, rank) => [treeIndex, rank]));

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function mixColor(from, to, amount) {
    const mix = (a, b) => Math.round(a + (b - a) * amount);
    return `rgb(${mix(from[0], to[0])}, ${mix(from[1], to[1])}, ${mix(from[2], to[2])})`;
  }

  function drawTree(tree, width, height, time) {
    const horizon = height * .28;
    const groundHeight = height - horizon;
    const y = horizon + tree.depth * groundHeight * .9;
    const scale = .22 + tree.depth * 1.06;
    const x = tree.x * width + Math.sin(time * .00045 + tree.sway) * (1.5 * scale);
    const trunkHeight = 24 * scale;
    const crownRadius = 10.5 * scale * tree.crown;

    ctx.fillStyle = `rgba(63, 43, 26, ${.5 + tree.depth * .4})`;
    ctx.fillRect(x - 1.7 * scale, y - trunkHeight, 3.4 * scale, trunkHeight + 3);

    const crownY = y - trunkHeight;
    ctx.shadowColor = "rgba(114, 188, 79, .18)";
    ctx.shadowBlur = 6 * scale;
    ctx.fillStyle = `hsl(${tree.hue} 43% ${21 + tree.depth * 6}%)`;
    ctx.beginPath();
    ctx.arc(x, crownY, crownRadius, 0, Math.PI * 2);
    ctx.arc(x - crownRadius * .66, crownY + crownRadius * .18, crownRadius * .68, 0, Math.PI * 2);
    ctx.arc(x + crownRadius * .7, crownY + crownRadius * .16, crownRadius * .72, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawForest(time = 0) {
    if (!canvas || !ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const loss = 1 - treeCount / totalTrees;
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height * .58);
    sky.addColorStop(0, mixColor([17, 39, 31], [55, 43, 33], loss));
    sky.addColorStop(1, mixColor([91, 126, 94], [157, 111, 72], loss));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = `rgba(218, 231, 188, ${.55 - loss * .2})`;
    ctx.beginPath();
    ctx.arc(width * .76, height * .12, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mixColor([31, 61, 42], [82, 64, 43], loss);
    ctx.beginPath();
    ctx.moveTo(0, height * .34);
    ctx.lineTo(width * .18, height * .22);
    ctx.lineTo(width * .35, height * .33);
    ctx.lineTo(width * .53, height * .19);
    ctx.lineTo(width * .74, height * .33);
    ctx.lineTo(width, height * .21);
    ctx.lineTo(width, height * .48);
    ctx.lineTo(0, height * .48);
    ctx.closePath();
    ctx.fill();

    const ground = ctx.createLinearGradient(0, height * .27, 0, height);
    ground.addColorStop(0, mixColor([34, 70, 42], [105, 76, 43], loss));
    ground.addColorStop(1, mixColor([9, 28, 16], [91, 57, 33], loss));
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, height * .28);
    ctx.lineTo(width, height * .28);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // O solo exposto cresce visualmente de modo proporcional ao índice didático.
    if (loss > .015) {
      ctx.fillStyle = `rgba(132, 81, 46, ${.28 + loss * .68})`;
      for (let i = 0; i < Math.ceil(loss * 12); i += 1) {
        const x = ((i * 197) % 83) / 83 * width;
        const y = height * (.43 + (((i * 67) % 47) / 47) * .49);
        const rx = (22 + loss * 88) * (.6 + (i % 3) * .17);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, rx * .3, -.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Curso d'água: mais estreito, opaco e amarronzado conforme a cobertura cai.
    const riverWidth = Math.max(13, 52 - loss * 35);
    ctx.strokeStyle = mixColor([72, 145, 139], [128, 86, 54], loss);
    ctx.globalAlpha = .78;
    ctx.lineWidth = riverWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(width * .58, height * .31);
    ctx.bezierCurveTo(width * .52, height * .5, width * .73, height * .62, width * .66, height * 1.04);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const activeThreshold = totalTrees - treeCount;
    trees.forEach((tree) => {
      if ((removalRank.get(tree.index) ?? 0) >= activeThreshold) drawTree(tree, width, height, time);
    });

    const haze = ctx.createLinearGradient(0, height * .28, 0, height * .56);
    haze.addColorStop(0, `rgba(220, 236, 205, ${.15 - loss * .08})`);
    haze.addColorStop(1, "rgba(220,236,205,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, height * .28, width, height * .28);

    animationFrame = requestAnimationFrame(drawForest);
  }

  function updateSimulation() {
    const percent = Math.round(treeCount / totalTrees * 100);
    const loss = 100 - percent;
    $("#forest-percent").textContent = percent;
    $("#tree-count").textContent = treeCount;
    $("#soil-value").textContent = `${Math.round(loss * .9)}%`;
    $("#habitat-value").textContent = `${Math.max(0, Math.round(100 - loss * 1.08))}%`;
    $("#moisture-value").textContent = percent > 70 ? "Alta" : percent > 38 ? "Em queda" : "Baixa";
    $("#forest-meter").style.width = `${percent}%`;
    $("#forest-meter").style.background = percent > 55 ? "linear-gradient(90deg, #589447, #b8e36a)" : "linear-gradient(90deg, #a4613e, #ff8a60)";

    let status;
    let consequence;
    if (percent > 82) {
      status = "Floresta íntegra: cobertura, sombra e umidade preservadas.";
      consequence = "Com cobertura alta, raízes protegem o solo, a evapotranspiração ajuda a reciclar umidade e há mais espaço contínuo para a biodiversidade.";
    } else if (percent > 58) {
      status = "Clareiras aparecem e o solo começa a perder proteção.";
      consequence = "A fragmentação separa habitats e aumenta as bordas quentes e secas. O escoamento superficial tende a crescer onde a vegetação foi retirada.";
    } else if (percent > 28) {
      status = "Paisagem fragmentada: menos habitat e umidade visível.";
      consequence = "Com menos cobertura, aumentam erosão, aquecimento do solo e pressão sobre nascentes, fauna e comunidades que dependem da floresta.";
    } else {
      status = "Cobertura crítica: solo exposto e curso d'água alterado.";
      consequence = "A perda severa de vegetação compromete biodiversidade, solo, regulação hídrica e modos de vida. Recuperar uma floresta é um processo lento e complexo.";
    }
    $("#land-status").textContent = status;
    $("#consequence-text").textContent = consequence;
  }

  function stopAutomatic() {
    window.clearInterval(simulationTimer);
    simulationTimer = null;
    mode = "idle";
    $("#accelerate")?.setAttribute("aria-pressed", "false");
    $("#reforest")?.setAttribute("aria-pressed", "false");
  }

  function setAutomatic(nextMode) {
    if (paused) return;
    if (mode === nextMode) {
      stopAutomatic();
      return;
    }
    stopAutomatic();
    mode = nextMode;
    const button = nextMode === "clearing" ? $("#accelerate") : $("#reforest");
    button?.setAttribute("aria-pressed", "true");
    simulationTimer = window.setInterval(() => {
      if (nextMode === "clearing") treeCount = Math.max(0, treeCount - 2);
      else treeCount = Math.min(totalTrees, treeCount + 2);
      updateSimulation();
      if (treeCount === 0 || treeCount === totalTrees) stopAutomatic();
    }, nextMode === "clearing" ? 160 : 210);
  }

  $("#remove-tree")?.addEventListener("click", () => {
    if (paused) return;
    stopAutomatic();
    treeCount = Math.max(0, treeCount - 1);
    updateSimulation();
  });
  $("#accelerate")?.addEventListener("click", () => setAutomatic("clearing"));
  $("#reforest")?.addEventListener("click", () => setAutomatic("restoring"));
  $("#pause-simulation")?.addEventListener("click", (event) => {
    paused = !paused;
    if (paused) stopAutomatic();
    event.currentTarget.innerHTML = paused ? '<span aria-hidden="true">▶</span> Continuar' : '<span aria-hidden="true">Ⅱ</span> Pausar';
    event.currentTarget.setAttribute("aria-pressed", String(paused));
  });
  $("#reset-simulation")?.addEventListener("click", () => {
    stopAutomatic();
    paused = false;
    treeCount = totalTrees;
    const pauseButton = $("#pause-simulation");
    pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pausar';
    pauseButton.setAttribute("aria-pressed", "false");
    updateSimulation();
  });
  $("#simulation-fullscreen")?.addEventListener("click", () => requestFullscreen($("#simulation-app")));

  if (canvas && ctx) {
    resizeCanvas();
    updateSimulation();
    drawForest();
    new ResizeObserver(resizeCanvas).observe(canvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(animationFrame);
      else drawForest();
    });
  }

  // Laboratório de pH.
  const phRange = $("#ph-range");
  const samples = $$(".sample-buttons button");
  const scale = $("#ph-scale");
  const phDescriptions = {
    acid: "A solução é ácida: seu pH está abaixo de 7.",
    neutral: "A solução está próxima do ponto neutro, pH 7.",
    base: "A solução é básica ou alcalina: seu pH está acima de 7."
  };

  function phColor(value) {
    const stops = [
      [0, [231, 83, 77]], [2, [245, 143, 69]], [5, [244, 207, 85]],
      [7, [86, 213, 164]], [9, [57, 184, 172]], [12, [77, 121, 216]], [14, [138, 85, 184]]
    ];
    for (let i = 0; i < stops.length - 1; i += 1) {
      const [startValue, startColor] = stops[i];
      const [endValue, endColor] = stops[i + 1];
      if (value >= startValue && value <= endValue) {
        const ratio = (value - startValue) / (endValue - startValue);
        return `rgb(${startColor.map((channel, index) => Math.round(channel + (endColor[index] - channel) * ratio)).join(",")})`;
      }
    }
    return "rgb(138,85,184)";
  }

  function updatePh(value, sampleName = null, explanation = null) {
    const ph = Math.min(14, Math.max(0, Number(value)));
    phRange.value = ph;
    $("#ph-number").textContent = ph.toFixed(1);
    $("#ph-output").textContent = ph.toFixed(1);
    const classification = Math.abs(ph - 7) < .05 ? "NEUTRO" : ph < 7 ? "ÁCIDO" : "BÁSICO / ALCALINO";
    $("#ph-classification").textContent = classification;
    const color = phColor(ph);
    $("#liquid").style.background = color;
    $("#liquid").style.boxShadow = `inset 0 13px 20px rgba(255,255,255,.16), 0 0 34px ${color}`;
    $$(".ph-scale button").forEach((button) => button.classList.toggle("active", Number(button.dataset.ph) === Math.round(ph)));

    if (sampleName) {
      $("#sample-name").textContent = sampleName;
      $("#sample-explanation").textContent = explanation;
    } else {
      const key = Math.abs(ph - 7) < .05 ? "neutral" : ph < 7 ? "acid" : "base";
      $("#sample-name").textContent = `Amostra virtual: pH ${ph.toFixed(1)}`;
      $("#sample-explanation").textContent = phDescriptions[key] + " A cor é uma representação didática de indicador universal.";
      samples.forEach((button) => button.classList.remove("active"));
    }
  }

  for (let value = 0; value <= 14; value += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.ph = value;
    button.textContent = value;
    button.setAttribute("aria-label", `Selecionar pH ${value}`);
    button.addEventListener("click", () => updatePh(value));
    scale?.append(button);
  }

  phRange?.addEventListener("input", (event) => updatePh(event.currentTarget.value));
  samples.forEach((button) => {
    button.addEventListener("click", () => {
      samples.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      updatePh(button.dataset.ph, button.dataset.name, button.dataset.description);
    });
  });
  updatePh(7, "Água pura", "Em condições de referência, a água pura é neutra. Na natureza, sais, gases e outras substâncias alteram esse valor.");

  // Indicação discreta da seção visível no cabeçalho.
  const navLinks = $$(".main-nav a");
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-35% 0px -58%", threshold: 0 });
  $$("main section[id]").forEach((section) => sectionObserver.observe(section));

  // Mantém links diretos para seções estáveis depois que as fontes terminam de carregar.
  if (location.hash) {
    document.fonts?.ready.then(() => {
      document.querySelector(location.hash)?.scrollIntoView();
    });
  }
})();
