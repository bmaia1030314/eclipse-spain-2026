/*
 * app.js
 *
 * Lógica da app Eclipse 2026 — León.
 * - Renderiza spots, hotéis, plano do dia, checklist e notas.
 * - Filtra / ordena spots.
 * - Guarda spot principal/backup e estado da checklist em LocalStorage.
 * - Suporta troca de idioma PT/EN.
 * - Tenta inicializar Leaflet; cai para texto se falhar.
 */

(function () {
  "use strict";

  // -----------------------------------------------------------
  // Estado / persistência
  // -----------------------------------------------------------
  //
  // Storage layout (v2 — suporta dois planos):
  //   eclipse2026.lang            — "pt" | "en"
  //   eclipse2026.currentPlan     — "leon" | "caxado"
  //   eclipse2026.primaryByPlan   — JSON { leon: spotId?, caxado: spotId? }
  //   eclipse2026.backupByPlan    — JSON { leon: spotId?, caxado: spotId? }
  //   eclipse2026.weatherByPlan   — JSON { leon: "clear", caxado: "haze", ... }
  //   eclipse2026.meteoCache.v2   — JSON { leon: { updatedAt, spots }, caxado: ... }
  //   eclipse2026.checklist       — JSON { itemId: bool }            (partilhado)
  //   eclipse2026.audioFired      — JSON { leon: [ids], caxado: [ids] } (sessionStorage)
  //
  // Migração v1→v2: chaves antigas (primarySpot, backupSpot, meteoCache) são
  // lidas e copiadas para o namespace "leon" e depois removidas. Os IDs
  // antigos não tinham prefixo, por isso prefixam-se com "leon-" se assim
  // existirem no plano leon.
  // -----------------------------------------------------------
  const STORAGE_KEYS = {
    lang:           "eclipse2026.lang",
    currentPlan:    "eclipse2026.currentPlan",
    primaryByPlan:  "eclipse2026.primaryByPlan",
    backupByPlan:   "eclipse2026.backupByPlan",
    weatherByPlan:  "eclipse2026.weatherByPlan",
    checklist:      "eclipse2026.checklist",
    meteo:          "eclipse2026.meteoCache.v2",
    history:        "eclipse2026.historyCache",
    // legacy (v1)
    legacyPrimary:  "eclipse2026.primarySpot",
    legacyBackup:   "eclipse2026.backupSpot",
    legacyMeteo:    "eclipse2026.meteoCache"
  };

  // Safe localStorage wrappers — alguns contextos (file://, modo privado)
  // bloqueiam o acesso. Falhar silenciosamente em vez de partir a app.
  const safeStorage = {
    get(key) {
      try { return window.localStorage.getItem(key); }
      catch (e) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); }
      catch (e) { /* ignore */ }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); }
      catch (e) { /* ignore */ }
    }
  };

  function readJSON(key, fallback) {
    try {
      const raw = safeStorage.get(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed != null ? parsed : fallback;
    } catch (e) { return fallback; }
  }

  function writeJSON(key, value) {
    try { safeStorage.set(key, JSON.stringify(value)); }
    catch (e) { /* ignore */ }
  }

  // Migração lazy a partir das chaves v1.
  function migrateLegacyStorageIfNeeded() {
    // Só migra se ainda não há valores na v2.
    const hasNew = safeStorage.get(STORAGE_KEYS.primaryByPlan)
                || safeStorage.get(STORAGE_KEYS.backupByPlan)
                || safeStorage.get(STORAGE_KEYS.currentPlan);
    const legacyPrimary = safeStorage.get(STORAGE_KEYS.legacyPrimary);
    const legacyBackup  = safeStorage.get(STORAGE_KEYS.legacyBackup);

    if (!hasNew && (legacyPrimary || legacyBackup)) {
      const data = (window.APP_DATA || {});
      const leonSpots = ((data.plans || {}).leon || {}).spots || [];
      const mapToLeonId = (id) => {
        if (!id) return null;
        // Já tem prefixo?
        if (leonSpots.some((s) => s.id === id)) return id;
        // Tentar prefixar.
        const tryPref = "leon-" + id;
        if (leonSpots.some((s) => s.id === tryPref)) return tryPref;
        return null;
      };
      const primary = { leon: mapToLeonId(legacyPrimary), caxado: null };
      const backup  = { leon: mapToLeonId(legacyBackup),  caxado: null };
      writeJSON(STORAGE_KEYS.primaryByPlan, primary);
      writeJSON(STORAGE_KEYS.backupByPlan,  backup);
    }

    // Limpar chaves legadas (já não são usadas).
    if (legacyPrimary) safeStorage.remove(STORAGE_KEYS.legacyPrimary);
    if (legacyBackup)  safeStorage.remove(STORAGE_KEYS.legacyBackup);
    // Cache de meteo: descartar a v1 (formato podia conter IDs sem prefixo).
    if (safeStorage.get(STORAGE_KEYS.legacyMeteo)) {
      safeStorage.remove(STORAGE_KEYS.legacyMeteo);
    }
  }

  const state = {
    lang: safeStorage.get(STORAGE_KEYS.lang) || "pt",
    currentPlanId: null,         // preenchido em init
    primaryByPlan: { leon: null, caxado: null },
    backupByPlan:  { leon: null, caxado: null },
    weatherByPlan: { leon: "clear", caxado: "clear" },
    filters: { distance: "all", type: "all", priority: "all" },
    sortBy: "facility",
    meteoCache: null,    // in-memory mirror of forecast cache (whole object: { leon, caxado })
    historyCache: null   // in-memory mirror of 10-year history cache ({ leon, caxado })
  };

  // Devolve o plano activo a partir de window.APP_DATA.plans[currentPlanId].
  function getCurrentPlan() {
    const plans = (window.APP_DATA && window.APP_DATA.plans) || {};
    return plans[state.currentPlanId] || plans.leon || Object.values(plans)[0] || {};
  }

  // Atalhos
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // i18n com substituição opcional de variáveis: t("sectionSpotsTpl", { city: "León" }).
  const t = (key, vars) => {
    const dict = (window.APP_DATA.i18n[state.lang]) || window.APP_DATA.i18n.pt;
    let txt = dict[key] != null ? dict[key] : key;
    if (vars && typeof txt === "string") {
      Object.keys(vars).forEach((k) => {
        txt = txt.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
      });
    }
    return txt;
  };

  // Nome do plano traduzido ("Plano A — León (Castilla)" etc.).
  function planLabel(plan) {
    if (!plan) return "";
    return state.lang === "pt" ? (plan.namePt || plan.id) : (plan.nameEn || plan.id);
  }

  // Região traduzida do plano activo (ex. "Castilla y León" / "Galicia").
  function planRegion(plan) {
    if (!plan || !plan.base) return "";
    return state.lang === "pt" ? (plan.base.regionPt || "") : (plan.base.regionEn || "");
  }

  // Substituição de {base}/{region} em strings vindas de data.js (cues áudio,
  // timeline). Usa o plano ACTIVO no momento de speak/render.
  function substituteBase(s) {
    const plan = getCurrentPlan();
    const base = (plan.base && plan.base.city) || "";
    const region = planRegion(plan);
    return String(s || "")
      .replace(/\{base\}/g, base)
      .replace(/\{region\}/g, region);
  }

  // -----------------------------------------------------------
  // Inicialização
  // -----------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.APP_DATA) {
      console.error("APP_DATA not found. Verifica data.js.");
      return;
    }

    // Migrar chaves antigas (v1 → v2) antes de ler estado.
    migrateLegacyStorageIfNeeded();

    // Carregar mapas plan-scoped do storage.
    const primaryByPlan = readJSON(STORAGE_KEYS.primaryByPlan, null);
    if (primaryByPlan && typeof primaryByPlan === "object") {
      state.primaryByPlan = Object.assign(state.primaryByPlan, primaryByPlan);
    }
    const backupByPlan = readJSON(STORAGE_KEYS.backupByPlan, null);
    if (backupByPlan && typeof backupByPlan === "object") {
      state.backupByPlan = Object.assign(state.backupByPlan, backupByPlan);
    }
    const weatherByPlan = readJSON(STORAGE_KEYS.weatherByPlan, null);
    if (weatherByPlan && typeof weatherByPlan === "object") {
      state.weatherByPlan = Object.assign(state.weatherByPlan, weatherByPlan);
    }

    // Plano activo: valor persistido se válido, senão "leon".
    const stored = safeStorage.get(STORAGE_KEYS.currentPlan);
    const plans = (window.APP_DATA.plans || {});
    state.currentPlanId = (stored && plans[stored]) ? stored : "leon";

    // Idioma inicial
    $("#lang-select").value = state.lang;
    document.documentElement.lang = state.lang === "pt" ? "pt-PT" : "en";

    populatePlanSelect();

    applyTranslations();
    applyDynamicTitles();
    renderWeatherOptions();
    renderTimeline();
    renderPhases();
    renderDecisionTable();
    renderHotels();
    renderChecklist();
    renderExpectations();
    renderTour();
    renderNotes();
    renderSpots();
    updateSummary();
    initMap();
    renderStreetView();
    renderMeteo();          // load from cache if available
    renderMeteoDisclaimer();
    renderHistory();        // load history from cache if available
    startAppClock();        // ticks countdown + audio cues every 1s

    bindEvents();
  });

  // Preenche o <select id="plan-select"> com os planos disponíveis.
  function populatePlanSelect() {
    const sel = $("#plan-select");
    if (!sel) return;
    sel.innerHTML = "";
    Object.keys(window.APP_DATA.plans || {}).forEach((id) => {
      const plan = window.APP_DATA.plans[id];
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = planLabel(plan);
      sel.appendChild(opt);
    });
    sel.value = state.currentPlanId;
  }

  // -----------------------------------------------------------
  // Tradução estática (elementos com data-i18n) + títulos dinâmicos
  // -----------------------------------------------------------
  function applyTranslations() {
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const txt = t(key);
      if (txt) el.textContent = txt;
    });
    // Recolocar valores "Spot não definido" no resumo se necessário
    updateSummary();
  }

  // Títulos / labels que dependem do plano activo. Devem ser re-aplicados
  // em qualquer troca de plano OU de idioma.
  function applyDynamicTitles() {
    const plan = getCurrentPlan();
    const city = (plan.base && plan.base.city) || "";

    const hSpots = document.getElementById("h-spots");
    if (hSpots) hSpots.textContent = t("sectionSpotsTpl", { city: city });

    const hHotels = document.getElementById("h-hotels");
    if (hHotels) hHotels.textContent = t("sectionHotelsTpl", { city: city });

    // Re-popular o select com nomes traduzidos sempre que muda o idioma.
    populatePlanSelect();
  }

  // -----------------------------------------------------------
  // Eventos
  // -----------------------------------------------------------
  function bindEvents() {
    // Idioma
    $("#lang-select").addEventListener("change", (e) => {
      state.lang = e.target.value;
      safeStorage.set(STORAGE_KEYS.lang, state.lang);
      document.documentElement.lang = state.lang === "pt" ? "pt-PT" : "en";
      applyTranslations();
      applyDynamicTitles();
      // Re-render para etiquetas dinâmicas dos cards/timeline
      renderTimeline();
      renderPhases();
      renderDecisionTable();
      renderWeatherOptions();
      renderSpots();
      renderHotels();
      renderChecklist();
      renderExpectations();
      renderTour();
      renderNotes();
      updateWeatherRecommendation();
      updateCountdown();
      renderMeteo();
      renderMeteoDisclaimer();
      renderHistory();
      AudioCue.renderStatus();
      AudioCue.renderCueList();
      AudioCue.renderNextCue();
    });

    // Plano
    const planSel = $("#plan-select");
    if (planSel) {
      planSel.addEventListener("change", (e) => setPlan(e.target.value));
    }

    // Filtros
    $$('input[name="f-distance"]').forEach((r) =>
      r.addEventListener("change", (e) => { state.filters.distance = e.target.value; renderSpots(); })
    );
    $$('input[name="f-type"]').forEach((r) =>
      r.addEventListener("change", (e) => { state.filters.type = e.target.value; renderSpots(); })
    );
    $$('input[name="f-priority"]').forEach((r) =>
      r.addEventListener("change", (e) => { state.filters.priority = e.target.value; renderSpots(); })
    );

    // Ordenação
    $("#sort-select").addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      renderSpots();
    });

    // Tempo / matriz de decisão
    $("#weather-select").addEventListener("change", (e) => {
      state.weatherByPlan[state.currentPlanId] = e.target.value;
      writeJSON(STORAGE_KEYS.weatherByPlan, state.weatherByPlan);
      updateWeatherRecommendation();
      highlightDecisionRow();
    });

    // Checklist
    $("#btn-reset").addEventListener("click", resetChecklist);
    $("#btn-print").addEventListener("click", () => window.print());

    // Meteorologia
    $("#btn-refresh-meteo").addEventListener("click", refreshMeteo);
    // Histórico (10 anos)
    const btnHist = $("#btn-load-history");
    if (btnHist) btnHist.addEventListener("click", refreshHistory);
  }

  // -----------------------------------------------------------
  // Troca de plano — refresh completo da UI.
  //
  // Princípios (validados com rubber-duck):
  // - Áudio é desactivado por segurança: cues do novo plano podem ter timings
  //   diferentes e talvez já tenham "passado" no novo plano. Utilizador
  //   re-activa manualmente.
  // - Conjunto de cues disparados é por plano: ao trocar, salvamos o set
  //   actual e carregamos o do novo plano (do sessionStorage).
  // - Mapa é reusado (uma só instância) — markers são limpos e re-adicionados.
  // - Estado de meteo está sempre em cache por plano (cache[planId]).
  // -----------------------------------------------------------
  function setPlan(newId) {
    const plans = (window.APP_DATA.plans || {});
    if (!plans[newId] || newId === state.currentPlanId) return;

    // 1) Persistir conjunto de cues do plano actual antes de trocar.
    AudioCue.saveFiredForCurrentPlan();
    // 2) Desactivar áudio: por segurança, evita falar cues do plano novo.
    const wasAudioEnabled = AudioCue.state.enabled;
    if (wasAudioEnabled) AudioCue.deactivate();

    // 3) Trocar plano
    state.currentPlanId = newId;
    safeStorage.set(STORAGE_KEYS.currentPlan, newId);

    // 4) Validar/normalizar weather do novo plano contra os seus options.
    const plan = getCurrentPlan();
    const opts = (plan.weatherOptions || []).map((o) => o.value);
    if (!state.weatherByPlan[newId] || opts.indexOf(state.weatherByPlan[newId]) === -1) {
      state.weatherByPlan[newId] = opts[0] || "clear";
      writeJSON(STORAGE_KEYS.weatherByPlan, state.weatherByPlan);
    }

    // 5) Reset audio fired state para os cues do novo plano.
    AudioCue.loadFiredForCurrentPlan();

    // 6) Re-render full
    applyDynamicTitles();
    renderWeatherOptions();
    renderTimeline();
    renderPhases();
    renderDecisionTable();
    renderHotels();
    renderSpots();
    renderTour();
    updateSummary();
    refreshMapMarkers();
    renderStreetView();
    renderMeteo();
    renderMeteoDisclaimer();
    renderHistory();
    updateCountdown();
    AudioCue.renderStatus();
    AudioCue.renderCueList();
    AudioCue.renderNextCue();

    if (wasAudioEnabled) {
      // Avisar visualmente o utilizador que o áudio foi desactivado.
      showToast(t("audioPlanSwitched"));
    }
  }

  // -----------------------------------------------------------
  // Render: Spots
  // -----------------------------------------------------------
  function renderSpots() {
    const grid = $("#spots-grid");
    grid.innerHTML = "";

    const list = filterAndSortSpots(getCurrentPlan().spots || []);

    if (list.length === 0) {
      const empty = document.createElement("p");
      empty.className = "disclaimer";
      empty.textContent = state.lang === "pt"
        ? "Nenhum spot corresponde aos filtros."
        : "No spot matches the filters.";
      grid.appendChild(empty);
      return;
    }

    list.forEach((spot) => grid.appendChild(buildSpotCard(spot)));
  }

  function filterAndSortSpots(spots) {
    const { distance, type, priority } = state.filters;
    let list = spots.filter((s) => {
      if (distance !== "all" && s.distance !== distance) return false;
      if (type !== "all" && s.type !== type) return false;
      if (priority !== "all" && !s.tags.includes(priority)) return false;
      return true;
    });

    list.sort((a, b) => {
      const key = state.sortBy === "experience" ? "experience" : "facility";
      return (b[key] || 0) - (a[key] || 0);
    });
    return list;
  }

  function buildSpotCard(spot) {
    const card = document.createElement("article");
    card.className = "card spot-card";
    if (spot.id === currentPrimaryId()) card.classList.add("is-primary");
    if (spot.id === currentBackupId())  card.classList.add("is-backup");

    // Header
    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = spot.name;

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.appendChild(makeBadge(typeLabel(spot.type), "badge-accent"));
    badges.appendChild(makeBadge(distanceLabel(spot.distance), "badge-primary"));
    if (spot.totalityLabel) {
      badges.appendChild(makeBadge(`${t("totalityDuration")} ${spot.totalityLabel}`, "badge-warn"));
    }
    if (spot.tags.includes("seguro"))      badges.appendChild(makeBadge(t("safer"), "badge-ok"));
    if (spot.tags.includes("fotogenico"))  badges.appendChild(makeBadge(t("photogenic"), "badge-primary"));
    if (spot.id === currentPrimaryId())    badges.appendChild(makeBadge(t("primarySpot"), "badge-primary"));
    if (spot.id === currentBackupId())     badges.appendChild(makeBadge(t("backupSpot"), "badge-accent"));

    header.appendChild(title);
    header.appendChild(badges);

    // Distância
    const distRow = document.createElement("p");
    distRow.className = "card-section";
    distRow.innerHTML = `<strong>${escape(spot.distanceLabel)}</strong> · ` +
      `<strong>${t("totalityDuration")}:</strong> ${escape(spot.totalityLabel || "—")}`;

    // Why
    const why = document.createElement("div");
    why.className = "card-section";
    why.innerHTML = `<strong>${t("whyGood")}:</strong> ${escape(spot.why)}`;

    // Sun position diagram
    const sunBlock = document.createElement("div");
    sunBlock.className = "card-section";
    sunBlock.innerHTML = `<strong>${t("sunAtTotality")}:</strong>`;
    sunBlock.appendChild(buildSunDiagram(spot));
    const sunCap = document.createElement("p");
    sunCap.className = "sun-diagram-caption";
    sunCap.textContent =
      `${t("altitude")}: ${spot.sun.altitude.toFixed(1)}° · ` +
      `${t("azimuth")}: ${spot.sun.azimuth}° (W → NW)`;
    sunBlock.appendChild(sunCap);

    // Alerts
    const alerts = document.createElement("div");
    alerts.className = "card-section";
    const ul = document.createElement("ul");
    spot.alerts.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = a;
      ul.appendChild(li);
    });
    alerts.innerHTML = `<strong>${t("alerts")}:</strong>`;
    alerts.appendChild(ul);

    // How to find
    const find = document.createElement("div");
    find.className = "card-section";
    find.innerHTML = `<strong>${t("howToFind")}:</strong> <code>${escape(spot.howToFind)}</code>`;

    // Ações
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnCopy = document.createElement("button");
    btnCopy.type = "button";
    btnCopy.className = "btn btn-secondary";
    btnCopy.textContent = t("copySearch");
    btnCopy.addEventListener("click", () => copyToClipboard(spot.howToFind));

    const btnPrimary = document.createElement("button");
    btnPrimary.type = "button";
    btnPrimary.className = "btn btn-primary";
    btnPrimary.textContent = t("setPrimary");
    btnPrimary.setAttribute("aria-pressed", spot.id === currentPrimaryId() ? "true" : "false");
    btnPrimary.addEventListener("click", () => setPrimarySpot(spot.id));

    const btnBackup = document.createElement("button");
    btnBackup.type = "button";
    btnBackup.className = "btn btn-accent";
    btnBackup.textContent = t("setBackup");
    btnBackup.setAttribute("aria-pressed", spot.id === currentBackupId() ? "true" : "false");
    btnBackup.addEventListener("click", () => setBackupSpot(spot.id));

    actions.appendChild(btnCopy);
    actions.appendChild(btnPrimary);
    actions.appendChild(btnBackup);

    card.appendChild(header);
    card.appendChild(distRow);
    card.appendChild(why);
    card.appendChild(sunBlock);
    card.appendChild(alerts);
    card.appendChild(find);
    card.appendChild(actions);

    return card;
  }

  function typeLabel(type) {
    if (type === "plano")    return t("typeFlat");
    if (type === "elevado")  return t("typeHigh");
    if (type === "montanha") return t("typeMountain");
    return type;
  }
  function distanceLabel(d) {
    if (d === "near")   return t("near");
    if (d === "medium") return t("medium");
    if (d === "long")   return t("long");
    return d;
  }

  function makeBadge(text, cls) {
    const b = document.createElement("span");
    b.className = `badge ${cls || ""}`.trim();
    b.textContent = text;
    return b;
  }

  // -----------------------------------------------------------
  // Spot principal / backup  (state plan-scoped)
  // -----------------------------------------------------------
  function currentPrimaryId() { return state.primaryByPlan[state.currentPlanId] || null; }
  function currentBackupId()  { return state.backupByPlan[state.currentPlanId]  || null; }

  function setPrimarySpot(id) {
    const cur = currentPrimaryId();
    if (cur === id) {
      state.primaryByPlan[state.currentPlanId] = null;
    } else {
      state.primaryByPlan[state.currentPlanId] = id;
      if (currentBackupId() === id) state.backupByPlan[state.currentPlanId] = null;
    }
    persistSpots();
    renderSpots();
    updateSummary();
    updateWeatherRecommendation();
    refreshTimingsUI();
  }

  function setBackupSpot(id) {
    const cur = currentBackupId();
    if (cur === id) {
      state.backupByPlan[state.currentPlanId] = null;
    } else {
      state.backupByPlan[state.currentPlanId] = id;
      if (currentPrimaryId() === id) state.primaryByPlan[state.currentPlanId] = null;
    }
    persistSpots();
    renderSpots();
    updateSummary();
  }

  function persistSpots() {
    writeJSON(STORAGE_KEYS.primaryByPlan, state.primaryByPlan);
    writeJSON(STORAGE_KEYS.backupByPlan,  state.backupByPlan);
  }

  function updateSummary() {
    const primary = findSpot(currentPrimaryId());
    const backup  = findSpot(currentBackupId());
    const plan = getCurrentPlan();
    const baseEl = $("#summary-base");
    if (baseEl) baseEl.textContent = (plan.base && plan.base.city) || "—";
    const pEl = $("#summary-primary"); if (pEl) pEl.textContent = primary ? primary.name : t("notSet");
    const bEl = $("#summary-backup");  if (bEl) bEl.textContent = backup  ? backup.name  : t("notSet");
  }

  // Procura um spot no plano ACTIVO apenas. Cross-plan lookups são
  // intencionalmente bloqueados (IDs prefixados garantem unicidade).
  function findSpot(id) {
    if (!id) return undefined;
    const plan = getCurrentPlan();
    return (plan.spots || []).find((s) => s.id === id);
  }

  // -----------------------------------------------------------
  // Spot-adjusted phase times
  //
  // Cada plano tem o seu próprio array de fases (`plan.phases[].tUTC`).
  // Cada spot pode ter `phaseOffsets` (segundos) relativos a essa
  // referência. Quando o Spot Principal está definido, todos os timings
  // (countdown, cues de áudio, lista de fases) usam os valores ajustados.
  // -----------------------------------------------------------
  function adjustedPhaseTimeMs(code, spotId) {
    const plan = getCurrentPlan();
    const phase = (plan.phases || []).find((p) => p.code === code);
    if (!phase || !phase.tUTC) return null;
    let ms = new Date(phase.tUTC).getTime();
    const id = spotId !== undefined ? spotId : currentPrimaryId();
    if (id) {
      const spot = findSpot(id);
      const off = spot && spot.phaseOffsets && spot.phaseOffsets[code];
      if (typeof off === "number") ms += off * 1000;
    }
    return ms;
  }

  function formatLocalHMS(ms) {
    // Sempre Europe/Madrid (CEST em Agosto = UTC+2) — corresponde ao local do eclipse.
    return new Date(ms).toLocaleTimeString("pt-PT", {
      timeZone: "Europe/Madrid",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
  }

  // Re-renderiza tudo o que depende dos timings ajustados ao spot.
  // Chamado em setPrimarySpot e mudança de idioma.
  function refreshTimingsUI() {
    renderPhases();
    updateCountdown();
    AudioCue.renderNextCue();
    AudioCue.renderCueList();
    renderStreetView();
  }

  // -----------------------------------------------------------
  // Street View do Spot Principal
  //
  // Usa a URL de embed do Google Maps (output=svembed) que NÃO requer
  // chave de API. Limitações conhecidas:
  //   - Em zonas rurais (Páramo, Babia) pode não haver cobertura no
  //     ponto exacto; o panorama pode aparecer vazio ou cair na
  //     estrada mais próxima.
  //   - O parâmetro cbp=11,heading,0,zoom,pitch aceita o azimute do
  //     Sol para alinhar a vista com a direção da totalidade.
  // -----------------------------------------------------------
  function renderStreetView() {
    const panel = $("#streetview-panel");
    const frame = $("#streetview-frame");
    const nameEl = $("#streetview-spot-name");
    const linkMaps = $("#streetview-open-maps");
    const linkSv = $("#streetview-open-sv");
    if (!panel || !frame) return;

    const primaryId = currentPrimaryId();
    const spot = primaryId ? findSpot(primaryId) : null;
    if (!spot || !spot.coords || spot.coords.length < 2) {
      panel.classList.add("hidden");
      // Liberta a iframe para não consumir rede em background.
      if (frame.src && frame.src !== "about:blank") frame.src = "about:blank";
      return;
    }

    const [lat, lng] = spot.coords;
    const heading = Math.round((spot.sun && spot.sun.azimuth) || 270);
    const pitch = 0;
    const fov = 90;

    // svembed: panorama "puro", sem UI extra.
    const svEmbed =
      "https://maps.google.com/maps?q=&layer=c" +
      "&cbll=" + lat + "," + lng +
      "&cbp=11," + heading + ",0," + fov + "," + pitch +
      "&output=svembed";

    // Só atualiza src se mudou — evita reload desnecessário.
    if (frame.dataset.spotId !== spot.id) {
      frame.src = svEmbed;
      frame.dataset.spotId = spot.id;
    }

    if (nameEl) nameEl.textContent = " — " + spot.name;

    // Link "Abrir no Google Maps" (mostra o pino + permite trocar para SV)
    if (linkMaps) {
      linkMaps.href = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
    }
    // Link "Abrir Street View" (entra directamente em modo SV)
    if (linkSv) {
      linkSv.href =
        "https://www.google.com/maps/@?api=1&map_action=pano" +
        "&viewpoint=" + lat + "," + lng +
        "&heading=" + heading +
        "&pitch=" + pitch +
        "&fov=" + fov;
    }

    panel.classList.remove("hidden");
  }

  // -----------------------------------------------------------
  // Render: Hotéis
  // -----------------------------------------------------------
  function renderHotels() {
    const grid = $("#hotels-grid");
    grid.innerHTML = "";

    (getCurrentPlan().hotels || []).forEach((h) => {
      const card = document.createElement("article");
      card.className = "card hotel-card";

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = h.name;

      const notes = document.createElement("div");
      notes.className = "hotel-notes";
      h.notes.forEach((n) => notes.appendChild(makeBadge(n)));

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const btnCopy = document.createElement("button");
      btnCopy.type = "button";
      btnCopy.className = "btn btn-secondary";
      btnCopy.textContent = t("copyHotel");
      btnCopy.addEventListener("click", () => copyToClipboard(h.name));

      actions.appendChild(btnCopy);

      card.appendChild(title);
      card.appendChild(notes);
      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  // -----------------------------------------------------------
  // Render: Plano do dia (timeline)
  //
  // O texto pode conter {base}/{region} que são substituídos pelo plano
  // activo em tempo de render. Permite manter um único timeline para
  // ambos os planos.
  // -----------------------------------------------------------
  function renderTimeline() {
    const ol = $("#timeline");
    ol.innerHTML = "";
    window.APP_DATA.timeline.forEach((item) => {
      const li = document.createElement("li");
      const isTotality = /totalidade|totality/i.test(item.title);
      if (isTotality) li.classList.add("is-highlight");

      const time = document.createElement("span");
      time.className = "timeline-time";
      time.textContent = substituteBase(item.time);

      const title = document.createElement("span");
      title.className = "timeline-title";
      title.textContent = substituteBase(item.title);

      const detail = document.createElement("span");
      detail.className = "timeline-detail";
      detail.textContent = substituteBase(item.detail);

      li.appendChild(time);
      li.appendChild(title);
      li.appendChild(detail);
      ol.appendChild(li);
    });
  }

  // -----------------------------------------------------------
  // Tempo + matriz de decisão
  // -----------------------------------------------------------
  function renderWeatherOptions() {
    const sel = $("#weather-select");
    const opts = (getCurrentPlan().weatherOptions || []);
    sel.innerHTML = "";
    opts.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      sel.appendChild(o);
    });
    // Estado persistido para este plano; fallback ao primeiro option.
    let cur = state.weatherByPlan[state.currentPlanId];
    if (!cur || !opts.some((o) => o.value === cur)) {
      cur = opts[0] ? opts[0].value : "clear";
      state.weatherByPlan[state.currentPlanId] = cur;
      writeJSON(STORAGE_KEYS.weatherByPlan, state.weatherByPlan);
    }
    sel.value = cur;
    updateWeatherRecommendation();
  }

  function renderDecisionTable() {
    const tbody = $("#decision-body");
    tbody.innerHTML = "";
    const plan = getCurrentPlan();
    const matrix = plan.decisionMatrix || {};
    (plan.weatherOptions || []).forEach((opt) => {
      const tr = document.createElement("tr");
      tr.dataset.weather = opt.value;

      const tdCond = document.createElement("td");
      tdCond.textContent = opt.label;

      const tdReco = document.createElement("td");
      const mapEntry = matrix[opt.value];
      const spot = mapEntry ? findSpot(mapEntry.spotId) : null;
      tdReco.innerHTML = `<strong>${spot ? escape(spot.name) : "—"}</strong>` +
                         (mapEntry ? `<br><span class="card-section">${escape(mapEntry.reason)}</span>` : "");

      tr.appendChild(tdCond);
      tr.appendChild(tdReco);
      tbody.appendChild(tr);
    });
    highlightDecisionRow();
  }

  function highlightDecisionRow() {
    const cur = state.weatherByPlan[state.currentPlanId];
    $$("#decision-body tr").forEach((tr) => {
      tr.classList.toggle("is-active", tr.dataset.weather === cur);
    });
  }

  function updateWeatherRecommendation() {
    const reco = $("#weather-reco");
    if (!reco) return;
    const plan = getCurrentPlan();
    const cur = state.weatherByPlan[state.currentPlanId];
    const entry = (plan.decisionMatrix || {})[cur];
    if (!entry) { reco.textContent = ""; return; }
    const spot = findSpot(entry.spotId);
    if (!spot) { reco.textContent = ""; return; }

    const recommendedLabel = t("recommended");
    reco.innerHTML =
      `<strong>${recommendedLabel}:</strong> ${escape(spot.name)} — ${escape(entry.reason)}`;
  }

  // -----------------------------------------------------------
  // Checklist
  // -----------------------------------------------------------
  function renderChecklist() {
    const ul = $("#checklist");
    ul.innerHTML = "";
    const saved = readChecklistState();

    window.APP_DATA.checklist.forEach((item) => {
      const li = document.createElement("li");
      const lbl = document.createElement("label");
      lbl.setAttribute("for", `chk-${item.id}`);

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = `chk-${item.id}`;
      cb.checked = !!saved[item.id];
      cb.addEventListener("change", () => {
        saved[item.id] = cb.checked;
        safeStorage.set(STORAGE_KEYS.checklist, JSON.stringify(saved));
      });

      const span = document.createElement("span");
      span.textContent = item.label;

      lbl.appendChild(cb);
      lbl.appendChild(span);
      li.appendChild(lbl);
      ul.appendChild(li);
    });
  }

  function readChecklistState() {
    try {
      return JSON.parse(safeStorage.get(STORAGE_KEYS.checklist) || "{}");
    } catch (e) {
      return {};
    }
  }

  function resetChecklist() {
    safeStorage.remove(STORAGE_KEYS.checklist);
    renderChecklist();
    showToast(state.lang === "pt" ? "Checklist limpa." : "Checklist cleared.");
  }

  // -----------------------------------------------------------
  // Notas
  // -----------------------------------------------------------
  function renderNotes() {
    const ul = $("#notes-list");
    ul.innerHTML = "";
    window.APP_DATA.notes.forEach((n) => {
      const li = document.createElement("li");
      li.textContent = n;
      ul.appendChild(li);
    });
  }

  // -----------------------------------------------------------
  // Mapa (Leaflet) com fallback
  //
  // Estratégia para suportar troca de plano sem partir o Leaflet:
  //   - Uma só instância do mapa (criada uma vez em initMap).
  //   - Os marcadores vivem num L.layerGroup; em mudança de plano,
  //     limpa-se o group e re-adicionam-se os markers do novo plano.
  //   - Em failure (Leaflet não carregou), cai para a mensagem de fallback.
  // -----------------------------------------------------------
  let mapInstance = null;
  let markerLayer = null;

  function initMap() {
    const mapEl = $("#map");
    const fallback = $("#map-fallback");

    const leafletAvailable = !window.__leafletFailed && typeof window.L !== "undefined";
    if (!leafletAvailable) {
      mapEl.classList.add("hidden");
      fallback.classList.remove("hidden");
      return;
    }

    try {
      const plan = getCurrentPlan();
      const center = (plan.base && plan.base.coords) || [42.5987, -5.5671];
      mapInstance = L.map(mapEl, { scrollWheelZoom: false }).setView(center, 9);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap"
      }).addTo(mapInstance);

      markerLayer = L.layerGroup().addTo(mapInstance);
      refreshMapMarkers();
    } catch (err) {
      console.warn("Map init failed:", err);
      mapEl.classList.add("hidden");
      fallback.classList.remove("hidden");
    }
  }

  // Limpa e re-adiciona os markers a partir do plano activo.
  // Chamado em troca de plano. Sem efeito se Leaflet falhou.
  function refreshMapMarkers() {
    if (!mapInstance || !markerLayer) return;
    try {
      markerLayer.clearLayers();

      const plan = getCurrentPlan();
      const base = (plan.base && plan.base.coords) || null;
      const baseLabel = ((plan.base && plan.base.city) || "") + " (base)";
      const markers = [];

      if (base) {
        const baseMarker = L.marker(base).bindPopup(baseLabel);
        markerLayer.addLayer(baseMarker);
        markers.push(baseMarker);
      }

      (plan.spots || []).forEach((s) => {
        if (!s.coords) return;
        const m = L.marker(s.coords).bindPopup(`<strong>${escape(s.name)}</strong>`);
        markerLayer.addLayer(m);
        markers.push(m);
      });

      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        mapInstance.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 9 });
      } else if (base) {
        mapInstance.setView(base, 9);
      }
    } catch (e) { /* ignore */ }
  }

  // -----------------------------------------------------------
  // Sun position diagram (SVG)
  // -----------------------------------------------------------
  // Shows the Sun's position above the western horizon at totality.
  // X axis: azimuth from 240° (SW) to 320° (NW-by-N).
  // Y axis: altitude from 0° (horizon) to 25°.
  function buildSunDiagram(spot) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const W = 240, H = 120;
    const HORIZON_Y = 90;
    const AZ_MIN = 240, AZ_MAX = 320;
    const ALT_MAX = 25;

    const az = clamp(spot.sun.azimuth, AZ_MIN, AZ_MAX);
    const alt = clamp(spot.sun.altitude, 0, ALT_MAX);
    const sunX = ((az - AZ_MIN) / (AZ_MAX - AZ_MIN)) * W;
    const sunY = HORIZON_Y - (alt / ALT_MAX) * (HORIZON_Y - 10);

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "sun-diagram");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      `${t("sunAtTotality")}: ${t("altitude")} ${spot.sun.altitude}°, ${t("azimuth")} ${spot.sun.azimuth}°`);

    // Gradient sky (defs)
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.innerHTML =
      `<linearGradient id="sky-${spot.id}" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="#1e3a5f"/>
         <stop offset="60%" stop-color="#7a4b8a"/>
         <stop offset="100%" stop-color="#f59e0b"/>
       </linearGradient>`;
    svg.appendChild(defs);

    // Sky
    const sky = document.createElementNS(SVG_NS, "rect");
    sky.setAttribute("x", "0"); sky.setAttribute("y", "0");
    sky.setAttribute("width", W); sky.setAttribute("height", HORIZON_Y);
    sky.setAttribute("fill", `url(#sky-${spot.id})`);
    svg.appendChild(sky);

    // Ground
    const ground = document.createElementNS(SVG_NS, "rect");
    ground.setAttribute("x", "0"); ground.setAttribute("y", HORIZON_Y);
    ground.setAttribute("width", W); ground.setAttribute("height", H - HORIZON_Y);
    ground.setAttribute("fill", "#1f2937");
    svg.appendChild(ground);

    // Altitude grid (5°, 10°, 15°, 20°)
    for (let a = 5; a <= 20; a += 5) {
      const y = HORIZON_Y - (a / ALT_MAX) * (HORIZON_Y - 10);
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", "0"); line.setAttribute("x2", W);
      line.setAttribute("y1", y);   line.setAttribute("y2", y);
      line.setAttribute("stroke", "rgba(255,255,255,0.12)");
      line.setAttribute("stroke-dasharray", "3 4");
      svg.appendChild(line);

      const lbl = document.createElementNS(SVG_NS, "text");
      lbl.setAttribute("x", "4"); lbl.setAttribute("y", y - 2);
      lbl.setAttribute("font-size", "8");
      lbl.setAttribute("fill", "rgba(255,255,255,0.5)");
      lbl.textContent = `${a}°`;
      svg.appendChild(lbl);
    }

    // Horizon line
    const horizon = document.createElementNS(SVG_NS, "line");
    horizon.setAttribute("x1", "0"); horizon.setAttribute("x2", W);
    horizon.setAttribute("y1", HORIZON_Y); horizon.setAttribute("y2", HORIZON_Y);
    horizon.setAttribute("stroke", "#fff");
    horizon.setAttribute("stroke-width", "1.5");
    svg.appendChild(horizon);

    // Compass labels
    const compass = [
      { az: 247.5, label: "WSW" },
      { az: 270,   label: "W"   },
      { az: 292.5, label: "WNW" },
      { az: 315,   label: "NW"  }
    ];
    compass.forEach((c) => {
      const x = ((c.az - AZ_MIN) / (AZ_MAX - AZ_MIN)) * W;

      const tick = document.createElementNS(SVG_NS, "line");
      tick.setAttribute("x1", x); tick.setAttribute("x2", x);
      tick.setAttribute("y1", HORIZON_Y - 3); tick.setAttribute("y2", HORIZON_Y + 3);
      tick.setAttribute("stroke", "#fff");
      svg.appendChild(tick);

      const txt = document.createElementNS(SVG_NS, "text");
      txt.setAttribute("x", x); txt.setAttribute("y", H - 6);
      txt.setAttribute("font-size", "10");
      txt.setAttribute("fill", "#fff");
      txt.setAttribute("text-anchor", "middle");
      txt.textContent = c.label;
      svg.appendChild(txt);
    });

    // Sun marker (glow + body)
    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("cx", sunX); glow.setAttribute("cy", sunY);
    glow.setAttribute("r", "14"); glow.setAttribute("fill", "rgba(245,158,11,0.35)");
    svg.appendChild(glow);

    const sun = document.createElementNS(SVG_NS, "circle");
    sun.setAttribute("cx", sunX); sun.setAttribute("cy", sunY);
    sun.setAttribute("r", "7");
    sun.setAttribute("fill", "#fbbf24");
    sun.setAttribute("stroke", "#fff");
    sun.setAttribute("stroke-width", "1.5");
    svg.appendChild(sun);

    // Label above sun
    const lbl = document.createElementNS(SVG_NS, "text");
    lbl.setAttribute("x", sunX); lbl.setAttribute("y", sunY - 12);
    lbl.setAttribute("font-size", "10");
    lbl.setAttribute("font-weight", "600");
    lbl.setAttribute("fill", "#fff");
    lbl.setAttribute("text-anchor", "middle");
    lbl.textContent = `${spot.sun.altitude}° / ${spot.sun.azimuth}°`;
    svg.appendChild(lbl);

    return svg;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // -----------------------------------------------------------
  // Phases (C1, C2, Max, C3, sunset, C4)
  // -----------------------------------------------------------
  function renderPhases() {
    const ol = $("#phases");
    if (!ol) return;
    ol.innerHTML = "";

    const primaryId = currentPrimaryId();
    const primary = primaryId ? findSpot(primaryId) : null;

    (getCurrentPlan().phases || []).forEach((p) => {
      const li = document.createElement("li");
      li.className = "phase-item";
      if (p.code === "C2" || p.code === "Max" || p.code === "C3") li.classList.add("is-totality");
      if (p.code === "Pôr" || /sun ?set|pôr/i.test(p.title)) li.classList.add("is-sunset");
      if (p.code === "C4") li.classList.add("is-skip");

      const code = document.createElement("span");
      code.className = "phase-code";
      code.textContent = p.code;

      // Quando há Spot Principal, mostra tempo absoluto ajustado (HH:MM:SS).
      // Caso contrário, usa a string genérica original ("≈ 19:30").
      let timeText = p.time;
      if (primary && p.tUTC) {
        const adj = adjustedPhaseTimeMs(p.code, primary.id);
        if (adj != null) timeText = "≈ " + formatLocalHMS(adj);
      }

      const body = document.createElement("div");
      body.className = "phase-body";
      body.innerHTML =
        `<span class="phase-time">${escape(timeText)}</span>` +
        `<span class="phase-title">${escape(p.title)}</span>` +
        `<span class="phase-detail">${escape(p.detail)}</span>`;

      li.appendChild(code);
      li.appendChild(body);
      ol.appendChild(li);
    });

    renderTimingsNotice();
  }

  // Pequeno aviso por baixo das fases / no painel áudio a indicar
  // se os timings estão ajustados ao Spot Principal ou são genéricos.
  function renderTimingsNotice() {
    const el = $("#timings-notice");
    if (!el) return;
    const primaryId = currentPrimaryId();
    const spot = primaryId ? findSpot(primaryId) : null;
    if (spot) {
      el.textContent = t("timingsAdjusted") + ": " + spot.name;
      el.classList.add("is-adjusted");
      el.classList.remove("is-generic");
    } else {
      el.textContent = t("timingsGenericTpl", { region: planRegion(getCurrentPlan()) });
      el.classList.add("is-generic");
      el.classList.remove("is-adjusted");
    }
  }

  // -----------------------------------------------------------
  // Expectations ("O que esperar")
  // -----------------------------------------------------------
  function renderExpectations() {
    const grid = $("#expectations-grid");
    if (!grid) return;
    grid.innerHTML = "";

    window.APP_DATA.expectations.forEach((e) => {
      const card = document.createElement("article");
      card.className = "card";

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = e.title;

      const detail = document.createElement("p");
      detail.className = "card-section";
      detail.textContent = e.detail;

      card.appendChild(title);
      card.appendChild(detail);
      grid.appendChild(card);
    });
  }

  // -----------------------------------------------------------
  // Tour guide (region, multi-day)
  // -----------------------------------------------------------
  function renderTour() {
    const grid = $("#tour-grid");
    const section = $("#section-tour");
    if (!grid) return;
    grid.innerHTML = "";

    const plan = getCurrentPlan();
    const tour = plan.tour;

    // Only show tour section if the current plan has tour data.
    if (!tour || !tour.length) {
      if (section) section.style.display = "none";
      return;
    }
    if (section) section.style.display = "";

    const isEn = state.lang === "en";

    tour.forEach((day) => {
      const card = document.createElement("article");
      card.className = "card tour-day-card";

      const header = document.createElement("div");
      header.className = "tour-day-header";

      const dayTitle = document.createElement("h3");
      dayTitle.className = "tour-day-title";
      dayTitle.textContent = isEn ? (day.dayEn || day.day) : day.day;

      const theme = document.createElement("span");
      theme.className = "tour-day-theme badge badge-primary";
      theme.textContent = isEn ? (day.themeEn || day.theme) : day.theme;

      header.appendChild(dayTitle);
      header.appendChild(theme);
      card.appendChild(header);

      const list = document.createElement("ul");
      list.className = "tour-items";

      day.items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "tour-item";

        const top = document.createElement("div");
        top.className = "tour-item-top";

        const itemName = document.createElement("strong");
        itemName.className = "tour-item-name";
        itemName.textContent = item.name;

        if (item.time) {
          const timeTag = document.createElement("span");
          timeTag.className = "tour-item-time badge";
          timeTag.textContent = item.time;
          top.appendChild(itemName);
          top.appendChild(timeTag);
        } else {
          top.appendChild(itemName);
        }

        const desc = document.createElement("p");
        desc.className = "tour-item-desc";
        desc.textContent = isEn ? (item.descEn || item.desc) : item.desc;

        li.appendChild(top);
        li.appendChild(desc);
        list.appendChild(li);
      });

      card.appendChild(list);
      grid.appendChild(card);
    });
  }

  // -----------------------------------------------------------
  // App clock — relógio único a 1Hz que actualiza o countdown
  // E processa os cues de áudio. Continua a correr depois de C3
  // (até passar o último cue + margem) para garantir o cue de sunset.
  // -----------------------------------------------------------
  let appClockTimer = null;

  function startAppClock() {
    AudioCue.init();
    tickAppClock();
    if (appClockTimer) clearInterval(appClockTimer);
    appClockTimer = setInterval(tickAppClock, 1000);
  }

  function tickAppClock() {
    updateCountdown();
    AudioCue.tick();

    // Parar só quando estamos já depois do último cue + margem.
    const cues = (window.APP_DATA && window.APP_DATA.audioCues) || [];
    const audioCfg = (window.APP_DATA && window.APP_DATA.audio) || {};
    const margin = audioCfg.clockEndMarginMs || (10 * 60 * 1000);
    let last = 0;
    for (const c of cues) {
      const ct = AudioCue.cueTimeMs(c);
      if (ct != null && ct > last) last = ct;
    }
    if (last > 0 && Date.now() > last + margin) {
      if (appClockTimer) { clearInterval(appClockTimer); appClockTimer = null; }
    }
  }

  function updateCountdown() {
    const el = $("#countdown");
    const val = $("#countdown-value");
    if (!el || !val) return;
    const plan = getCurrentPlan();
    if (!plan.eclipse) return;

    // Usa timings ajustados ao Spot Principal quando definido,
    // senão cai nos valores genéricos do plano (eclipse.totality*UTC).
    const c2 = adjustedPhaseTimeMs("C2");
    const c3 = adjustedPhaseTimeMs("C3");
    const startMs = c2 != null ? c2
                                : new Date(plan.eclipse.totalityStartUTC).getTime();
    const endMs   = c3 != null ? c3
                                : new Date(plan.eclipse.totalityEndUTC).getTime();
    const now = Date.now();

    el.classList.remove("is-active", "is-done");

    if (now < startMs) {
      val.textContent = formatDelta(startMs - now);
    } else if (now >= startMs && now <= endMs) {
      el.classList.add("is-active");
      const remaining = Math.max(0, Math.ceil((endMs - now) / 1000));
      val.textContent = `${t("countdownActive")} — ${remaining}${t("seconds")}`;
    } else {
      el.classList.add("is-done");
      val.textContent = t("countdownDone");
      // NOTA: não paramos o appClockTimer aqui — os cues de sunset
      // ainda têm de tocar. O tickAppClock decide quando parar.
    }
  }

  function formatDelta(ms) {
    let s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600);  s -= h * 3600;
    const m = Math.floor(s / 60);    s -= m * 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d}${t("days")} ${pad(h)}${t("hours")} ${pad(m)}${t("minutes")} ${pad(s)}${t("seconds")}`;
  }

  // -----------------------------------------------------------
  // Audio cues (Web Speech API)
  //
  // Princípios:
  // - Tick-based polling (1Hz) através do appClock — evita o limite
  //   ~24 dias do setTimeout e funciona com cues a 80+ dias de distância.
  // - Activação por gesto (autoplay policy): utterance silenciosa para
  //   "primar" o motor de speech. Não persiste entre sessões.
  // - Catch-up por cue: se o tab esteve suspenso, só dispara cues
  //   "atrasados" se ainda estiverem dentro da sua janela de catchup.
  //   Cues críticos (C3) têm staleText alternativo de segurança.
  // - sessionStorage para conjunto de cues já disparados (sobrevive
  //   a refresh dentro de uma janela de catchup). É plan-scoped:
  //   { leon: [ids], caxado: [ids] } — trocar plano carrega o set correcto.
  // - Visibility/focus → tick imediato para recuperar de suspensão.
  // - Substituição {base}/{region} em runtime — permite partilhar texto
  //   entre planos com cidades diferentes.
  // -----------------------------------------------------------
  const AUDIO_FIRED_KEY = "eclipse2026.audioFired";

  const AudioCue = {
    state: {
      enabled: false,
      primed: false,
      fired: new Set(),
      previewing: false,
      previewIndex: 0,
      previewCancel: false,
      wakeLockEnabled: false,
      wakeLock: null
    },

    isSupported() {
      return typeof window !== "undefined"
          && typeof window.speechSynthesis !== "undefined"
          && typeof window.SpeechSynthesisUtterance === "function";
    },

    // Lê o objecto plan-scoped do sessionStorage.
    readAllFired() {
      try {
        const raw = window.sessionStorage && window.sessionStorage.getItem(AUDIO_FIRED_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch (e) { return {}; }
    },

    writeAllFired(obj) {
      try {
        if (window.sessionStorage) {
          window.sessionStorage.setItem(AUDIO_FIRED_KEY, JSON.stringify(obj));
        }
      } catch (e) { /* ignore */ }
    },

    // Persiste o Set actual no namespace do plano ACTIVO.
    saveFiredForCurrentPlan() {
      const all = this.readAllFired();
      all[state.currentPlanId] = Array.from(this.state.fired);
      this.writeAllFired(all);
    },

    // Carrega o Set guardado para o plano ACTIVO (chamado em init e setPlan).
    loadFiredForCurrentPlan() {
      this.state.fired = new Set();
      const all = this.readAllFired();
      const arr = all[state.currentPlanId];
      if (Array.isArray(arr)) arr.forEach((id) => this.state.fired.add(id));
    },

    // Compatibilidade com chamadas antigas que tocavam num "saveFired".
    saveFired() { this.saveFiredForCurrentPlan(); },

    init() {
      // Restaurar conjunto de cues disparados do plano actual.
      this.loadFiredForCurrentPlan();

      // Em Chrome, getVoices() retorna [] no primeiro call e dispara este evento.
      if (this.isSupported()) {
        try {
          window.speechSynthesis.onvoiceschanged = () => { /* voices ready */ };
        } catch (e) { /* ignore */ }
      }

      const btnAct  = $("#btn-audio-activate");
      const btnTest = $("#btn-audio-test");
      const btnPrev = $("#btn-audio-preview");
      const btnStop = $("#btn-audio-stop");
      const chkWake = $("#chk-wake-lock");

      if (btnAct)  btnAct.addEventListener("click",  () => this.toggleActivate());
      if (btnTest) btnTest.addEventListener("click", () => this.test());
      if (btnPrev) btnPrev.addEventListener("click", () => this.startPreview());
      if (btnStop) btnStop.addEventListener("click", () => this.stopPreview());
      if (chkWake) chkWake.addEventListener("change", (e) => this.toggleWakeLock(e.target.checked));

      // Recuperar de tab em background quando volta a ficar visível.
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.tick();
          if (this.state.wakeLockEnabled) this.acquireWakeLock();
        }
      });
      window.addEventListener("focus", () => this.tick());
      window.addEventListener("pageshow", () => this.tick());

      this.renderStatus();
      this.renderCueList();
      this.renderNextCue();
    },

    toggleActivate() {
      if (!this.isSupported()) { this.renderStatus(); return; }
      if (this.state.enabled) this.deactivate();
      else this.activate();
    },

    activate() {
      if (!this.isSupported()) return;
      // Prime: utterance silenciosa para satisfazer autoplay policy.
      try {
        const u = new window.SpeechSynthesisUtterance(" ");
        u.volume = 0;
        u.lang = state.lang === "pt" ? "pt-PT" : "en-GB";
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
      this.state.enabled = true;
      this.state.primed = true;
      this.renderStatus();
      if (this.state.wakeLockEnabled) this.acquireWakeLock();
    },

    deactivate() {
      this.state.enabled = false;
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      this.releaseWakeLock();
      this.renderStatus();
    },

    test() {
      if (!this.isSupported()) return;
      if (!this.state.primed) this.activate();
      const txt = state.lang === "pt"
        ? "Cues de áudio ativos. Tudo pronto para o eclipse."
        : "Audio cues active. Ready for the eclipse.";
      this.speakNow(txt);
    },

    speakNow(text, opts) {
      if (!this.isSupported()) return;
      opts = opts || {};
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      try {
        const u = new window.SpeechSynthesisUtterance(text);
        u.lang   = opts.lang   || (state.lang === "pt" ? "pt-PT" : "en-GB");
        u.rate   = opts.rate   != null ? opts.rate   : 1.0;
        u.pitch  = opts.pitch  != null ? opts.pitch  : 1.0;
        u.volume = opts.volume != null ? opts.volume : 1.0;
        const v = this.pickVoice(u.lang);
        if (v) u.voice = v;
        if (opts.onend)   u.onend = opts.onend;
        if (opts.onerror) u.onerror = opts.onerror;
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },

    pickVoice(lang) {
      if (!this.isSupported()) return null;
      let voices = [];
      try { voices = window.speechSynthesis.getVoices() || []; }
      catch (e) { return null; }
      if (!voices.length) return null;
      const cfg = (window.APP_DATA && window.APP_DATA.audio) || {};
      const want = state.lang === "pt"
        ? (cfg.preferredVoicePt || [])
        : (cfg.preferredVoiceEn || []);
      for (const sub of want) {
        const v = voices.find(
          (vv) => vv.name && vv.name.toLowerCase().includes(sub.toLowerCase())
        );
        if (v) return v;
      }
      const langPrefix = (lang || "").split("-")[0].toLowerCase();
      return voices.find(
        (vv) => vv.lang && vv.lang.toLowerCase().startsWith(langPrefix)
      ) || null;
    },

    cueTimeMs(cue) {
      const base = adjustedPhaseTimeMs(cue.refPhase);
      if (base == null) return null;
      return base + (cue.offsetSec || 0) * 1000;
    },

    cueText(cue, stale) {
      const isPt = state.lang === "pt";
      let raw;
      if (stale) {
        raw = (isPt ? cue.staleTextPt : cue.staleTextEn) ||
              (isPt ? cue.textPt : cue.textEn);
      } else {
        raw = isPt ? cue.textPt : cue.textEn;
      }
      return substituteBase(raw);
    },

    tick() {
      // Atualiza UI do "próximo cue" sempre — útil mesmo desativado.
      this.renderNextCue();

      if (!this.state.enabled || this.state.previewing) return;
      if (!this.isSupported()) return;

      const now = Date.now();
      const cues = (window.APP_DATA && window.APP_DATA.audioCues) || [];
      let firedNow = false;
      cues.forEach((cue) => {
        if (this.state.fired.has(cue.id)) return;
        const ct = this.cueTimeMs(cue);
        if (ct == null) return;
        const dt = now - ct;
        const catchupMs = (cue.catchupSec || 30) * 1000;
        if (dt >= 0 && dt < catchupMs) {
          this.state.fired.add(cue.id);
          firedNow = true;
          // Se chegámos significativamente atrasados (>3s) e há mensagem
          // alternativa "stale", usa-a (mais segura, contextualizada).
          const stale = dt > 3000 && (cue.staleTextPt || cue.staleTextEn);
          this.speakNow(this.cueText(cue, stale));
        }
      });
      if (firedNow) {
        this.saveFired();
        this.renderCueList();
      }
    },

    startPreview() {
      if (!this.isSupported()) return;
      if (this.state.previewing) return;
      if (!this.state.primed) this.activate();
      this.state.previewing = true;
      this.state.previewCancel = false;
      this.state.previewIndex = 0;
      this.renderStatus();
      this.previewNext();
    },

    stopPreview() {
      this.state.previewCancel = true;
      this.state.previewing = false;
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      this.renderStatus();
    },

    previewNext() {
      if (this.state.previewCancel) {
        this.state.previewing = false;
        this.renderStatus();
        return;
      }
      const cues = (window.APP_DATA && window.APP_DATA.audioCues) || [];
      if (this.state.previewIndex >= cues.length) {
        this.state.previewing = false;
        this.renderStatus();
        return;
      }
      const cue = cues[this.state.previewIndex++];
      const text = this.cueText(cue);
      const cfg = (window.APP_DATA && window.APP_DATA.audio) || {};
      const pause = cfg.previewPauseMs != null ? cfg.previewPauseMs : 1500;

      // Avanço com onend OU timeout (alguns browsers não disparam onend).
      let advanced = false;
      const advance = () => {
        if (advanced) return;
        advanced = true;
        window.setTimeout(() => this.previewNext(), pause);
      };
      const estimatedMs = Math.max(2500, text.length * 90);
      window.setTimeout(advance, estimatedMs + 2000);
      this.speakNow(text, { onend: advance, onerror: advance });
    },

    async acquireWakeLock() {
      if (!("wakeLock" in navigator)) return;
      if (this.state.wakeLock) return;
      try {
        this.state.wakeLock = await navigator.wakeLock.request("screen");
        if (this.state.wakeLock && this.state.wakeLock.addEventListener) {
          this.state.wakeLock.addEventListener("release", () => {
            this.state.wakeLock = null;
          });
        }
      } catch (e) { /* user moved away or insecure context */ }
    },

    releaseWakeLock() {
      if (this.state.wakeLock && this.state.wakeLock.release) {
        try { this.state.wakeLock.release(); } catch (e) { /* ignore */ }
      }
      this.state.wakeLock = null;
    },

    toggleWakeLock(on) {
      this.state.wakeLockEnabled = !!on;
      if (on) this.acquireWakeLock();
      else this.releaseWakeLock();
    },

    // ----- UI -----
    renderStatus() {
      const wrap = $("#audio-status");
      const txt  = $("#audio-status-text");
      const btn  = $("#btn-audio-activate");
      const stop = $("#btn-audio-stop");
      if (!wrap) return;

      wrap.classList.remove("is-active", "is-preview", "is-unsupported");
      if (!this.isSupported()) {
        wrap.classList.add("is-unsupported");
        if (txt) txt.textContent = t("audioStatusUnsupported");
        if (btn) { btn.disabled = true; btn.textContent = t("audioActivate"); }
      } else if (this.state.previewing) {
        wrap.classList.add("is-preview");
        if (txt) txt.textContent = t("audioStatusPreview");
        if (btn) btn.textContent = t("audioActivate");
      } else if (this.state.enabled) {
        wrap.classList.add("is-active");
        if (txt) txt.textContent = t("audioStatusActive");
        if (btn) { btn.disabled = false; btn.textContent = t("audioDeactivate"); }
      } else {
        if (txt) txt.textContent = t("audioStatusInactive");
        if (btn) { btn.disabled = false; btn.textContent = t("audioActivate"); }
      }
      if (stop) stop.hidden = !this.state.previewing;
    },

    renderNextCue() {
      const timeEl = $("#audio-next-time");
      const textEl = $("#audio-next-text");
      if (!timeEl || !textEl) return;
      const now = Date.now();
      const upcoming = ((window.APP_DATA && window.APP_DATA.audioCues) || [])
        .map((c) => ({ c, t: this.cueTimeMs(c) }))
        .filter((x) => x.t != null && x.t >= now)
        .sort((a, b) => a.t - b.t);
      if (!upcoming.length) {
        timeEl.textContent = "—";
        textEl.textContent = t("audioNoMoreCues");
        return;
      }
      const next = upcoming[0];
      timeEl.textContent = formatDelta(next.t - now);
      const fullText = this.cueText(next.c) || "";
      textEl.textContent = fullText.split(".")[0];
    },

    renderCueList() {
      const ul = $("#audio-cue-list");
      if (!ul) return;
      ul.innerHTML = "";
      const cues = (window.APP_DATA && window.APP_DATA.audioCues) || [];
      cues.forEach((cue) => {
        const ct = this.cueTimeMs(cue);
        const li = document.createElement("li");
        li.className = "audio-cue-item";
        if (this.state.fired.has(cue.id)) li.classList.add("is-fired");

        const code = document.createElement("span");
        code.className = "audio-cue-code";
        let label = cue.refPhase;
        if (cue.offsetSec) {
          label += (cue.offsetSec > 0 ? "+" : "") + cue.offsetSec + "s";
        }
        code.textContent = label;

        const time = document.createElement("span");
        time.className = "audio-cue-time";
        if (ct != null) {
          time.textContent = formatLocalHMS(ct);
        } else {
          time.textContent = "—";
        }

        const text = document.createElement("span");
        text.className = "audio-cue-text";
        text.textContent = this.cueText(cue) || "";

        li.appendChild(code);
        li.appendChild(time);
        li.appendChild(text);
        ul.appendChild(li);
      });
    }
  };

  // -----------------------------------------------------------
  // Meteorologia (Open-Meteo)
  // -----------------------------------------------------------
  // Cache em localStorage (plan-scoped):
  //   { leon:   { updatedAt: ISO, spots: { spotId: forecast | { error } } },
  //     caxado: { updatedAt: ISO, spots: { ... } } }
  function readMeteoCache() {
    if (state.meteoCache) return state.meteoCache;
    try {
      const raw = safeStorage.get(STORAGE_KEYS.meteo);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Aceita formato novo (plan-scoped); rejeita formato antigo.
        if (parsed && typeof parsed === "object" && !parsed.spots) {
          state.meteoCache = parsed;
          return state.meteoCache;
        }
      }
    } catch (e) { /* ignore */ }
    state.meteoCache = {};
    return state.meteoCache;
  }

  function writeMeteoCache(cache) {
    state.meteoCache = cache;
    safeStorage.set(STORAGE_KEYS.meteo, JSON.stringify(cache));
  }

  // Devolve a cache do plano ACTIVO (ou null se não existir ainda).
  function getCurrentMeteoCache() {
    const all = readMeteoCache() || {};
    return all[state.currentPlanId] || null;
  }

  function daysUntilEclipse() {
    const plan = getCurrentPlan();
    if (!plan.eclipse) return Infinity;
    const ecl = new Date(plan.eclipse.totalityStartUTC).getTime();
    return Math.ceil((ecl - Date.now()) / 86400000);
  }

  function renderMeteoDisclaimer() {
    const el = $("#meteo-disclaimer");
    if (!el) return;
    const days = daysUntilEclipse();
    if (days > window.APP_DATA.meteo.forecastHorizonDays) {
      const msg = t("weatherDaysAway").replace("{n}", days);
      el.textContent = `${t("weatherOutOfRange")} ${msg} ${t("weatherTryAgain")}`;
    } else if (days < 0) {
      el.textContent = "";
    } else {
      el.textContent = `${t("forecastFor")} ${window.APP_DATA.meteo.eclipseDateLocal}, ${String(window.APP_DATA.meteo.eclipseHourLocal).padStart(2,"0")}:00 (CEST).`;
    }
  }

  // Guarda do plano para descartar respostas se o utilizador trocou de plano
  // durante o fetch (race condition).
  let meteoRequestPlanId = null;

  async function refreshMeteo() {
    const btn = $("#btn-refresh-meteo");
    const status = $("#meteo-status");

    btn.disabled = true;
    btn.dataset.prev = btn.textContent;
    btn.textContent = t("weatherLoading");
    status.textContent = "";

    const startedAtPlan = state.currentPlanId;
    meteoRequestPlanId = startedAtPlan;

    const days = daysUntilEclipse();
    const outOfRange = days > window.APP_DATA.meteo.forecastHorizonDays;

    try {
      const planSpots = (getCurrentPlan().spots || []);
      const results = await Promise.all(
        planSpots.map((s) =>
          fetchSpotForecast(s).then(
            (data) => ({ id: s.id, data }),
            (err)  => ({ id: s.id, error: err.message || String(err) })
          )
        )
      );

      // Se o utilizador mudou de plano durante o fetch, ignorar resultados.
      if (state.currentPlanId !== startedAtPlan) {
        return;
      }

      const allCache = readMeteoCache() || {};
      allCache[startedAtPlan] = { updatedAt: new Date().toISOString(), spots: {} };
      results.forEach((r) => {
        allCache[startedAtPlan].spots[r.id] = r.error ? { error: r.error } : r.data;
      });
      writeMeteoCache(allCache);

      renderMeteo();

      const allFailed = results.every((r) => r.error);
      if (allFailed && outOfRange) {
        status.textContent = t("weatherOutOfRange");
      } else if (allFailed) {
        status.textContent = t("weatherError");
      }
    } catch (err) {
      console.warn("Meteo refresh failed:", err);
      if (state.currentPlanId === startedAtPlan) {
        status.textContent = t("weatherError");
      }
    } finally {
      if (state.currentPlanId === startedAtPlan) {
        btn.disabled = false;
        btn.textContent = btn.dataset.prev || t("refreshForecast");
      }
    }
  }

  async function fetchSpotForecast(spot) {
    const m = window.APP_DATA.meteo;
    const url = new URL(m.endpoint);
    url.searchParams.set("latitude",  String(spot.coords[0]));
    url.searchParams.set("longitude", String(spot.coords[1]));
    url.searchParams.set("hourly",    m.hourlyVars.join(","));
    url.searchParams.set("timezone",  m.timezone);
    url.searchParams.set("start_date", m.eclipseDateLocal);
    url.searchParams.set("end_date",   m.eclipseDateLocal);
    url.searchParams.set("windspeed_unit", "kmh");

    const res = await fetch(url.toString());
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body && body.reason) detail = body.reason;
      } catch (e) { /* ignore */ }
      throw new Error(detail);
    }
    const json = await res.json();
    return extractEclipseHour(json);
  }

  function extractEclipseHour(json) {
    if (!json || !json.hourly || !Array.isArray(json.hourly.time)) {
      throw new Error("Resposta inesperada do Open-Meteo");
    }
    const m = window.APP_DATA.meteo;
    const target = `${m.eclipseDateLocal}T${String(m.eclipseHourLocal).padStart(2,"0")}:00`;
    const idx = json.hourly.time.findIndex((t) => t === target);
    if (idx === -1) {
      throw new Error("Hora alvo não encontrada na resposta");
    }
    const pick = (k) => json.hourly[k] ? json.hourly[k][idx] : null;
    return {
      cloud_total: pick("cloud_cover"),
      cloud_low:   pick("cloud_cover_low"),
      cloud_mid:   pick("cloud_cover_mid"),
      cloud_high:  pick("cloud_cover_high"),
      temp:        pick("temperature_2m"),
      wind:        pick("wind_speed_10m"),
      precip:      pick("precipitation_probability"),
      visibility:  pick("visibility")
    };
  }

  // Classify weather data into a status + matrix mapping
  function classifyWeather(d) {
    const total = num(d.cloud_total);
    const low   = num(d.cloud_low);
    const mid   = num(d.cloud_mid);
    const high  = num(d.cloud_high);
    const precip = num(d.precip);
    const obstructive = low + mid; // low+mid block direct view

    if (precip > 60)
      return { key: "statusPoor",     mapTo: "clouds", color: "badge-warn" };
    if (total < 20 && obstructive < 15)
      return { key: "statusExcellent", mapTo: "clear",  color: "badge-ok" };
    if (obstructive < 25 && high > 30)
      return { key: "statusGood",      mapTo: "haze",   color: "badge-primary" };
    if (total < 40)
      return { key: "statusGood",      mapTo: "clear",  color: "badge-ok" };
    if (total < 70)
      return { key: "statusMarginal",  mapTo: "clouds", color: "badge-primary" };
    return { key: "statusPoor",        mapTo: "clouds", color: "badge-warn" };
  }

  function num(v) { return typeof v === "number" ? v : 0; }

  function renderMeteo() {
    const grid = $("#meteo-grid");
    const statusEl = $("#meteo-status");
    const suggestEl = $("#meteo-suggestion");
    if (!grid) return;
    grid.innerHTML = "";

    const cache = getCurrentMeteoCache();
    if (!cache || !cache.spots) {
      statusEl.textContent = `${t("lastUpdated")}: ${t("never")}`;
      suggestEl.classList.add("hidden");
      const empty = document.createElement("p");
      empty.className = "meteo-empty";
      empty.textContent = state.lang === "pt"
        ? "Sem dados ainda. Clica em 'Atualizar previsão'."
        : "No data yet. Click 'Refresh forecast'.";
      grid.appendChild(empty);
      return;
    }

    statusEl.textContent = `${t("lastUpdated")}: ${formatDateTime(cache.updatedAt)}`;

    const classifiedByCandidates = []; // for auto-suggestion
    const plan = getCurrentPlan();

    (plan.spots || []).forEach((spot) => {
      const data = cache.spots[spot.id];
      grid.appendChild(buildMeteoCard(spot, data, classifiedByCandidates));
    });

    // Auto-suggestion logic:
    //   - se há Spot Principal definido, usa a classificação desse spot
    //   - caso contrário, usa a média regional (todos os spots disponíveis)
    let chosenCls = null;
    let chosenLabel = "";
    const primaryId = currentPrimaryId();
    if (primaryId) {
      const c = classifiedByCandidates.find((c) => c.spotId === primaryId);
      if (c && c.cls) {
        chosenCls = c.cls;
        chosenLabel = state.lang === "pt"
          ? `com base no Spot Principal (${c.spotName})`
          : `based on your Primary Spot (${c.spotName})`;
      }
    }
    if (!chosenCls) {
      const valid = classifiedByCandidates.filter((c) => c.data);
      if (valid.length > 0) {
        const avg = {
          cloud_total: avgOf(valid, "cloud_total"),
          cloud_low:   avgOf(valid, "cloud_low"),
          cloud_mid:   avgOf(valid, "cloud_mid"),
          cloud_high:  avgOf(valid, "cloud_high"),
          precip:      avgOf(valid, "precip"),
          wind:        avgOf(valid, "wind")
        };
        chosenCls = classifyWeather(avg);
        chosenLabel = state.lang === "pt"
          ? `média regional (${valid.length} spots)`
          : `regional average (${valid.length} spots)`;
      }
    }

    if (chosenCls) {
      suggestEl.classList.remove("hidden");
      suggestEl.innerHTML = "";

      const text = document.createElement("p");
      text.className = "meteo-suggestion-text";
      const matrixLabel = ((plan.weatherOptions || []).find((o) => o.value === chosenCls.mapTo) || {}).label || chosenCls.mapTo;
      text.innerHTML =
        `<strong>${escape(t("weatherSuggestion"))}:</strong> ${escape(matrixLabel)} ` +
        `<span class="meteo-suggestion-note">(${escape(t(chosenCls.key))} — ${escape(chosenLabel)})</span>`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary";
      btn.textContent = t("applySuggestion");
      btn.addEventListener("click", () => applyAutoSuggestion(chosenCls.mapTo));

      suggestEl.appendChild(text);
      suggestEl.appendChild(btn);
    } else {
      suggestEl.classList.add("hidden");
    }
  }

  function avgOf(list, key) {
    let n = 0, sum = 0;
    list.forEach((it) => {
      const v = it.data ? it.data[key] : null;
      if (typeof v === "number") { sum += v; n++; }
    });
    return n > 0 ? sum / n : 0;
  }

  function buildMeteoCard(spot, data, accum) {
    const card = document.createElement("article");
    card.className = "card meteo-card";

    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = spot.name;
    header.appendChild(title);

    const badges = document.createElement("div");
    badges.className = "badges";

    if (!data || data.error) {
      badges.appendChild(makeBadge("—", "badge-warn"));
      header.appendChild(badges);
      card.appendChild(header);

      const err = document.createElement("p");
      err.className = "meteo-error";
      err.textContent = data && data.error ? data.error : t("weatherError");
      card.appendChild(err);

      accum.push({ spotId: spot.id, spotName: spot.name, cls: null, score: 999, data: null });
      return card;
    }

    const cls = classifyWeather(data);
    badges.appendChild(makeBadge(t(cls.key), cls.color));
    header.appendChild(badges);
    card.appendChild(header);

    const summary = document.createElement("p");
    summary.className = "meteo-summary";
    summary.textContent =
      `${t("forecastFor")} ${window.APP_DATA.meteo.eclipseDateLocal}, ` +
      `${String(window.APP_DATA.meteo.eclipseHourLocal).padStart(2,"0")}:00 (CEST)`;
    card.appendChild(summary);

    const dl = document.createElement("dl");
    dl.className = "meteo-stats";
    appendStat(dl, t("cloudTotal"),     fmtPercent(data.cloud_total));
    appendStat(dl, t("cloudLow"),       fmtPercent(data.cloud_low));
    appendStat(dl, t("cloudMid"),       fmtPercent(data.cloud_mid));
    appendStat(dl, t("cloudHigh"),      fmtPercent(data.cloud_high));
    appendStat(dl, t("temperature"),    fmtTemp(data.temp));
    appendStat(dl, t("wind"),           fmtWind(data.wind));
    appendStat(dl, t("precipitation"),  fmtPercent(data.precip));
    appendStat(dl, t("visibility"),     fmtVisibility(data.visibility));
    card.appendChild(dl);

    accum.push({
      spotId: spot.id,
      spotName: spot.name,
      cls: cls,
      data: data,
      score: num(data.cloud_low) + num(data.cloud_mid) + 0.5 * num(data.cloud_high)
    });

    return card;
  }

  function appendStat(dl, term, value) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    dl.appendChild(row);
  }

  function fmtPercent(v) { return v == null ? "—" : `${Math.round(v)}%`; }
  function fmtTemp(v)    { return v == null ? "—" : `${Math.round(v)} °C`; }
  function fmtWind(v)    { return v == null ? "—" : `${Math.round(v)} km/h`; }
  function fmtVisibility(v) {
    if (v == null) return "—";
    if (v >= 1000) return `${Math.round(v / 1000)} km`;
    return `${Math.round(v)} m`;
  }
  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) { return iso; }
  }

  // -----------------------------------------------------------
  // Histórico meteorológico (10 anos) — Open-Meteo Archive
  // -----------------------------------------------------------
  // Cache em localStorage (plan-scoped):
  //   { leon:   { updatedAt: ISO,
  //               spots: { spotId: { years: [{ year, cloud_total, cloud_low, cloud_mid,
  //                                             cloud_high, temp, wind, precip,
  //                                             error? }] | { error } } } },
  //     caxado: { ... } }
  function readHistoryCache() {
    if (state.historyCache) return state.historyCache;
    try {
      const raw = safeStorage.get(STORAGE_KEYS.history);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.historyCache = parsed;
          return state.historyCache;
        }
      }
    } catch (e) { /* ignore */ }
    state.historyCache = {};
    return state.historyCache;
  }

  function writeHistoryCache(cache) {
    state.historyCache = cache;
    try {
      safeStorage.set(STORAGE_KEYS.history, JSON.stringify(cache));
    } catch (e) { /* quota? ignore */ }
  }

  function getCurrentHistoryCache() {
    const all = readHistoryCache() || {};
    return all[state.currentPlanId] || null;
  }

  // Anos a consultar: (eclipseYear - yearsBack) .. (eclipseYear - 1)
  function historyYears() {
    const h = window.APP_DATA.historyMeteo;
    if (!h) return [];
    const out = [];
    for (let i = h.yearsBack; i >= 1; i--) {
      out.push(h.eclipseYear - i);
    }
    return out;
  }

  async function fetchSpotHistoryYear(spot, year) {
    const h = window.APP_DATA.historyMeteo;
    const dateStr = `${year}-${h.monthDay}`;
    const url = new URL(h.endpoint);
    url.searchParams.set("latitude",  String(spot.coords[0]));
    url.searchParams.set("longitude", String(spot.coords[1]));
    url.searchParams.set("start_date", dateStr);
    url.searchParams.set("end_date",   dateStr);
    url.searchParams.set("hourly",     h.hourlyVars.join(","));
    url.searchParams.set("timezone",   h.timezone);
    url.searchParams.set("windspeed_unit", "kmh");

    const res = await fetch(url.toString());
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body && body.reason) detail = body.reason;
      } catch (e) { /* ignore */ }
      throw new Error(detail);
    }
    const json = await res.json();
    if (!json || !json.hourly || !Array.isArray(json.hourly.time)) {
      throw new Error("Resposta inesperada");
    }
    const target = `${dateStr}T${String(h.hourLocal).padStart(2,"0")}:00`;
    let idx = json.hourly.time.findIndex((t) => t === target);
    if (idx === -1) {
      // Fallback: alguns dias o índice 20 corresponde a 20:00 quando há shift
      // por DST; usa directamente o índice da hora alvo se a lista tiver 24
      // entradas.
      if (json.hourly.time.length >= h.hourLocal + 1) idx = h.hourLocal;
      else throw new Error("Hora alvo não encontrada");
    }
    const pick = (k) => json.hourly[k] ? json.hourly[k][idx] : null;
    return {
      year,
      cloud_total: pick("cloud_cover"),
      cloud_low:   pick("cloud_cover_low"),
      cloud_mid:   pick("cloud_cover_mid"),
      cloud_high:  pick("cloud_cover_high"),
      temp:        pick("temperature_2m"),
      wind:        pick("wind_speed_10m"),
      precip:      pick("precipitation")
    };
  }

  async function fetchSpotHistory(spot) {
    const years = historyYears();
    const results = await Promise.all(years.map((y) =>
      fetchSpotHistoryYear(spot, y).catch((e) => ({ year: y, error: e.message || String(e) }))
    ));
    return { years: results };
  }

  // Race guard: capture planId at fetch start; discard if user switched plans.
  let historyRequestPlanId = null;

  async function refreshHistory() {
    const btn = $("#btn-load-history");
    const status = $("#history-status");
    if (!btn) return;

    btn.disabled = true;
    btn.dataset.prev = btn.textContent;
    btn.textContent = t("historyLoading");
    if (status) status.textContent = t("historyLoading");

    const planId = state.currentPlanId;
    historyRequestPlanId = planId;

    const plan = window.APP_DATA.plans[planId];
    const spots = (plan && plan.spots) ? plan.spots : [];

    try {
      const results = await Promise.all(spots.map((s) =>
        fetchSpotHistory(s).catch((e) => ({ error: e.message || String(e) }))
      ));

      // Se o plano foi trocado entretanto, descarta o resultado.
      if (historyRequestPlanId !== planId) {
        return;
      }

      const cache = readHistoryCache() || {};
      cache[planId] = {
        updatedAt: new Date().toISOString(),
        spots: spots.reduce((acc, s, i) => { acc[s.id] = results[i]; return acc; }, {})
      };
      writeHistoryCache(cache);
      renderHistory();
      if (status) {
        const updated = formatDateTime(cache[planId].updatedAt);
        status.textContent = `${t("lastUpdated")}: ${updated}`;
      }
    } catch (e) {
      if (status) status.textContent = t("historyError");
    } finally {
      // só reactiva se ainda estamos no plano original
      if (historyRequestPlanId === planId) {
        btn.disabled = false;
        btn.textContent = btn.dataset.prev || t("loadHistory");
      } else {
        btn.disabled = false;
        btn.textContent = t("loadHistory");
      }
    }
  }

  function classifyHistoryYear(cloudTotal, thresholds) {
    if (cloudTotal == null || isNaN(cloudTotal)) return "is-pending";
    if (cloudTotal < thresholds.clear) return "is-clear";
    if (cloudTotal < thresholds.marginal) return "is-marginal";
    return "is-cloudy";
  }

  function renderHistory() {
    const grid = $("#history-grid");
    const status = $("#history-status");
    if (!grid) return;

    grid.innerHTML = "";

    const planCache = getCurrentHistoryCache();
    const plan = getCurrentPlan();
    const spots = (plan && plan.spots) ? plan.spots : [];

    // Update the button label (in case language changed).
    const btn = $("#btn-load-history");
    if (btn && !btn.disabled) btn.textContent = t("loadHistory");

    // Status line (last update OR empty hint).
    if (status) {
      if (planCache && planCache.updatedAt) {
        status.textContent = `${t("lastUpdated")}: ${formatDateTime(planCache.updatedAt)}`;
      } else {
        status.textContent = t("historyEmpty");
      }
    }

    if (!spots.length) return;

    const h = window.APP_DATA.historyMeteo;
    const years = historyYears();

    spots.forEach((spot) => {
      const card = document.createElement("article");
      card.className = "card history-card";

      const title = document.createElement("h3");
      title.textContent = spot.name;
      card.appendChild(title);

      // Either render bars from cache, or render pending placeholders.
      const cacheEntry = planCache && planCache.spots ? planCache.spots[spot.id] : null;

      if (cacheEntry && cacheEntry.error) {
        const err = document.createElement("p");
        err.className = "history-error";
        err.textContent = `${t("historyError")} (${cacheEntry.error})`;
        card.appendChild(err);
        grid.appendChild(card);
        return;
      }

      const yearsData = cacheEntry && Array.isArray(cacheEntry.years) ? cacheEntry.years : null;

      // Stats line (computed only with valid entries).
      const stats = document.createElement("p");
      stats.className = "history-stats";

      if (yearsData) {
        const valid = yearsData.filter((y) => y && !y.error && typeof y.cloud_total === "number");
        const clearN    = valid.filter((y) => y.cloud_total <  h.thresholds.clear).length;
        const marginalN = valid.filter((y) => y.cloud_total >= h.thresholds.clear && y.cloud_total < h.thresholds.marginal).length;
        const cloudyN   = valid.filter((y) => y.cloud_total >= h.thresholds.marginal).length;
        const avg = valid.length ? Math.round(valid.reduce((a, y) => a + y.cloud_total, 0) / valid.length) : null;

        const s1 = document.createElement("span");
        s1.className = "history-stat" + (clearN >= 6 ? " is-good" : (clearN <= 2 ? " is-bad" : ""));
        s1.innerHTML = `<strong>${clearN}</strong>/${valid.length} ${escape(t("historySuccessRate"))}`;
        stats.appendChild(s1);

        if (avg != null) {
          const s2 = document.createElement("span");
          s2.className = "history-stat";
          s2.innerHTML = `${escape(t("historyAvgCloud"))}: <strong>${avg}%</strong>`;
          stats.appendChild(s2);
        }

        const s3 = document.createElement("span");
        s3.className = "history-stat";
        s3.textContent = `${marginalN} ${t("historyMarginalYears")} · ${cloudyN} ${t("historyCloudyYears")}`;
        stats.appendChild(s3);

        const s4 = document.createElement("span");
        s4.className = "history-stat history-hour-label";
        s4.textContent = t("historyHourLabel");
        stats.appendChild(s4);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "history-stat";
        placeholder.textContent = t("historyEmpty");
        stats.appendChild(placeholder);
      }
      card.appendChild(stats);

      // Bars row (one per year).
      const bars = document.createElement("div");
      bars.className = "history-bars";

      years.forEach((y) => {
        const entry = yearsData ? yearsData.find((d) => d && d.year === y) : null;
        const bar = document.createElement("div");
        bar.className = "history-bar";

        const fill = document.createElement("div");
        fill.className = "history-bar-fill";

        if (!entry) {
          bar.classList.add("is-pending");
          fill.textContent = "—";
        } else if (entry.error) {
          bar.classList.add("is-error");
          fill.textContent = "!";
          bar.title = entry.error;
        } else {
          const cls = classifyHistoryYear(entry.cloud_total, h.thresholds);
          bar.classList.add(cls);
          fill.textContent = (entry.cloud_total == null) ? "?" : `${Math.round(entry.cloud_total)}%`;
          // Tooltip with breakdown.
          const parts = [`${y}`, `cloud ${Math.round(entry.cloud_total)}%`];
          if (typeof entry.cloud_low === "number")  parts.push(`low ${Math.round(entry.cloud_low)}%`);
          if (typeof entry.cloud_mid === "number")  parts.push(`mid ${Math.round(entry.cloud_mid)}%`);
          if (typeof entry.cloud_high === "number") parts.push(`high ${Math.round(entry.cloud_high)}%`);
          if (typeof entry.temp === "number")  parts.push(`T ${Math.round(entry.temp)}°C`);
          if (typeof entry.wind === "number")  parts.push(`wind ${Math.round(entry.wind)} km/h`);
          if (typeof entry.precip === "number" && entry.precip > 0) parts.push(`precip ${entry.precip} mm`);
          bar.title = parts.join(" · ");
        }

        const yr = document.createElement("div");
        yr.className = "history-bar-year";
        yr.textContent = String(y);

        bar.appendChild(fill);
        bar.appendChild(yr);
        bars.appendChild(bar);
      });
      card.appendChild(bars);

      grid.appendChild(card);
    });
  }

  function applyAutoSuggestion(matrixValue) {
    const sel = $("#weather-select");
    if (!sel) return;
    const valid = Array.from(sel.options).some((o) => o.value === matrixValue);
    if (!valid) return;
    sel.value = matrixValue;
    state.weatherByPlan[state.currentPlanId] = matrixValue;
    writeJSON(STORAGE_KEYS.weatherByPlan, state.weatherByPlan);
    updateWeatherRecommendation();
    highlightDecisionRow();
    // Scroll to plan section so user sees the effect
    const plan = $("#section-plan");
    if (plan && plan.scrollIntoView) plan.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(state.lang === "pt" ? "Matriz atualizada." : "Matrix updated.");
  }

  // -----------------------------------------------------------
  // Util: clipboard + toast + escape
  // -----------------------------------------------------------
  function copyToClipboard(text) {
    const done = () => showToast(t("copied"));

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(legacyCopy);
    } else {
      legacyCopy();
    }
    function legacyCopy() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 1800);
  }

  function escape(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
