"""Browser checks with Playwright for Python.

Start the app first (pnpm build && pnpm start), then run:
    BASE_URL=http://localhost:3000 python3 tests/browser/smoke.py
Set CHROME_PATH to use a specific Chromium binary.
"""
import os, tempfile
import asyncio, json, sys
from playwright.async_api import async_playwright

SHOTS = os.environ.get("SHOTS_DIR", tempfile.gettempdir())
BASE = os.environ.get("BASE_URL", "http://localhost:3000")
ROUTES = ["/", "/a/kilele-rooftop", "/a/mnara-cinema", "/a/does-not-exist", "/explore", "/checkout", "/me", "/me?tab=hire", "/me?tab=reviews", "/me/ambassador", "/onboarding",
          "/studio", "/studio/activations", "/studio/activations/new", "/studio/bookings", "/studio/bookings?tab=hire", "/studio/check-in", "/studio/payouts",
          "/admin", "/admin/approvals", "/admin/activations", "/admin/revenue", "/admin/settings", "/nope"]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None)
        report = []
        for width, height, tag in [(375, 812, "m"), (1280, 860, "d")]:
            ctx = await b.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
            page = await ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text[:200]}") if m.type == "error" and "images.unsplash" not in m.text and "_next/image" not in m.text else None)
            for r in ROUTES:
                errors.clear()
                await page.goto(BASE + r, wait_until="networkidle")
                await page.wait_for_timeout(1400)
                overflow = await page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                h1 = await page.evaluate("[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()).join(' | ')")
                alerts = await page.evaluate("[...document.querySelectorAll('[role=alert]')].map(a=>a.textContent.trim().slice(0,80))")
                name = r.strip("/").replace("/", "_").replace("?", "_").replace("=", "-") or "home"
                await page.screenshot(path=f"{SHOTS}/{tag}-{name}.png", full_page=False)
                report.append((tag, r, overflow, h1[:60], alerts[:2], list(dict.fromkeys(errors))[:4]))
            await ctx.close()
        for row in report:
            flag = "!!" if row[2] > 0 or row[5] or row[4] else "ok"
            print(flag, *row)
        await b.close()

asyncio.run(main())
