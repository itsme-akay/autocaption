/**
 * node/transcribe.js
 * Runs inside CEP built-in Node.js via window.cep_node.require().
 *
 * transcribe(audioPath, modelPath, whisperBin, language, onProgress, callback)
 *   callback(err, segments)  where segments = [{text, start, end}]
 */

"use strict";

var childProcess = window.cep_node.require("child_process");
var fs           = window.cep_node.require("fs");
var path         = window.cep_node.require("path");
var os           = window.cep_node.require("os");

var execFile = childProcess.execFile;
var exec     = childProcess.exec;

function getTempBase() {
  return path.join(os.tmpdir(), "autocaption_" + Date.now());
}

function cleanup() {
  for (var i = 0; i < arguments.length; i++) {
    try { if (arguments[i] && fs.existsSync(arguments[i])) fs.unlinkSync(arguments[i]); }
    catch(e) {}
  }
}

function ffmpegExists(cb) {
  var paths = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  var idx = 0;
  function tryNext() {
    if (idx >= paths.length) {
      exec("which ffmpeg", function(e, stdout) { cb(e ? null : stdout.trim()); });
      return;
    }
    fs.access(paths[idx], fs.constants.X_OK, function(err) {
      if (!err) return cb(paths[idx]);
      idx++; tryNext();
    });
  }
  tryNext();
}

function tsToSeconds(ts) {
  if (!ts) return 0;
  var clean = ts.replace(",", ".");
  var parts = clean.split(":");
  if (parts.length !== 3) return 0;
  return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
}

function transcribe(audioPath, modelPath, whisperBin, language, onProgress, callback) {

  if (!fs.existsSync(audioPath))  return callback(new Error("Audio file not found:\n" + audioPath));
  if (!fs.existsSync(whisperBin)) return callback(new Error("whisper-mac binary not found:\n" + whisperBin + "\n\nSee README.md for setup."));
  if (!fs.existsSync(modelPath))  return callback(new Error("Whisper model not found:\n" + modelPath + "\n\nRun: bash bin/download-model.sh"));

  var tempBase = getTempBase();
  var wavPath  = tempBase + ".wav";

  ffmpegExists(function(ffmpegBin) {
    if (!ffmpegBin) return callback(new Error("ffmpeg not found.\n\nInstall: brew install ffmpeg"));

    onProgress("Converting audio to 16kHz WAV...");

    execFile(ffmpegBin, ["-y","-i",audioPath,"-ar","16000","-ac","1","-c:a","pcm_s16le",wavPath],
      function(ffErr, ffOut, ffStderr) {
        if (ffErr) { cleanup(wavPath); return callback(new Error("ffmpeg: " + (ffStderr || ffErr.message))); }

        onProgress("Starting Whisper...");

        try { fs.chmodSync(whisperBin, parseInt("0755",8)); } catch(e) {}

        var outBase = tempBase + "_out";
        var whisperArgs = ["-m",modelPath,"-f",wavPath,"-oj","-of",outBase,"--split-on-word","--no-prints","-pp"];
        if (language && language !== "auto") whisperArgs.push("-l", language);

        var proc = execFile(whisperBin, whisperArgs, { maxBuffer: 100*1024*1024 },
          function(wErr, wOut, wStderr) {
            cleanup(wavPath);
            if (wErr) { cleanup(outBase+".json"); return callback(new Error("Whisper: " + (wStderr || wErr.message))); }

            onProgress("Parsing transcript...");

            fs.readFile(outBase + ".json", "utf8", function(rErr, data) {
              cleanup(outBase + ".json");
              if (rErr) return callback(new Error("Cannot read output: " + rErr.message));

              try {
                var parsed   = JSON.parse(data);
                var segments = (parsed.transcription || [])
                  .map(function(s) {
                    return {
                      text:  (s.text || "").trim(),
                      start: tsToSeconds(s.timestamps && s.timestamps.from),
                      end:   tsToSeconds(s.timestamps && s.timestamps.to)
                    };
                  })
                  .filter(function(s) { return s.text.length > 0; });

                callback(null, segments);
              } catch(pe) {
                callback(new Error("Parse error: " + pe.message));
              }
            });
          });

        if (proc && proc.stderr) {
          proc.stderr.on("data", function(chunk) {
            var m = chunk.toString().match(/progress\s*=\s*(\d+)/i) || chunk.toString().match(/(\d+)%/);
            if (m) onProgress("Transcribing... " + m[1] + "%");
          });
        }
      });
  });
}

module.exports = { transcribe: transcribe };
