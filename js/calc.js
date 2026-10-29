/* Invoicer - pure logic shared by the browser and the tests. No DOM, no storage. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CURRENCIES = [
    ['USD', 'US dollar'], ['EUR', 'Euro'], ['GBP', 'British pound'], ['ILS', 'Israeli shekel'],
    ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['NZD', 'New Zealand dollar'],
    ['CHF', 'Swiss franc'], ['JPY', 'Japanese yen'], ['INR', 'Indian rupee'], ['SGD', 'Singapore dollar'],
    ['HKD', 'Hong Kong dollar'], ['SEK', 'Swedish krona'], ['NOK', 'Norwegian krone'], ['DKK', 'Danish krone'],
    ['PLN', 'Polish zloty'], ['CZK', 'Czech koruna'], ['BRL', 'Brazilian real'], ['MXN', 'Mexican peso'],
    ['ZAR', 'South African rand']
  ];
  var STATUSES = ['draft', 'sent', 'paid'];

  function toNumber(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    var n = parseFloat(String(v).replace(/,/g, '').trim());
    return isFinite(n) ? n : 0;
  }
  function isBlank(v) { return v === null || v === undefined || String(v).trim() === ''; }
  function isNumeric(v) { return !isBlank(v) && isFinite(parseFloat(String(v).replace(/,/g, ''))); }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function pad(n, width) { var s = String(n); while (s.length < width) s = '0' + s; return s; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function todayIso(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }
  function parseIso(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1] - 1 || d.getUTCDate() !== p[2]) return null;
    return d;
  }
  function addDays(iso, days) {
    var d = parseIso(iso);
    if (!d) return iso;
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function formatDate(iso, locale) {
    var d = parseIso(iso);
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat(locale || undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
    } catch (e) { return iso; }
  }
  function formatMoney(amount, currency, locale) {
    amount = round2(toNumber(amount));
    try {
      return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
    } catch (e) { return (currency || '') + ' ' + amount.toFixed(2); }
  }
  function formatNumber(prefix, n) {
    var num = Math.floor(toNumber(n));
    return (prefix || '') + pad(num >= 1 ? num : 1, 4);
  }
  function isValidEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim()); }

  function lineTotal(item) { return round2(toNumber(item.quantity) * toNumber(item.unitPrice)); }
  function isBlankItem(it) { return isBlank(it.description) && isBlank(it.quantity) && isBlank(it.unitPrice); }
  function cleanItems(items) { return (items || []).filter(function (it) { return !isBlankItem(it); }); }

  function totals(invoice) {
    var items = cleanItems(invoice.items);
    var subtotal = round2(items.reduce(function (s, it) { return s + lineTotal(it); }, 0));
    var d = invoice.discount || { type: 'percent', value: 0 };
    var discount = d.type === 'fixed'
      ? round2(clamp(toNumber(d.value), 0, subtotal))
      : round2(subtotal * clamp(toNumber(d.value), 0, 100) / 100);
    var taxable = round2(subtotal - discount);
    var taxRate = clamp(toNumber(invoice.taxRate), 0, 100);
    var tax = round2(taxable * taxRate / 100);
    var total = round2(taxable + tax);
    return { subtotal: subtotal, discount: discount, taxable: taxable, tax: tax, total: total, taxRate: taxRate, discountLabel: discountLabel(d, invoice.currency) };
  }
  function discountLabel(d, currency) {
    if (!d || !(toNumber(d.value) > 0)) return '';
    return d.type === 'fixed' ? 'Discount' : 'Discount (' + toNumber(d.value) + '%)';
  }

  function defaultSettings() {
    return { businessName: '', address: '', email: '', logoDataUrl: '', currency: 'USD', taxRate: 0, invoicePrefix: 'INV-', nextNumber: 1 };
  }
  function newItem() { return { description: '', quantity: 1, unitPrice: '' }; }
  function newInvoice(settings, today) {
    settings = settings || defaultSettings();
    today = today || todayIso();
    return {
      id: uid(), number: null, status: 'draft', issueDate: today, dueDate: addDays(today, 14),
      currency: settings.currency || 'USD',
      client: { name: '', email: '', address: '' },
      items: [newItem()],
      taxRate: toNumber(settings.taxRate),
      discount: { type: 'percent', value: 0 },
      notes: '', createdAt: null, updatedAt: null
    };
  }
  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
  function duplicateInvoice(inv, today) {
    today = today || todayIso();
    var copy = deepCopy(inv);
    var span = (parseIso(inv.dueDate) && parseIso(inv.issueDate)) ? Math.round((parseIso(inv.dueDate) - parseIso(inv.issueDate)) / 86400000) : 14;
    copy.id = uid();
    copy.number = null;
    copy.status = 'draft';
    copy.issueDate = today;
    copy.dueDate = addDays(today, span > 0 ? span : 14);
    copy.createdAt = null;
    copy.updatedAt = null;
    return copy;
  }

  function validateSettings(s) {
    var errors = {};
    if (isBlank(s.businessName)) errors.businessName = 'Enter your business name, or your own name.';
    if (isBlank(s.email)) errors.email = 'Enter the email clients should reply to.';
    else if (!isValidEmail(s.email)) errors.email = 'That does not look like an email address.';
    if (!isBlank(s.taxRate) && (!isNumeric(s.taxRate) || toNumber(s.taxRate) < 0 || toNumber(s.taxRate) > 100)) errors.taxRate = 'Tax rate must be between 0 and 100.';
    if (!CURRENCIES.some(function (c) { return c[0] === s.currency; })) errors.currency = 'Pick a currency.';
    var next = parseInt(s.nextNumber, 10);
    if (!(next >= 1) || String(s.nextNumber).indexOf('.') !== -1) errors.nextNumber = 'Next number must be a whole number, 1 or more.';
    if (String(s.invoicePrefix || '').length > 12) errors.invoicePrefix = 'Keep the prefix under 12 characters.';
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function validateInvoice(inv) {
    var errors = { items: [] };
    var client = inv.client || {};
    if (isBlank(client.name)) errors.clientName = 'Enter the client name.';
    if (!isBlank(client.email) && !isValidEmail(client.email)) errors.clientEmail = 'That does not look like an email address.';
    var items = cleanItems(inv.items);
    if (items.length === 0) errors.itemsEmpty = 'Add at least one line item.';
    (inv.items || []).forEach(function (it, i) {
      if (isBlankItem(it)) { errors.items[i] = null; return; }
      var e = {};
      if (isBlank(it.description)) e.description = 'Describe this line.';
      if (!isNumeric(it.quantity) || toNumber(it.quantity) <= 0) e.quantity = 'Quantity must be more than 0.';
      if (!isNumeric(it.unitPrice) || toNumber(it.unitPrice) < 0) e.unitPrice = 'Enter a price of 0 or more.';
      errors.items[i] = Object.keys(e).length ? e : null;
    });
    if (!parseIso(inv.issueDate)) errors.issueDate = 'Enter a valid issue date.';
    if (!parseIso(inv.dueDate)) errors.dueDate = 'Enter a valid due date.';
    else if (parseIso(inv.issueDate) && inv.dueDate < inv.issueDate) errors.dueDate = 'The due date cannot be before the issue date.';
    if (!isBlank(inv.taxRate) && (!isNumeric(inv.taxRate) || toNumber(inv.taxRate) < 0 || toNumber(inv.taxRate) > 100)) errors.taxRate = 'Tax rate must be between 0 and 100.';
    var d = inv.discount || {};
    if (!isBlank(d.value)) {
      if (!isNumeric(d.value) || toNumber(d.value) < 0) errors.discount = 'Discount must be 0 or more.';
      else if (d.type === 'percent' && toNumber(d.value) > 100) errors.discount = 'A percent discount cannot be more than 100.';
      else if (d.type === 'fixed' && items.length && toNumber(d.value) > totals({ items: items }).subtotal) errors.discount = 'The discount is more than the subtotal.';
    }
    var ok = !errors.clientName && !errors.clientEmail && !errors.itemsEmpty && !errors.issueDate && !errors.dueDate && !errors.taxRate && !errors.discount
      && errors.items.every(function (e) { return !e; });
    return { ok: ok, errors: errors };
  }
  function errorCount(v) {
    var n = 0;
    Object.keys(v.errors).forEach(function (k) {
      if (k === 'items') v.errors.items.forEach(function (e) { if (e) n += Object.keys(e).length; });
      else if (v.errors[k]) n += 1;
    });
    return n;
  }

  function displayNumber(inv, settings) {
    settings = settings || defaultSettings();
    return inv.number || formatNumber(settings.invoicePrefix, settings.nextNumber);
  }

  function summaryText(inv, settings, locale) {
    settings = settings || defaultSettings();
    var t = totals(inv);
    var cur = inv.currency || settings.currency;
    var m = function (n) { return formatMoney(n, cur, locale); };
    var lines = [];
    lines.push('Invoice ' + displayNumber(inv, settings));
    lines.push('From: ' + (settings.businessName || 'Your business'));
    lines.push('To: ' + ((inv.client && inv.client.name) || 'Client'));
    lines.push('Issued: ' + formatDate(inv.issueDate, locale) + '   Due: ' + formatDate(inv.dueDate, locale));
    lines.push('');
    cleanItems(inv.items).forEach(function (it) {
      lines.push('- ' + it.description + ': ' + toNumber(it.quantity) + ' x ' + m(it.unitPrice) + ' = ' + m(lineTotal(it)));
    });
    lines.push('');
    lines.push('Subtotal: ' + m(t.subtotal));
    if (t.discount > 0) lines.push(t.discountLabel + ': -' + m(t.discount));
    if (t.taxRate > 0) lines.push('Tax (' + t.taxRate + '%): ' + m(t.tax));
    lines.push('Total due: ' + m(t.total));
    if (!isBlank(inv.notes)) { lines.push(''); lines.push('Notes: ' + String(inv.notes).trim()); }
    if (!isBlank(settings.email)) { lines.push(''); lines.push('Questions? Reply to ' + settings.email); }
    return lines.join('\n');
  }

  function mailtoLink(inv, settings, locale) {
    settings = settings || defaultSettings();
    var subject = 'Invoice ' + displayNumber(inv, settings) + ' from ' + (settings.businessName || 'me');
    var body = summaryText(inv, settings, locale).replace(/\n/g, '\r\n');
    var email = (inv.client && inv.client.email) ? String(inv.client.email).trim() : '';
    var to = isValidEmail(email) ? encodeURIComponent(email).replace('%40', '@') : '';
    return 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function matchesSearch(inv, q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return true;
    var hay = [inv.number, inv.client && inv.client.name, inv.client && inv.client.email, inv.status].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }
  function isOverdue(inv, today) {
    today = today || todayIso();
    return inv.status !== 'paid' && !!parseIso(inv.dueDate) && inv.dueDate < today;
  }
  function sortInvoices(list) {
    return list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }
  function outstanding(list) {
    return list.filter(function (i) { return i.status !== 'paid'; }).length;
  }

  function parseBackup(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('not-json'); }
    if (!data || typeof data !== 'object' || data.version !== 1 || !data.settings || typeof data.settings !== 'object' || !Array.isArray(data.invoices)) {
      throw new Error('not-backup');
    }
    var invoices = data.invoices.filter(function (i) { return i && typeof i === 'object' && i.id; }).map(function (i) {
      var inv = Object.assign(newInvoice(data.settings), i);
      inv.client = Object.assign({ name: '', email: '', address: '' }, i.client || {});
      inv.items = Array.isArray(i.items) ? i.items : [];
      inv.discount = Object.assign({ type: 'percent', value: 0 }, i.discount || {});
      if (STATUSES.indexOf(inv.status) === -1) inv.status = 'draft';
      return inv;
    });
    return { version: 1, settings: Object.assign(defaultSettings(), data.settings), invoices: invoices, draft: null };
  }

  return {
    CURRENCIES: CURRENCIES, STATUSES: STATUSES,
    toNumber: toNumber, isBlank: isBlank, isNumeric: isNumeric, round2: round2, pad: pad, uid: uid,
    todayIso: todayIso, parseIso: parseIso, addDays: addDays, formatDate: formatDate, formatMoney: formatMoney,
    formatNumber: formatNumber, isValidEmail: isValidEmail,
    lineTotal: lineTotal, cleanItems: cleanItems, totals: totals,
    defaultSettings: defaultSettings, newItem: newItem, newInvoice: newInvoice, deepCopy: deepCopy, duplicateInvoice: duplicateInvoice,
    validateSettings: validateSettings, validateInvoice: validateInvoice, errorCount: errorCount,
    displayNumber: displayNumber, summaryText: summaryText, mailtoLink: mailtoLink,
    matchesSearch: matchesSearch, isOverdue: isOverdue, sortInvoices: sortInvoices, outstanding: outstanding,
    parseBackup: parseBackup
  };
});
