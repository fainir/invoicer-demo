/* Invoicer - UI. Hash routes: #/invoices, #/new, #/edit/<id>, #/settings. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl2br(s) { return esc(s).replace(/\r?\n/g, '<br>'); }
  function money(n, cur) { return Calc.formatMoney(n, cur || state.settings.currency); }
  function dateText(iso) { return Calc.formatDate(iso); }

  var state = Store.load();
  var main = $('#main');
  var toastEl = $('#toast');
  var bannerEl = $('#banner');
  var dialog = $('#confirm-dialog');
  var toastTimer = null;
  var draftTimer = null;
  var pendingDelete = null;
  var firstRender = true;
  var searchQuery = '';
  var editor = null;      // { id, invoice, errors, restored }
  var settingsForm = null; // { settings, errors, logoError }
  var lastFocusBeforeDialog = null;
  var bannerJustShown = false;

  /* ---------- persistence, banner, toast ---------- */

  function persist() {
    var r = Store.save(state);
    if (!r.ok) {
      showBanner(r.reason === 'quota'
        ? 'Could not save: this browser\'s storage is full. Remove the logo in Settings or delete old invoices, then try again.'
        : 'Could not save: this browser is blocking site storage. Your changes will be lost when you close the tab.');
    }
    return r.ok;
  }

  function showBanner(msg) {
    bannerEl.innerHTML = '<p>' + esc(msg) + '</p><button type="button" class="btn btn-ghost btn-small" data-action="dismiss-banner">Dismiss</button>';
    bannerEl.hidden = false;
    bannerJustShown = true;
    bannerEl.scrollIntoView({ block: 'start', behavior: 'instant' });
    bannerEl.focus();
  }
  function hideBanner() { bannerEl.hidden = true; bannerEl.innerHTML = ''; }

  function toast(msg, opts) {
    opts = opts || {};
    clearTimeout(toastTimer);
    toastEl.innerHTML = '<span class="toast-msg">' + esc(msg) + '</span>'
      + (opts.actionLabel ? '<button type="button" class="btn btn-small btn-toast" data-action="toast-action">' + esc(opts.actionLabel) + '</button>' : '')
      + '<button type="button" class="toast-close" data-action="toast-close" aria-label="Dismiss message">&times;</button>';
    toastEl.hidden = false;
    toastEl._onAction = opts.onAction || null;
    toastEl._onExpire = opts.onExpire || null;
    toastTimer = setTimeout(function () { var cb = toastEl._onExpire; hideToast(); if (cb) cb(); }, opts.duration || 7000);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    toastEl.hidden = true;
    toastEl.innerHTML = '';
    toastEl._onAction = null;
    toastEl._onExpire = null;
  }

  function businessSetUp() { return !Calc.isBlank(state.settings.businessName); }

  /* ---------- routing ---------- */

  function route() {
    var hash = location.hash || '#/invoices';
    var m;
    if (hash === '#/new') return { view: 'editor', id: null };
    if ((m = hash.match(/^#\/edit\/([\w-]+)$/))) return { view: 'editor', id: m[1] };
    if (hash === '#/settings') return { view: 'settings' };
    return { view: 'invoices' };
  }

  function render() {
    var r = route();
    $$('[data-nav]').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      var active = r.view === 'editor' ? key === 'new' : key === r.view;
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (editor && draftTimer) saveDraftNow();
    editor = null;
    settingsForm = null;
    if (r.view === 'editor') renderEditor(r.id);
    else if (r.view === 'settings') renderSettings();
    else renderInvoices();
    if (!firstRender) {
      var h = $('h1', main);
      if (!bannerEl.hidden && bannerJustShown) bannerEl.focus();
      else if (h) h.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    bannerJustShown = false;
    firstRender = false;
  }

  /* ---------- invoices list ---------- */

  function renderInvoices() {
    document.title = 'Invoices - Invoicer';
    var all = Calc.sortInvoices(state.invoices);
    main.innerHTML =
      '<div class="page">' +
        '<div class="page-head">' +
          '<h1 class="page-title" tabindex="-1">Invoices</h1>' +
        '</div>' +
        (all.length ?
          '<div class="list-tools">' +
            '<div class="field search-field">' +
              '<label for="search">Search invoices</label>' +
              '<input type="search" id="search" name="search" placeholder="Number, client or status" value="' + esc(searchQuery) + '" autocomplete="off">' +
            '</div>' +
            '<p class="muted list-summary" id="list-summary" aria-live="polite"></p>' +
          '</div>' +
          '<ul class="invoice-list" id="invoice-list" aria-label="Saved invoices"></ul>'
        :
          '<div class="empty">' +
            '<h2>No invoices yet</h2>' +
            '<p>Create your first invoice. It takes about two minutes, and it stays in this browser.</p>' +
            '<a class="btn btn-primary" href="#/new">Create an invoice</a>' +
            (businessSetUp() ? '' : '<p class="muted">Tip: add your business details in <a href="#/settings">Settings</a> first so they appear on every invoice.</p>') +
          '</div>') +
      '</div>';
    if (all.length) renderInvoiceRows();
  }

  function renderInvoiceRows() {
    var list = $('#invoice-list');
    var summary = $('#list-summary');
    if (!list) return;
    var all = Calc.sortInvoices(state.invoices);
    var shown = all.filter(function (i) { return Calc.matchesSearch(i, searchQuery); });
    var today = Calc.todayIso();
    summary.textContent = searchQuery
      ? shown.length + ' of ' + all.length + ' invoices match'
      : all.length + (all.length === 1 ? ' invoice' : ' invoices') + ', ' + Calc.outstanding(all) + ' not paid yet';
    if (!shown.length) {
      list.innerHTML = '<li class="empty empty-inline">' +
        '<p>No invoices match <q>' + esc(searchQuery) + '</q>. Try a number like ' + esc(Calc.formatNumber(state.settings.invoicePrefix, 1)) + ', part of the client name, or a status.</p>' +
        '<button type="button" class="btn btn-secondary" data-action="clear-search">Clear search</button></li>';
      return;
    }
    list.innerHTML = shown.map(function (inv) {
      var t = Calc.totals(inv);
      var overdue = Calc.isOverdue(inv, today);
      return '<li class="invoice-row status-' + esc(inv.status) + '" data-id="' + esc(inv.id) + '">' +
        '<div class="row-main">' +
          '<a class="row-number" href="#/edit/' + esc(inv.id) + '">' + esc(inv.number) + '</a>' +
          '<span class="row-client">' + esc(inv.client.name || 'No client') + '</span>' +
        '</div>' +
        '<div class="row-meta">' +
          '<span class="row-due">Due ' + esc(dateText(inv.dueDate)) + '</span>' +
          (overdue ? '<span class="badge badge-overdue">Overdue</span>' : '') +
        '</div>' +
        '<div class="row-total">' + esc(money(t.total, inv.currency)) + '</div>' +
        '<div class="row-status">' +
          '<label class="sr-only" for="status-' + esc(inv.id) + '">Status of ' + esc(inv.number) + '</label>' +
          '<select id="status-' + esc(inv.id) + '" class="status-select status-' + esc(inv.status) + '" data-action="status" data-id="' + esc(inv.id) + '">' +
            Calc.STATUSES.map(function (s) { return '<option value="' + s + '"' + (s === inv.status ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="row-actions">' +
          '<a class="btn btn-small btn-secondary" href="#/edit/' + esc(inv.id) + '" aria-label="Open ' + esc(inv.number) + '">Open</a>' +
          '<button type="button" class="btn btn-small btn-secondary" data-action="duplicate" data-id="' + esc(inv.id) + '" aria-label="Duplicate ' + esc(inv.number) + '">Duplicate</button>' +
          '<button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="' + esc(inv.id) + '" aria-label="Delete ' + esc(inv.number) + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function findInvoice(id) {
    for (var i = 0; i < state.invoices.length; i++) if (state.invoices[i].id === id) return state.invoices[i];
    return null;
  }

  function setStatus(id, status) {
    var inv = findInvoice(id);
    if (!inv || Calc.STATUSES.indexOf(status) === -1) return;
    inv.status = status;
    inv.updatedAt = Date.now();
    persist();
    renderInvoiceRows();
    toast(inv.number + ' marked as ' + status + '.');
  }

  function duplicateInvoice(id) {
    var src = findInvoice(id);
    if (!src) return;
    var copy = Calc.duplicateInvoice(src);
    assignNumber(copy);
    copy.createdAt = Date.now();
    copy.updatedAt = copy.createdAt;
    state.invoices.push(copy);
    persist();
    renderInvoiceRows();
    toast('Duplicated as ' + copy.number + '.', { actionLabel: 'Open', onAction: function () { location.hash = '#/edit/' + copy.id; } });
  }

  function deleteInvoice(id) {
    var idx = -1;
    for (var i = 0; i < state.invoices.length; i++) if (state.invoices[i].id === id) idx = i;
    if (idx === -1) return;
    if (pendingDelete) pendingDelete = null; // the previous delete is final once another starts
    var removed = state.invoices.splice(idx, 1)[0];
    pendingDelete = { invoice: removed, index: idx };
    persist();
    renderInvoiceRows();
    if (!state.invoices.length) renderInvoices();
    toast('Deleted ' + removed.number + '.', {
      actionLabel: 'Undo',
      onAction: function () {
        if (!pendingDelete) return;
        state.invoices.splice(Math.min(pendingDelete.index, state.invoices.length), 0, pendingDelete.invoice);
        pendingDelete = null;
        persist();
        if (route().view === 'invoices') renderInvoices();
        toast('Restored ' + removed.number + '.');
      },
      onExpire: function () { pendingDelete = null; }
    });
  }

  /* ---------- editor ---------- */

  function assignNumber(inv) {
    if (inv.number) return;
    inv.number = Calc.formatNumber(state.settings.invoicePrefix, state.settings.nextNumber);
    state.settings.nextNumber = Math.floor(Calc.toNumber(state.settings.nextNumber) || 1) + 1;
  }

  function renderEditor(id) {
    var existing = id ? findInvoice(id) : null;
    if (id && !existing) {
      document.title = 'Invoice not found - Invoicer';
      main.innerHTML = '<div class="page"><h1 class="page-title" tabindex="-1">Invoice not found</h1>' +
        '<p>This invoice may have been deleted. <a href="#/invoices">Back to invoices</a></p></div>';
      return;
    }
    var draft = state.draft;
    var restored = false;
    var inv;
    if (draft && draft.forId === (id || null) && draft.invoice && typeof draft.invoice === 'object') {
      inv = Calc.deepCopy(draft.invoice);
      restored = true;
    } else {
      inv = existing ? Calc.deepCopy(existing) : Calc.newInvoice(state.settings);
    }
    if (existing) { inv.id = existing.id; inv.number = existing.number; }
    editor = { id: id || null, invoice: inv, errors: null, restored: restored };
    document.title = (existing ? existing.number : 'New invoice') + ' - Invoicer';
    var s = state.settings;
    main.innerHTML =
      '<div class="page editor">' +
        '<div class="editor-form">' +
          '<div class="page-head">' +
            '<h1 class="page-title" tabindex="-1">' + (existing ? esc(existing.number) : 'New invoice') + '</h1>' +
            '<p class="muted">' + (existing
              ? esc(existing.status.charAt(0).toUpperCase() + existing.status.slice(1)) + ' - last saved ' + esc(new Date(existing.updatedAt || existing.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
              : 'Will be numbered ' + esc(Calc.displayNumber(inv, s)) + ' when you save.') + '</p>' +
          '</div>' +
          (businessSetUp() ? '' :
            '<div class="notice"><p>Add your business details so they appear on this invoice.</p><a class="btn btn-secondary btn-small" href="#/settings">Open Settings</a></div>') +
          (restored ?
            '<div class="notice" role="status" id="restored-notice"><p>Restored the changes you had not saved.</p><button type="button" class="btn btn-ghost btn-small" data-action="discard-draft">Discard them</button></div>' : '') +
          '<form id="invoice-form" novalidate>' +
            '<fieldset><legend>Client</legend>' +
              field('clientName', 'Client name', 'text', inv.client.name, { required: true, autocomplete: 'organization', placeholder: 'Acme Studio' }) +
              field('clientEmail', 'Client email', 'email', inv.client.email, { autocomplete: 'off', placeholder: 'billing@acme.com', hint: 'Used for the Email invoice button.' }) +
              textarea('clientAddress', 'Client address', inv.client.address, { rows: 2, placeholder: '12 Market St, Springfield' }) +
            '</fieldset>' +
            '<fieldset><legend>Dates and currency</legend>' +
              '<div class="field-row">' +
                field('issueDate', 'Issue date', 'date', inv.issueDate, { required: true }) +
                field('dueDate', 'Due date', 'date', inv.dueDate, { required: true }) +
                select('currency', 'Currency', inv.currency, Calc.CURRENCIES.map(function (c) { return [c[0], c[0] + ' - ' + c[1]]; })) +
              '</div>' +
            '</fieldset>' +
            '<fieldset class="items-fieldset"><legend>Line items</legend>' +
              '<div class="items-head" aria-hidden="true"><span>Description</span><span>Qty</span><span>Unit price</span><span>Amount</span><span></span></div>' +
              '<div id="items"></div>' +
              '<p id="items-error" class="field-error" hidden></p>' +
              '<button type="button" class="btn btn-secondary" data-action="add-item">Add line</button>' +
            '</fieldset>' +
            '<fieldset><legend>Discount and tax</legend>' +
              '<div class="field-row">' +
                select('discountType', 'Discount type', inv.discount.type, [['percent', 'Percent'], ['fixed', 'Fixed amount']]) +
                field('discountValue', 'Discount', 'number', inv.discount.value, { min: 0, step: 'any', inputmode: 'decimal' }) +
                field('taxRate', 'Tax rate (%)', 'number', inv.taxRate, { min: 0, max: 100, step: 'any', inputmode: 'decimal' }) +
              '</div>' +
            '</fieldset>' +
            '<fieldset><legend>Notes</legend>' +
              textarea('notes', 'Notes for the client', inv.notes, { rows: 3, placeholder: 'Payment details, thanks, terms' }) +
            '</fieldset>' +
            '<p id="form-error" class="form-error" role="alert" hidden></p>' +
            '<div class="actions editor-actions">' +
              '<button type="submit" class="btn btn-primary">Save invoice</button>' +
              '<button type="button" class="btn btn-secondary" data-action="print">Download PDF</button>' +
              '<button type="button" class="btn btn-secondary" data-action="copy-summary">Copy summary</button>' +
              '<a class="btn btn-secondary" id="email-link" data-action="email" href="#">Email invoice</a>' +
              (existing ? '<a class="btn btn-ghost" href="#/invoices">Back to invoices</a>' : '') +
            '</div>' +
          '</form>' +
        '</div>' +
        '<aside class="editor-preview" aria-label="Invoice preview">' +
          '<h2 class="preview-title" tabindex="-1">Preview</h2>' +
          '<div id="preview" class="invoice-doc"></div>' +
        '</aside>' +
        '<div class="editor-bar" aria-hidden="false">' +
          '<span class="editor-bar-total"><span class="muted">Total</span> <strong id="bar-total"></strong></span>' +
          '<button type="button" class="btn btn-secondary btn-small" data-action="scroll-preview">Preview</button>' +
          '<button type="submit" form="invoice-form" class="btn btn-primary btn-small">Save</button>' +
        '</div>' +
      '</div>';
    renderItems();
    renderPreview();
  }

  function field(name, label, type, value, o) {
    o = o || {};
    var id = 'f-' + name;
    return '<div class="field">' +
      '<label for="' + id + '">' + esc(label) + (o.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
      '<input id="' + id + '" name="' + name + '" type="' + type + '" value="' + esc(value === null || value === undefined ? '' : value) + '"' +
        (o.required ? ' required aria-required="true"' : '') +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
        (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
        (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
        (o.min !== undefined ? ' min="' + o.min + '"' : '') +
        (o.max !== undefined ? ' max="' + o.max + '"' : '') +
        (o.step !== undefined ? ' step="' + o.step + '"' : '') +
        (o.accept ? ' accept="' + o.accept + '"' : '') +
        ' aria-describedby="' + id + '-err' + (o.hint ? ' ' + id + '-hint' : '') + '">' +
      (o.hint ? '<p class="hint" id="' + id + '-hint">' + esc(o.hint) + '</p>' : '') +
      '<p class="field-error" id="' + id + '-err" hidden></p>' +
    '</div>';
  }
  function textarea(name, label, value, o) {
    o = o || {};
    var id = 'f-' + name;
    return '<div class="field">' +
      '<label for="' + id + '">' + esc(label) + '</label>' +
      '<textarea id="' + id + '" name="' + name + '" rows="' + (o.rows || 3) + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + ' aria-describedby="' + id + '-err">' + esc(value) + '</textarea>' +
      '<p class="field-error" id="' + id + '-err" hidden></p>' +
    '</div>';
  }
  function select(name, label, value, options) {
    var id = 'f-' + name;
    return '<div class="field">' +
      '<label for="' + id + '">' + esc(label) + '</label>' +
      '<select id="' + id + '" name="' + name + '" aria-describedby="' + id + '-err">' +
        options.map(function (opt) { return '<option value="' + esc(opt[0]) + '"' + (opt[0] === value ? ' selected' : '') + '>' + esc(opt[1]) + '</option>'; }).join('') +
      '</select>' +
      '<p class="field-error" id="' + id + '-err" hidden></p>' +
    '</div>';
  }

  function renderItems() {
    var wrap = $('#items');
    if (!wrap || !editor) return;
    var inv = editor.invoice;
    wrap.innerHTML = inv.items.map(function (it, i) {
      var n = i + 1;
      return '<div class="item-row" data-index="' + i + '">' +
        '<div class="field item-desc">' +
          '<label for="item-desc-' + i + '" class="item-label">Description</label>' +
          '<input id="item-desc-' + i + '" type="text" data-item="description" data-index="' + i + '" value="' + esc(it.description) + '" placeholder="Logo design" aria-describedby="item-desc-err-' + i + '">' +
          '<p class="field-error" id="item-desc-err-' + i + '" hidden></p>' +
        '</div>' +
        '<div class="field item-qty">' +
          '<label for="item-qty-' + i + '" class="item-label">Qty</label>' +
          '<input id="item-qty-' + i + '" type="number" inputmode="decimal" min="0" step="any" data-item="quantity" data-index="' + i + '" value="' + esc(it.quantity) + '" aria-describedby="item-qty-err-' + i + '">' +
          '<p class="field-error" id="item-qty-err-' + i + '" hidden></p>' +
        '</div>' +
        '<div class="field item-price">' +
          '<label for="item-price-' + i + '" class="item-label">Unit price</label>' +
          '<input id="item-price-' + i + '" type="number" inputmode="decimal" min="0" step="0.01" data-item="unitPrice" data-index="' + i + '" value="' + esc(it.unitPrice) + '" placeholder="0.00" aria-describedby="item-price-err-' + i + '">' +
          '<p class="field-error" id="item-price-err-' + i + '" hidden></p>' +
        '</div>' +
        '<div class="item-total"><span class="item-label">Amount</span><output id="item-total-' + i + '" for="item-qty-' + i + ' item-price-' + i + '">' + esc(money(Calc.lineTotal(it), inv.currency)) + '</output></div>' +
        '<button type="button" class="btn btn-icon btn-remove" data-action="remove-item" data-index="' + i + '" aria-label="Remove line ' + n + '"' + (inv.items.length === 1 ? ' disabled title="An invoice needs at least one line"' : '') + '>' +
          '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>';
    }).join('');
    if (editor.errors) showInvoiceErrors();
  }

  function renderPreview() {
    var el = $('#preview');
    if (!el || !editor) return;
    el.innerHTML = invoiceDocHtml(editor.invoice, state.settings);
    var bar = $('#bar-total');
    if (bar) bar.textContent = money(Calc.totals(editor.invoice).total, editor.invoice.currency);
    var link = $('#email-link');
    if (link) link.href = Calc.mailtoLink(editor.invoice, state.settings);
  }

  function invoiceDocHtml(inv, s) {
    var t = Calc.totals(inv);
    var cur = inv.currency || s.currency;
    var items = Calc.cleanItems(inv.items);
    return '<header class="doc-head">' +
        '<div class="doc-from">' +
          (s.logoDataUrl ? '<img class="doc-logo" src="' + esc(s.logoDataUrl) + '" alt="">' : '') +
          '<p><strong>' + esc(s.businessName || 'Your business name') + '</strong>' +
          (s.address ? '<br>' + nl2br(s.address) : '') +
          (s.email ? '<br>' + esc(s.email) : '') + '</p>' +
        '</div>' +
        '<div class="doc-title">' +
          '<h2 class="doc-h">Invoice</h2>' +
          '<dl class="doc-meta">' +
            '<div><dt>Number</dt><dd>' + esc(Calc.displayNumber(inv, s)) + '</dd></div>' +
            '<div><dt>Issued</dt><dd>' + esc(dateText(inv.issueDate) || '-') + '</dd></div>' +
            '<div><dt>Due</dt><dd>' + esc(dateText(inv.dueDate) || '-') + '</dd></div>' +
          '</dl>' +
        '</div>' +
      '</header>' +
      '<section class="doc-billto"><h3>Bill to</h3><p>' +
        '<strong>' + esc(inv.client.name || 'Client name') + '</strong>' +
        (inv.client.address ? '<br>' + nl2br(inv.client.address) : '') +
        (inv.client.email ? '<br>' + esc(inv.client.email) : '') +
      '</p></section>' +
      '<div class="doc-items-wrap"><table class="doc-items"><thead><tr><th scope="col">Description</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Amount</th></tr></thead><tbody>' +
        (items.length ? items.map(function (it) {
          return '<tr><td>' + esc(it.description || '-') + '</td><td class="num">' + esc(Calc.toNumber(it.quantity)) + '</td><td class="num">' + esc(money(it.unitPrice, cur)) + '</td><td class="num">' + esc(money(Calc.lineTotal(it), cur)) + '</td></tr>';
        }).join('') : '<tr><td colspan="4" class="doc-empty">No line items yet</td></tr>') +
      '</tbody></table></div>' +
      '<div class="doc-totals"><dl>' +
        '<div><dt>Subtotal</dt><dd>' + esc(money(t.subtotal, cur)) + '</dd></div>' +
        (t.discount > 0 ? '<div><dt>' + esc(t.discountLabel) + '</dt><dd>-' + esc(money(t.discount, cur)) + '</dd></div>' : '') +
        (t.taxRate > 0 ? '<div><dt>Tax (' + esc(t.taxRate) + '%)</dt><dd>' + esc(money(t.tax, cur)) + '</dd></div>' : '') +
        '<div class="grand"><dt>Total due</dt><dd>' + esc(money(t.total, cur)) + '</dd></div>' +
      '</dl></div>' +
      (Calc.isBlank(inv.notes) ? '' : '<section class="doc-notes"><h3>Notes</h3><p>' + nl2br(inv.notes) + '</p></section>') +
      '<footer class="doc-foot"><p>Thank you for your business.' + (s.email ? ' Questions? Reply to ' + esc(s.email) + '.' : '') + '</p></footer>';
  }

  function readEditorField(target) {
    var inv = editor.invoice;
    var item = target.getAttribute('data-item');
    if (item) {
      var idx = parseInt(target.getAttribute('data-index'), 10);
      if (inv.items[idx]) {
        inv.items[idx][item] = target.value;
        var out = $('#item-total-' + idx);
        if (out) out.textContent = money(Calc.lineTotal(inv.items[idx]), inv.currency);
      }
      return;
    }
    switch (target.name) {
      case 'clientName': inv.client.name = target.value; break;
      case 'clientEmail': inv.client.email = target.value; break;
      case 'clientAddress': inv.client.address = target.value; break;
      case 'issueDate': inv.issueDate = target.value; break;
      case 'dueDate': inv.dueDate = target.value; break;
      case 'currency': inv.currency = target.value; renderItems(); break;
      case 'discountType': inv.discount.type = target.value; break;
      case 'discountValue': inv.discount.value = target.value; break;
      case 'taxRate': inv.taxRate = target.value; break;
      case 'notes': inv.notes = target.value; break;
    }
  }

  function saveDraftNow() {
    clearTimeout(draftTimer);
    draftTimer = null;
    if (!editor) return;
    state.draft = { forId: editor.id, invoice: Calc.deepCopy(editor.invoice), savedAt: Date.now() };
    persist();
  }
  function cancelDraftSave() {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  function scheduleDraftSave() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 250);
  }
  window.addEventListener('pagehide', function () { if (draftTimer) saveDraftNow(); });

  function setFieldError(id, msg) {
    var input = $('#' + id);
    var err = $('#' + id + '-err') || $('#' + id.replace(/^item-(\w+)-(\d+)$/, 'item-$1-err-$2'));
    if (!input) return;
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = msg; err.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (err) { err.textContent = ''; err.hidden = true; }
    }
  }

  function showInvoiceErrors() {
    var e = editor.errors || { items: [] };
    setFieldError('f-clientName', e.clientName);
    setFieldError('f-clientEmail', e.clientEmail);
    setFieldError('f-issueDate', e.issueDate);
    setFieldError('f-dueDate', e.dueDate);
    setFieldError('f-taxRate', e.taxRate);
    setFieldError('f-discountValue', e.discount);
    editor.invoice.items.forEach(function (it, i) {
      var ie = (e.items && e.items[i]) || {};
      setFieldError('item-desc-' + i, ie.description);
      setFieldError('item-qty-' + i, ie.quantity);
      setFieldError('item-price-' + i, ie.unitPrice);
    });
    var itemsErr = $('#items-error');
    if (itemsErr) { itemsErr.textContent = e.itemsEmpty || ''; itemsErr.hidden = !e.itemsEmpty; }
    var formErr = $('#form-error');
    var count = editor.errors ? Calc.errorCount({ errors: e }) : 0;
    if (formErr) {
      formErr.textContent = count ? 'Fix the ' + (count === 1 ? 'highlighted field' : count + ' highlighted fields') + ' to save this invoice.' : '';
      formErr.hidden = !count;
    }
  }

  function saveInvoice() {
    var inv = editor.invoice;
    var v = Calc.validateInvoice(inv);
    if (!v.ok) {
      editor.errors = v.errors;
      showInvoiceErrors();
      var first = $('[aria-invalid="true"]', main);
      if (first) first.focus();
      return;
    }
    editor.errors = null;
    showInvoiceErrors();
    inv.items = Calc.cleanItems(inv.items);
    inv.taxRate = Calc.toNumber(inv.taxRate);
    inv.discount.value = Calc.toNumber(inv.discount.value);
    inv.client.name = inv.client.name.trim();
    inv.client.email = inv.client.email.trim();
    var now = Date.now();
    var existing = findInvoice(editor.id || inv.id);
    if (existing) {
      inv.status = existing.status;
      inv.createdAt = existing.createdAt;
      inv.updatedAt = now;
      state.invoices[state.invoices.indexOf(existing)] = inv;
    } else {
      assignNumber(inv);
      inv.createdAt = now;
      inv.updatedAt = now;
      state.invoices.push(inv);
    }
    state.draft = null;
    cancelDraftSave();
    editor.id = inv.id;
    var saved = persist();
    if (saved) toast('Saved ' + inv.number + '.');
    if (existing) render();
    else location.replace('#/edit/' + inv.id);
  }

  var titleBeforePrint = null;
  function setPrintTitle() {
    if (!editor || titleBeforePrint !== null) return;
    titleBeforePrint = document.title;
    document.title = Calc.displayNumber(editor.invoice, state.settings);
  }
  function restorePrintTitle() {
    if (titleBeforePrint === null) return;
    document.title = titleBeforePrint;
    titleBeforePrint = null;
  }
  window.addEventListener('beforeprint', setPrintTitle);
  window.addEventListener('afterprint', restorePrintTitle);
  function printInvoice() {
    setPrintTitle();
    window.print();
    setTimeout(restorePrintTitle, 2000);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy-failed'));
    });
  }

  function offerMarkSent(message) {
    var existing = editor && editor.id ? findInvoice(editor.id) : null;
    if (existing && existing.status === 'draft') {
      toast(message + ' Mark ' + existing.number + ' as sent?', {
        actionLabel: 'Mark as sent',
        onAction: function () { existing.status = 'sent'; existing.updatedAt = Date.now(); persist(); render(); toast(existing.number + ' marked as sent.'); }
      });
    } else toast(message);
  }

  function copySummary() {
    var text = Calc.summaryText(editor.invoice, state.settings);
    copyText(text).then(function () { offerMarkSent('Summary copied.'); }, function () {
      toast('Could not copy automatically. Select the preview and copy it instead.');
    });
  }

  /* ---------- settings ---------- */

  function renderSettings() {
    document.title = 'Settings - Invoicer';
    var s = settingsForm ? settingsForm.settings : Calc.deepCopy(state.settings);
    settingsForm = { settings: s, errors: null, logoError: '' };
    main.innerHTML =
      '<div class="page page-narrow">' +
        '<div class="page-head"><h1 class="page-title" tabindex="-1">Settings</h1></div>' +
        '<form id="settings-form" novalidate>' +
          '<fieldset><legend>Your business</legend>' +
            field('businessName', 'Business name', 'text', s.businessName, { required: true, autocomplete: 'organization', placeholder: 'Jane Doe Design' }) +
            textarea('address', 'Address', s.address, { rows: 3, placeholder: '12 Market St\nSpringfield 12345' }) +
            field('email', 'Email', 'email', s.email, { required: true, autocomplete: 'email', placeholder: 'jane@example.com', hint: 'Printed on invoices and used as the reply address.' }) +
          '</fieldset>' +
          '<fieldset><legend>Logo</legend>' +
            '<div class="logo-field">' +
              '<div id="logo-preview" class="logo-preview">' + (s.logoDataUrl ? '<img src="' + esc(s.logoDataUrl) + '" alt="Your logo">' : '<span class="muted">No logo</span>') + '</div>' +
              '<div class="field">' +
                '<label for="f-logo">Logo image (PNG, JPG or SVG, up to 300 KB)</label>' +
                '<input id="f-logo" name="logo" type="file" accept="image/*" aria-describedby="f-logo-err">' +
                '<p class="field-error" id="f-logo-err" hidden></p>' +
                (s.logoDataUrl ? '<button type="button" class="btn btn-ghost btn-small" data-action="remove-logo">Remove logo</button>' : '') +
              '</div>' +
            '</div>' +
          '</fieldset>' +
          '<fieldset><legend>Invoice defaults</legend>' +
            '<div class="field-row">' +
              select('currency', 'Default currency', s.currency, Calc.CURRENCIES.map(function (c) { return [c[0], c[0] + ' - ' + c[1]]; })) +
              field('taxRate', 'Default tax rate (%)', 'number', s.taxRate, { min: 0, max: 100, step: 'any', inputmode: 'decimal' }) +
            '</div>' +
            '<div class="field-row">' +
              field('invoicePrefix', 'Invoice number prefix', 'text', s.invoicePrefix, { placeholder: 'INV-' }) +
              field('nextNumber', 'Next invoice number', 'number', s.nextNumber, { min: 1, step: 1, inputmode: 'numeric', hint: 'The next invoice will be ' + Calc.formatNumber(s.invoicePrefix, s.nextNumber) + '.' }) +
            '</div>' +
          '</fieldset>' +
          '<p id="form-error" class="form-error" role="alert" hidden></p>' +
          '<div class="actions"><button type="submit" class="btn btn-primary">Save settings</button></div>' +
        '</form>' +
        '<section class="data-section" aria-labelledby="data-title">' +
          '<h2 id="data-title">Your data</h2>' +
          '<p>Everything is stored in this browser only. Download a backup before clearing browser data or moving to another computer.</p>' +
          '<div class="actions">' +
            '<button type="button" class="btn btn-secondary" data-action="export">Download backup</button>' +
            '<div class="field field-inline"><label for="f-restore">Restore from a backup file</label><input id="f-restore" type="file" accept="application/json,.json" aria-describedby="f-restore-err"><p class="field-error" id="f-restore-err" hidden></p></div>' +
          '</div>' +
          '<div class="actions"><button type="button" class="btn btn-danger" data-action="delete-all">Delete all data</button></div>' +
          '<p class="muted">Storage: ' + (Store.mode() === 'local' ? 'this browser\'s local storage.' : 'memory only; this browser is blocking site storage.') + ' See the <a href="privacy.html">privacy note</a>.</p>' +
        '</section>' +
      '</div>';
  }

  function readSettingsField(target) {
    var s = settingsForm.settings;
    switch (target.name) {
      case 'businessName': s.businessName = target.value; break;
      case 'address': s.address = target.value; break;
      case 'email': s.email = target.value; break;
      case 'currency': s.currency = target.value; break;
      case 'taxRate': s.taxRate = target.value; break;
      case 'invoicePrefix': s.invoicePrefix = target.value; break;
      case 'nextNumber': s.nextNumber = target.value; break;
    }
    var hint = $('#f-nextNumber-hint');
    if (hint) hint.textContent = 'The next invoice will be ' + Calc.formatNumber(s.invoicePrefix, s.nextNumber) + '.';
  }

  function showSettingsErrors() {
    var e = settingsForm.errors || {};
    ['businessName', 'email', 'taxRate', 'currency', 'invoicePrefix', 'nextNumber'].forEach(function (k) { setFieldError('f-' + k, e[k]); });
    setFieldError('f-logo', settingsForm.logoError);
    var count = Object.keys(e).length;
    var formErr = $('#form-error');
    if (formErr) {
      formErr.textContent = count ? 'Fix the ' + (count === 1 ? 'highlighted field' : count + ' highlighted fields') + ' to save your settings.' : '';
      formErr.hidden = !count;
    }
  }

  function handleLogoFile(input) {
    var file = input.files && input.files[0];
    settingsForm.logoError = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      settingsForm.logoError = 'Choose an image file (PNG, JPG or SVG).';
      input.value = '';
      showSettingsErrors();
      return;
    }
    if (file.size > 300 * 1024) {
      settingsForm.logoError = 'That image is ' + Math.round(file.size / 1024) + ' KB. Use one under 300 KB so it fits in browser storage.';
      input.value = '';
      showSettingsErrors();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      settingsForm.settings.logoDataUrl = String(reader.result);
      var prev = $('#logo-preview');
      if (prev) prev.innerHTML = '<img src="' + esc(settingsForm.settings.logoDataUrl) + '" alt="Your logo">';
      showSettingsErrors();
      toast('Logo added. Save settings to keep it.');
    };
    reader.onerror = function () { settingsForm.logoError = 'Could not read that file.'; showSettingsErrors(); };
    reader.readAsDataURL(file);
  }

  function saveSettings() {
    var s = settingsForm.settings;
    var v = Calc.validateSettings(s);
    settingsForm.errors = v.ok ? null : v.errors;
    showSettingsErrors();
    if (!v.ok) {
      var first = $('[aria-invalid="true"]', main);
      if (first) first.focus();
      return;
    }
    state.settings = {
      businessName: s.businessName.trim(),
      address: String(s.address || '').trim(),
      email: s.email.trim(),
      logoDataUrl: s.logoDataUrl || '',
      currency: s.currency,
      taxRate: Calc.toNumber(s.taxRate),
      invoicePrefix: String(s.invoicePrefix || ''),
      nextNumber: parseInt(s.nextNumber, 10)
    };
    if (persist()) {
      settingsForm = null;
      toast('Settings saved.');
      renderSettings();
      var saveBtn = $('#settings-form button[type=submit]');
      if (saveBtn) saveBtn.focus();
    } else {
      settingsForm.settings = Calc.deepCopy(state.settings);
    }
  }

  function exportBackup() {
    var data = { version: 1, exportedAt: new Date().toISOString(), settings: state.settings, invoices: state.invoices };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'invoicer-backup-' + Calc.todayIso() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Backup downloaded: ' + a.download);
  }

  function applyBackup(data) {
    var draft = state.draft;
    var keepDraft = draft && (draft.forId === null || data.invoices.some(function (i) { return i.id === draft.forId; }));
    data.draft = keepDraft ? draft : null;
    state = data;
    settingsForm = null;
    pendingDelete = null;
    var ok = persist();
    renderSettings();
    var h = $('h1', main);
    if (h) h.focus();
    if (ok) {
      toast('Restored ' + data.invoices.length + (data.invoices.length === 1 ? ' invoice' : ' invoices') + ' and your settings.');
    }
  }
  function restoreBackup(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var err = $('#f-restore-err');
      hideToast();
      var data;
      try {
        data = Calc.parseBackup(String(reader.result));
      } catch (e) {
        input.value = '';
        input.setAttribute('aria-invalid', 'true');
        if (err) {
          err.textContent = e.message === 'not-json' ? 'That file is not readable as JSON. Choose a backup downloaded from Invoicer.' : 'That file is not an Invoicer backup.';
          err.hidden = false;
        }
        return;
      }
      input.value = '';
      input.removeAttribute('aria-invalid');
      if (err) { err.textContent = ''; err.hidden = true; }
      var n = state.invoices.length;
      if (n || businessSetUp()) {
        openDialog({
          title: 'Replace your current data?',
          text: 'This browser holds your settings' + (n ? ' and ' + n + (n === 1 ? ' invoice' : ' invoices') : ' and no invoices') + '. Restoring replaces them with the backup (' + data.invoices.length + (data.invoices.length === 1 ? ' invoice' : ' invoices') + ' and its settings). An invoice you are still writing is kept. Download a backup of the current data first if you might need it.',
          confirmLabel: 'Replace with the backup',
          trigger: input
        }, function () { applyBackup(data); });
      } else {
        applyBackup(data);
      }
    };
    reader.readAsText(file);
  }

  var dialogOnConfirm = null;
  function openDialog(o, onConfirm) {
    lastFocusBeforeDialog = o.trigger || null;
    dialogOnConfirm = onConfirm;
    $('#confirm-title').textContent = o.title;
    $('#confirm-text').textContent = o.text;
    $('#confirm-ok').textContent = o.confirmLabel;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else if (window.confirm(o.title + ' ' + o.text)) { dialogOnConfirm = null; onConfirm(); }
  }
  function confirmDeleteAll(trigger) {
    var n = state.invoices.length;
    openDialog({
      title: 'Delete all data?',
      text: 'This removes your business details' + (n ? ' and all ' + n + (n === 1 ? ' invoice' : ' invoices') : '') + ' from this browser. Download a backup first if you might need them.',
      confirmLabel: 'Delete everything',
      trigger: trigger
    }, deleteAll);
  }
  function deleteAll() {
    Store.clear();
    state = Store.defaults();
    pendingDelete = null;
    persist();
    settingsForm = null;
    render();
    toast('All data deleted.');
  }
  if (dialog) {
    dialog.addEventListener('close', function () {
      var cb = dialogOnConfirm;
      dialogOnConfirm = null;
      if (dialog.returnValue === 'confirm' && cb) cb();
      if (lastFocusBeforeDialog && document.contains(lastFocusBeforeDialog)) lastFocusBeforeDialog.focus();
      lastFocusBeforeDialog = null;
      dialog.returnValue = '';
    });
  }

  /* ---------- events ---------- */

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    switch (action) {
      case 'dismiss-banner': hideBanner(); break;
      case 'toast-close': hideToast(); break;
      case 'toast-action': { var cb = toastEl._onAction; hideToast(); if (cb) cb(); break; }
      case 'clear-search': searchQuery = ''; renderInvoices(); var s = $('#search'); if (s) s.focus(); break;
      case 'duplicate': duplicateInvoice(id); break;
      case 'delete': deleteInvoice(id); break;
      case 'add-item':
        editor.invoice.items.push(Calc.newItem());
        renderItems();
        renderPreview();
        scheduleDraftSave();
        var last = $('#item-desc-' + (editor.invoice.items.length - 1));
        if (last) last.focus();
        break;
      case 'remove-item': {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        if (editor.invoice.items.length > 1) {
          editor.invoice.items.splice(idx, 1);
          if (editor.errors && editor.errors.items) editor.errors.items.splice(idx, 1);
          renderItems();
          renderPreview();
          scheduleDraftSave();
          var next = $('#item-desc-' + Math.min(idx, editor.invoice.items.length - 1));
          if (next) next.focus();
        }
        break;
      }
      case 'scroll-preview': { var pt = $('.preview-title'); if (pt) { pt.scrollIntoView(); pt.focus({ preventScroll: true }); } break; }
      case 'discard-draft': cancelDraftSave(); state.draft = null; persist(); render(); toast('Discarded the unsaved changes.'); break;
      case 'print': ev.preventDefault(); printInvoice(); break;
      case 'copy-summary': copySummary(); break;
      case 'email':
        if (!editor.invoice.client.email || !Calc.isValidEmail(editor.invoice.client.email)) {
          ev.preventDefault();
          toast('Add a valid client email first, or copy the summary instead.');
          var ce = $('#f-clientEmail');
          if (ce) ce.focus();
        } else {
          offerMarkSent('Opening your email app.');
        }
        break;
      case 'remove-logo':
        settingsForm.settings.logoDataUrl = '';
        var prev = $('#logo-preview');
        if (prev) prev.innerHTML = '<span class="muted">No logo</span>';
        btn.remove();
        toast('Logo removed. Save settings to keep the change.');
        break;
      case 'export': exportBackup(); break;
      case 'delete-all': confirmDeleteAll(btn); break;
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'search') { searchQuery = t.value.trim() ? t.value : ''; renderInvoiceRows(); return; }
    if (editor && t.closest('#invoice-form')) {
      readEditorField(t);
      renderPreview();
      if (editor.errors) { editor.errors = Calc.validateInvoice(editor.invoice).errors; showInvoiceErrors(); }
      scheduleDraftSave();
      return;
    }
    if (settingsForm && t.closest('#settings-form') && t.type !== 'file') {
      readSettingsField(t);
      if (settingsForm.errors) { var v = Calc.validateSettings(settingsForm.settings); settingsForm.errors = v.ok ? null : v.errors; showSettingsErrors(); }
    }
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.getAttribute('data-action') === 'status') { setStatus(t.getAttribute('data-id'), t.value); return; }
    if (t.id === 'f-logo') { handleLogoFile(t); return; }
    if (t.id === 'f-restore') { restoreBackup(t); return; }
    if (editor && t.closest('#invoice-form') && t.tagName === 'SELECT') {
      readEditorField(t);
      renderPreview();
      scheduleDraftSave();
    }
  });

  document.addEventListener('submit', function (ev) {
    if (ev.target.id === 'invoice-form') { ev.preventDefault(); saveInvoice(); }
    else if (ev.target.id === 'settings-form') { ev.preventDefault(); saveSettings(); }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !toastEl.hidden) hideToast();
  });

  window.addEventListener('hashchange', render);

  /* ---------- boot ---------- */

  if (Store.mode() === 'memory') {
    showBanner('This browser is blocking site storage, so your invoices will disappear when you close this tab. Allow site data for this page to keep them.');
  }
  render();
  document.documentElement.classList.remove('loading');
})();
