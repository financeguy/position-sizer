"use strict";

// ============================================================
// DOM REFS — INPUTS
// ============================================================
const inputs = {
  ticker:      document.getElementById("ticker"),
  accountSize: document.getElementById("accountSize"),
  riskPct:     document.getElementById("riskPct"),
  entryPrice:  document.getElementById("entryPrice"),
  stopPrice:   document.getElementById("stopPrice"),
};

// ============================================================
// DOM REFS — OUTPUTS
// ============================================================
const outputs = {
  positionSize:     document.getElementById("positionSize"),
  positionSizeNote: document.getElementById("positionSizeNote"),
  totalExposure:    document.getElementById("totalExposure"),
  maxRisk:          document.getElementById("maxRisk"),
  perShareRisk:     document.getElementById("perShareRisk"),
  directionBadge:   document.getElementById("directionBadge"),
};

// ============================================================
// DOM REFS — R-MULTIPLES PANEL
// ============================================================
const rmRows = {
  "1R": document.getElementById("rm1R"),
  "2R": document.getElementById("rm2R"),
  "3R": document.getElementById("rm3R"),
  "5R": document.getElementById("rm5R"),
};

// ============================================================
// DOM REFS — ACTIONS + HISTORY
// ============================================================
const btnSave        = document.getElementById("btnSave");
const btnCopy        = document.getElementById("btnCopy");
const actionFeedback = document.getElementById("actionFeedback");
const historyWrap    = document.getElementById("historyWrap");
const historyBody    = document.getElementById("historyBody");

// ============================================================
// DOM REFS — ERRORS
// ============================================================
const errors = {
  tickerError:        document.getElementById("tickerError"),
  accountSizeError:   document.getElementById("accountSizeError"),
  accountSizeWarning: document.getElementById("accountSizeWarning"),
  riskPctError:       document.getElementById("riskPctError"),
  entryPriceError:    document.getElementById("entryPriceError"),
  stopPriceError:     document.getElementById("stopPriceError"),
};

// ============================================================
// STATE — last valid calc result (used by Save + Copy)
// ============================================================
let lastCalc = null;

// ============================================================
// FORMATTERS
// ============================================================
function formatDollar(n) {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollarCents(n) {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice(n) {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================================
// BUTTON STATE — disable Save/Copy when ticker is empty
// ============================================================
function updateButtonState() {
  const tickerFilled = inputs.ticker.value.trim().length > 0;
  btnSave.disabled = !tickerFilled;
  btnCopy.disabled = !tickerFilled;
  btnSave.classList.toggle("is-disabled", !tickerFilled);
  btnCopy.classList.toggle("is-disabled", !tickerFilled);
}

// ============================================================
// CLEAR / RESET
// ============================================================
function clearOutputs() {
  outputs.positionSize.textContent     = "—";
  outputs.positionSizeNote.textContent = "";
  outputs.totalExposure.textContent    = "—";
  outputs.maxRisk.textContent          = "—";
  outputs.perShareRisk.textContent     = "—";
  outputs.directionBadge.textContent   = "";
  clearRmPanel();
  lastCalc = null;
}

function clearErrors() {
  for (const key in errors) {
    errors[key].textContent = "";
  }
  document.querySelectorAll(".field__input-wrap").forEach(el => {
    el.classList.remove("is-error");
  });
}

function setError(fieldId, message) {
  const errorEl = errors[fieldId + "Error"];
  if (errorEl) {
    errorEl.textContent = message;
    const input = inputs[fieldId];
    if (input) {
      input.closest(".field__input-wrap").classList.add("is-error");
    }
  }
}

// ============================================================
// TICKER: auto-uppercase on input
// ============================================================
inputs.ticker.addEventListener("input", () => {
  const pos = inputs.ticker.selectionStart;
  inputs.ticker.value = inputs.ticker.value.toUpperCase();
  inputs.ticker.setSelectionRange(pos, pos);
  updateButtonState();
  calculate();
});

// ============================================================
// R-MULTIPLES PANEL
// ============================================================
function clearRmPanel() {
  Object.values(rmRows).forEach(row => {
    row.querySelector(".rm-panel__target").textContent = "—";
    const pnlEl = row.querySelector(".rm-panel__pnl");
    pnlEl.textContent = "—";
    pnlEl.classList.remove("is-profit");
  });
}

function renderRmPanel(entry, perShareRisk, positionSize, direction) {
  const multiples = [1, 2, 3, 5];
  const keys      = ["1R", "2R", "3R", "5R"];

  multiples.forEach((m, i) => {
    const row    = rmRows[keys[i]];
    const target = direction === "LONG"
      ? entry + m * perShareRisk
      : entry - m * perShareRisk;

    // P&L = position_size × N × R
    const pnl = positionSize * m * perShareRisk;

    row.querySelector(".rm-panel__target").textContent = formatPrice(target);

    const pnlEl = row.querySelector(".rm-panel__pnl");
    pnlEl.textContent = "+" + formatDollar(pnl);
    pnlEl.classList.add("is-profit");
  });
}

// ============================================================
// CORE CALCULATION
// ============================================================
function calculate() {
  clearErrors();

  const rawAccount = inputs.accountSize.value.trim();
  const rawRisk    = inputs.riskPct.value.trim();
  const rawEntry   = inputs.entryPrice.value.trim();
  const rawStop    = inputs.stopPrice.value.trim();

  if (!rawAccount || !rawRisk || !rawEntry || !rawStop) {
    clearOutputs();
    return;
  }

  const account = parseFloat(rawAccount);
  const riskPct = parseFloat(rawRisk);
  const entry   = parseFloat(rawEntry);
  const stop    = parseFloat(rawStop);

  let hasError = false;

  if (isNaN(account) || account <= 0) {
    setError("accountSize", "Must be greater than 0.");
    hasError = true;
  }
  if (isNaN(riskPct) || riskPct <= 0) {
    setError("riskPct", "Must be greater than 0.");
    hasError = true;
  }
  if (isNaN(entry) || entry <= 0) {
    setError("entryPrice", "Must be greater than 0.");
    hasError = true;
  }
  if (isNaN(stop) || stop <= 0) {
    setError("stopPrice", "Must be greater than 0.");
    hasError = true;
  }

  if (hasError) {
    clearOutputs();
    return;
  }

  if (account < 1000) {
    errors.accountSizeWarning.textContent = "Small account — calculations still valid.";
  } else {
    errors.accountSizeWarning.textContent = "";
  }

  // Direction detection
  let direction;
  if (stop < entry) {
    direction = "LONG";
  } else if (stop > entry) {
    direction = "SHORT";
  } else {
    clearOutputs();
    outputs.directionBadge.textContent = "INVALID";
    errors.stopPriceError.textContent  = "Stop and entry are equal.";
    inputs.stopPrice.closest(".field__input-wrap").classList.add("is-error");
    return;
  }

  outputs.directionBadge.textContent = direction;

  // Core math
  const maxRisk       = account * (riskPct / 100);
  const perShareRisk  = Math.abs(entry - stop);
  const positionSize  = Math.floor(maxRisk / perShareRisk);
  const totalExposure = positionSize * entry;

  // Render
  outputs.maxRisk.textContent      = formatDollar(maxRisk);
  outputs.perShareRisk.textContent = formatDollarCents(perShareRisk);
  outputs.totalExposure.textContent = positionSize > 0
    ? formatDollar(totalExposure)
    : "—";

  if (positionSize === 0) {
    outputs.positionSize.textContent     = "—";
    outputs.positionSizeNote.textContent = "Risk too tight for account size";
  } else {
    outputs.positionSize.textContent     = positionSize.toLocaleString("en-US");
    outputs.positionSizeNote.textContent = "";
  }

  if (positionSize > 0) {
    renderRmPanel(entry, perShareRisk, positionSize, direction);
  } else {
    clearRmPanel();
  }

  // Store for Save + Copy
  lastCalc = {
    ticker: inputs.ticker.value.trim().toUpperCase(),
    account, riskPct, entry, stop,
    direction, maxRisk, perShareRisk,
    positionSize, totalExposure,
  };
}

// ============================================================
// COPY SUMMARY
// Format: TICKER Direction @ entry · stop X · N sh · $exposure · risk $X (1R) · 2R = X
// ============================================================
function buildSummary(c) {
  const target2R = c.direction === "LONG"
    ? c.entry + 2 * c.perShareRisk
    : c.entry - 2 * c.perShareRisk;

  return [
    c.ticker,
    c.direction,
    "@ " + formatPrice(c.entry),
    "stop " + formatPrice(c.stop),
    c.positionSize.toLocaleString("en-US") + " sh",
    formatDollar(c.totalExposure),
    "risk " + formatDollar(c.maxRisk) + " (1R)",
    "2R = " + formatPrice(target2R),
  ].join(" · ");
}

btnCopy.addEventListener("click", () => {
  if (!lastCalc || lastCalc.positionSize === 0) {
    showFeedback("Nothing to copy");
    return;
  }
  navigator.clipboard.writeText(buildSummary(lastCalc)).then(() => {
    showFeedback("Copied");
  }).catch(() => {
    showFeedback("Copy failed");
  });
});

// ============================================================
// SAVE TRADE + HISTORY (localStorage key: "ps_trades")
// Saved fields: ticker, direction, entry, stop, positionSize, maxRisk, ts
// ============================================================
const LS_KEY    = "ps_trades";
const MAX_TRADES = 5;

function loadTrades() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTrades(trades) {
  localStorage.setItem(LS_KEY, JSON.stringify(trades));
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function renderHistory() {
  const trades = loadTrades();

  if (trades.length === 0) {
    historyWrap.style.display = "none";
    return;
  }

  historyWrap.style.display = "";
  historyBody.innerHTML = "";

  // Most recent first
  [...trades].reverse().forEach((t, i) => {
    const reloadIndex = trades.length - 1 - i;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${formatTime(t.ts)}</td>
      <td class="td-ticker">${t.ticker}</td>
      <td class="td-dir">${t.direction}</td>
      <td>${formatPrice(t.entry)}</td>
      <td>${t.positionSize.toLocaleString("en-US")}</td>
      <td>${formatDollar(t.maxRisk)}</td>
      <td><span class="td-reload" data-index="${reloadIndex}">Reload</span></td>
    `;

    historyBody.appendChild(tr);
  });
}

btnSave.addEventListener("click", () => {
  if (!lastCalc || lastCalc.positionSize === 0) {
    showFeedback("Nothing to save");
    return;
  }

  const trades = loadTrades();

  trades.push({
    ts:           Date.now(),
    ticker:       lastCalc.ticker,
    direction:    lastCalc.direction,
    entry:        lastCalc.entry,
    stop:         lastCalc.stop,
    positionSize: lastCalc.positionSize,
    maxRisk:      lastCalc.maxRisk,
    // keep these for Reload
    account:      lastCalc.account,
    riskPct:      lastCalc.riskPct,
  });

  if (trades.length > MAX_TRADES) {
    trades.splice(0, trades.length - MAX_TRADES);
  }

  saveTrades(trades);
  renderHistory();
  showFeedback("Saved");
});

// Reload a saved trade into inputs
historyBody.addEventListener("click", (e) => {
  const el = e.target.closest(".td-reload");
  if (!el) return;

  const index  = parseInt(el.dataset.index, 10);
  const trades = loadTrades();
  const t      = trades[index];
  if (!t) return;

  inputs.ticker.value      = t.ticker;
  inputs.accountSize.value = t.account;
  inputs.riskPct.value     = t.riskPct;
  inputs.entryPrice.value  = t.entry;
  inputs.stopPrice.value   = t.stop;

  updateButtonState();
  calculate();
  showFeedback("Loaded");
});

// ============================================================
// FEEDBACK FLASH
// ============================================================
let feedbackTimer = null;

function showFeedback(msg) {
  actionFeedback.textContent = msg;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    actionFeedback.textContent = "";
  }, 2000);
}

// ============================================================
// DISABLED BUTTON STYLE — add to CSS via JS toggle
// ============================================================
// (handled via .is-disabled class in CSS)

// ============================================================
// EVENT LISTENERS — live update on every keystroke
// (ticker has its own listener above that also calls calculate)
// ============================================================
[inputs.accountSize, inputs.riskPct, inputs.entryPrice, inputs.stopPrice].forEach(input => {
  input.addEventListener("input", calculate);
});

// ============================================================
// INIT
// ============================================================
updateButtonState();
renderHistory();
