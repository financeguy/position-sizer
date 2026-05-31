"use strict";

// ============================================================
// DOM REFS
// ============================================================
const inputs = {
  accountSize: document.getElementById("accountSize"),
  riskPct:     document.getElementById("riskPct"),
  entryPrice:  document.getElementById("entryPrice"),
  stopPrice:   document.getElementById("stopPrice"),
};

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

const errors = {
  accountSizeError:   document.getElementById("accountSizeError"),
  accountSizeWarning: document.getElementById("accountSizeWarning"),
  riskPctError:       document.getElementById("riskPctError"),
  entryPriceError:    document.getElementById("entryPriceError"),
  stopPriceError:     document.getElementById("stopPriceError"),
};

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
  // Show up to 2 decimal places for display; strip trailing zeros beyond 2
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
}

function clearErrors() {
  for (const key in errors) {
    errors[key].textContent = "";
  }
  // Remove error styling from all input wraps
  document.querySelectorAll(".field__input-wrap").forEach(el => {
    el.classList.remove("is-error");
  });
}

function setError(fieldId, message) {
  const errorEl = errors[fieldId + "Error"];
  if (errorEl) {
    errorEl.textContent = message;
    // Apply error border to parent wrap
    const input = inputs[fieldId];
    if (input) {
      input.closest(".field__input-wrap").classList.add("is-error");
    }
  }
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

  // If any field is empty, show dashes and bail
  if (!rawAccount || !rawRisk || !rawEntry || !rawStop) {
    clearOutputs();
    return;
  }

  const account = parseFloat(rawAccount);
  const riskPct = parseFloat(rawRisk);
  const entry   = parseFloat(rawEntry);
  const stop    = parseFloat(rawStop);

  let hasError = false;

  // Validate each field > 0
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

  // Small account warning (non-blocking)
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
    // stop === entry
    clearOutputs();
    outputs.directionBadge.textContent = "INVALID";
    errors.stopPriceError.textContent  = "Stop and entry are equal.";
    inputs.stopPrice.closest(".field__input-wrap").classList.add("is-error");
    return;
  }

  outputs.directionBadge.textContent = direction;

  // Core math
  const maxRisk      = account * (riskPct / 100);
  const perShareRisk = Math.abs(entry - stop);
  const positionSize = Math.floor(maxRisk / perShareRisk);
  const totalExposure = positionSize * entry;

  // R:R targets
  const target2R = direction === "LONG"
    ? entry + 2 * perShareRisk
    : entry - 2 * perShareRisk;

  const target3R = direction === "LONG"
    ? entry + 3 * perShareRisk
    : entry - 3 * perShareRisk;

  // Render
  outputs.maxRisk.textContent     = formatDollar(maxRisk);
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
}

// ============================================================
// EVENT LISTENERS — live update on every keystroke
// ============================================================
Object.values(inputs).forEach(input => {
  input.addEventListener("input", calculate);
});
