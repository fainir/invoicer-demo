#!/usr/bin/env python3
"""Scripted walk through every flow at 375px and 1440px. Saves screenshots under qa/smoke/ and prints console errors.
Usage: python3 scripts/qa-smoke.py [http://127.0.0.1:8080/]  (needs: pip install playwright; playwright install chromium)"""
import sys, os, json, pathlib
from playwright.sync_api import sync_playwright
import glob

def chromium_path():
    """Playwright's own download if present, else the newest headless shell already in the cache."""
    found = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell")))
    return found[-1] if found else None

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/"
OUT = pathlib.Path("qa/smoke"); OUT.mkdir(parents=True, exist_ok=True)
errors = []

def run(width, height, tag):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium_path())
        ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
        page = ctx.new_page()
        page.on("console", lambda m: errors.append((tag, m.type, m.text)) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append((tag, "pageerror", str(e))))
        shot = lambda name: page.screenshot(path=str(OUT / f"{name}-{tag}.png"), full_page=True)
        page.goto(URL); page.wait_for_selector("h1"); shot("01-empty-list")
        page.goto(URL + "#/settings"); page.wait_for_selector("#settings-form")
        page.click("button[type=submit]"); shot("02-settings-errors")
        page.fill("#f-businessName", "Jane Doe Design"); page.fill("#f-address", "12 Market St\nSpringfield 12345")
        page.fill("#f-email", "jane@example.com"); page.select_option("#f-currency", "USD"); page.fill("#f-taxRate", "10")
        page.click("button[type=submit]"); page.wait_for_selector("#toast:not([hidden])"); shot("03-settings-saved")
        page.goto(URL + "#/new"); page.wait_for_selector("#invoice-form")
        page.click("button[type=submit]"); shot("04-invoice-errors")
        page.fill("#f-clientName", "Acme Studio"); page.fill("#f-clientEmail", "billing@acme.com")
        page.fill("#item-desc-0", "Logo design"); page.fill("#item-qty-0", "1"); page.fill("#item-price-0", "500")
        page.click("[data-action=add-item]"); page.fill("#item-desc-1", "Hours"); page.fill("#item-qty-1", "2.5"); page.fill("#item-price-1", "80")
        page.fill("#f-discountValue", "10"); page.fill("#f-notes", "Bank transfer to IBAN XX00. Thank you!")
        shot("05-invoice-filled")
        page.click("#invoice-form button[type=submit]"); page.wait_for_selector("#toast:not([hidden])"); shot("06-invoice-saved")
        page.emulate_media(media="print"); shot("07-print-preview"); page.emulate_media(media="screen")
        page.goto(URL + "#/invoices"); page.wait_for_selector(".invoice-row"); shot("08-list")
        page.click("[data-action=duplicate]"); page.wait_for_selector("#toast:not([hidden])"); shot("09-duplicated")
        page.click("[data-action=delete]"); page.wait_for_selector("[data-action=toast-action]"); shot("10-delete-undo")
        page.click("[data-action=toast-action]"); page.wait_for_timeout(300); shot("11-restored")
        page.fill("#search", "zzz"); shot("12-search-empty")
        print(tag, "rows:", page.locator(".invoice-row").count(), "title:", page.title())
        b.close()

run(375, 812, "375")
run(1440, 900, "1440")
print("console problems:", json.dumps(errors, indent=1) if errors else "none")
