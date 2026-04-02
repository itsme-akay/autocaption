/**
 * client/main.js
 * CEP panel logic — runs in embedded Chromium inside After Effects.
 *
 * Responsibilities:
 *   1. Load comp info from AE via ExtendScript
 *   2. On "Generate", get the audio file path from AE
 *   3. Run whisper.cpp via Node.js (node/transcribe.js)
 *   4. Send segments back to ExtendScript to create text layers
 */

"use strict";

// ─── CEP bridge ──────────────────────────────────────────────────────────────
var cs = new CSInterface();

// ─── Node.js access (CEP built-in) ───────────────────────────────────────────
// window.cep_node is available when --enable-nodejs is set in manifest
var transcribeModule = null;

(function initNode() {
  try {
    var nodePath = cs.getExtensionPath() + "/node/transcribe.js";
    transcribeModule = window.cep_node.require(nodePath);
  } catch (e) {
    log("Node.js unavailable: " + e.message, "err");
  }
})();

// ─── State ───────────────────────────────────────────────────────────────────
var state = {
  busy:       false,
  posYPct:    82,        // percentage from top
  color:      "#ffffff",
  compHeight: 1080
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
var elCompName    = document.getElementById("comp-name");
var elAudioLayer  = document.getElementById("audio-layer");
var elDot         = document.getElementById("status-dot");
var elLogCard     = document.getElementById("log-card");
var elLogLines    = document.getElementById("log-lines");
var elProgressBar = document.getElementById("progress-bar");
var elBtnGenerate = document.getElementById("btn-generate");
var elBtnClear    = document.getElementById("btn-clear");
var elBtnRefresh  = document.getElementById("btn-refresh");
var elColorHex    = document.getElementById("color-preview");

// ─── Init ─────────────────────────────────────────────────────────────────────
refreshCompInfo();

// ─── Colour swatches ─────────────────────────────────────────────────────────
var COLORS = { white: "#ffffff", yellow: "#ffe234", cyan: "#34e8ff" };

document.querySelectorAll(".color-swatch").forEach(function(el) {
  el.addEventListener("click", function() {
    document.querySelectorAll(".color-swatch").forEach(function(s){ s.classList.remove("active"); });
    el.classList.add("active");
    var key = el.dataset.color;
    if (key && COLORS[key]) {
      state.color = COLORS[key];
      elColorHex.textContent = state.color;
    }
  });
});

document.getElementById("custom-color").addEventListener("input", function(e) {
  state.color = e.target.value;
  elColorHex.textContent = state.color;
  document.querySelectorAll(".color-swatch").forEach(function(s){ s.classList.remove("active"); });
  document.querySelector('[data-color="custom"]').classList.add("active");
});

// ─── Position buttons ─────────────────────────────────────────────────────────
document.querySelectorAll(".pos-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".pos-btn").forEach(function(b){ b.classList.remove("active"); });
    btn.classList.add("active");
    state.posYPct = parseInt(btn.dataset.pos, 10);
  });
});

// ─── Refresh comp info ────────────────────────────────────────────────────────
elBtnRefresh.addEventListener("click", refreshCompInfo);

function refreshCompInfo() {
  cs.evalScript("getCompInfo()", function(raw) {
    var res = safeJSON(raw);
    if (res.error) {
      elCompName.textContent   = "No active comp";
      elCompName.className     = "value muted";
      elAudioLayer.textContent = "—";
      elAudioLayer.className   = "value muted";
      return;
    }
    state.compHeight  = res.height || 1080;
    elCompName.textContent = res.name || "—";
    elCompName.className   = "value";

    // Now get audio layer name
    cs.evalScript("getAudioFilePath()", function(raw2) {
      var res2 = safeJSON(raw2);
      if (res2.error || !res2.layerName) {
        elAudioLayer.textContent = "No audio layer";
        elAudioLayer.className   = "value muted";
      } else {
        elAudioLayer.textContent = res2.layerName;
        elAudioLayer.className   = "value";
      }
    });
  });
}

// ─── Clear captions ───────────────────────────────────────────────────────────
elBtnClear.addEventListener("click", function() {
  if (state.busy) return;
  cs.evalScript("clearCaptionLayers()", function(raw) {
    var res = safeJSON(raw);
    if (res.error) {
      log("Error: " + res.error, "err");
    } else {
      log("Removed " + res.removed + " caption layer(s).", "ok");
    }
    showLog();
  });
});

// ─── Generate captions ────────────────────────────────────────────────────────
elBtnGenerate.addEventListener("click", function() {
  if (state.busy) return;

  if (!transcribeModule) {
    log("Node.js bridge unavailable. Make sure --enable-nodejs is in manifest.", "err");
    showLog();
    return;
  }

  setBusy(true);
  showLog();
  clearLog();
  setProgress(0);

  // 1. Get audio file path from AE
  cs.evalScript("getAudioFilePath()", function(raw) {
    var res = safeJSON(raw);
    if (res.error) {
      log("Error: " + res.error, "err");
      setBusy(false);
      return;
    }

    var audioPath = res.path;
    log("Audio: " + basename(audioPath), "info");

    // 2. Get selected model
    var modelSelect = document.getElementById("model-select");
    var modelFile   = modelSelect.value;

    // Inject model filename into transcribeModule before calling
    // (override via monkey-patch since module uses its own MODEL_PATH constant)
    var extensionPath = cs.getExtensionPath();
    var modelPath = extensionPath + "/bin/" + modelFile;
    var whisperBin = extensionPath + "/bin/whisper-mac";

    // 3. Transcribe
    transcribeModule.transcribe(
      audioPath,
      modelPath,
      whisperBin,
      document.getElementById("language").value,
      function onProgress(msg) {
        log(msg, "info");
        // Rough progress from message
        var match = msg.match(/(\d+)%/);
        if (match) setProgress(parseInt(match[1], 10));
      },
      function onDone(err, segments) {
        if (err) {
          log("Transcription failed: " + err.message, "err");
          setBusy(false);
          return;
        }

        log("Got " + segments.length + " segment(s). Writing to timeline…", "info");
        setProgress(90);

        // 4. Build options for ExtendScript
        var fontSize  = parseInt(document.getElementById("font-size").value, 10) || 72;
        var fontName  = document.getElementById("font-select").value;
        var posY      = Math.round(state.compHeight * (state.posYPct / 100));
        var colorArr  = hexToRGB01(state.color);

        var options = JSON.stringify({
          font:      fontName,
          size:      fontSize,
          color:     colorArr,
          positionY: posY,
          bold:      false
        });

        var segJSON = JSON.stringify(segments);

        // 5. Call ExtendScript to write layers
        cs.evalScript(
          "createCaptionLayers(" +
            JSON.stringify(segJSON) + ", " +
            JSON.stringify(options) +
          ")",
          function(raw2) {
            var res2 = safeJSON(raw2);
            setProgress(100);
            if (res2.error) {
              log("AE error: " + res2.error, "err");
            } else {
              log("Done! Created " + res2.created + " caption layer(s).", "ok");
              setDot("done");
            }
            setBusy(false);
          }
        );
      }
    );
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setBusy(busy) {
  state.busy = busy;
  elBtnGenerate.disabled = busy;
  elBtnClear.disabled    = busy;
  setDot(busy ? "working" : "idle");
}

function setDot(cls) {
  elDot.className = "dot " + cls;
}

function showLog() {
  elLogCard.style.display = "block";
}

function clearLog() {
  elLogLines.innerHTML = "";
}

function log(msg, type) {
  var line = document.createElement("div");
  line.className = "log-" + (type || "info");
  line.textContent = msg;
  elLogLines.appendChild(line);
  elLogLines.scrollTop = elLogLines.scrollHeight;
}

function setProgress(pct) {
  elProgressBar.style.width = Math.min(100, pct) + "%";
}

function safeJSON(str) {
  try { return JSON.parse(str); }
  catch(e) { return { error: "Invalid JSON: " + str }; }
}

function hexToRGB01(hex) {
  var r = parseInt(hex.slice(1,3),16) / 255;
  var g = parseInt(hex.slice(3,5),16) / 255;
  var b = parseInt(hex.slice(5,7),16) / 255;
  return [r, g, b];
}

function basename(p) {
  return p ? p.split("/").pop().split("\\").pop() : "";
}
