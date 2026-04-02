/**
 * host/index.jsx
 * ExtendScript — runs inside After Effects engine.
 * Provides functions callable from the CEP panel via CSInterface.evalScript().
 */

// ─── Utility ────────────────────────────────────────────────────────────────

function toJSON(obj) {
  return JSON.stringify(obj);
}

// ─── Get active comp info ────────────────────────────────────────────────────

function getCompInfo() {
  try {
    var item = app.project.activeItem;
    if (!item || !(item instanceof CompItem)) {
      return toJSON({ error: "No active composition. Open a comp first." });
    }
    return toJSON({
      name: item.name,
      duration: item.duration,
      frameRate: item.frameRate,
      width: item.width,
      height: item.height
    });
  } catch (e) {
    return toJSON({ error: e.message });
  }
}

// ─── Find audio layer and return its source file path ───────────────────────

function getAudioFilePath() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return toJSON({ error: "No active composition." });
    }

    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      if (layer instanceof AVLayer && layer.hasAudio) {
        var src = layer.source;
        if (src && src.file) {
          return toJSON({
            path: src.file.fsName,
            layerName: layer.name
          });
        }
      }
    }
    return toJSON({ error: "No audio layer with a linked file found in the active comp." });
  } catch (e) {
    return toJSON({ error: e.message });
  }
}

// ─── Create caption text layers from segments JSON ──────────────────────────
// segments: array of { text, start, end }
// options:  { font, size, color, positionY, bold }

function createCaptionLayers(segmentsJSON, optionsJSON) {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return toJSON({ error: "No active composition." });
    }

    var segments = JSON.parse(segmentsJSON);
    var opts     = JSON.parse(optionsJSON);

    var fontName  = opts.font      || "ArialMT";
    var fontSize  = opts.size      || 72;
    var bold      = opts.bold      || false;
    var posY      = opts.positionY || (comp.height * 0.82);
    var color     = opts.color     || [1, 1, 1]; // white [r,g,b] 0-1

    // Create a null group layer to keep captions organised
    var groupName = "CAPTIONS";
    var groupNull = null;

    // Check if group already exists
    for (var g = 1; g <= comp.numLayers; g++) {
      if (comp.layer(g).name === groupName) {
        groupNull = comp.layer(g);
        break;
      }
    }
    if (!groupNull) {
      groupNull = comp.layers.addNull(comp.duration);
      groupNull.name = groupName;
    }

    app.beginUndoGroup("AutoCaption — Create Layers");

    var created = 0;

    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (!seg.text || seg.text.replace(/\s/g, "") === "") continue;

      var textLayer = comp.layers.addText(seg.text);
      textLayer.name = "CAP_" + (i + 1);
      textLayer.inPoint  = seg.start;
      textLayer.outPoint = seg.end;

      // ── Text properties ──
      var srcText = textLayer.property("Source Text");
      var textDoc = srcText.value;

      textDoc.resetCharStyle();
      textDoc.font        = bold ? fontName.replace("MT","") + "-Bold" : fontName;
      textDoc.fontSize    = fontSize;
      textDoc.fillColor   = color;
      textDoc.strokeWidth = 0;
      textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;

      srcText.setValue(textDoc);

      // ── Position: centred horizontally, posY from top ──
      var pos = textLayer.property("Transform").property("Position");
      pos.setValue([comp.width / 2, posY]);

      // ── Anchor point to centre of text ──
      var anch = textLayer.property("Transform").property("Anchor Point");
      anch.setValue([0, 0]);

      created++;
    }

    app.endUndoGroup();

    return toJSON({ created: created });

  } catch (e) {
    app.endUndoGroup();
    return toJSON({ error: e.message });
  }
}

// ─── Clear all caption layers (layers named CAP_*) ──────────────────────────

function clearCaptionLayers() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return toJSON({ error: "No active composition." });
    }

    app.beginUndoGroup("AutoCaption — Clear Layers");
    var removed = 0;

    // Iterate in reverse so removing doesn't shift indices
    for (var i = comp.numLayers; i >= 1; i--) {
      var l = comp.layer(i);
      if (l.name.indexOf("CAP_") === 0 || l.name === "CAPTIONS") {
        l.remove();
        removed++;
      }
    }

    app.endUndoGroup();
    return toJSON({ removed: removed });
  } catch (e) {
    app.endUndoGroup();
    return toJSON({ error: e.message });
  }
}
