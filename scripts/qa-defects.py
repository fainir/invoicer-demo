#!/usr/bin/env python3
"""Re-checks for the defects QA filed on 2026-10-29 (D1-D11). Prints PASS/FAIL per defect; screenshots under qa/defects/."""
import sys, json, pathlib
sys.path.insert(0, "scripts"); from browser import open_page
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/"
OUT = pathlib.Path("qa/defects"); OUT.mkdir(parents=True, exist_ok=True)
results = {}
def check(name, ok, note=""):
    results[name] = ("PASS" if ok else "FAIL") + (" " + note if note else "")
    print(name, results[name])

def setup(page):
    page.goto(URL + "#/settings"); page.wait_for_selector("#settings-form")
    page.fill("#f-businessName", "Jane Doe Design"); page.fill("#f-email", "jane@example.com"); page.fill("#f-taxRate", "10")
    page.click("#settings-form button[type=submit]"); page.wait_for_selector("#toast:not([hidden])")

def new_invoice(page, price="500"):
    page.goto(URL + "#/new"); page.wait_for_selector("#invoice-form")
    page.fill("#f-clientName", "Acme Studio"); page.fill("#f-clientEmail", "billing@acme.com")
    page.fill("#item-desc-0", "Logo design"); page.fill("#item-qty-0", "1"); page.fill("#item-price-0", price)

with open_page(1440, 900) as (page, errors):
    setup(page)
    # D1 hint follows prefix/number
    page.fill("#f-invoicePrefix", "ACME-"); page.fill("#f-nextNumber", "42")
    check("D1 hint live", page.inner_text("#f-nextNumber-hint").strip() == "The next invoice will be ACME-0042.", page.inner_text("#f-nextNumber-hint"))
    # D2 refused logo is not a blocking form error
    page.set_input_files("#f-logo", {"name": "x.txt", "mimeType": "text/plain", "buffer": b"hello"})
    check("D2 no form error after refused logo", page.is_hidden("#form-error") and page.is_visible("#f-logo-err"))
    page.fill("#f-invoicePrefix", "INV-"); page.fill("#f-nextNumber", "1"); page.click("#settings-form button[type=submit]")
    page.wait_for_selector("#toast:not([hidden])")
    check("F1 focus stays on Save after saving", page.evaluate("document.activeElement && document.activeElement.textContent.trim()") == "Save settings")
    # D7 double-click Save creates one invoice
    new_invoice(page); page.dblclick("#invoice-form button[type=submit]"); page.wait_for_timeout(400)
    page.goto(URL + "#/invoices"); page.wait_for_selector(".invoice-row")
    check("D7 double-click saves once", page.locator(".invoice-row").count() == 1, f"rows={page.locator('.invoice-row').count()}")
    # D3 Cmd+P style print gets the number as title
    page.click(".row-number"); page.wait_for_selector("#invoice-form")
    title_during = page.evaluate("(() => { window.dispatchEvent(new Event('beforeprint')); var t = document.title; window.dispatchEvent(new Event('afterprint')); return t + '|' + document.title; })()")
    check("D3 beforeprint sets title", title_during == "INV-0001|INV-0001 - Invoicer", title_during)
    # D8 draft flushed on pagehide
    page.goto(URL + "#/new"); page.wait_for_selector("#invoice-form"); page.fill("#f-clientName", "Quick Co"); page.fill("#item-price-0", "77")
    page.reload(); page.wait_for_selector("#invoice-form")
    check("D8 draft kept on immediate reload", page.input_value("#item-price-0") == "77" and page.input_value("#f-clientName") == "Quick Co")
    page.click("[data-action=discard-draft]")
    # D6 toast at the top, not over the buttons
    page.goto(URL + "#/invoices"); page.click(".row-number"); page.wait_for_selector("#invoice-form")
    page.click("[data-action=copy-summary]"); page.wait_for_selector("#toast:not([hidden])")
    box = page.locator("#toast").bounding_box()
    check("D6 toast at top of viewport", box and box["y"] < 60, f"y={box and box['y']}")
    page.screenshot(path=str(OUT / "D6-toast-top-1440.png"))
    # D4/D5 restore over existing data asks first; failed restore clears old toast
    page.goto(URL + "#/settings"); page.wait_for_selector("#settings-form")
    backup = json.dumps({"version": 1, "settings": {"businessName": "Backup Biz", "email": "b@b.test"}, "invoices": []}).encode()
    page.set_input_files("#f-restore", {"name": "b.json", "mimeType": "application/json", "buffer": backup})
    page.wait_for_selector("#confirm-dialog[open]")
    check("D4 restore asks before replacing", "Replace your current data" in page.inner_text("#confirm-title"))
    page.screenshot(path=str(OUT / "D4-restore-dialog-1440.png"))
    page.click("#confirm-dialog button[value=cancel]"); page.wait_for_timeout(200)
    check("D4 cancel keeps data", page.input_value("#f-businessName") == "Jane Doe Design")
    page.set_input_files("#f-restore", {"name": "b.json", "mimeType": "application/json", "buffer": backup})
    page.wait_for_selector("#confirm-dialog[open]"); page.click("#confirm-ok"); page.wait_for_selector("#toast:not([hidden])")
    check("D4 confirm restores", page.input_value("#f-businessName") == "Backup Biz")
    page.set_input_files("#f-restore", {"name": "bad.json", "mimeType": "application/json", "buffer": b"{not json"})
    page.wait_for_selector("#f-restore-err:not([hidden])")
    check("D5 old toast hidden on failed restore", page.is_hidden("#toast"))
    # F4 spaces-only search (the restored backup had no invoices, so create one first)
    new_invoice(page); page.click("#invoice-form button[type=submit]"); page.wait_for_selector("#toast:not([hidden])")
    page.goto(URL + "#/invoices"); page.wait_for_selector("#search"); page.fill("#search", "   ")
    check("F4 spaces-only search is no search", "match" not in page.inner_text("#list-summary"), page.inner_text("#list-summary"))
    check("1440 console clean", not errors, str(errors))

with open_page(375, 812) as (page, errors):
    setup(page)
    # D11 huge totals do not widen the page
    new_invoice(page, "1250000"); page.click("#invoice-form button[type=submit]"); page.wait_for_selector("#toast:not([hidden])")
    w = page.evaluate("document.documentElement.scrollWidth")
    check("D11 editor fits at 375 with $1,250,000", w <= 375, f"scrollWidth={w}")
    page.screenshot(path=str(OUT / "D11-big-total-375.png"), full_page=True)
    page.goto(URL + "#/invoices"); page.wait_for_selector(".invoice-row")
    w = page.evaluate("document.documentElement.scrollWidth")
    check("D11 list fits at 375 with huge total", w <= 375, f"scrollWidth={w}")
    check("375 console clean", not errors, str(errors))

# D9 + D10: storage full
quota = "(function(){var orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(v).length>50){throw new DOMException('quota','QuotaExceededError');}return orig.call(this,k,v);};})();"
with open_page(375, 812) as (page, errors):
    page.add_init_script(quota)
    page.goto(URL + "#/new"); page.wait_for_selector("#invoice-form")
    page.fill("#f-clientName", "Client One"); page.fill("#item-desc-0", "Design work"); page.fill("#item-price-0", "100")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.click("#invoice-form button[type=submit]"); page.wait_for_timeout(300)
    bb = page.locator("#banner").bounding_box()
    check("D9 banner in view after failed save", page.is_visible("#banner") and bb and 0 <= bb["y"] < 812, f"y={bb and bb['y']}")
    check("D9 banner focused", page.evaluate("document.activeElement && document.activeElement.id") == "banner")
    page.screenshot(path=str(OUT / "D9-banner-in-view-375.png"))
    check("D10 editor now on the saved invoice", page.url.endswith("#/edit/" + page.evaluate("location.hash.split('/').pop()")) and "#/edit/" in page.url)
    page.click("#invoice-form button[type=submit]"); page.wait_for_timeout(300)
    page.goto(URL + "#/invoices"); page.wait_for_selector(".invoice-row")
    check("D10 second save does not duplicate", page.locator(".invoice-row").count() == 1, f"rows={page.locator('.invoice-row').count()}")
    check("storage-full console clean", not errors, str(errors))

fails = [k for k, v in results.items() if v.startswith("FAIL")]
print("\nSUMMARY:", f"{len(results) - len(fails)}/{len(results)} pass", ("FAILS: " + ", ".join(fails)) if fails else "")
