"""Shared Playwright helper for QA scripts: finds a working Chromium on this machine and opens a fresh context.
Usage:
    import sys; sys.path.insert(0, "scripts"); from browser import open_page
    with open_page(375) as (page, errors): page.goto(URL); ...
"""
import os, glob, contextlib
from playwright.sync_api import sync_playwright

def chromium_path():
    found = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell")))
    return found[-1] if found else None

@contextlib.contextmanager
def open_page(width=375, height=812, **context_kwargs):
    """Yields (page, errors). errors collects console errors/warnings and page errors as (type, text)."""
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium_path())
        ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, **context_kwargs)
        page = ctx.new_page()
        page.on("console", lambda m: errors.append((m.type, m.text)) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
        page.on("requestfailed", lambda r: errors.append(("requestfailed", r.url)))
        try:
            yield page, errors
        finally:
            browser.close()
