(function () {
  const dataset = window.seedDataset;
  const allBanks = Array.from(new Set(dataset.events.map((event) => event.institution)));
  const assetPinRank = new Map(
    [
      "黄金",
      "白银",
      "铜",
      "原油",
      "布伦特原油",
      "LNG",
      "欧洲天然气",
      "美国天然气",
      "柴油",
      "大宗商品",
      "原油波动率",
      "美元",
      "欧元",
      "离岸人民币",
      "人民币",
      "日元",
      "英镑",
      "瑞郎",
      "澳元",
      "高beta货币",
      "美债10年",
      "美国10年期国债",
      "美债2年",
      "30年美债",
      "美国TIPS",
      "欧元区国债",
      "日本国债",
      "英国前端利率",
      "英国长久期国债",
      "发达市场前端利率",
      "利率波动率",
    ].map((asset, index) => [asset, index]),
  );
  const assetCategories = [
    { id: "all", label: "全部" },
    { id: "metals", label: "贵金属" },
    { id: "energy", label: "能源大宗" },
    { id: "fx", label: "外汇" },
    { id: "rates", label: "利率债" },
    { id: "equity", label: "股票指数" },
    { id: "credit", label: "信用" },
    { id: "other", label: "其他" },
  ];
  const allAssets = Array.from(
    new Set(dataset.events.flatMap((event) => event.signals.map((signal) => signal.asset))),
  ).sort(byAssetPriority);
  const themeButtons = Array.from(document.querySelectorAll("[data-theme]"));

  const state = {
    theme: "全部",
    window: "all",
    date: "全部",
    bank: "全部",
    assetCategory: "all",
    assetPickerOpen: false,
    assetQuery: "",
    shiftsExpanded: false,
    eventId: dataset.events[0]?.id || null,
    signalAsset: dataset.events[0]?.signals[0]?.asset || null,
  };
  let tapeSignature = "";

  function byDateDesc(a, b) {
    return new Date(b.date) - new Date(a.date);
  }

  function assetCategoryPriority(asset) {
    if (assetPinRank.has(asset)) {
      return 0;
    }

    if (/黄金|白银|铜|贵金属|铂|钯/.test(asset)) {
      return 1;
    }

    if (/原油|布伦特|LNG|天然气|柴油|大宗商品|能源|金属|矿业/.test(asset)) {
      return 2;
    }

    if (/美元|欧元|人民币|日元|英镑|瑞郎|澳元|高beta货币|离岸人民币/.test(asset)) {
      return 3;
    }

    if (/美债|国债|TIPS|前端利率|利率波动率|久期/.test(asset)) {
      return 4;
    }

    if (/信用|杠杆贷款|私募信贷|BDC/.test(asset)) {
      return 6;
    }

    if (/股票|股|标普|罗素|消费|航空|需求|AI/.test(asset)) {
      return 5;
    }

    return 7;
  }

  function byAssetPriority(left, right) {
    const leftPinned = assetPinRank.get(left);
    const rightPinned = assetPinRank.get(right);

    if (leftPinned !== undefined || rightPinned !== undefined) {
      if (leftPinned === undefined) {
        return 1;
      }

      if (rightPinned === undefined) {
        return -1;
      }

      return leftPinned - rightPinned;
    }

    const categoryGap = assetCategoryPriority(left) - assetCategoryPriority(right);
    if (categoryGap !== 0) {
      return categoryGap;
    }

    return left.localeCompare(right, "zh-CN");
  }

  function directionCopy(direction) {
    switch (direction) {
      case "bullish":
        return "看多";
      case "bearish":
        return "看空";
      default:
        return "中性";
    }
  }

  function directionShortCopy(direction) {
    switch (direction) {
      case "bullish":
        return "多";
      case "bearish":
        return "空";
      default:
        return "中";
    }
  }

  function directionClass(direction) {
    switch (direction) {
      case "bullish":
        return "bullish";
      case "bearish":
        return "bearish";
      default:
        return "neutral";
    }
  }

  function directionToneClass(direction) {
    switch (direction) {
      case "bullish":
        return "dir-bullish";
      case "bearish":
        return "dir-bearish";
      default:
        return "dir-neutral";
    }
  }

  function directionValue(direction) {
    switch (direction) {
      case "bullish":
        return 1;
      case "bearish":
        return -1;
      default:
        return 0;
    }
  }

  function movementCopy(type) {
    switch (type) {
      case "shift":
        return "转向";
      case "reinforce":
        return "强化";
      default:
        return "维持";
    }
  }

  function movementPriority(type) {
    switch (type) {
      case "shift":
        return 3;
      case "reinforce":
        return 2;
      default:
        return 1;
    }
  }

  function byDateStringDesc(left, right) {
    return new Date(right) - new Date(left);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function localizeText(value) {
    return String(value)
      .replaceAll("CIO Alert", "首席投资官提示")
      .replaceAll("Oil Tracker", "原油追踪")
      .replaceAll("FX Trader Call", "外汇交易员电话会")
      .replaceAll("Rates Vol", "利率波动率")
      .replaceAll("Global Credit Trader", "全球信用交易台")
      .replaceAll("US Market Intell", "美国市场情报")
      .replaceAll("Top of Mind", "核心关注")
      .replaceAll("G10 FX", "G10外汇")
      .replaceAll("Hormuz", "霍尔木兹海峡")
      .replaceAll("Bab al-Mandeb", "曼德海峡")
      .replaceAll("Ras Laffan", "拉斯拉凡")
      .replace(/relief rally/gi, "缓和反弹")
      .replace(/\bheadlines\b/gi, "消息面")
      .replace(/\bheadline\b/gi, "消息面")
      .replace(/\brisk-off\b/gi, "避险收缩")
      .replace(/high beta/gi, "高贝塔")
      .replaceAll("高beta", "高贝塔")
      .replaceAll("LNG", "液化天然气")
      .replaceAll("美国TIPS", "美国通胀保值国债")
      .replace(/\bTIPS\b/g, "通胀保值国债")
      .replaceAll("美国IG信用", "美国投资级信用")
      .replace(/\bIG信用\b/g, "投资级信用")
      .replace(/\bHY信用\b/g, "高收益信用");
  }

  function displayText(value) {
    return escapeHtml(localizeText(value));
  }

  function searchableText(value) {
    return localizeText(value).toLowerCase();
  }

  function getThemeBaseEvents() {
    if (state.theme === "全部") {
      return dataset.events;
    }

    return dataset.events.filter((event) => event.theme === state.theme);
  }

  function getAssetCategoryId(asset) {
    if (/黄金|白银|铜|贵金属|铂|钯/.test(asset)) {
      return "metals";
    }

    if (/原油|布伦特|LNG|天然气|柴油|大宗商品|能源|波动率|金属|矿业/.test(asset)) {
      return "energy";
    }

    if (/美元|欧元|人民币|日元|英镑|瑞郎|澳元|高beta货币|离岸人民币/.test(asset)) {
      return "fx";
    }

    if (/美债|国债|TIPS|前端利率|利率波动率|久期/.test(asset)) {
      return "rates";
    }

    if (/信用|杠杆贷款|私募信贷|BDC/.test(asset)) {
      return "credit";
    }

    if (/股票|股|标普|罗素|消费|航空|需求|AI/.test(asset)) {
      return "equity";
    }

    return "other";
  }

  function matchesAssetCategory(asset) {
    return state.assetCategory === "all" || getAssetCategoryId(asset) === state.assetCategory;
  }

  function matchesAsset(event, query) {
    const term = query.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return event.signals.some(
      (signal) => signal.asset.toLowerCase().includes(term) || searchableText(signal.asset).includes(term),
    );
  }

  function getScopeBaseEvents() {
    const baseEvents = getThemeBaseEvents();

    if (!state.assetQuery.trim()) {
      return baseEvents;
    }

    return baseEvents.filter((event) => matchesAsset(event, state.assetQuery));
  }

  function getVisibleAssets() {
    const term = state.assetQuery.trim().toLowerCase();
    return allAssets.filter(
      (asset) => !term || asset.toLowerCase().includes(term) || searchableText(asset).includes(term),
    );
  }

  function buildAssetSections(visibleAssets) {
    if (!visibleAssets.length) {
      return `<div class="hero-asset-empty">当前没有匹配资产，换个关键词试试。</div>`;
    }

    const visibleSet = new Set(visibleAssets);
    const categoriesToRender = assetCategories.filter((category) => category.id !== "all");

    const sections = categoriesToRender
      .map((category) => {
        const assets = allAssets.filter(
          (asset) => visibleSet.has(asset) && getAssetCategoryId(asset) === category.id,
        );

        if (!assets.length) {
          return "";
        }

        return `
          <section class="hero-asset-section">
            <div class="hero-asset-section-head">
              <span>${category.label}</span>
              <em>${assets.length}</em>
            </div>
            <div class="hero-asset-option-list">
              ${assets
                .map(
                  (asset) => `
                    <button
                      class="hero-asset-chip ${state.assetQuery === asset ? "active" : ""}"
                      type="button"
                      data-asset-value="${escapeHtml(asset)}"
                    >
                      ${displayText(asset)}
                    </button>
                  `,
                )
                .join("")}
            </div>
          </section>
        `;
      })
      .filter(Boolean)
      .join("");

    return sections || `<div class="hero-asset-empty">当前分类下没有可展示资产。</div>`;
  }

  function withinDays(date, anchor, days) {
    const current = new Date(date);
    const reference = new Date(anchor);
    current.setHours(0, 0, 0, 0);
    reference.setHours(0, 0, 0, 0);
    const diff = Math.round((reference - current) / 86400000);
    return diff >= 0 && diff < days;
  }

  function getThemeEvents() {
    const baseEvents = getScopeBaseEvents();
    const anchorDate = dataset.source.snapshotDate || dataset.events[0]?.date || new Date();
    let scopedByDate = baseEvents;

    if (state.window === "day") {
      scopedByDate =
        state.date === "全部"
          ? baseEvents
          : baseEvents.filter((event) => event.date === state.date);
    } else if (state.window === "7d") {
      scopedByDate = baseEvents.filter((event) => withinDays(event.date, anchorDate, 7));
    } else if (state.window === "30d") {
      scopedByDate = baseEvents.filter((event) => withinDays(event.date, anchorDate, 30));
    }

    return [...scopedByDate].sort(byDateDesc);
  }

  function getAvailableDates() {
    return Array.from(new Set(getScopeBaseEvents().map((event) => event.date))).sort(
      byDateStringDesc,
    );
  }

  function getScopedEvents(themeEvents) {
    if (state.bank === "全部") {
      return themeEvents;
    }

    return themeEvents.filter((event) => event.institution === state.bank);
  }

  function getSelectedEvent(events) {
    return events.find((event) => event.id === state.eventId) || events[0] || null;
  }

  function getSelectedSignal(event) {
    if (!event || !event.signals.length) {
      return null;
    }

    return (
      event.signals.find((signal) => signal.asset === state.signalAsset) ||
      event.signals[0]
    );
  }

  function aggregateAssets(events) {
    const bucket = new Map();

    events.forEach((event) => {
      event.signals.forEach((signal) => {
        const current = bucket.get(signal.asset) || {
          asset: signal.asset,
          mentions: 0,
          scoreTotal: 0,
          biasTotal: 0,
        };

        current.mentions += 1;
        current.scoreTotal += signal.score;
        current.biasTotal += directionValue(signal.direction);
        bucket.set(signal.asset, current);
      });
    });

    return Array.from(bucket.values())
      .map((item) => ({
        ...item,
        avgScore: Math.round(item.scoreTotal / item.mentions),
        avgBias: item.biasTotal / item.mentions,
      }))
      .sort((a, b) => {
        const left = b.mentions * 100 + b.avgScore;
        const right = a.mentions * 100 + a.avgScore;
        return left - right;
      });
  }

  function getBiasDirection(avgBias) {
    if (avgBias > 0.25) {
      return "bullish";
    }
    if (avgBias < -0.25) {
      return "bearish";
    }
    return "neutral";
  }

  function flattenSignals(events) {
    return events.flatMap((event) =>
      event.signals.map((signal) => ({
        ...signal,
        eventId: event.id,
        institution: event.institution,
        theme: event.theme,
        date: event.date,
      })),
    );
  }

  function getBankSummary(themeEvents) {
    return allBanks
      .map((institution) => {
        const bankEvents = themeEvents.filter((event) => event.institution === institution);
        const topSignal = bankEvents
          .flatMap((event) => event.signals)
          .sort((a, b) => b.score - a.score)[0];

        return {
          institution,
          events: bankEvents.length,
          avgScore: bankEvents.length
            ? Math.round(
                bankEvents.reduce((sum, event) => sum + event.conviction, 0) /
                  bankEvents.length,
              )
            : 0,
          leadSignal: topSignal ? topSignal.asset : "空白",
        };
      })
      .sort((a, b) => b.events - a.events || b.avgScore - a.avgScore);
  }

  function getSignalMix(events) {
    return flattenSignals(events).reduce(
      (acc, signal) => {
        acc[signal.direction] += 1;
        return acc;
      },
      { bullish: 0, bearish: 0, neutral: 0 },
    );
  }

  function getShiftRecords(events) {
    const historyByPair = new Map();

    [...events]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((event) => {
        event.signals.forEach((signal) => {
          const key = `${event.institution}::${signal.asset}`;
          const history = historyByPair.get(key) || [];

          history.push({
            ...signal,
            institution: event.institution,
            date: event.date,
            title: event.title,
            type: event.type,
            theme: event.theme,
          });

          historyByPair.set(key, history);
        });
      });

    return Array.from(historyByPair.values())
      .filter((history) => history.length > 1)
      .map((history) => {
        const previous = history[history.length - 2];
        const current = history[history.length - 1];
        const scoreDelta = current.score - previous.score;
        let movementType = "hold";

        if (previous.direction !== current.direction) {
          movementType = "shift";
        } else if (scoreDelta >= 4) {
          movementType = "reinforce";
        }

        return {
          id: `${current.institution}::${current.asset}`,
          institution: current.institution,
          asset: current.asset,
          type: movementType,
          previous,
          current,
          scoreDelta,
        };
      })
      .sort(
        (left, right) =>
          byDateDesc(left.current, right.current) ||
          movementPriority(right.type) - movementPriority(left.type) ||
          Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta) ||
          right.current.score - left.current.score,
      );
  }

  function ensureSelection() {
    if (state.window === "day") {
      const availableDates = getAvailableDates();
      if (!availableDates.length) {
        state.eventId = null;
        state.signalAsset = null;
        return { themeEvents: [], scopedEvents: [], selectedEvent: null };
      }

      if (!availableDates.includes(state.date)) {
        state.date = availableDates[0];
      }
    }

    const themeEvents = getThemeEvents();

    if (state.bank !== "全部" && !themeEvents.some((event) => event.institution === state.bank)) {
      state.bank = "全部";
    }

    const scopedEvents = getScopedEvents(themeEvents);
    const fallback = scopedEvents[0] || themeEvents[0] || null;

    if (!fallback) {
      state.eventId = null;
      state.signalAsset = null;
      return { themeEvents, scopedEvents, selectedEvent: null };
    }

    const selectedEvent = getSelectedEvent(scopedEvents) || fallback;
    state.eventId = selectedEvent.id;

    const selectedSignal = getSelectedSignal(selectedEvent);
    state.signalAsset = selectedSignal?.asset || null;

    return { themeEvents, scopedEvents, selectedEvent };
  }

  function render() {
    const { themeEvents, scopedEvents, selectedEvent } = ensureSelection();
    renderHero(themeEvents, scopedEvents, selectedEvent);
    renderTape(themeEvents);
    renderHeatZone(themeEvents);
    renderMatrix(themeEvents);
    renderShifts(themeEvents);
    renderRailBankFilter(themeEvents);
    renderEventRail(scopedEvents, selectedEvent);
    renderFocus(selectedEvent);
    renderTradePanel(selectedEvent);
    syncThemeButtons();
  }

  function renderHero(themeEvents, scopedEvents, selectedEvent) {
    const container = document.getElementById("hero-metrics");
    const latestEvent = scopedEvents[0] || themeEvents[0] || null;
    const strongestSignal =
      flattenSignals(scopedEvents).sort((a, b) => b.score - a.score)[0] || null;
    const scopedAssets = aggregateAssets(scopedEvents);
    const dominantAsset = scopedAssets[0] || null;
    const mix = getSignalMix(scopedEvents);
    const scopedBanks = new Set(scopedEvents.map((event) => event.institution));
    const availableDates = getAvailableDates();
    const dateOptions = availableDates
      .map(
        (date) =>
          `<option value="${date}" ${state.date === date ? "selected" : ""}>${date}</option>`,
      )
      .join("");
    const windowButtons = [
      { value: "all", label: "全部" },
      { value: "7d", label: "7天" },
      { value: "30d", label: "30天" },
      { value: "day", label: "单日" },
    ]
      .map(
        (item) => `
          <button class="hero-window-chip ${state.window === item.value ? "active" : ""}" data-window="${item.value}">
            ${item.label}
          </button>
        `,
      )
      .join("");
    const latestTitle = latestEvent ? latestEvent.title : "当前范围暂无更新";
    const latestSummary = latestEvent
      ? latestEvent.summary
      : "当前筛选条件下还没有匹配到事件。";
    const focusTitle = selectedEvent ? selectedEvent.takeaway : "当前范围没有匹配事件";
    const focusQuote = selectedEvent
      ? selectedEvent.quote
      : state.assetQuery
        ? `没有找到与“${escapeHtml(state.assetQuery)}”相关的事件，换个资产名或放宽时间范围试试。`
        : "可以先切换时间范围、银行，或者输入资产关键词查看相关观点。";
    const visibleAssets = getVisibleAssets();
    const assetSections = buildAssetSections(visibleAssets);
    const scopeChip = state.assetQuery
      ? `<span class="hero-scope-chip">资产 ${displayText(state.assetQuery)}</span>`
      : "";

    container.innerHTML = `
      <article class="hero-brand-card">
        <span class="label">头部投行观点追踪</span>
        <h1>投行 <span>观点雷达</span></h1>
        <div class="hero-card-meta">
          <span>${state.bank === "全部" ? "全部银行" : state.bank}</span>
          <span>${scopedEvents.length}条事件 · ${scopedBanks.size}家机构</span>
        </div>
        <div class="hero-filter-stack">
          <label class="hero-search-field ${state.assetPickerOpen ? "is-open" : ""}">
            <span class="hero-filter-label">资产</span>
            <span class="hero-search-shell">
              <input
                class="hero-asset-search"
                type="search"
                value="${escapeHtml(state.assetQuery)}"
                placeholder="点击展开资产面板，如 黄金 / 原油 / 美元"
              />
              ${
                state.assetQuery
                  ? '<button class="hero-search-clear" type="button" data-clear-asset>清空</button>'
                  : ""
              }
            </span>
            <div class="hero-asset-picker">
              <div class="hero-asset-picker-head">
                <strong>资产面板</strong>
                <span>共${visibleAssets.length}项</span>
              </div>
              <div class="hero-asset-picker-body single-column">
                <div class="hero-asset-column">${assetSections}</div>
              </div>
            </div>
          </label>
          <div class="hero-filter-group">
            <span class="hero-filter-label">时间</span>
            <div class="hero-window-stack">
              <div class="hero-window-filter">${windowButtons}</div>
              ${
                state.window === "day"
                  ? `
                    <label class="hero-date-field inline-date-field">
                      <span class="hero-date-shell">
                        <select class="hero-date-select" data-date-filter>
                          ${dateOptions}
                        </select>
                        <span class="hero-date-arrow">▾</span>
                      </span>
                    </label>
                  `
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="hero-scope-row">
          ${scopeChip}
          <span class="hero-scope-chip">${dominantAsset ? `主轴 ${displayText(dominantAsset.asset)}` : "暂无主轴"}</span>
        </div>
      </article>
      <article class="hero-data-card hero-latest-card">
        <span class="label">最新更新</span>
        <h3>${displayText(latestTitle)}</h3>
        <p>${displayText(latestSummary)}</p>
        <div class="hero-card-meta">
          <span>${latestEvent ? `${latestEvent.institution} · ${latestEvent.theme}` : "当前范围"}</span>
          <span>${latestEvent ? latestEvent.date : "暂无"}</span>
        </div>
      </article>
      <article class="hero-data-card hero-signal-card">
        <span class="label">最强信号</span>
        <strong>${strongestSignal ? displayText(strongestSignal.asset) : "暂无信号"}</strong>
        <span class="hero-card-line">
          ${
            strongestSignal
              ? `${strongestSignal.institution} · ${directionCopy(strongestSignal.direction)} · ${strongestSignal.score}`
              : "调整筛选条件后再看最强信号"
          }
        </span>
      </article>
      <article class="hero-data-card hero-mix-card">
        <span class="label">多空分布</span>
        <div class="hero-split">
          <span class="split-bull">
            <em>多</em>
            <strong>${mix.bullish}</strong>
          </span>
          <span class="split-bear">
            <em>空</em>
            <strong>${mix.bearish}</strong>
          </span>
          <span class="split-flat">
            <em>中</em>
            <strong>${mix.neutral}</strong>
          </span>
        </div>
      </article>
      <article class="hero-data-card hero-focus-card">
        <div class="hero-focus-main">
          <span class="label">当前焦点</span>
          <h3>${displayText(focusTitle)}</h3>
          <p>${displayText(focusQuote)}</p>
        </div>
        <div class="hero-focus-side">
          <div class="hero-kpis">
            <span class="hero-kpi">
              <em>成色</em>
              <strong>${selectedEvent ? selectedEvent.conviction : "—"}</strong>
            </span>
            <span class="hero-kpi">
              <em>增量</em>
              <strong>${selectedEvent ? selectedEvent.surprise : "—"}</strong>
            </span>
            <span class="hero-kpi">
              <em>偏离</em>
              <strong>${selectedEvent ? selectedEvent.divergence : "—"}</strong>
            </span>
          </div>
          <div class="hero-card-meta">
            <span>${selectedEvent ? `${selectedEvent.institution} / ${localizeText(selectedEvent.desk)}` : "当前范围 / 无匹配事件"}</span>
            <span>${state.bank === "全部" ? "全市场范围" : "银行范围"}</span>
          </div>
        </div>
      </article>
    `;

    const assetInput = container.querySelector(".hero-asset-search");
    if (assetInput) {
      const refocusInput = () => {
        requestAnimationFrame(() => {
          const nextInput = document.querySelector(".hero-asset-search");
          if (!nextInput) {
            return;
          }

          nextInput.focus();
          const cursor = nextInput.value.length;
          nextInput.setSelectionRange(cursor, cursor);
        });
      };

      const applyAssetQuery = () => {
        const nextQuery = assetInput.value.trim();
        if (nextQuery === state.assetQuery && state.assetPickerOpen) {
          return;
        }

        state.assetQuery = nextQuery;
        state.assetPickerOpen = true;
        render();
        refocusInput();
      };

      const openAssetPicker = () => {
        if (state.assetPickerOpen) {
          return;
        }

        state.assetPickerOpen = true;
        render();
        refocusInput();
      };

      assetInput.addEventListener("focus", openAssetPicker);
      assetInput.addEventListener("click", openAssetPicker);
      assetInput.addEventListener("input", applyAssetQuery);
      assetInput.addEventListener("change", applyAssetQuery);
      assetInput.addEventListener("search", applyAssetQuery);
      assetInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          state.assetPickerOpen = false;
          render();
        }
      });
    }

    container.querySelectorAll("[data-asset-value]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextAsset = button.dataset.assetValue;
        if (!nextAsset) {
          return;
        }

        state.assetQuery = nextAsset;
        state.assetPickerOpen = false;
        render();
      });
    });

    container.querySelectorAll("[data-window]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextWindow = button.dataset.window;
        if (!nextWindow || nextWindow === state.window) {
          return;
        }

        state.window = nextWindow;
        render();
      });
    });

    const clearAssetButton = container.querySelector("[data-clear-asset]");
    if (clearAssetButton) {
      clearAssetButton.addEventListener("click", () => {
        state.assetQuery = "";
        state.assetPickerOpen = true;
        render();
        requestAnimationFrame(() => {
          document.querySelector(".hero-asset-search")?.focus();
        });
      });
    }

    const dateSelect = container.querySelector("[data-date-filter]");
    if (dateSelect) {
      dateSelect.addEventListener("change", () => {
        const nextDate = dateSelect.value;
        if (!nextDate || nextDate === state.date) {
          return;
        }

        state.date = nextDate;
        render();
      });
    }
  }

  function renderTape(themeEvents) {
    const container = document.getElementById("market-tape");
    const signals = flattenSignals(themeEvents)
      .sort((a, b) => b.score - a.score)
      .slice(0, 16);
    const nextSignature = signals
      .map((signal) => `${signal.eventId}:${signal.asset}:${signal.direction}:${signal.score}`)
      .join("|");

    if (!signals.length) {
      if (tapeSignature !== "__empty__") {
        container.innerHTML = `<div class="empty-tape">当前主题暂无信号</div>`;
        tapeSignature = "__empty__";
      }
      return;
    }

    if (nextSignature === tapeSignature) {
      return;
    }

    const items = signals
      .map(
        (signal) => `
          <article class="tape-chip ${directionClass(signal.direction)}">
            <span>${signal.institution}</span>
            <strong>${displayText(signal.asset)}</strong>
            <em>${directionCopy(signal.direction)}</em>
          </article>
        `,
      )
      .join("");

    container.innerHTML = `
      <div class="market-track">
        ${items}
        ${items}
      </div>
    `;
    tapeSignature = nextSignature;
  }

  function renderRailBankFilter(themeEvents) {
    const container = document.getElementById("rail-bank-filter");
    const banks = getBankSummary(themeEvents);

    container.innerHTML = [
      `
        <button class="rail-filter-chip ${state.bank === "全部" ? "active" : ""}" data-bank="全部">
          <span>全部银行</span>
          <em>${themeEvents.length}</em>
        </button>
      `,
      ...banks.map((bank) => {
        const disabled = bank.events === 0;
        return `
          <button
            class="rail-filter-chip ${state.bank === bank.institution ? "active" : ""} ${
              disabled ? "disabled" : ""
            }"
            data-bank="${bank.institution}"
            ${disabled ? "disabled" : ""}
          >
            <span>${bank.institution}</span>
            <em>${bank.events || "—"}</em>
          </button>
        `;
      }),
    ].join("");

    container.querySelectorAll("[data-bank]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextBank = button.dataset.bank;
        if (!nextBank || nextBank === state.bank || button.disabled) {
          return;
        }

        state.bank = nextBank;
        const themeEvents = getThemeEvents();
        const scopedEvents = getScopedEvents(themeEvents);
        const fallback = scopedEvents[0] || themeEvents[0] || null;
        state.eventId = fallback?.id || null;
        state.signalAsset = fallback?.signals[0]?.asset || null;
        render();
      });
    });
  }

  function renderHeatZone(themeEvents) {
    const container = document.getElementById("heat-zone");
    const assets = aggregateAssets(themeEvents).slice(0, 8);

    if (!assets.length) {
      container.innerHTML = `<div class="panel-empty">当前范围没有可展示的资产热区。</div>`;
      return;
    }

    container.innerHTML = assets
      .map((asset) => {
        const direction = getBiasDirection(asset.avgBias);
        return `
          <article class="heat-card ${directionClass(direction)}">
            <div class="heat-head">
              <span>${displayText(asset.asset)}</span>
              <strong>${asset.avgScore}</strong>
            </div>
            <div class="heat-strip">
              <span style="width: ${Math.max(24, asset.avgScore)}%"></span>
            </div>
            <div class="heat-foot">
              <span>${asset.mentions}次提及</span>
              <em>${directionCopy(direction)}</em>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderMatrix(themeEvents) {
    const container = document.getElementById("matrix");
    const institutions = allBanks;
    const assets = aggregateAssets(themeEvents)
      .slice(0, 8)
      .map((item) => item.asset);

    if (!assets.length) {
      container.innerHTML = `<div class="panel-empty">当前范围没有可展示的分歧矩阵。</div>`;
      return;
    }

    const latestByPair = new Map();
    [...themeEvents].sort(byDateDesc).forEach((event) => {
      event.signals.forEach((signal) => {
        const key = `${event.institution}::${signal.asset}`;
        if (!latestByPair.has(key)) {
          latestByPair.set(key, signal.direction);
        }
      });
    });

    container.innerHTML = `
      <div class="matrix-grid" style="grid-template-columns: 132px repeat(${assets.length}, minmax(96px, 1fr));">
        <div class="matrix-corner">机构 / 资产</div>
              ${assets.map((asset) => `<div class="matrix-head">${displayText(asset)}</div>`).join("")}
        ${institutions
          .map(
            (institution) => `
              <div class="matrix-side">${institution}</div>
              ${assets
                .map((asset) => {
                  const direction = latestByPair.get(`${institution}::${asset}`);
                  const label = direction ? directionShortCopy(direction) : "—";
                  const cls = direction ? directionClass(direction) : "empty";
                  return `<div class="matrix-cell ${cls}">${label}</div>`;
                })
                .join("")}
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderShifts(themeEvents) {
    const summary = document.getElementById("shift-summary");
    const grid = document.getElementById("shift-grid");
    const actions = document.getElementById("shift-actions");
    const allRecords = getShiftRecords(themeEvents);
    const visibleRecords = allRecords.filter((record) => record.type !== "hold");
    const records = visibleRecords.length ? visibleRecords : allRecords.slice(0, 3);

    if (!allRecords.length) {
      summary.innerHTML = `
        <span class="shift-summary-chip">
          <strong>暂无变化</strong>
          <em>当前范围还没有连续历史</em>
        </span>
      `;
      grid.innerHTML = `<div class="shift-empty">当前范围暂无可追踪的连续变化。</div>`;
      grid.classList.remove("is-collapsed", "is-expandable");
      grid.style.removeProperty("--collapsed-height");
      actions.innerHTML = "";
      return;
    }

    const counts = allRecords.reduce(
      (acc, record) => {
        acc[record.type] += 1;
        return acc;
      },
      { shift: 0, reinforce: 0, hold: 0 },
    );

    const latestDate = allRecords[0]?.current.date || "暂无";
    const summaryItems = [
      `
        <span class="shift-summary-chip strong">
          <strong>${latestDate}</strong>
          <em>最近变化日期</em>
        </span>
      `,
      `
        <span class="shift-summary-chip type-shift">
          <strong>${counts.shift}</strong>
          <em>转向</em>
        </span>
      `,
      counts.reinforce
        ? `
          <span class="shift-summary-chip type-reinforce">
            <strong>${counts.reinforce}</strong>
            <em>强化</em>
          </span>
        `
        : "",
      counts.hold
        ? `
          <span class="shift-summary-chip type-hold">
            <strong>${counts.hold}</strong>
            <em>维持</em>
          </span>
        `
        : "",
    ].filter(Boolean);

    summary.innerHTML = summaryItems.join("");
    grid.innerHTML = records
      .map(
        (record) => `
          <article class="shift-card ${directionToneClass(record.current.direction)} shift-${record.type}">
            <div class="shift-card-head">
              <span class="shift-bank">${record.institution}</span>
              <span class="shift-kind shift-${record.type}">${movementCopy(record.type)}</span>
            </div>
            <div class="shift-asset-row">
              <strong class="${directionToneClass(record.current.direction)}">${displayText(record.asset)}</strong>
              <span>${record.current.date}</span>
            </div>
            <div class="shift-route">
              <span class="shift-state ${directionClass(record.previous.direction)}">${directionCopy(
                record.previous.direction,
              )}</span>
              <span class="shift-arrow">→</span>
              <span class="shift-state ${directionClass(record.current.direction)}">${directionCopy(
                record.current.direction,
              )}</span>
            </div>
            <p class="shift-note">${displayText(record.current.expression)}</p>
            <div class="shift-card-foot">
              <span>上次 ${record.previous.date}</span>
              <span>当前 ${record.current.score}</span>
            </div>
          </article>
        `,
      )
      .join("");

    grid.classList.remove("is-collapsed", "is-expandable");
    grid.style.removeProperty("--collapsed-height");
    actions.innerHTML = "";

    const cards = Array.from(grid.querySelectorAll(".shift-card"));
    const rowTops = [];

    cards.forEach((card) => {
      const top = card.offsetTop;
      if (!rowTops.some((value) => Math.abs(value - top) <= 4)) {
        rowTops.push(top);
      }
    });

    if (rowTops.length > 2) {
      const secondRowTop = rowTops[1];
      let collapsedHeight = 0;
      let hiddenCount = 0;

      cards.forEach((card) => {
        const top = card.offsetTop;
        const bottom = top + card.offsetHeight;
        if (top <= secondRowTop + 4) {
          collapsedHeight = Math.max(collapsedHeight, bottom);
        } else {
          hiddenCount += 1;
        }
      });

      if (collapsedHeight > 0 && hiddenCount > 0) {
        grid.classList.add("is-expandable");
        grid.style.setProperty("--collapsed-height", `${collapsedHeight}px`);
        if (!state.shiftsExpanded) {
          grid.classList.add("is-collapsed");
        }

        actions.innerHTML = `
          <button class="shift-toggle" type="button" data-shift-toggle>
            ${state.shiftsExpanded ? "收起" : `展开其余 ${hiddenCount} 条`}
          </button>
        `;

        actions.querySelector("[data-shift-toggle]")?.addEventListener("click", () => {
          state.shiftsExpanded = !state.shiftsExpanded;
          render();
        });
      }
    }
  }

  function renderEventRail(scopedEvents, selectedEvent) {
    const container = document.getElementById("event-rail");
    if (!scopedEvents.length || !selectedEvent) {
      container.innerHTML = `<div class="panel-empty">当前范围没有匹配事件。</div>`;
      return;
    }

    container.innerHTML = scopedEvents
      .map((event) => {
        const leadSignals = event.signals
          .slice(0, 2)
          .map((signal) => `${localizeText(signal.asset)} ${directionCopy(signal.direction)}`)
          .join(" / ");

        return `
          <button
            class="rail-item ${event.id === selectedEvent.id ? "active" : ""}"
            data-event-id="${event.id}"
          >
            <div class="rail-item-head">
              <span>${event.date}</span>
              <span>${event.institution}</span>
            </div>
            <strong>${displayText(event.title)}</strong>
            <p>${displayText(event.summary)}</p>
            <div class="rail-item-foot">
              <span>${displayText(event.type)}</span>
              <span>${escapeHtml(leadSignals)}</span>
            </div>
          </button>
        `;
      })
      .join("");

    container.querySelectorAll("[data-event-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextEvent = scopedEvents.find((event) => event.id === button.dataset.eventId);
        if (!nextEvent) {
          return;
        }

        state.eventId = nextEvent.id;
        state.signalAsset = nextEvent.signals[0]?.asset || null;
        render();
      });
    });
  }

  function renderFocus(event) {
    const detailContainer = document.getElementById("event-detail");
    const signalContainer = document.getElementById("signal-list");
    if (!event) {
      detailContainer.innerHTML = `
        <div class="detail-empty">
          <span class="label">观点拆解</span>
          <h2>当前范围没有匹配事件</h2>
          <p class="detail-summary">可以调整资产关键词、时间范围，或切回全部银行查看。</p>
        </div>
      `;
      signalContainer.innerHTML = `<div class="panel-empty">当前范围暂无可拆解信号。</div>`;
      return;
    }

    const selectedSignal = getSelectedSignal(event);
    const pillRow = event.signals
      .map(
        (signal) => `
          <span
            class="detail-pill ${directionClass(signal.direction)} ${
              signal.asset === selectedSignal?.asset ? "active-pill" : ""
            }"
          >
            ${displayText(signal.asset)} · ${directionCopy(signal.direction)}
          </span>
        `,
      )
      .join("");

    detailContainer.innerHTML = `
      <div class="detail-topline">
        <span>${displayText(event.type)}</span>
        <span>${event.date}</span>
      </div>
      <h2>${displayText(event.title)}</h2>
      <p class="detail-summary">${displayText(event.summary)}</p>
      <blockquote>${displayText(event.quote)}</blockquote>
      <div class="detail-metrics">
        <div class="mini-metric">
          <span>信号成色</span>
          <strong>${event.conviction}</strong>
        </div>
        <div class="mini-metric">
          <span>认知增量</span>
          <strong>${event.surprise}</strong>
        </div>
        <div class="mini-metric">
          <span>共识偏离</span>
          <strong>${event.divergence}</strong>
        </div>
      </div>
      <p class="detail-takeaway">${displayText(event.takeaway)}</p>
      <div class="detail-pill-row">${pillRow}</div>
      <div class="detail-meta">${event.institution} / ${displayText(event.desk)}</div>
    `;

    signalContainer.innerHTML = event.signals
      .map(
        (signal) => `
          <button
            class="signal-card ${directionClass(signal.direction)} ${
              signal.asset === selectedSignal?.asset ? "active" : ""
            }"
            data-signal-asset="${signal.asset}"
          >
            <div class="signal-card-head">
              <strong>${displayText(signal.asset)}</strong>
              <span>${directionCopy(signal.direction)} · ${signal.horizon}</span>
            </div>
            <p>${displayText(signal.driver)}</p>
            <div class="signal-card-foot">
              <span>${displayText(signal.expression)}</span>
              <em>${signal.score}</em>
            </div>
          </button>
        `,
      )
      .join("");

    signalContainer.querySelectorAll("[data-signal-asset]").forEach((button) => {
      button.addEventListener("click", () => {
        state.signalAsset = button.dataset.signalAsset;
        render();
      });
    });
  }

  function renderTradePanel(event) {
    const container = document.getElementById("trade-panel");
    if (!event) {
      container.innerHTML = `
        <div class="trade-card trade-empty">
          <p class="trade-kicker">当前范围</p>
          <h3>暂无执行表达</h3>
          <p>先调整资产关键词、时间范围或银行，再看对应交易表达。</p>
        </div>
      `;
      return;
    }

    const signal = getSelectedSignal(event);

    container.innerHTML = `
      <div class="trade-card">
        <p class="trade-kicker">${event.institution} · ${event.theme}</p>
        <h3>${displayText(signal.asset)}</h3>
        <div class="trade-badge ${directionClass(signal.direction)}">
          ${directionCopy(signal.direction)} · ${signal.horizon}
        </div>
        <dl>
          <div>
            <dt>驱动</dt>
            <dd>${displayText(signal.driver)}</dd>
          </div>
          <div>
            <dt>交易表达</dt>
            <dd>${displayText(signal.expression)}</dd>
          </div>
          <div>
            <dt>失效条件</dt>
            <dd>${displayText(signal.invalidation)}</dd>
          </div>
        </dl>
      </div>
      <div class="trade-side">
        <div class="trade-tile">
          <span>信号成色</span>
          <strong>${signal.score}</strong>
        </div>
        <div class="trade-tile">
          <span>事件时间</span>
          <strong>${event.date}</strong>
        </div>
        <div class="trade-tile">
          <span>当前银行</span>
          <strong>${event.institution}</strong>
        </div>
      </div>
    `;
  }

  function syncThemeButtons() {
    themeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.theme === state.theme);
    });
  }

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = button.dataset.theme;
      if (nextTheme === state.theme) {
        return;
      }

      state.theme = nextTheme;
      const themeEvents = getThemeEvents();
      if (state.bank !== "全部" && !themeEvents.some((event) => event.institution === state.bank)) {
        state.bank = "全部";
      }
      const scopedEvents = getScopedEvents(themeEvents);
      const fallback = scopedEvents[0] || themeEvents[0] || null;
      state.eventId = fallback?.id || null;
      state.signalAsset = fallback?.signals[0]?.asset || null;
      render();
    });
  });

  document.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!state.assetPickerOpen) {
      return;
    }

    if (target.closest(".hero-search-field")) {
      return;
    }

    state.assetPickerOpen = false;
    render();
  });

  render();
})();
