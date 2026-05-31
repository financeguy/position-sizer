"use strict";

// ============================================================
// DOM REFS — INPUTS
// ============================================================
const inputs = {
  accountSize: document.getElementById("accountSize"),
  riskPct:     document.getElementById("riskPct"),
  entryPrice:  document.getElementById("entryPrice"),
  stopPrice:   document.getElementById("stopPrice"),
};

// ============================================================
// DOM REFS — OUTPUTS (existing)
// ============================================================
const outputs = {
  positionSize:     document.getElementById("positionSize"),
  positionSizeNote: document.getElementById("positionSizeNote"),
  totalExposure:    document.getElementById("totalExposure"),
  maxRisk:          document.getElementById("maxRisk"),
  perShareRisk:     document.getElementById("perShareRisk"),
  target2R:         document.getElementById("target2R"),
  target3R:         document.getElementById("target3R"),
  directionBadge:   document.getElementById("directionBadge"),
};

// ============================================================
// DOM REFS — NEW FEATURES
// ============================================================
const rmRows = {
  "1R": document.getElementById("rm1R"),
  "2R": document.getElementById("rm2R"),
  "3R": document.getElementById("rm3R"),
  "5R": document.getElementById("rm5R"),
};

const btnSave       = document.getElementById("btnSave");
const btnCopy       = document.getElementById("btnCopy");
const actionFeedback = document.getElementById("actionFeedback");
const historyWrap   = document.getElementById("historyWrap");
const historyBody   = document.getElementById("historyBody");

// ============================================================
// ERRORS
// ============================================================
const errors = {
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
// CLEAR / RESET
// ============================================================
function clearOutputs() {
  outputs.positionSize.textContent     = "—";
  outputs.positionSizeNote.textContent = "";
  outputs.totalExposure.textContent    = "—";
  outputs.maxRisk.textContent          = "—";
  outputs.perShareRisk.textContent     = "—";
  outputs.target2R.textContent         = "—";
  outputs.target3R.textContent         = "—";
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
    const pnl    = m * perShareRisk * positionSize;

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

  // Direction detection — unchanged
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

  // Core math — unchanged
  const maxRisk       = account * (riskPct / 100);
  const perShareRisk  = Math.abs(entry - stop);
  const positionSize  = Math.floor(maxRisk / perShareRisk);
  const totalExposure = positionSize * entry;

  const target2R = direction === "LONG"
    ? entry + 2 * perShareRisk
    : entry - 2 * perShareRisk;

  const target3R = direction === "LONG"
    ? entry + 3 * perShareRisk
    : entry - 3 * perShareRisk;

  // Render existing outputs — unchanged
  outputs.maxRisk.textContent      = formatDollar(maxRisk);
  outputs.perShareRisk.textContent = formatDollarCents(perShareRisk);
  outputs.totalExposure.textContent = positionSize > 0
    ? formatDollar(totalExposure)
    : "—";
  outputs.target2R.textContent = formatPrice(target2R);
  outputs.target3R.textContent = formatPrice(target3R);

  if (positionSize === 0) {
    outputs.positionSize.textContent     = "—";
    outputs.positionSizeNote.textContent = "Risk too tight for account size";
  } else {
    outputs.positionSize.textContent     = positionSize.toLocaleString("en-US");
    outputs.positionSizeNote.textContent = "";
  }

  // R-multiples panel
  if (positionSize > 0) {
    renderRmPanel(entry, perShareRisk, positionSize, direction);
  } else {
    clearRmPanel();
  }

  // Store last valid calc for Save + Copy
  lastCalc = {
    account, riskPct, entry, stop,
    direction, maxRisk, perShareRisk,
    positionSize, totalExposure,
  };
}

// ============================================================
// COPY SUMMARY
// Format: TICKER Direction @ entry . stop X . N sh . $exposure . risk $X (1R) . 2R = X
// (Ticker field not in scope — omit label, use direction as first token)
// ============================================================
function buildSummary(c) {
  const target2R = c.direction === "LONG"
    ? c.entry + 2 * c.perShareRisk
    : c.entry - 2 * c.perShareRisk;

  return [
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
  const summary = buildSummary(lastCalc);
  navigator.clipboard.writeText(summary).then(() => {
    showFeedback("Copied");
  }).catch(() => {
    showFeedback("Copy failed");
  });
});

// ============================================================
// SAVE TRADE + HISTORY (localStorage key: "ps_trades")
// ============================================================
const LS_KEY = "ps_trades";
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
    const tr = document.createElement("tr");

    const reloadIndex = trades.length - 1 - i; // index in original array

    tr.innerHTML = `
      <td>${formatTime(t.ts)}</td>
      <td class="td-dir">${t.direction}</td>
      <td>${formatPrice(t.entry)}</td>
      <td>${formatPrice(t.stop)}</td>
      <td>${t.positionSize.toLocaleString("en-US")}</td>
      <td>${formatDollar(t.totalExposure)}</td>
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
    account:      lastCalc.account,
    riskPct:      lastCalc.riskPct,
    entry:        lastCalc.entry,
    stop:         lastCalc.stop,
    direction:    lastCalc.direction,
    maxRisk:      lastCalc.maxRisk,
    perShareRisk: lastCalc.perShareRisk,
    positionSize: lastCalc.positionSize,
    totalExposure: lastCalc.totalExposure,
  });

  // Keep only last 5
  if (trades.length > MAX_TRADES) {
    trades.splice(0, trades.length - MAX_TRADES);
  }

  saveTrades(trades);
  renderHistory();
  showFeedback("Saved");
});

// Reload a saved trade back into inputs
historyBody.addEventListener("click", (e) => {
  const el = e.target.closest(".td-reload");
  if (!el) return;

  const index  = parseInt(el.dataset.index, 10);
  const trades = loadTrades();
  const t      = trades[index];
  if (!t) return;

  inputs.accountSize.value = t.account;
  inputs.riskPct.value     = t.riskPct;
  inputs.entryPrice.value  = t.entry;
  inputs.stopPrice.value   = t.stop;

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
// EVENT LISTENERS — live update on every keystroke
// ============================================================
Object.values(inputs).forEach(input => {
  input.addEventListener("input", calculate);
});

// ============================================================
// INIT
// ============================================================
renderHistory();
