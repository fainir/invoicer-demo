/* Invoicer - localStorage wrapper with an in-memory fallback when storage is blocked. */
var Store = (function () {
  'use strict';
  var KEY = 'invoicer.v1';
  var mode = 'local';
  var memory = null;

  (function detect() {
    try {
      var t = KEY + '.test';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      mode = 'local';
    } catch (e) { mode = 'memory'; }
  })();

  function defaults() { return { version: 1, settings: Calc.defaultSettings(), invoices: [], draft: null }; }

  function normalize(data) {
    if (!data || typeof data !== 'object' || data.version !== 1) return defaults();
    data.settings = Object.assign(Calc.defaultSettings(), data.settings || {});
    data.invoices = Array.isArray(data.invoices) ? data.invoices : [];
    if (!data.draft || typeof data.draft !== 'object') data.draft = null;
    return data;
  }

  function load() {
    if (mode === 'memory') return memory || (memory = defaults());
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { mode = 'memory'; return memory || (memory = defaults()); }
    if (!raw) return defaults();
    try { return normalize(JSON.parse(raw)); } catch (e) { return defaults(); }
  }

  function isQuotaError(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }

  function save(data) {
    memory = data;
    if (mode === 'memory') return { ok: true, persisted: false };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return { ok: true, persisted: true };
    } catch (e) {
      return { ok: false, persisted: false, reason: isQuotaError(e) ? 'quota' : 'blocked' };
    }
  }

  function clear() {
    memory = null;
    try { window.localStorage.removeItem(KEY); } catch (e) { /* storage blocked: nothing to clear */ }
  }

  return { KEY: KEY, mode: function () { return mode; }, load: load, save: save, clear: clear, defaults: defaults };
})();
