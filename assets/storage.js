(function () {
  "use strict";
  const prefix = "llmstudy.";
  function read(name, fallback) {
    try { const raw = localStorage.getItem(prefix + name); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }
  function write(name, value) {
    try { localStorage.setItem(prefix + name, JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  function getProgress() { return read("progress", {}); }
  function setProgress(chapter, complete) { const progress = getProgress(); progress[chapter] = Boolean(complete); write("progress", progress); return progress; }
  function getSrs() { return read("flashcards.srs", {}); }
  function setSrs(id, bucket) { const srs = getSrs(); srs[id] = { bucket, lastSeen: new Date().toISOString() }; write("flashcards.srs", srs); return srs[id]; }
  function attempts(part) { const all = read("quiz.attempts", {}); return all[part] || []; }
  function addAttempt(part, score, total, missed) { const all = read("quiz.attempts", {}); all[part] = all[part] || []; all[part].push({ date:new Date().toISOString(), score, total, missed:missed || [] }); write("quiz.attempts", all); }
  function prefs() { return read("prefs", { reducedMotion:"auto", fontScale:1 }); }
  function setPrefs(next) { write("prefs", Object.assign(prefs(), next)); }
  function lastVisited() { return read("lastVisited", null); }
  function setLastVisited(page, hash) { write("lastVisited", { page, hash:hash || "" }); }
  window.LLMSTUDY_STORAGE = { read, write, getProgress, setProgress, getSrs, setSrs, attempts, addAttempt, prefs, setPrefs, lastVisited, setLastVisited };
}());
