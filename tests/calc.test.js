'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../js/calc.js');

function invoice(overrides) {
  return Object.assign(Calc.newInvoice(Calc.defaultSettings(), '2026-10-29'), {
    client: { name: 'Acme', email: 'pay@acme.test', address: '' },
    items: [{ description: 'Design', quantity: 2, unitPrice: '100' }, { description: 'Hours', quantity: '1.5', unitPrice: 80 }],
  }, overrides || {});
}

test('totals: subtotal, percent discount, tax and rounding', () => {
  const t = Calc.totals(invoice({ discount: { type: 'percent', value: 10 }, taxRate: 17 }));
  assert.equal(t.subtotal, 320);
  assert.equal(t.discount, 32);
  assert.equal(t.taxable, 288);
  assert.equal(t.tax, 48.96);
  assert.equal(t.total, 336.96);
});

test('totals: fixed discount is capped at the subtotal, tax clamps to 0..100', () => {
  const t = Calc.totals(invoice({ discount: { type: 'fixed', value: 999 }, taxRate: 250 }));
  assert.equal(t.discount, 320);
  assert.equal(t.taxable, 0);
  assert.equal(t.tax, 0);
  assert.equal(t.total, 0);
});

test('totals: blank rows are ignored and float noise is rounded', () => {
  const t = Calc.totals({ items: [{ description: 'a', quantity: 3, unitPrice: 0.1 }, { description: '', quantity: '', unitPrice: '' }], taxRate: 0, discount: { type: 'percent', value: 0 } });
  assert.equal(t.subtotal, 0.3);
  assert.equal(t.total, 0.3);
});

test('lineTotal handles strings with commas and bad input', () => {
  assert.equal(Calc.lineTotal({ quantity: '1,000', unitPrice: '2.5' }), 2500);
  assert.equal(Calc.lineTotal({ quantity: 'abc', unitPrice: 5 }), 0);
});

test('formatNumber pads to four digits and never goes below 1', () => {
  assert.equal(Calc.formatNumber('INV-', 7), 'INV-0007');
  assert.equal(Calc.formatNumber('INV-', 12345), 'INV-12345');
  assert.equal(Calc.formatNumber('', 0), '0001');
});

test('dates: parse, add days across month end, reject impossible dates', () => {
  assert.equal(Calc.addDays('2026-01-30', 5), '2026-02-04');
  assert.equal(Calc.parseIso('2026-02-30'), null);
  assert.equal(Calc.parseIso('not a date'), null);
  assert.equal(Calc.formatDate('2026-10-29', 'en-US'), 'Oct 29, 2026');
});

test('formatMoney uses the currency and falls back on a bad code', () => {
  assert.equal(Calc.formatMoney(1234.5, 'USD', 'en-US'), '$1,234.50');
  assert.equal(Calc.formatMoney(1234.5, 'EUR', 'en-US'), '€1,234.50');
  assert.match(Calc.formatMoney(5, 'NOPE', 'en-US'), /5\.00/);
});

test('validateInvoice: happy path passes', () => {
  const v = Calc.validateInvoice(invoice());
  assert.equal(v.ok, true);
  assert.equal(Calc.errorCount(v), 0);
});

test('validateInvoice: empty client, no lines, bad email, due before issue', () => {
  const v = Calc.validateInvoice(invoice({
    client: { name: '  ', email: 'nope', address: '' },
    items: [{ description: '', quantity: '', unitPrice: '' }],
    dueDate: '2026-10-01',
  }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.clientName);
  assert.ok(v.errors.clientEmail);
  assert.ok(v.errors.itemsEmpty);
  assert.match(v.errors.dueDate, /before the issue date/);
  assert.equal(Calc.errorCount(v), 4);
});

test('validateInvoice: per-line errors and discount rules', () => {
  const v = Calc.validateInvoice(invoice({
    items: [{ description: 'ok', quantity: 0, unitPrice: -1 }, { description: '', quantity: 1, unitPrice: 5 }],
    discount: { type: 'fixed', value: 1000 },
  }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.items[0].quantity);
  assert.ok(v.errors.items[0].unitPrice);
  assert.ok(v.errors.items[1].description);
  assert.match(v.errors.discount, /more than the subtotal/);
  const p = Calc.validateInvoice(invoice({ discount: { type: 'percent', value: 150 } }));
  assert.match(p.errors.discount, /more than 100/);
});

test('validateSettings: name and email required, tax and next number bounded', () => {
  const bad = Calc.validateSettings({ businessName: '', email: 'x', taxRate: 120, currency: 'XXX', nextNumber: 0, invoicePrefix: 'INV-' });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(bad.errors).sort(), ['businessName', 'currency', 'email', 'nextNumber', 'taxRate']);
  const good = Calc.validateSettings({ businessName: 'Studio', email: 'me@studio.test', taxRate: '17', currency: 'ILS', nextNumber: '3', invoicePrefix: 'INV-' });
  assert.equal(good.ok, true);
});

test('summaryText lists lines, totals, notes and the reply address', () => {
  const settings = Object.assign(Calc.defaultSettings(), { businessName: 'Studio', email: 'me@studio.test', nextNumber: 4 });
  const text = Calc.summaryText(invoice({ notes: 'Bank: 123', taxRate: 10, discount: { type: 'percent', value: 0 } }), settings, 'en-US');
  assert.match(text, /^Invoice INV-0004\n/);
  assert.match(text, /From: Studio\n/);
  assert.match(text, /- Design: 2 x \$100\.00 = \$200\.00/);
  assert.match(text, /Tax \(10%\): \$32\.00/);
  assert.match(text, /Total due: \$352\.00/);
  assert.match(text, /Notes: Bank: 123/);
  assert.match(text, /Reply to me@studio\.test$/);
  assert.doesNotMatch(text, /Discount/);
});

test('mailtoLink addresses the client and encodes the body', () => {
  const link = Calc.mailtoLink(invoice(), Object.assign(Calc.defaultSettings(), { businessName: 'Studio' }), 'en-US');
  assert.match(link, /^mailto:pay@acme\.test\?subject=Invoice%20INV-0001%20from%20Studio&body=/);
  assert.match(link, /Total%20due/);
  const noEmail = Calc.mailtoLink(invoice({ client: { name: 'A', email: 'bad email', address: '' } }), Calc.defaultSettings());
  assert.match(noEmail, /^mailto:\?subject=/);
});

test('duplicateInvoice resets number, status and dates and keeps the term length', () => {
  const src = invoice({ number: 'INV-0001', status: 'paid', issueDate: '2026-01-01', dueDate: '2026-01-31', createdAt: 1 });
  const dup = Calc.duplicateInvoice(src, '2026-10-29');
  assert.notEqual(dup.id, src.id);
  assert.equal(dup.number, null);
  assert.equal(dup.status, 'draft');
  assert.equal(dup.issueDate, '2026-10-29');
  assert.equal(dup.dueDate, '2026-11-28');
  assert.deepEqual(dup.items, src.items);
  assert.equal(src.status, 'paid');
});

test('search, overdue and sorting', () => {
  const a = invoice({ number: 'INV-0001', status: 'sent', dueDate: '2026-10-01', createdAt: 1 });
  const b = invoice({ number: 'INV-0002', status: 'paid', dueDate: '2026-10-01', createdAt: 2, client: { name: 'Zed Co', email: '', address: '' } });
  assert.equal(Calc.matchesSearch(a, '0001'), true);
  assert.equal(Calc.matchesSearch(a, 'acme'), true);
  assert.equal(Calc.matchesSearch(a, 'zed'), false);
  assert.equal(Calc.matchesSearch(a, '  '), true);
  assert.equal(Calc.isOverdue(a, '2026-10-29'), true);
  assert.equal(Calc.isOverdue(b, '2026-10-29'), false);
  assert.deepEqual(Calc.sortInvoices([a, b]).map((i) => i.number), ['INV-0002', 'INV-0001']);
  assert.equal(Calc.outstanding([a, b]), 1);
});

test('parseBackup accepts a real backup and rejects junk', () => {
  const good = Calc.parseBackup(JSON.stringify({ version: 1, settings: { businessName: 'S' }, invoices: [invoice({ id: 'x1', status: 'weird' }), { nope: true }] }));
  assert.equal(good.settings.businessName, 'S');
  assert.equal(good.settings.currency, 'USD');
  assert.equal(good.invoices.length, 1);
  assert.equal(good.invoices[0].status, 'draft');
  assert.throws(() => Calc.parseBackup('{not json'), /not-json/);
  assert.throws(() => Calc.parseBackup(JSON.stringify({ hello: 1 })), /not-backup/);
  assert.throws(() => Calc.parseBackup(JSON.stringify({ version: 2, settings: {}, invoices: [] })), /not-backup/);
});
