import data from "./game-data.js";
import "@phosphor-icons/web/regular";

const els = {
  game: document.querySelector("#game"),
  stage: document.querySelector("#stage"),
  hud: document.querySelector("#hud"),
  sceneMarker: document.querySelector(".scene-marker"),
  sceneTitle: document.querySelector("#scene-title"),
  sceneSubtitle: document.querySelector("#scene-subtitle"),
  dialogue: document.querySelector("#dialogue"),
  speaker: document.querySelector("#speaker"),
  text: document.querySelector("#dialogue-text"),
  advance: document.querySelector("#advance-button"),
  choices: document.querySelector("#choice-panel"),
  overlay: document.querySelector("#overlay"),
  evidenceButton: document.querySelector("#evidence-button"),
  evidenceCount: document.querySelector("#evidence-count"),
  recordButton: document.querySelector("#record-button"),
  settingsButton: document.querySelector("#settings-button"),
  modal: document.querySelector("#modal"),
  modalTitle: document.querySelector("#modal-title"),
  modalBody: document.querySelector("#modal-body"),
  modalClose: document.querySelector("#modal-close"),
  modalScrim: document.querySelector("#modal-scrim"),
  toast: document.querySelector("#toast"),
};

const backgrounds = {
  cover: "/assets/backgrounds/cover-clinic-interior-v1.jpg",
  phone: "/assets/backgrounds/opening-phone-v2.jpg",
  exterior: "/assets/backgrounds/hospital-exterior-v2.jpg",
  title: "/assets/backgrounds/title-transition-v3.jpg",
  waiting: "/assets/backgrounds/waiting-area-clean-v1.jpg",
  waitingCast: "/assets/backgrounds/waiting-area-cast-v2.jpg",
  waitingInvestigation: "/assets/backgrounds/waiting-area-investigation-v1.jpg",
  corridor: "/assets/backgrounds/second-consultation-corridor-v1.jpg",
  clinic: "/assets/backgrounds/second-consultation-evidence-v4.jpg",
  consultationClean: "/assets/backgrounds/second-consultation-clean-v1.jpg",
  isolation: "/assets/backgrounds/isolation-room-v1.jpg",
};

const backgroundCache = new Map();
let backgroundPreloadScheduled = false;

function preloadBackground(src, priority = "auto") {
  if (backgroundCache.has(src)) return backgroundCache.get(src);
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = priority;
  image.src = src;
  const ready = image.decode?.().catch(() => {}) || Promise.resolve();
  backgroundCache.set(src, ready);
  return ready;
}

function scheduleBackgroundPreload() {
  if (backgroundPreloadScheduled) return;
  backgroundPreloadScheduled = true;
  const queue = Object.values(backgrounds).filter((src) => src !== backgrounds.cover && src !== backgrounds.phone);
  const preloadNext = () => {
    const src = queue.shift();
    if (!src) return;
    preloadBackground(src).finally(() => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(preloadNext, { timeout: 1400 });
      else window.setTimeout(preloadNext, 180);
    });
  };
  preloadNext();
}

const preloadedEvidenceImages = new Map();
let evidencePreloadScheduled = false;
const preloadedCharacterImages = new Map();
let characterPreloadScheduled = false;

function scheduleCharacterPreload() {
  if (characterPreloadScheduled) return;
  characterPreloadScheduled = true;
  const queue = Object.values(data.characters).flatMap((character) => character.frames || [character.expressions]).filter(Boolean);
  const preloadNext = () => {
    const src = queue.shift();
    if (!src) return;
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    preloadedCharacterImages.set(src, image);
    const ready = image.decode?.().catch(() => {}) || Promise.resolve();
    ready.finally(() => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(preloadNext, { timeout: 1600 });
      else window.setTimeout(preloadNext, 220);
    });
  };
  preloadNext();
}

function scheduleEvidencePreload() {
  if (evidencePreloadScheduled) return;
  evidencePreloadScheduled = true;
  const queue = Object.values(data.evidence);
  const preloadNext = () => {
    const item = queue.shift();
    if (!item) return;
    const image = new Image();
    image.decoding = "async";
    image.src = item.image;
    preloadedEvidenceImages.set(item.image, image);
    const ready = image.decode?.().catch(() => {}) || Promise.resolve();
    ready.finally(() => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(preloadNext, { timeout: 1800 });
      else window.setTimeout(preloadNext, 260);
    });
  };
  preloadNext();
}

const state = {
  evidence: new Set(),
  facts: new Set(),
  qinDone: new Set(),
  witnessTopicsDone: {
    tang: new Set(),
    su: new Set(),
    lin: new Set(),
  },
  witnessesStarted: new Set(),
  witnessesDone: new Set(),
  searchFound: new Set(),
  isolationSearchFound: new Set(),
  secondLinTopicsDone: new Set(),
  waitingSearchFound: new Set(),
  liveReplaySegments: new Set(),
  suFinalTopicsDone: new Set(),
  testimonyPressed: new Set(),
  selectedTestimony: 0,
  dialogueQueue: [],
  dialogueDone: null,
  dialogueHistory: [],
  typingTimer: null,
  typingComplete: true,
  fullLine: "",
  textSpeed: localStorage.getItem("mystery-text-speed") || "instant",
  fontSize: localStorage.getItem("mystery-font-size") || "medium",
  volume: Number(localStorage.getItem("mystery-volume") ?? 34),
  muted: localStorage.getItem("mystery-muted") === "true",
  activePortrait: "",
  interactionScroll: {
    search: null,
    suspects: null,
    isolation: null,
    waitingInvestigation: null,
  },
};

const sceneAdvanceGesture = {
  pointerId: null,
  startX: 0,
  startY: 0,
};

const audio = {
  tracks: {
    story: "/assets/audio/clean-soul.m4a",
  },
  testimonyTrack: "/assets/audio/courtroom-cross-examination.ogg",
  sfx: {
    advance: "/assets/audio/sfx/dialogue-thump.wav",
    door: "/assets/audio/sfx/door-open-close.mp3",
    investigate: "/assets/audio/sfx/investigation-found.wav",
    evidence: "/assets/audio/sfx/evidence-acquired.wav",
    phone: "/assets/audio/sfx/phone-ring.wav",
    testimony: "/assets/audio/sfx/cross-examination-sting.wav",
  },
  trackMix: {
    story: 0.64,
    testimony: 0.66,
  },
  currentTrack: "story",
  bgm: null,
  sfxPools: new Map(),
  getTrackSource(track = this.currentTrack) {
    if (track === "testimony") return this.testimonyTrack;
    return this.tracks.story;
  },
  init() {
    if (!this.bgm) {
      this.bgm = new Audio(this.getTrackSource());
      this.bgm.loop = true;
      this.bgm.preload = "auto";
    }
    Object.entries(this.sfx).forEach(([name, src]) => {
      if (this.sfxPools.has(name)) return;
      const players = Array.from({ length: 3 }, () => {
        const sound = new Audio(src);
        sound.preload = "auto";
        sound.load();
        return sound;
      });
      this.sfxPools.set(name, { players, index: 0 });
    });
    this.update();
    this.startBgm();
  },
  startBgm() {
    if (!this.bgm || state.muted || state.volume === 0) return;
    this.bgm.play().catch(() => {});
  },
  setTrack(track, force = false) {
    if (!this.tracks[track] && track !== "testimony") return;
    if (track === this.currentTrack && !force) {
      this.startBgm();
      return;
    }
    const shouldResume = Boolean(this.bgm && !this.bgm.paused);
    this.bgm?.pause();
    this.currentTrack = track;
    this.bgm = new Audio(this.getTrackSource(track));
    this.bgm.loop = true;
    this.bgm.preload = "auto";
    this.update();
    if (shouldResume) this.startBgm();
  },
  update() {
    const value = state.muted ? 0 : state.volume / 100;
    if (this.bgm) this.bgm.volume = Math.min(1, value * (this.trackMix[this.currentTrack] || 0.64));
    this.sfxPools.forEach(({ players }) => {
      players.forEach((player) => {
        player.volume = Math.min(1, value * (player.dataset.mix || 0.8));
      });
    });
  },
  playSfx(name, mix = 0.8) {
    if (!this.sfx[name] || state.muted || state.volume === 0) return;
    if (!this.sfxPools.has(name)) this.init();
    const pool = this.sfxPools.get(name);
    if (!pool) return;
    const player = pool.players[pool.index];
    pool.index = (pool.index + 1) % pool.players.length;
    player.pause();
    player.currentTime = 0;
    player.dataset.mix = String(mix);
    player.volume = Math.min(1, (state.volume / 100) * mix);
    player.play().catch(() => {});
  },
  phonePulse() {
    this.playSfx("phone", 0.9);
  },
  door() {
    this.playSfx("door", 1);
  },
  advance() {
    this.playSfx("advance", 0.45);
  },
  cue(type = "soft") {
    this.playSfx(type === "evidence" ? "evidence" : "investigate", type === "evidence" ? 0.95 : 0.75);
  },
  testimonySting() {
    this.playSfx("testimony", 1);
  },
};

function setHud(title, subtitle = "", visible = true) {
  els.sceneTitle.textContent = title;
  els.sceneSubtitle.textContent = subtitle;
  els.sceneMarker.classList.toggle("hidden", !title);
  els.sceneSubtitle.classList.toggle("hidden", !subtitle);
  els.hud.classList.toggle("hidden", !visible);
}

function setStage(screen, background, markup = "") {
  if (background) preloadBackground(background, "high");
  els.stage.className = `stage stage-${screen}`;
  els.stage.style.setProperty("--scene-bg", background ? `url("${background}")` : "none");
  els.stage.innerHTML = `${markup}<div id="character-layer" class="character-layer" aria-hidden="true"></div>`;
  state.activePortrait = "";
}

function resetPanels() {
  clearTyping();
  clearTestimonyInterface();
  els.dialogue.classList.add("hidden");
  els.game.classList.remove("dialogue-active");
  els.choices.classList.add("hidden");
  els.choices.classList.remove("replay-choice-panel");
  els.overlay.classList.add("hidden");
  els.overlay.innerHTML = "";
  closeModal();
}

function clearTestimonyInterface() {
  els.dialogue.classList.remove("testimony-mode");
  els.dialogue.querySelector(".testimony-dialogue-tools")?.remove();
  els.advance.classList.remove("hidden");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 2200);
}

function updateEvidenceCount() {
  els.evidenceCount.textContent = state.evidence.size;
}

function getCharacter(speaker) {
  if (speaker.startsWith("许知衡")) return data.characters.xu;
  if (speaker.startsWith("江跃")) return data.characters.jiang;
  if (speaker.startsWith("秦昭")) return data.characters.qin;
  if (speaker.startsWith("唐宁")) return data.characters.tang;
  if (speaker.startsWith("苏青")) return data.characters.su;
  if (speaker.startsWith("林夏")) return data.characters.lin;
  return null;
}

function inferExpression(speaker, text) {
  if (speaker.startsWith("江跃")) {
    if (/^前辈。$|密室知识|遵命|先别睡|今晚是你先|听起来确实没睡/.test(text)) return 0;
    if (/拒绝|好吧|手机|睡了|……/.test(text)) return 2;
    return 1;
  }
  if (speaker.startsWith("秦昭")) {
    if (/所以我拒绝|你刚才摸了手机/.test(text)) return 2;
    if (/死|撞击|伤|血|不能|没有|遗体|尸检/.test(text)) return 1;
    return 0;
  }
  if (speaker.startsWith("许知衡")) {
    if (/什么时候准备|今晚是你|睡了|密室知识/.test(text)) return 0;
    if (/^……|可惜|无语/.test(text)) return 2;
    return 1;
  }
  return 0;
}

function showSpeakerPortrait(speaker, text = "", requestedExpression) {
  const layer = document.querySelector("#character-layer");
  if (!layer) return;
  if (els.stage.classList.contains("stage-phone")) {
    layer.innerHTML = "";
    return;
  }
  const character = getCharacter(speaker);
  if (!character) {
    if (state.activePortrait) layer.innerHTML = "";
    state.activePortrait = "";
    return;
  }
  const expression = requestedExpression ?? inferExpression(speaker, text);
  const portraitKey = `${character.id}-${expression}`;
  if (state.activePortrait === portraitKey && layer.firstElementChild) return;
  state.activePortrait = portraitKey;
  const expressionAsset = character.frames?.[expression];
  const portraitAsset = expressionAsset || character.frames?.[0] || character.expressions;
  const frameClass = character.frames ? " portrait-frame" : "";
  const expressionLabel = character.expressionLabels?.[expression] || `expression-${expression}`;
  layer.innerHTML = `<div class="speaker-portrait${frameClass} portrait-${character.side} portrait-${character.id} expression-${expression} expression-${expressionLabel}" data-expression="${expressionLabel}" style="--portrait-sheet:url('${portraitAsset}')"></div>`;
}

function clearTyping() {
  if (state.typingTimer) window.clearInterval(state.typingTimer);
  state.typingTimer = null;
  state.typingComplete = true;
}

function renderLineText(text) {
  clearTyping();
  state.fullLine = text;
  if (state.textSpeed === "instant") {
    els.text.textContent = text;
    return;
  }
  const delay = state.textSpeed === "slow" ? 52 : 28;
  let index = 0;
  state.typingComplete = false;
  els.text.textContent = "";
  state.typingTimer = window.setInterval(() => {
    index += 1;
    els.text.textContent = text.slice(0, index);
    if (index >= text.length) clearTyping();
  }, delay);
}

function runDialogue(lines, done) {
  clearTestimonyInterface();
  state.dialogueQueue = lines.map(([speaker, text, expression]) => ({ speaker, text, expression }));
  state.dialogueDone = done || null;
  els.choices.classList.add("hidden");
  els.dialogue.classList.remove("hidden");
  els.game.classList.add("dialogue-active");
  nextDialogueLine();
}

function advanceDialogue() {
  if (!state.typingComplete) {
    clearTyping();
    els.text.textContent = state.fullLine;
    return;
  }
  audio.advance();
  nextDialogueLine();
}

function nextDialogueLine() {
  const next = state.dialogueQueue.shift();
  if (!next) {
    els.dialogue.classList.add("hidden");
    els.game.classList.remove("dialogue-active");
    showSpeakerPortrait("");
    const done = state.dialogueDone;
    state.dialogueDone = null;
    if (done) done();
    return;
  }
  const isNarration = next.speaker === "旁白";
  els.dialogue.classList.toggle("narration", isNarration);
  els.speaker.textContent = isNarration ? "" : next.speaker.replace(/（电话）|（低声）/, "");
  els.speaker.classList.toggle("hidden", isNarration);
  renderLineText(next.text);
  showSpeakerPortrait(next.speaker, next.text, next.expression);
  state.dialogueHistory.push(next);
}

function isSceneAdvanceTarget(target) {
  if (!(target instanceof Element)) return false;
  if (els.dialogue.classList.contains("hidden")) return false;
  if (!els.modal.classList.contains("hidden") || !els.modalScrim.classList.contains("hidden")) return false;
  return !target.closest("#dialogue, #hud, #choice-panel, #overlay, #modal, #modal-scrim, button, a, input, select, textarea, [role='button']");
}

function beginSceneAdvanceGesture(event) {
  if (!event.isPrimary || event.button !== 0 || !isSceneAdvanceTarget(event.target)) return;
  sceneAdvanceGesture.pointerId = event.pointerId;
  sceneAdvanceGesture.startX = event.clientX;
  sceneAdvanceGesture.startY = event.clientY;
}

function finishSceneAdvanceGesture(event) {
  if (sceneAdvanceGesture.pointerId !== event.pointerId) return;
  const distance = Math.hypot(
    event.clientX - sceneAdvanceGesture.startX,
    event.clientY - sceneAdvanceGesture.startY,
  );
  sceneAdvanceGesture.pointerId = null;
  if (distance <= 12 && isSceneAdvanceTarget(event.target)) advanceDialogue();
}

function cancelSceneAdvanceGesture(event) {
  if (sceneAdvanceGesture.pointerId === event.pointerId) sceneAdvanceGesture.pointerId = null;
}

function showChoices(items) {
  els.choices.innerHTML = `<div class="choice-list"></div>`;
  const list = els.choices.querySelector(".choice-list");
  items.forEach((item) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.innerHTML = `<span>${item.label}</span><i class="ph ph-arrow-right"></i>`;
    button.addEventListener("click", item.action);
    list.append(button);
  });
  els.choices.classList.remove("hidden");
}

function getEvidenceItem(key) {
  const item = data.evidence[key];
  if (key === "reports" && state.facts.has("blood-analysis")) {
    return {
      ...item,
      description: "下层为奶糖的检验报告，于03:36自动打印，正面沾有贺川在器械架前遭受撞击时留下的血；上层为旺旺的血液检查报告，于03:46自动打印，正面干净，背面留有从下层接触转印的贺川血迹。上层报告落下时，下层的血尚未干。",
      updated: true,
    };
  }
  if (key === "hair" && state.facts.has("hair-identified")) {
    return {
      ...item,
      name: "奶糖的猫毛",
      description: "夹在器械架新形成的变形缝中的白色猫毛，经鉴定属于奶糖；毛发位于撞击后向内折叠的金属夹层里。",
      updated: true,
    };
  }
  if (key !== "injury" || !state.facts.has("death-time")) return item;
  return {
    ...item,
    description: `${item.description} 根据现场初步检验，死亡时间暂定为03:20—03:50。`,
    updated: true,
  };
}

function addEvidence(key, done) {
  const isNew = !state.evidence.has(key);
  state.evidence.add(key);
  updateEvidenceCount();
  if (!isNew) {
    if (done) done();
    return;
  }
  const item = getEvidenceItem(key);
  audio.cue("evidence");
  els.overlay.innerHTML = `
    <article class="evidence-reveal">
      <figure class="evidence-reveal-media">
        <img src="${item.image}" alt="${item.name}" decoding="async" />
      </figure>
      <div class="evidence-reveal-copy">
        <small>获得证物 · ${item.id}</small>
        <h2>${item.name}</h2>
        <p>${item.description}</p>
        <button id="accept-evidence" class="primary-button" type="button">收下证物</button>
      </div>
    </article>`;
  els.overlay.classList.remove("hidden");
  const revealMedia = els.overlay.querySelector(".evidence-reveal-media");
  const revealImage = revealMedia.querySelector("img");
  const showImage = () => revealMedia.classList.add("loaded");
  if (revealImage.complete && revealImage.naturalWidth) showImage();
  else revealImage.addEventListener("load", showImage, { once: true });
  document.querySelector("#accept-evidence").addEventListener("click", () => {
    els.overlay.classList.add("hidden");
    els.overlay.innerHTML = "";
    if (done) done();
  });
}

function renderStart() {
  resetPanels();
  setHud("", "", false);
  setStage("cover", backgrounds.cover, `
    <div class="cover-scrim"></div>
    <section class="cover-copy">
      <p>“前辈，你睡了吗？”</p>
      <h1>凌晨四点的<br>宠物医院</h1>
      <span>电话那头停了半秒：“南桥路，出命案了。”</span>
      <button id="start-game" class="cover-button" type="button">接起电话 <i class="ph ph-arrow-right"></i></button>
    </section>
    <div class="sound-state"><i class="ph ph-speaker-high"></i> 点击进入后播放背景音乐与剧情音效 · 可在设置中关闭</div>`);
  preloadBackground(backgrounds.phone, "high");
  document.querySelector("#start-game").addEventListener("click", () => {
    audio.init();
    scheduleBackgroundPreload();
    window.setTimeout(scheduleCharacterPreload, 450);
    window.setTimeout(scheduleEvidencePreload, 1800);
    startOpening();
  });
}

function startOpening() {
  audio.setTrack("story");
  state.evidence.clear();
  state.facts.clear();
  state.qinDone.clear();
  Object.values(state.witnessTopicsDone).forEach((topics) => topics.clear());
  state.witnessesStarted.clear();
  state.witnessesDone.clear();
  state.searchFound.clear();
  state.isolationSearchFound.clear();
  state.secondLinTopicsDone.clear();
  state.waitingSearchFound.clear();
  state.liveReplaySegments.clear();
  state.suFinalTopicsDone.clear();
  state.testimonyPressed.clear();
  state.selectedTestimony = 0;
  state.interactionScroll.search = null;
  state.interactionScroll.suspects = null;
  state.interactionScroll.isolation = null;
  state.interactionScroll.waitingInvestigation = null;
  state.dialogueHistory = [];
  updateEvidenceCount();
  resetPanels();
  setHud("", "", true);
  setStage("phone", backgrounds.phone);
  audio.phonePulse();
  runDialogue(data.openingBeforeChoice, () => {
    showChoices(data.openingBranches.map((branch) => ({
      label: branch.label,
      action: () => chooseOpening(branch),
    })));
  });
}

function chooseOpening(branch) {
  els.choices.classList.add("hidden");
  runDialogue(
    [["许知衡", branch.player], ["江跃（电话）", branch.jiang], ...data.openingAfterChoice],
    renderTitleReveal,
  );
}

function renderTitleReveal() {
  resetPanels();
  setHud("", "", false);
  setStage("title", backgrounds.title, `
    <div class="title-scrim"></div>
    <section class="title-copy">
      <p>凌晨 04:46</p>
      <h1>南桥路宠物医院</h1>
      <button id="enter-case" class="cover-button" type="button">进入医院 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  document.querySelector("#enter-case").addEventListener("click", renderArrivalOutside);
}

function renderArrivalOutside() {
  resetPanels();
  setHud("南桥路宠物医院", "04:46", true);
  setStage("scene scene-transition", backgrounds.exterior);
  runDialogue(data.arrival.slice(0, 5), renderWaitingScene);
}

function renderWaitingScene() {
  resetPanels();
  setHud("医院等候区", "04:49", true);
  setStage("scene scene-transition", backgrounds.waitingCast);
  audio.door();
  runDialogue(data.waitingNarration, () => {
    runDialogue([
      data.arrival[5],
      ["江跃", "秦法医在第二诊室门口等我们。"],
      ["许知衡", "过去看看。"],
    ], renderQinEntrance);
  });
}

function renderQinEntrance() {
  resetPanels();
  setHud("第二诊室门口", "04:51", true);
  setStage("scene scene-transition", backgrounds.corridor);
  runDialogue(data.arrival.slice(6), renderQinHub);
}

function enterSecondConsultation() {
  resetPanels();
  setHud("第二诊室", "04:52", true);
  setStage("scene scene-transition", backgrounds.clinic);
  audio.door();
  window.setTimeout(renderSearch, 320);
}

function renderQinHub() {
  resetPanels();
  setHud("询问秦昭", `${state.qinDone.size}/4`, true);
  setStage("topic", backgrounds.corridor, `
    <div class="topic-focus"></div>
    <div class="topic-person expression-0" style="--portrait-sheet:url('${data.characters.qin.expressions}')" aria-label="秦昭"></div>
    <div class="topic-connectors" aria-hidden="true">
      <i class="connector connector-1"></i><i class="connector connector-2"></i>
      <i class="connector connector-3"></i><i class="connector connector-4"></i>
    </div>
    <div id="topic-list" class="topic-list" aria-label="询问话题"><p class="topic-list-label">选择询问话题</p></div>
    <button id="finish-qin" class="finish-button" type="button" disabled>完成询问</button>`);

  const list = document.querySelector("#topic-list");
  data.qinTopics.forEach((topic, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-button topic-${index + 1}${state.qinDone.has(topic.id) ? " complete" : ""}`;
    button.innerHTML = `<span>${topic.label}</span><i class="ph ${state.qinDone.has(topic.id) ? "ph-check" : "ph-plus"}"></i>`;
    button.addEventListener("click", () => openQinTopic(topic));
    list.append(button);
  });

  const finish = document.querySelector("#finish-qin");
  finish.disabled = state.qinDone.size < data.qinTopics.length;
  finish.addEventListener("click", () => {
    setStage("scene", backgrounds.corridor);
    runDialogue(data.qinEnding, renderSearchIntro);
  });
}

function openQinTopic(topic) {
  setStage("scene", backgrounds.corridor);
  runDialogue(topic.lines, () => {
    state.qinDone.add(topic.id);
    if (topic.info) {
      const alreadyHadReport = state.evidence.has("injury");
      state.facts.add("death-time");
      if (alreadyHadReport) showToast("《贺川的伤势》已补充死亡时间");
      if (!alreadyHadReport) {
        addEvidence("injury", renderQinHub);
        return;
      }
    }
    if (topic.evidence) addEvidence(topic.evidence, renderQinHub);
    else renderQinHub();
  });
}

function renderSearchIntro() {
  resetPanels();
  setHud("第二诊室门口", "04:52", true);
  setStage("search-intro", backgrounds.corridor, `
    <section class="search-briefing">
      <p>现场</p>
      <h1>第二诊室</h1>
      <button id="begin-search" class="primary-button" type="button">进入第二诊室 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  document.querySelector("#begin-search").addEventListener("click", enterSecondConsultation);
}

function renderSearch() {
  resetPanels();
  const requiredFound = ["rack", "reports", "seam"].filter((key) => state.searchFound.has(key)).length;
  setHud("第二诊室", requiredFound === 3 ? "关键证物已齐" : `调查 ${requiredFound}/3`, true);
  setStage("search interaction-stage", backgrounds.clinic, `
    <div id="interaction-scroll" class="interaction-scroll">
      <div class="interaction-canvas search-canvas" style="--interaction-bg:url('${backgrounds.clinic}')">
        <div id="hotspots" class="hotspots" aria-label="可调查区域"></div>
      </div>
    </div>
    <p class="interaction-hint"><i class="ph ph-arrows-horizontal"></i><span>左右滑动查看完整场景 · 点击可疑位置</span></p>
    <button id="leave-search" class="leave-button" type="button" ${requiredFound < 3 ? "disabled" : ""}>完成调查</button>`);

  setupInteractionScroll("search");

  const spots = document.querySelector("#hotspots");
  spots.addEventListener("pointermove", () => spots.classList.add("armed"), { once: true });
  Object.entries(data.searchSpots).forEach(([key, spot]) => {
    if (spot.requires && !state.searchFound.has(spot.requires)) return;
    if (state.searchFound.has(key)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hotspot ${spot.className}`;
    button.setAttribute("aria-label", `调查${spot.label}`);
    button.innerHTML = `<span>调查 · ${spot.label}</span>`;
    button.addEventListener("click", () => inspectSpot(key, spot));
    spots.append(button);
  });
  document.querySelector("#leave-search").addEventListener("click", () => {
    renderReturnToWaiting();
  });
}

function renderReturnToWaiting() {
  resetPanels();
  setHud("医院等候区", "05:06", true);
  setStage("scene scene-transition", backgrounds.waitingCast);
  audio.door();
  window.setTimeout(() => runDialogue(data.searchEnding, renderPeopleSelection), 280);
}

function inspectSpot(key, spot) {
  audio.cue();
  runDialogue(spot.lines, () => {
    state.searchFound.add(key);
    if (spot.evidence) addEvidence(spot.evidence, renderSearch);
    else renderSearch();
  });
}

function renderPeopleSelection() {
  resetPanels();
  setHud("等候区", `第一轮询问 ${state.witnessesDone.size}/3`, true);
  setStage("suspects interaction-stage", backgrounds.waitingCast, `
    <div class="suspect-heading"><h1>先问谁？</h1><p>三个人都在等候区。</p></div>
    <div id="interaction-scroll" class="interaction-scroll">
      <div class="interaction-canvas suspect-canvas" style="--interaction-bg:url('${backgrounds.waitingCast}')">
        <div class="suspect-map">
          ${renderSuspectZone("tang", "suspect-tang")}
          ${renderSuspectZone("su", "suspect-su")}
          ${renderSuspectZone("lin", "suspect-lin")}
        </div>
      </div>
    </div>
    <p class="interaction-hint"><i class="ph ph-arrows-horizontal"></i><span>左右滑动查看完整场景 · 点击人物进行询问</span></p>
    <button id="finish-first-round" class="finish-button round-finish" type="button" ${state.witnessesDone.size < 3 ? "disabled" : ""}>完成第一轮询问</button>`);
  setupInteractionScroll("suspects");
  document.querySelectorAll("[data-witness]").forEach((button) => {
    button.addEventListener("click", () => openWitness(button.dataset.witness));
  });
  document.querySelector("#finish-first-round").addEventListener("click", finishFirstRound);
}

function renderSuspectZone(key, className) {
  const witness = data.witnesses[key];
  const complete = state.witnessesDone.has(key);
  const progress = state.witnessTopicsDone[key].size;
  return `<button class="suspect-zone ${className}${complete ? " complete" : ""}" data-witness="${key}" type="button">
    <span><b>${witness.name}${complete ? ' <i class="ph ph-check-circle"></i>' : ""}</b><small>${witness.role} · ${witness.relation}</small><em>${complete ? "询问完成" : `${progress}/4 个话题`}</em></span>
  </button>`;
}

function openWitness(key) {
  const witness = data.witnesses[key];
  if (!witness) return;
  if (state.witnessesStarted.has(key)) {
    renderWitnessHub(key);
    return;
  }
  state.witnessesStarted.add(key);
  resetPanels();
  setHud(`询问${witness.name}`, "第一轮", true);
  setStage("scene", backgrounds.waiting);
  runDialogue(witness.intro, () => renderWitnessHub(key));
}

function renderWitnessHub(key) {
  const witness = data.witnesses[key];
  const character = data.characters[key];
  const completedTopics = state.witnessTopicsDone[key];
  resetPanels();
  setHud(`询问${witness.name}`, `${completedTopics.size}/${witness.topics.length}`, true);
  setStage("topic witness-topic", backgrounds.waiting, `
    <div class="topic-focus"></div>
    <div class="topic-person witness-person witness-${key}" style="--portrait-sheet:url('${character.frames[0]}')" aria-label="${witness.name}"></div>
    <div class="topic-connectors" aria-hidden="true">
      <i class="connector connector-1"></i><i class="connector connector-2"></i>
      <i class="connector connector-3"></i><i class="connector connector-4"></i>
    </div>
    <div id="topic-list" class="topic-list" aria-label="询问话题"><p class="topic-list-label">选择询问话题</p></div>
    <button id="finish-witness" class="finish-button" type="button" ${completedTopics.size < witness.topics.length ? "disabled" : ""}>完成询问</button>`);

  const list = document.querySelector("#topic-list");
  witness.topics.forEach((topic, index) => {
    const complete = completedTopics.has(topic.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-button topic-${index + 1}${complete ? " complete" : ""}`;
    button.innerHTML = `<span>${topic.label}</span><i class="ph ${complete ? "ph-check" : "ph-plus"}"></i>`;
    button.addEventListener("click", () => openWitnessTopic(key, topic));
    list.append(button);
  });

  document.querySelector("#finish-witness").addEventListener("click", () => {
    state.witnessesDone.add(key);
    renderPeopleSelection();
  });
}

function openWitnessTopic(key, topic) {
  const witness = data.witnesses[key];
  resetPanels();
  setHud(`询问${witness.name}`, topic.label, true);
  setStage("scene", backgrounds.waiting);
  runDialogue(topic.lines, () => {
    state.witnessTopicsDone[key].add(topic.id);
    renderWitnessHub(key);
  });
}

function finishFirstRound() {
  if (state.witnessesDone.size < 3) return;
  resetPanels();
  setHud("医院等候区", "05:24", true);
  setStage("scene scene-transition", backgrounds.waiting);
  runDialogue(data.firstRoundEnding, renderChapterEnd);
}

function renderChapterEnd() {
  resetPanels();
  setHud("第二轮调查", "隔离间已开放", true);
  setStage("search-intro chapter-end", backgrounds.corridor, `
    <section class="search-briefing chapter-end-copy">
      <p>第一轮询问完成</p>
      <h1>下一地点：隔离间</h1>
      <span>三人的陈述已记入对话记录。接下来，需要检查旺旺曾经接受治疗的隔离间。</span>
      <button id="enter-isolation" class="primary-button" type="button">进入隔离间 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  document.querySelector("#enter-isolation").addEventListener("click", renderIsolationArrival);
}

function renderIsolationArrival() {
  resetPanels();
  setHud("隔离间", "05:26", true);
  setStage("scene scene-transition", backgrounds.isolation);
  audio.door();
  runDialogue(data.isolationArrival, renderIsolationSearch);
}

function renderIsolationSearch() {
  resetPanels();
  const requiredFound = state.isolationSearchFound.size;
  setHud("隔离间", requiredFound === 4 ? "关键证物已齐" : `调查 ${requiredFound}/4`, true);
  setStage("search interaction-stage isolation-search", backgrounds.isolation, `
    <div id="interaction-scroll" class="interaction-scroll">
      <div class="interaction-canvas search-canvas" style="--interaction-bg:url('${backgrounds.isolation}')">
        <div id="hotspots" class="hotspots" aria-label="隔离间可调查区域"></div>
      </div>
    </div>
    <p class="interaction-hint"><i class="ph ph-arrows-horizontal"></i><span>左右滑动查看完整场景 · 点击可疑位置</span></p>
    <button id="leave-isolation" class="leave-button" type="button" ${requiredFound < 4 ? "disabled" : ""}>完成调查</button>`);

  setupInteractionScroll("isolation");
  const spots = document.querySelector("#hotspots");
  spots.addEventListener("pointermove", () => spots.classList.add("armed"), { once: true });
  Object.entries(data.isolationSearchSpots).forEach(([key, spot]) => {
    if (state.isolationSearchFound.has(key)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hotspot ${spot.className}`;
    button.setAttribute("aria-label", `调查${spot.label}`);
    button.innerHTML = `<span>调查 · ${spot.label}</span>`;
    button.addEventListener("click", () => inspectIsolationSpot(key, spot));
    spots.append(button);
  });
  document.querySelector("#leave-isolation").addEventListener("click", () => {
    if (state.isolationSearchFound.size < 4) return;
    resetPanels();
    setHud("隔离间门外", "05:38", true);
    setStage("scene scene-transition", backgrounds.corridor);
    runDialogue(data.isolationSearchEnding, renderSecondLinHub);
  });
}

function inspectIsolationSpot(key, spot) {
  audio.cue();
  runDialogue(spot.lines, () => {
    state.isolationSearchFound.add(key);
    addEvidence(spot.evidence, renderIsolationSearch);
  });
}

function renderSecondLinHub() {
  resetPanels();
  const completed = state.secondLinTopicsDone;
  setHud("再次询问林夏", `${completed.size}/${data.secondLinTopics.length}`, true);
  setStage("topic witness-topic", backgrounds.corridor, `
    <div class="topic-focus"></div>
    <div class="topic-person witness-person witness-lin" style="--portrait-sheet:url('${data.characters.lin.frames[0]}')" aria-label="林夏"></div>
    <div class="topic-connectors" aria-hidden="true">
      <i class="connector connector-1"></i><i class="connector connector-2"></i>
      <i class="connector connector-3"></i><i class="connector connector-4"></i>
    </div>
    <div id="topic-list" class="topic-list" aria-label="再次询问话题"><p class="topic-list-label">选择询问话题</p></div>
    <button id="finish-second-lin" class="finish-button" type="button" ${completed.size < data.secondLinTopics.length ? "disabled" : ""}>完成询问</button>`);

  const list = document.querySelector("#topic-list");
  data.secondLinTopics.forEach((topic, index) => {
    const complete = completed.has(topic.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-button topic-${index + 1}${complete ? " complete" : ""}`;
    button.innerHTML = `<span>${topic.label}</span><i class="ph ${complete ? "ph-check" : "ph-plus"}"></i>`;
    button.addEventListener("click", () => {
      resetPanels();
      setHud("再次询问林夏", topic.label, true);
      setStage("scene", backgrounds.corridor);
      runDialogue(topic.lines, () => {
        completed.add(topic.id);
        renderSecondLinHub();
      });
    });
    list.append(button);
  });

  document.querySelector("#finish-second-lin").addEventListener("click", () => {
    if (completed.size < data.secondLinTopics.length) return;
    resetPanels();
    setHud("隔离间门外", "05:47", true);
    setStage("scene", backgrounds.corridor);
    runDialogue(data.secondLinEnding, renderBloodAnalysis);
  });
}

function renderBloodAnalysis() {
  setHud("血迹鉴定", "秦昭来电", true);
  runDialogue(data.bloodAnalysis, () => {
    state.facts.add("blood-analysis");
    showToast("《叠放的两份报告》已补充血迹鉴定");
    renderTangConfrontation();
  });
}

function renderTangConfrontation() {
  resetPanels();
  state.selectedTestimony = 0;
  state.testimonyPressed.clear();
  setHud("对质唐宁", "消失的两分钟", true);
  setStage("scene scene-transition", backgrounds.consultationClean);
  runDialogue(data.tangConfrontIntro, renderTestimonyIntro);
}

function renderTestimonyIntro() {
  resetPanels();
  audio.setTrack("testimony");
  setHud("对质唐宁", "证言质疑", true);
  setStage("testimony-intro", backgrounds.consultationClean, `
    <div class="testimony-intro-scrim"></div>
    <section class="testimony-intro-card" aria-label="进入证言质疑">
      <p><span></span>CROSS-EXAMINATION<span></span></p>
      <h1>证言质疑</h1>
      <strong>逐句核验唐宁的证词</strong>
      <button id="enter-testimony" type="button">进入质疑 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  audio.testimonySting();

  document.querySelector("#enter-testimony").addEventListener("click", renderTangTestimony, { once: true });
}

function updateTestimonyStatement(speaker, statements) {
  const total = statements.length;
  const index = ((Number(state.selectedTestimony) % total) + total) % total;
  const statement = statements[index];
  state.selectedTestimony = index;
  els.speaker.innerHTML = `<span>${speaker}</span><small>证言 ${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")} · ${state.testimonyPressed.has(index) ? "已追问" : "尚未追问"}</small>`;
  clearTyping();
  state.fullLine = statement.text;
  els.text.textContent = statement.text;
  const progress = els.dialogue.querySelector(".testimony-dialogue-progress");
  if (progress) {
    progress.innerHTML = statements.map((_, dotIndex) => `<span class="${dotIndex === index ? "active" : ""}${state.testimonyPressed.has(dotIndex) ? " pressed" : ""}"></span>`).join("");
  }
  showSpeakerPortrait(speaker, statement.text, 1);
}

function renderTangTestimony() {
  resetPanels();
  audio.setTrack("testimony");
  const statements = Array.isArray(data.tangTestimony) ? data.tangTestimony : [];
  const total = statements.length;
  if (!total) {
    setHud("对质唐宁", "证言读取失败", true);
    setStage("scene", backgrounds.consultationClean);
    runDialogue([["旁白", "证言暂时无法读取。请刷新页面后重新进入。"]], renderTangConfrontation);
    return;
  }
  const requestedIndex = Number.isFinite(Number(state.selectedTestimony)) ? Number(state.selectedTestimony) : 0;
  const index = ((requestedIndex % total) + total) % total;
  state.selectedTestimony = index;
  setHud("对质唐宁", "切换证言 · 追问 / 质疑", true);
  setStage("testimony-dialogue", backgrounds.consultationClean);
  els.dialogue.classList.add("testimony-mode");
  els.dialogue.classList.remove("hidden", "narration");
  els.game.classList.add("dialogue-active");
  els.speaker.classList.remove("hidden");
  els.advance.classList.add("hidden");
  els.dialogue.insertAdjacentHTML("beforeend", `
    <div class="testimony-dialogue-tools" aria-label="证言操作">
      <div class="testimony-dialogue-nav">
        <button id="previous-testimony" type="button" aria-label="上一句证言"><i class="ph ph-caret-left"></i><span>上一句</span></button>
        <div class="testimony-dialogue-progress" aria-label="证言进度"></div>
        <button id="next-testimony" type="button" aria-label="下一句证言"><span>下一句</span><i class="ph ph-caret-right"></i></button>
      </div>
      <div class="testimony-dialogue-actions">
        <button id="press-testimony" class="press" type="button"><i class="ph ph-chat-circle-dots"></i><span><small>PRESS</small>追问</span></button>
        <button id="challenge-testimony" class="challenge" type="button"><i class="ph ph-warning-octagon"></i><span><small>CHALLENGE</small>质疑</span></button>
      </div>
    </div>`);
  updateTestimonyStatement("唐宁", statements);

  window.requestAnimationFrame(() => {
    const testimonyStageIsActive = els.stage.classList.contains("stage-testimony-dialogue");
    const interfaceIsMissing = els.dialogue.classList.contains("hidden") || !document.querySelector("#next-testimony");
    if (testimonyStageIsActive && interfaceIsMissing) renderTangTestimony();
  });

  const changeStatement = (offset) => {
    state.selectedTestimony = (state.selectedTestimony + offset + total) % total;
    updateTestimonyStatement("唐宁", statements);
  };

  document.querySelector("#previous-testimony").addEventListener("click", () => changeStatement(-1));
  document.querySelector("#next-testimony").addEventListener("click", () => changeStatement(1));
  document.querySelector("#press-testimony").addEventListener("click", () => {
    state.testimonyPressed.add(state.selectedTestimony);
    setStage("scene", backgrounds.consultationClean);
    runDialogue(statements[state.selectedTestimony].press, renderTangTestimony);
  });
  document.querySelector("#challenge-testimony").addEventListener("click", presentAgainstTestimony);

  const card = els.text;
  let startX = 0;
  card.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    card.setPointerCapture?.(event.pointerId);
  });
  card.addEventListener("pointerup", (event) => {
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 46) changeStatement(distance > 0 ? -1 : 1);
  });
}

function presentAgainstTestimony() {
  askEvidence(
    "哪件证物与这句证言矛盾？",
    ["usedSupplies", "isolationVideo"],
    (selected) => {
      if (state.selectedTestimony !== 2) {
        runDialogue([["许知衡（心声）", "这件证物与当前证言还不能构成直接矛盾。先证明唐宁并不只是在等审批结果。"]], renderTangTestimony);
        return;
      }
      setStage("scene", backgrounds.consultationClean);
      if (selected === "isolationVideo") {
        runDialogue(data.treatmentVideoReveal, revealCommunicationRecord);
        return;
      }
      runDialogue(data.treatmentContradiction, askWhoUsedSupplies);
    },
    "需要能直接证明隔离间里确实发生过治疗的证物。",
    renderTangTestimony,
  );
}

function askWhoUsedSupplies() {
  askEvidence(
    "是谁使用了这些治疗用品？",
    "isolationVideo",
    () => {
      setStage("scene", backgrounds.consultationClean);
      runDialogue(data.treatmentVideoReveal, revealCommunicationRecord);
    },
    "需要能够直接看到隔离间内发生了什么的证物。",
  );
}

function revealCommunicationRecord() {
  setHud("对质唐宁", "03:42的语音", true);
  runDialogue(data.communicationReveal, () => addEvidence("communication", () => {
    setStage("scene", backgrounds.consultationClean);
    runDialogue(data.communicationChallenge, renderVoiceDeductionChoices);
  }));
}

function renderVoiceDeductionChoices() {
  setHud("推理", "排除语音提前录制", true);
  showChoices([
    {
      label: "贺川在语音里准确提到了温度。",
      action: () => {
        els.choices.classList.add("hidden");
        runDialogue(data.voiceDeduction, askFatalTimeEvidence);
      },
    },
    {
      label: "贺川的语气听起来很自然。",
      action: wrongVoiceDeduction,
    },
    {
      label: "语音发送时间处于明确死亡时间范围外。",
      action: wrongVoiceDeduction,
    },
  ]);
}

function wrongVoiceDeduction() {
  els.choices.classList.add("hidden");
  runDialogue([["许知衡", "好像不太对……"]], renderVoiceDeductionChoices);
}

function askFatalTimeEvidence() {
  askEvidence(
    "哪件证物能够证明致命撞击不可能发生在03:49以后？",
    "reports",
    () => {
      setStage("scene", backgrounds.consultationClean);
      runDialogue(data.reportTimelineReveal, askAlibiEvidence);
    },
    "需要找到一个不依赖任何人证言的时间标记。",
  );
}

function askAlibiEvidence() {
  askEvidence(
    "03:42—03:46之间，唐宁和林夏在哪里？",
    "isolationVideo",
    () => {
      setStage("scene", backgrounds.consultationClean);
      runDialogue(data.alibiReveal, renderSecondRoundEnding);
    },
    "需要同时确认两个人在这四分钟里的位置。",
  );
}

function askEvidence(question, correctKey, onCorrect, wrongHint, onCancel) {
  const correctKeys = Array.isArray(correctKey) ? correctKey : [correctKey];
  const keys = [...state.evidence];
  els.overlay.innerHTML = `
    <section class="evidence-select-panel" aria-label="选择证物">
      <header><small>出示证物</small><h2>${question}</h2></header>
      <div class="evidence-select-grid">
        ${keys.map((key) => {
          const item = getEvidenceItem(key);
          return `<button data-present-evidence="${key}" type="button"><img src="${item.image}" alt=""><span><small>${item.id}</small>${item.name}</span></button>`;
        }).join("")}
      </div>
      ${onCancel ? '<button id="cancel-present" class="evidence-cancel" type="button">返回证言</button>' : ""}
    </section>`;
  els.overlay.classList.remove("hidden");
  document.querySelectorAll("[data-present-evidence]").forEach((button) => button.addEventListener("click", () => {
    const selected = button.dataset.presentEvidence;
    els.overlay.classList.add("hidden");
    els.overlay.innerHTML = "";
    if (correctKeys.includes(selected)) {
      audio.cue("evidence");
      onCorrect(selected);
      return;
    }
    runDialogue([["许知衡（心声）", wrongHint]], () => askEvidence(question, correctKey, onCorrect, wrongHint, onCancel));
  }));
  document.querySelector("#cancel-present")?.addEventListener("click", () => {
    els.overlay.classList.add("hidden");
    els.overlay.innerHTML = "";
    onCancel();
  });
}

function renderSecondRoundEnding() {
  resetPanels();
  audio.setTrack("story");
  setHud("第二轮调查", "真相第一次收束", true);
  setStage("scene scene-transition", backgrounds.waitingCast);
  runDialogue(data.secondRoundEnding, renderSecondRoundEndCard);
}

function renderSecondRoundEndCard() {
  resetPanels();
  setHud("第三轮调查", "等候区已开放", true);
  setStage("search-intro chapter-end", backgrounds.waitingCast, `
    <section class="search-briefing chapter-end-copy">
      <p>第二轮结束</p>
      <h1>真正的作案时间</h1>
      <span>贺川在03:42仍然活着；致命撞击发生于03:42—03:46。唐宁和林夏在这四分钟里始终出现在隔离间录像中。</span>
      <button id="enter-waiting-investigation" class="primary-button" type="button">进入等候区 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  document.querySelector("#enter-waiting-investigation").addEventListener("click", renderThirdRoundArrival);
}

function renderThirdRoundArrival() {
  resetPanels();
  audio.setTrack("story");
  setHud("医院等候区", "第三轮调查", true);
  setStage("scene scene-transition", backgrounds.waitingInvestigation);
  audio.door();
  runDialogue(data.thirdRoundArrival, renderWaitingSearch);
}

function renderWaitingSearch() {
  resetPanels();
  const requiredKeys = Object.entries(data.waitingSearchSpots).filter(([, spot]) => spot.required).map(([key]) => key);
  const requiredFound = requiredKeys.filter((key) => state.waitingSearchFound.has(key)).length;
  setHud("医院等候区", requiredFound === requiredKeys.length ? "关键线索已齐" : `调查 ${requiredFound}/${requiredKeys.length}`, true);
  setStage("search interaction-stage waiting-search", backgrounds.waitingInvestigation, `
    <div id="interaction-scroll" class="interaction-scroll">
      <div class="interaction-canvas search-canvas" style="--interaction-bg:url('${backgrounds.waitingInvestigation}')">
        <div id="hotspots" class="hotspots" aria-label="等候区可调查区域"></div>
      </div>
    </div>
    <p class="interaction-hint"><i class="ph ph-arrows-horizontal"></i><span>左右滑动查看完整场景 · 点击可疑位置</span></p>
    <button id="leave-waiting-search" class="leave-button" type="button" ${requiredFound < requiredKeys.length ? "disabled" : ""}>完成调查</button>`);

  setupInteractionScroll("waitingInvestigation");
  const spots = document.querySelector("#hotspots");
  spots.addEventListener("pointermove", () => spots.classList.add("armed"), { once: true });
  Object.entries(data.waitingSearchSpots).forEach(([key, spot]) => {
    if (state.waitingSearchFound.has(key)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hotspot ${spot.className}`;
    button.setAttribute("aria-label", `调查${spot.label}`);
    button.innerHTML = `<span>调查 · ${spot.label}</span>`;
    button.addEventListener("click", () => inspectWaitingSpot(key, spot));
    spots.append(button);
  });
  document.querySelector("#leave-waiting-search").addEventListener("click", () => {
    if (requiredFound < requiredKeys.length) return;
    renderCatHairAnalysis();
  });
}

function inspectWaitingSpot(key, spot) {
  audio.cue();
  if (spot.review) {
    renderLiveReplayReview();
    return;
  }
  runDialogue(spot.lines, () => {
    state.waitingSearchFound.add(key);
    if (spot.evidence) addEvidence(spot.evidence, renderWaitingSearch);
    else renderWaitingSearch();
  });
}

function renderLiveReplayReview() {
  resetPanels();
  const completed = state.liveReplaySegments;
  setHud("查看直播回放", `${completed.size}/${data.liveReplaySegments.length}`, true);
  setStage("scene", backgrounds.waitingInvestigation);
  els.choices.classList.add("replay-choice-panel");
  els.choices.innerHTML = `
    <header class="replay-choice-head"><small>完整直播录像</small><h2>选择时间段查看</h2></header>
    <div class="replay-choice-list">
      ${data.liveReplaySegments.map((segment) => `<button data-replay-segment="${segment.id}" class="choice-button${completed.has(segment.id) ? " complete" : ""}" type="button"><span>${segment.label}</span><i class="ph ${completed.has(segment.id) ? "ph-check" : "ph-play"}"></i></button>`).join("")}
    </div>
    <button id="finish-replay-review" class="replay-finish" type="button" ${completed.size < data.liveReplaySegments.length ? "disabled" : ""}>完成查看</button>`;
  els.choices.classList.remove("hidden");
  document.querySelectorAll("[data-replay-segment]").forEach((button) => button.addEventListener("click", () => {
    const segment = data.liveReplaySegments.find((item) => item.id === button.dataset.replaySegment);
    els.choices.classList.add("hidden");
    runDialogue(segment.lines, () => {
      completed.add(segment.id);
      renderLiveReplayReview();
    });
  }));
  document.querySelector("#finish-replay-review").addEventListener("click", () => {
    if (completed.size < data.liveReplaySegments.length) return;
    state.waitingSearchFound.add("livestream");
    addEvidence("liveReplay", renderWaitingSearch);
  });
}

function renderCatHairAnalysis() {
  resetPanels();
  setHud("医院等候区", "猫毛鉴定", true);
  setStage("scene scene-transition", backgrounds.waitingInvestigation);
  runDialogue(data.catHairAnalysis, () => {
    state.facts.add("hair-identified");
    showToast("《白色猫毛》已更新为《奶糖的猫毛》");
    renderSuFinalHub();
  });
}

function renderSuFinalHub() {
  resetPanels();
  const completed = state.suFinalTopicsDone;
  setHud("再次询问苏青", `${completed.size}/${data.suFinalTopics.length}`, true);
  setStage("topic witness-topic", backgrounds.waiting, `
    <div class="topic-focus"></div>
    <div class="topic-person witness-person witness-su" style="--portrait-sheet:url('${data.characters.su.frames[0]}')" aria-label="苏青"></div>
    <div class="topic-connectors" aria-hidden="true">
      <i class="connector connector-1"></i><i class="connector connector-2"></i>
      <i class="connector connector-3"></i><i class="connector connector-4"></i>
    </div>
    <div id="topic-list" class="topic-list" aria-label="再次询问话题"><p class="topic-list-label">选择询问话题</p></div>
    <button id="finish-su-final" class="finish-button" type="button" ${completed.size < data.suFinalTopics.length ? "disabled" : ""}>完成询问</button>`);

  const list = document.querySelector("#topic-list");
  data.suFinalTopics.forEach((topic, index) => {
    const complete = completed.has(topic.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-button topic-${index + 1}${complete ? " complete" : ""}`;
    button.innerHTML = `<span>${topic.label}</span><i class="ph ${complete ? "ph-check" : "ph-plus"}"></i>`;
    button.addEventListener("click", () => {
      resetPanels();
      setHud("再次询问苏青", topic.label, true);
      setStage("scene", backgrounds.waiting);
      runDialogue(topic.lines, () => {
        completed.add(topic.id);
        renderSuFinalHub();
      });
    });
    list.append(button);
  });

  document.querySelector("#finish-su-final").addEventListener("click", () => {
    if (completed.size < data.suFinalTopics.length) return;
    resetPanels();
    setHud("对质苏青", "安静的直播", true);
    setStage("scene", backgrounds.waiting);
    runDialogue(data.suFinalInquiryEnding, () => renderSuTestimonyIntro("安静的直播", "逐句核验苏青的不在场证明", startSuQuietPhase));
  });
}

function renderSuTestimonyIntro(title, detail, onEnter) {
  resetPanels();
  audio.setTrack("testimony");
  setHud("对质苏青", "证言质疑", true);
  setStage("testimony-intro", backgrounds.waiting, `
    <div class="testimony-intro-scrim"></div>
    <section class="testimony-intro-card" aria-label="进入证言质疑">
      <p><span></span>CROSS-EXAMINATION<span></span></p>
      <h1>${title}</h1>
      <strong>${detail}</strong>
      <button id="enter-su-testimony" type="button">进入质疑 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  audio.testimonySting();
  document.querySelector("#enter-su-testimony").addEventListener("click", onEnter, { once: true });
}

function openSuTestimony(statements, subtitle, onChallenge) {
  state.selectedTestimony = 0;
  state.testimonyPressed.clear();
  renderSuTestimony(statements, subtitle, onChallenge);
}

function renderSuTestimony(statements, subtitle, onChallenge) {
  resetPanels();
  audio.setTrack("testimony");
  const testimonyLines = Array.isArray(statements) ? statements : [];
  const total = testimonyLines.length;
  if (!total) {
    setHud("对质苏青", "证言读取失败", true);
    setStage("scene", backgrounds.waiting);
    runDialogue([["旁白", "证言暂时无法读取。请刷新页面后重新进入。"]], renderSuFinalHub);
    return;
  }
  const requestedIndex = Number.isFinite(Number(state.selectedTestimony)) ? Number(state.selectedTestimony) : 0;
  const index = ((requestedIndex % total) + total) % total;
  state.selectedTestimony = index;
  setHud("对质苏青", `${subtitle} · 切换证言 · 追问 / 质疑`, true);
  setStage("testimony-dialogue", backgrounds.waiting);
  els.dialogue.classList.add("testimony-mode");
  els.dialogue.classList.remove("hidden", "narration");
  els.game.classList.add("dialogue-active");
  els.speaker.classList.remove("hidden");
  els.advance.classList.add("hidden");
  els.dialogue.insertAdjacentHTML("beforeend", `
    <div class="testimony-dialogue-tools" aria-label="证言操作">
      <div class="testimony-dialogue-nav">
        <button id="previous-testimony" type="button" aria-label="上一句证言"><i class="ph ph-caret-left"></i><span>上一句</span></button>
        <div class="testimony-dialogue-progress" aria-label="证言进度"></div>
        <button id="next-testimony" type="button" aria-label="下一句证言"><span>下一句</span><i class="ph ph-caret-right"></i></button>
      </div>
      <div class="testimony-dialogue-actions">
        <button id="press-testimony" class="press" type="button"><i class="ph ph-chat-circle-dots"></i><span><small>PRESS</small>追问</span></button>
        <button id="challenge-testimony" class="challenge" type="button"><i class="ph ph-warning-octagon"></i><span><small>CHALLENGE</small>质疑</span></button>
      </div>
    </div>`);
  updateTestimonyStatement("苏青", testimonyLines);

  window.requestAnimationFrame(() => {
    const testimonyStageIsActive = els.stage.classList.contains("stage-testimony-dialogue");
    const interfaceIsMissing = els.dialogue.classList.contains("hidden") || !document.querySelector("#next-testimony");
    if (testimonyStageIsActive && interfaceIsMissing) renderSuTestimony(testimonyLines, subtitle, onChallenge);
  });

  const changeStatement = (offset) => {
    state.selectedTestimony = (state.selectedTestimony + offset + total) % total;
    updateTestimonyStatement("苏青", testimonyLines);
  };
  document.querySelector("#previous-testimony").addEventListener("click", () => changeStatement(-1));
  document.querySelector("#next-testimony").addEventListener("click", () => changeStatement(1));
  document.querySelector("#press-testimony").addEventListener("click", () => {
    state.testimonyPressed.add(state.selectedTestimony);
    setStage("scene", backgrounds.waiting);
    runDialogue(testimonyLines[state.selectedTestimony].press, () => renderSuTestimony(statements, subtitle, onChallenge));
  });
  document.querySelector("#challenge-testimony").addEventListener("click", onChallenge);
  let startX = 0;
  els.text.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    els.text.setPointerCapture?.(event.pointerId);
  }, { once: true });
  els.text.addEventListener("pointerup", (event) => {
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 46) changeStatement(distance > 0 ? -1 : 1);
  }, { once: true });
}

function startSuQuietPhase() {
  openSuTestimony(data.suTestimonyQuiet, "安静的直播", challengeSuQuietPhase);
}

function challengeSuQuietPhase() {
  const selectedStatement = state.selectedTestimony;
  askEvidence(
    "哪件证物与这句证言矛盾？",
    "rack",
    () => {
      if (selectedStatement !== 1) {
        runDialogue([["许知衡（心声）", "这件证物还不能直接推翻当前这句证言。需要先击破‘医院一直很安静’。"]], () => renderSuTestimony(data.suTestimonyQuiet, "安静的直播", challengeSuQuietPhase));
        return;
      }
      setStage("scene", backgrounds.waiting);
      runDialogue(data.quietRackReveal, askWaitingLocationEvidence);
    },
    "如果案发时发生过足够大的撞击，医院就不可能始终安静。",
    () => renderSuTestimony(data.suTestimonyQuiet, "安静的直播", challengeSuQuietPhase),
  );
}

function askWaitingLocationEvidence() {
  askEvidence(
    "哪件证物能够说明唐宁听不到，但苏青可以听到？",
    "floorplan",
    () => {
      setStage("scene", backgrounds.waiting);
      runDialogue(data.floorplanReveal, askAnimalReactionEvidence);
    },
    "需要确认等候区、第二诊室和隔离间之间的位置关系。",
  );
}

function askAnimalReactionEvidence() {
  askEvidence(
    "即使苏青本人没有留意，什么能够证明等候区仍会出现异常？",
    "observationReaction",
    () => {
      setStage("scene", backgrounds.waiting);
      runDialogue(data.animalReactionReveal, startSuRealtimePhase);
    },
    "还需要一个不依赖苏青主观注意力的现场反应。",
  );
}

function startSuRealtimePhase() {
  state.facts.delete("replay-capability-solved");
  openSuTestimony(data.suTestimonyRealtime, "直播是否实时", challengeSuRealtimePhase);
}

function challengeSuRealtimePhase() {
  if (!state.facts.has("replay-capability-solved")) {
    renderReplayCapabilityChoices();
    return;
  }
  if (state.selectedTestimony !== 3) {
    setStage("scene", backgrounds.waiting);
    runDialogue([["许知衡（心声）", "现在需要解释的不是苏青有没有出现在画面里，而是整段画面是否属于当时。"]], () => renderSuTestimony(data.suTestimonyRealtime, "直播是否实时", challengeSuRealtimePhase));
    return;
  }
  setStage("scene", backgrounds.waiting);
  runDialogue(data.fakeRealtimeReveal, () => {
    runDialogue(data.suBackupAdmission, () => renderSuTestimonyIntro("镜头之外", "备用画面遮住了谁的行动", startSuOffCameraPhase));
  });
}

function renderReplayCapabilityChoices() {
  clearTestimonyInterface();
  els.dialogue.classList.add("hidden");
  els.game.classList.remove("dialogue-active");
  showChoices([
    { label: "03:10—03:20，直播刚开始的片段。", action: wrongReplayCapabilityChoice },
    { label: "03:42—03:46，医院保持安静的片段。", action: wrongReplayCapabilityChoice },
    {
      label: "03:51以后，唐宁呼喊的片段。",
      action: () => {
        els.choices.classList.add("hidden");
        setStage("scene", backgrounds.waiting);
        runDialogue(data.replayCapabilityReveal, () => {
          state.facts.add("replay-capability-solved");
          openSuTestimony(data.suTestimonyRealtime, "选择矛盾证言", challengeSuRealtimePhase);
        });
      },
    },
  ]);
}

function wrongReplayCapabilityChoice() {
  els.choices.classList.add("hidden");
  setStage("scene", backgrounds.waiting);
  runDialogue([["许知衡", "这一段还不能证明第二诊室的声音能够被直播录到。"]], renderReplayCapabilityChoices);
}

function startSuOffCameraPhase() {
  openSuTestimony(data.suTestimonyOffCamera, "镜头之外", challengeSuOffCameraPhase);
}

function challengeSuOffCameraPhase() {
  const selectedStatement = state.selectedTestimony;
  askEvidence(
    "哪件证物能证明奶糖进入过第二诊室？",
    "hair",
    () => {
      if (selectedStatement !== 2) {
        runDialogue([["许知衡（心声）", "这件证物应该用来质疑奶糖是否始终留在等候区。"]], () => renderSuTestimony(data.suTestimonyOffCamera, "镜头之外", challengeSuOffCameraPhase));
        return;
      }
      setStage("scene", backgrounds.waiting);
      runDialogue(data.catHairReveal, startSuCollisionPhase);
    },
    "需要能直接联系奶糖与第二诊室现场的证物。",
    () => renderSuTestimony(data.suTestimonyOffCamera, "镜头之外", challengeSuOffCameraPhase),
  );
}

function startSuCollisionPhase() {
  openSuTestimony(data.suTestimonyCollision, "撞击发生以前", renderCollisionTimingChoices);
}

function renderCollisionTimingChoices() {
  clearTestimonyInterface();
  els.dialogue.classList.add("hidden");
  els.game.classList.remove("dialogue-active");
  showChoices([
    {
      label: "奶糖的毛被夹在器械架新形成的变形缝里。",
      action: () => {
        els.choices.classList.add("hidden");
        setStage("scene", backgrounds.waiting);
        runDialogue(data.collisionLockReveal, () => {
          runDialogue(data.motiveIntro, askSuMotiveEvidence);
        });
      },
    },
    { label: "苏青的直播在03:48左右恢复了实时内容。", action: wrongCollisionTimingChoice },
    { label: "第二诊室没有外人闯入的迹象。", action: wrongCollisionTimingChoice },
  ]);
}

function wrongCollisionTimingChoice() {
  els.choices.classList.add("hidden");
  setStage("scene", backgrounds.waiting);
  runDialogue([["许知衡", "这还不能直接说明她离开诊室时，撞击是否已经发生。"]], renderCollisionTimingChoices);
}

function askSuMotiveEvidence() {
  askEvidence(
    "哪件证物能够证明苏青存在动机？",
    "reports",
    () => {
      setStage("scene", backgrounds.waiting);
      runDialogue(data.confession, renderCaseEnding);
    },
    "需要指出苏青必须隐瞒的明确动机。",
  );
}

function renderCaseEnding() {
  resetPanels();
  audio.setTrack("story");
  setHud("案件结束", "清晨", true);
  setStage("scene scene-transition", backgrounds.waitingInvestigation);
  runDialogue(data.caseEnding, renderCaseSolvedCard);
}

function renderCaseSolvedCard() {
  resetPanels();
  setHud("案件结束", "真相已查明", true);
  setStage("search-intro chapter-end case-finale", backgrounds.waitingInvestigation, `
    <section class="search-briefing chapter-end-copy finale-copy">
      <p>案件终结</p>
      <h1>凌晨四点的宠物医院</h1>
      <span>完整直播遮住了四分钟的空白，却没有遮住现场留下的声音、反应与猫毛。</span>
      <strong>完</strong>
      <button id="show-credits" class="primary-button" type="button">查看片尾 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  document.querySelector("#show-credits").addEventListener("click", renderCredits);
}

function renderCredits() {
  resetPanels();
  setHud("片尾", "雨停之后", true);
  setStage("scene scene-transition", backgrounds.exterior);
  runDialogue(data.credits, renderFinalCard);
}

function renderFinalCard() {
  resetPanels();
  setHud("", "", false);
  setStage("cover final-card", backgrounds.exterior, `
    <div class="cover-scrim"></div>
    <section class="cover-copy final-card-copy">
      <p>CASE CLOSED</p>
      <h1>凌晨四点的<br>宠物医院</h1>
      <span>感谢体验</span>
      <button id="restart-game" class="cover-button" type="button">重新体验 <i class="ph ph-arrow-counter-clockwise"></i></button>
    </section>`);
  document.querySelector("#restart-game").addEventListener("click", startOpening);
}

function setupInteractionScroll(key) {
  const scroller = document.querySelector("#interaction-scroll");
  if (!scroller) return;
  window.requestAnimationFrame(() => {
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const saved = state.interactionScroll[key];
    scroller.scrollLeft = saved === null ? maxScroll / 2 : Math.min(saved, maxScroll);
    scroller.addEventListener("scroll", () => {
      state.interactionScroll[key] = scroller.scrollLeft;
    }, { passive: true });
  });
}

function openEvidenceModal() {
  const keys = [...state.evidence];
  openModal("证物", "evidence-modal");
  if (!keys.length) {
    els.modalBody.innerHTML = `<div class="empty-state"><i class="ph ph-briefcase"></i><p>尚未取得证物。</p></div>`;
    return;
  }
  els.modalBody.innerHTML = `
    <div class="evidence-browser">
      <div class="evidence-grid">
        ${keys.map((key, index) => {
          const item = getEvidenceItem(key);
          return `<button class="evidence-tile${index === 0 ? " selected" : ""}" data-evidence="${key}" type="button"><img src="${item.image}" alt=""><span>${item.name}</span></button>`;
        }).join("")}
      </div>
      <article id="evidence-detail" class="evidence-detail"></article>
    </div>`;
  const renderDetail = (key) => {
    const item = getEvidenceItem(key);
    document.querySelectorAll("[data-evidence]").forEach((button) => button.classList.toggle("selected", button.dataset.evidence === key));
    document.querySelector("#evidence-detail").innerHTML = `<img src="${item.image}" alt="${item.name}"><small>${item.id}</small><h3>${item.name}</h3><p>${item.description}</p>`;
  };
  document.querySelectorAll("[data-evidence]").forEach((button) => button.addEventListener("click", () => renderDetail(button.dataset.evidence)));
  renderDetail(keys[0]);
}

function openRecordModal() {
  openModal("对话记录", "record-modal");
  const history = state.dialogueHistory.slice(-100);
  els.modalBody.innerHTML = history.length
    ? `<div class="history-list">${history.map((line) => `<div><b>${line.speaker}</b><p>${line.text}</p></div>`).join("")}</div>`
    : `<div class="empty-state"><i class="ph ph-notebook"></i><p>还没有对话记录。</p></div>`;
}

function openSettingsModal() {
  openModal("设置", "settings-modal");
  els.modalBody.innerHTML = `
    <div class="settings-panel">
      <section><div><h3>声音</h3><p>背景音乐、来电、开关门与证物提示</p></div><div class="segmented" id="sound-options"><button data-sound="on" type="button">开启</button><button data-sound="off" type="button">关闭</button></div></section>
      <section><div><h3>音量</h3><p id="volume-label">${state.volume}%</p></div><input id="volume-range" type="range" min="0" max="100" value="${state.volume}" aria-label="音量"></section>
      <section><div><h3>文字速度</h3><p>控制台词出现速度</p></div><div class="segmented" id="speed-options"><button data-speed="instant" type="button">即时</button><button data-speed="medium" type="button">适中</button><button data-speed="slow" type="button">缓慢</button></div></section>
      <section><div><h3>字体大小</h3><p>调整对话与界面文字</p></div><div class="segmented" id="font-options"><button data-font="small" type="button">较小</button><button data-font="medium" type="button">标准</button><button data-font="large" type="button">较大</button></div></section>
    </div>`;
  const sync = () => {
    document.querySelectorAll("[data-speed]").forEach((button) => button.classList.toggle("active", button.dataset.speed === state.textSpeed));
    document.querySelectorAll("[data-font]").forEach((button) => button.classList.toggle("active", button.dataset.font === state.fontSize));
    document.querySelectorAll("[data-sound]").forEach((button) => button.classList.toggle("active", (button.dataset.sound === "off") === state.muted));
  };
  sync();
  document.querySelectorAll("[data-sound]").forEach((button) => button.addEventListener("click", () => {
    audio.init();
    state.muted = button.dataset.sound === "off";
    localStorage.setItem("mystery-muted", String(state.muted));
    audio.update();
    if (!state.muted) audio.startBgm();
    sync();
  }));
  document.querySelector("#volume-range").addEventListener("input", (event) => {
    audio.init();
    state.volume = Number(event.target.value);
    localStorage.setItem("mystery-volume", String(state.volume));
    document.querySelector("#volume-label").textContent = `${state.volume}%`;
    audio.update();
  });
  document.querySelectorAll("[data-speed]").forEach((button) => button.addEventListener("click", () => {
    state.textSpeed = button.dataset.speed;
    localStorage.setItem("mystery-text-speed", state.textSpeed);
    sync();
  }));
  document.querySelectorAll("[data-font]").forEach((button) => button.addEventListener("click", () => {
    state.fontSize = button.dataset.font;
    els.game.dataset.font = state.fontSize;
    localStorage.setItem("mystery-font-size", state.fontSize);
    sync();
  }));
}

function openModal(title, className) {
  els.modalTitle.textContent = title;
  els.modal.className = `modal ${className}`;
  els.modal.classList.remove("hidden");
  els.modalScrim.classList.remove("hidden");
}

function closeModal() {
  els.modal.className = "modal hidden";
  els.modalScrim.classList.add("hidden");
  els.modalBody.innerHTML = "";
}

els.game.dataset.font = state.fontSize;
els.game.addEventListener("pointerdown", beginSceneAdvanceGesture);
els.game.addEventListener("pointerup", finishSceneAdvanceGesture);
els.game.addEventListener("pointercancel", cancelSceneAdvanceGesture);
els.advance.addEventListener("click", advanceDialogue);
els.dialogue.addEventListener("click", (event) => {
  if (!event.target.closest("button") && !els.dialogue.classList.contains("testimony-mode")) advanceDialogue();
});
els.evidenceButton.addEventListener("click", openEvidenceModal);
els.recordButton.addEventListener("click", openRecordModal);
els.settingsButton.addEventListener("click", openSettingsModal);
els.modalClose.addEventListener("click", closeModal);
els.modalScrim.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !els.dialogue.classList.contains("hidden") && !els.dialogue.classList.contains("testimony-mode")) {
    event.preventDefault();
    advanceDialogue();
  }
  if (event.key === "Escape") closeModal();
  if (els.stage.classList.contains("stage-testimony-dialogue") && els.overlay.classList.contains("hidden") && els.modal.classList.contains("hidden")) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      document.querySelector("#previous-testimony")?.click();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      document.querySelector("#next-testimony")?.click();
    }
  }
});

renderStart();
