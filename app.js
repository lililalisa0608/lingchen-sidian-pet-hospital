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
  cover: "./assets/backgrounds/cover-clinic-interior-v1.png",
  phone: "./assets/backgrounds/opening-phone-v2.png",
  exterior: "./assets/backgrounds/hospital-exterior-v2.png",
  title: "./assets/backgrounds/title-transition-v3.png",
  waiting: "./assets/backgrounds/waiting-area-clean-v1.png",
  waitingCast: "./assets/backgrounds/waiting-area-cast-v2.png",
  corridor: "./assets/backgrounds/second-consultation-corridor-v1.png",
  clinic: "./assets/backgrounds/second-consultation-evidence-v4.png",
};

// Warm the browser cache so a scene swap never exposes the stage fallback color.
const preloadedBackgrounds = Object.values(backgrounds).map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});

const state = {
  evidence: new Set(),
  facts: new Set(),
  qinDone: new Set(),
  searchFound: new Set(),
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
};

const audio = {
  context: null,
  gain: null,
  bgm: null,
  init() {
    if (!this.bgm) {
      this.bgm = new Audio("./assets/audio/unsolved-investigation.ogg");
      this.bgm.loop = true;
      this.bgm.preload = "auto";
    }
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.connect(this.context.destination);
      }
    } else {
      this.context.resume();
    }
    this.update();
    this.startBgm();
  },
  startBgm() {
    if (!this.bgm) return;
    this.bgm.play().catch(() => {});
  },
  update() {
    const value = state.muted ? 0 : state.volume / 100;
    if (this.gain && this.context) this.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.04);
    if (this.bgm) this.bgm.volume = Math.min(1, value * 0.28);
  },
  phonePulse() {
    if (!this.context || state.muted || state.volume === 0) return;
    const now = this.context.currentTime;
    [0, 0.46].forEach((offset) => {
      [440, 480].forEach((frequency) => {
        const oscillator = this.context.createOscillator();
        const pulseGain = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        pulseGain.gain.setValueAtTime(0.0001, now + offset);
        pulseGain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.025);
        pulseGain.gain.setValueAtTime(0.2, now + offset + 0.28);
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.36);
        oscillator.connect(pulseGain).connect(this.gain);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.38);
      });
    });
  },
  door() {
    if (!this.context || state.muted || state.volume === 0) return;
    const now = this.context.currentTime;
    const length = Math.floor(this.context.sampleRate * 0.48);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      const progress = index / length;
      channel[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 2.2);
    }
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const noiseGain = this.context.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(720, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.46);
    filter.Q.value = 1.1;
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    noise.connect(filter).connect(noiseGain).connect(this.gain);
    noise.start(now);
    noise.stop(now + 0.5);

    const thud = this.context.createOscillator();
    const thudGain = this.context.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(105, now + 0.31);
    thud.frequency.exponentialRampToValueAtTime(58, now + 0.46);
    thudGain.gain.setValueAtTime(0.0001, now + 0.3);
    thudGain.gain.exponentialRampToValueAtTime(0.24, now + 0.325);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.49);
    thud.connect(thudGain).connect(this.gain);
    thud.start(now + 0.3);
    thud.stop(now + 0.5);
  },
  cue(type = "soft") {
    if (!this.context || state.muted || state.volume === 0) return;
    const oscillator = this.context.createOscillator();
    const cueGain = this.context.createGain();
    oscillator.type = type === "evidence" ? "triangle" : "sine";
    oscillator.frequency.value = type === "evidence" ? 523.25 : 392;
    cueGain.gain.setValueAtTime(0, this.context.currentTime);
    cueGain.gain.linearRampToValueAtTime(0.18, this.context.currentTime + 0.015);
    cueGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.22);
    oscillator.connect(cueGain).connect(this.gain);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.24);
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
  els.stage.className = `stage stage-${screen}`;
  els.stage.style.setProperty("--scene-bg", background ? `url("${background}")` : "none");
  els.stage.innerHTML = `${markup}<div id="character-layer" class="character-layer" aria-hidden="true"></div>`;
  state.activePortrait = "";
}

function resetPanels() {
  clearTyping();
  els.dialogue.classList.add("hidden");
  els.choices.classList.add("hidden");
  els.overlay.classList.add("hidden");
  els.overlay.innerHTML = "";
  closeModal();
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
  const portraitAsset = character.frames?.[expression] || character.expressions;
  const frameClass = character.frames ? " portrait-frame" : "";
  layer.innerHTML = `<div class="speaker-portrait${frameClass} portrait-${character.side} portrait-${character.id} expression-${expression}" style="--portrait-sheet:url('${portraitAsset}')"></div>`;
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
  state.dialogueQueue = lines.map(([speaker, text, expression]) => ({ speaker, text, expression }));
  state.dialogueDone = done || null;
  els.choices.classList.add("hidden");
  els.dialogue.classList.remove("hidden");
  nextDialogueLine();
}

function advanceDialogue() {
  if (!state.typingComplete) {
    clearTyping();
    els.text.textContent = state.fullLine;
    return;
  }
  nextDialogueLine();
}

function nextDialogueLine() {
  const next = state.dialogueQueue.shift();
  if (!next) {
    els.dialogue.classList.add("hidden");
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
      <img src="${item.image}" alt="${item.name}" />
      <div class="evidence-reveal-copy">
        <small>获得证物 · ${item.id}</small>
        <h2>${item.name}</h2>
        <p>${item.description}</p>
        <button id="accept-evidence" class="primary-button" type="button">收下证物</button>
      </div>
    </article>`;
  els.overlay.classList.remove("hidden");
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
  document.querySelector("#start-game").addEventListener("click", () => {
    audio.init();
    startOpening();
  });
}

function startOpening() {
  state.evidence.clear();
  state.facts.clear();
  state.qinDone.clear();
  state.searchFound.clear();
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
      <button id="enter-case" class="cover-button" type="button">进入 <i class="ph ph-arrow-right"></i></button>
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
    <div id="topic-list" class="topic-list" aria-label="询问话题"></div>
    <button id="finish-qin" class="finish-button" type="button" disabled>结束询问</button>`);

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
      <button id="begin-search" class="primary-button" type="button">进入现场 <i class="ph ph-arrow-right"></i></button>
    </section>`);
  document.querySelector("#begin-search").addEventListener("click", enterSecondConsultation);
}

function renderSearch() {
  resetPanels();
  const requiredFound = ["rack", "reports", "seam"].filter((key) => state.searchFound.has(key)).length;
  setHud("第二诊室", requiredFound === 3 ? "关键证物已齐" : `调查 ${requiredFound}/3`, true);
  setStage("search", backgrounds.clinic, `
    <div id="hotspots" class="hotspots" aria-label="可调查区域"></div>
    <button id="leave-search" class="leave-button" type="button" ${requiredFound < 3 ? "disabled" : ""}>离开现场</button>`);

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
  runDialogue(spot.lines, () => {
    state.searchFound.add(key);
    if (spot.evidence) addEvidence(spot.evidence, renderSearch);
    else renderSearch();
  });
}

function renderPeopleSelection() {
  resetPanels();
  setHud("等候区", "选择询问对象", true);
  setStage("suspects", backgrounds.waitingCast, `
    <div class="suspect-heading"><h1>先问谁？</h1><p>三个人都在等候区。</p></div>
    <div class="suspect-map">
      <button class="suspect-zone suspect-tang" data-person="唐宁" type="button"><span><b>唐宁</b><small>医院助理 · 报警人</small></span></button>
      <button class="suspect-zone suspect-su" data-person="苏青" type="button"><span><b>苏青</b><small>宠物博主 · 奶糖主人</small></span></button>
      <button class="suspect-zone suspect-lin" data-person="林夏" type="button"><span><b>林夏</b><small>动物救助者 · 旺旺送诊人</small></span></button>
    </div>`);
  document.querySelectorAll("[data-person]").forEach((button) => {
    button.addEventListener("click", () => showToast(`${button.dataset.person}的询问将在下一段开放`));
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
  els.modal.classList.add("hidden");
  els.modalScrim.classList.add("hidden");
  els.modalBody.innerHTML = "";
}

els.game.dataset.font = state.fontSize;
els.advance.addEventListener("click", advanceDialogue);
els.dialogue.addEventListener("click", (event) => {
  if (!event.target.closest("button")) advanceDialogue();
});
els.evidenceButton.addEventListener("click", openEvidenceModal);
els.recordButton.addEventListener("click", openRecordModal);
els.settingsButton.addEventListener("click", openSettingsModal);
els.modalClose.addEventListener("click", closeModal);
els.modalScrim.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !els.dialogue.classList.contains("hidden")) {
    event.preventDefault();
    advanceDialogue();
  }
  if (event.key === "Escape") closeModal();
});

renderStart();
