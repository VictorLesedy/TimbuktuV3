"""Browser checks with Playwright for Python.

Start the app first (pnpm build && pnpm start), then run:
    BASE_URL=http://localhost:3000 python3 tests/browser/journeys.py
Set CHROME_PATH to use a specific Chromium binary.
"""
import os, tempfile
import asyncio, re, sys, traceback
from playwright.async_api import async_playwright, expect

SHOTS = os.environ.get("SHOTS_DIR", tempfile.gettempdir())
CODE_FILE = os.path.join(tempfile.gettempdir(), "timbuktu-code.txt")
BASE = os.environ.get("BASE_URL", "http://localhost:3000")
results = []

def ok(name, cond, detail=""):
    results.append(("PASS" if cond else "FAIL", name, detail))
    print("PASS" if cond else "FAIL", name, detail, flush=True)

async def pay(page, outcome="Success"):
    await page.locator('[aria-label="Demo outcome"] button', has_text=outcome).click()
    await page.get_by_role("button", name=re.compile(r"^Pay TSh")).click()
    await expect(page.get_by_text("Confirm on your phone")).to_be_visible(timeout=8000)

async def run(name, fn, ctx):
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        await fn(page)
        ok(f"{name}: no page errors", not errors, "; ".join(errors)[:200])
    except Exception as e:
        ok(name, False, f"{type(e).__name__}: {str(e)[:300]}")
        await page.screenshot(path=f"{SHOTS}/fail-{name.split()[0]}.png")
    await page.close()

async def ticket(page):
    await page.goto(BASE + "/a/sunset-sessions-rooftop")
    book = page.locator("#book")
    await expect(book.get_by_role("button", name="Get tickets")).to_be_enabled(timeout=8000)
    ok("ids unique on detail", await page.locator("#book").count() == 1)
    await book.get_by_role("button", name="Add one").click()
    total = await book.locator("span.font-display").last.inner_text()
    await book.get_by_role("button", name="Get tickets").click()
    await page.wait_for_url("**/checkout")
    await expect(page.get_by_text("Order summary")).to_be_visible(timeout=8000)
    ok("checkout shows two tickets", await page.get_by_text("× 2").count() == 1, total)
    await page.get_by_label("Promo code").fill("NOPE")
    await page.get_by_role("button", name="Apply").click()
    await expect(page.get_by_text("is not an active promo code")).to_be_visible(timeout=5000)
    ok("bad promo rejected inline", True)
    await page.get_by_label("Promo code").fill("karibu10")
    await page.get_by_role("button", name="Apply").click()
    await expect(page.get_by_text("KARIBU10 applied: 10% off").first).to_be_visible(timeout=5000)
    ok("promo applied", await page.get_by_text("Discount").count() == 1)
    await page.get_by_label("Mobile money number").fill("12345")
    await page.get_by_role("button", name=re.compile(r"^Pay TSh")).click()
    await expect(page.get_by_text("Enter a Tanzanian mobile number")).to_be_visible()
    ok("bad phone blocked", True)
    await page.get_by_label("Mobile money number").fill("0712 345 678")
    await page.get_by_role("radio", name="Airtel Money").click()
    await pay(page)
    await expect(page.get_by_role("heading", name="Tickets confirmed")).to_be_visible(timeout=10000)
    code = await page.locator("span.font-mono").first.inner_text()
    ok("ticket confirmed with QR", await page.locator("svg title", has_text=code).count() == 1, code)
    await page.get_by_role("button", name="Go to my tickets").click()
    await page.wait_for_url("**/me?tab=tickets")
    card = page.locator("article", has_text="Sunset Sessions").first
    await expect(card).to_be_visible(timeout=8000)
    await card.get_by_role("button", name="Show code").click()
    await expect(page.get_by_role("dialog").locator("span.font-mono", has_text=code)).to_be_visible()
    ok("ticket appears in My tickets with the same code", True, code)
    await page.keyboard.press("Escape")
    # Tell the check-in journey which code to scan.
    open(CODE_FILE, "w").write(code)

async def declined(page):
    await page.goto(BASE + "/a/kilele-rooftop")
    book = page.locator("#book")
    await expect(book.get_by_role("button", name=re.compile("^(Book entry|Reserve)"))).to_be_enabled(timeout=8000)
    await book.get_by_role("button", name=re.compile("^(Book entry|Reserve)")).click()
    await page.wait_for_url("**/checkout")
    await expect(page.get_by_text("Order summary")).to_be_visible(timeout=8000)
    await pay(page, "Declined")
    await expect(page.get_by_role("heading", name="Payment declined")).to_be_visible(timeout=10000)
    ok("declined payment shows recovery", True)
    await page.get_by_role("button", name="Try again").click()
    await expect(page.get_by_text("Order summary")).to_be_visible()
    ok("try again keeps the order", await page.get_by_text("Order summary").count() == 1)
    await page.locator('[aria-label="Demo outcome"] button', has_text="No response").click()
    await page.get_by_role("button", name=re.compile(r"^Pay TSh")).click()
    await expect(page.get_by_text("60s left").or_(page.get_by_text("59s left"))).to_be_visible(timeout=8000)
    await page.get_by_role("button", name="Cancel payment").click()
    await expect(page.get_by_role("heading", name="Payment timed out")).to_be_visible(timeout=8000)
    ok("timeout path reachable via cancel", True)

async def hire(page):
    await page.goto(BASE + "/a/dj-kivuli")
    book = page.locator("#book")
    await expect(book.get_by_role("button", name="Send hire request")).to_be_visible(timeout=8000)
    await book.get_by_role("button", name="Send hire request").click()
    await expect(book.get_by_text("Pick a date from the calendar")).to_be_visible()
    ok("hire form validates", True)
    day = book.locator('button[aria-label$=", Available"]:not([disabled])').first
    if await day.count() == 0:
        await book.get_by_role("button", name="Next month").click()
        day = book.locator('button[aria-label$=", Available"]:not([disabled])').first
    await day.click()
    await book.get_by_label("Location").fill("Slipway, Msasani")
    await book.get_by_role("button", name="Send hire request").click()
    await expect(page.get_by_text("Hire request sent")).to_be_visible(timeout=8000)
    await expect(book.get_by_text("Waiting for a quote").first).to_be_visible()
    ok("fan sends hire request", True)

    await page.goto(BASE + "/studio/bookings?tab=hire")
    req = page.locator("li", has_text="Slipway, Msasani").first
    await expect(req).to_be_visible(timeout=8000)
    await req.get_by_role("button", name="Send quote").click()
    dlg = page.get_by_role("dialog")
    await dlg.get_by_label("Price in TSh").fill("450000")
    await dlg.get_by_role("button", name="Send quote").click()
    await expect(page.get_by_text("Quote sent")).to_be_visible(timeout=8000)
    ok("entertainer sends quote", True)

    await page.goto(BASE + "/me?tab=hire")
    card = page.locator("article", has_text="Slipway, Msasani").first
    await expect(card.get_by_role("button", name="Accept quote")).to_be_visible(timeout=8000)
    await card.get_by_role("button", name="Accept quote").click()
    await expect(card.get_by_role("button", name="Pay now")).to_be_visible(timeout=8000)
    ok("fan accepts quote", True)
    await card.get_by_role("button", name="Pay now").click()
    await page.wait_for_url("**/checkout")
    await expect(page.get_by_text("TSh 450,000").first).to_be_visible(timeout=8000)
    await pay(page)
    await expect(page.get_by_role("heading", name="Booking paid")).to_be_visible(timeout=10000)
    await page.goto(BASE + "/me?tab=hire")
    card = page.locator("article", has_text="Slipway, Msasani").first
    await expect(card.get_by_text("Paid. The booking is confirmed.")).to_be_visible(timeout=8000)
    ok("hire round trip ends paid", True)

async def checkin(page):
    code = open(CODE_FILE).read().strip()
    await page.goto(BASE + "/studio/check-in")
    await expect(page.get_by_label("Listing")).to_be_visible(timeout=8000)
    opt = page.get_by_label("Listing").locator("option", has_text="Sunset Sessions")
    await page.get_by_label("Listing").select_option(await opt.first.get_attribute("value"))
    await page.get_by_label("Search guests").fill(code)
    await expect(page.get_by_text(code)).to_be_visible(timeout=8000)
    ok("new ticket in door queue", True)
    await page.get_by_label("Ticket code").fill(code)
    await page.get_by_label("Ticket code").press("Enter")
    await expect(page.get_by_role("status").filter(has_text="checked in")).to_be_visible(timeout=8000)
    ok("scan checks guest in", True)
    await page.get_by_label("Ticket code").fill(code)
    await page.get_by_role("button", name="Check in", exact=True).click()
    await expect(page.get_by_text("already scanned")).to_be_visible(timeout=8000)
    ok("double scan blocked", True)

async def wizard(page):
    title = "Kilele jazz night"
    await page.goto(BASE + "/studio/activations/new")
    await page.get_by_role("button", name="Continue").click()
    await page.get_by_role("button", name="Continue").click()
    await expect(page.get_by_text("Give it a title")).to_be_visible()
    ok("wizard blocks empty details", True)
    await page.get_by_label("Title").fill(title)
    await page.get_by_label("Description").fill("Live jazz on the rooftop with a sunset set and late session.")
    await page.get_by_label("Area or neighbourhood").fill("Masaki")
    await page.get_by_role("button", name="Continue").click()
    await page.get_by_role("button", name="Add sample photo").click()
    for _ in range(3):
        await page.get_by_role("button", name="Continue").click()
    await expect(page.get_by_role("heading", name="This is what fans will see")).to_be_visible()
    await page.get_by_role("button", name="Submit for approval").click()
    await page.wait_for_url("**/studio/activations")
    row = page.locator("article", has_text=title)
    await expect(row.get_by_text("Pending approval")).to_be_visible(timeout=8000)
    ok("wizard submits listing", True)
    await page.goto(BASE + "/admin/approvals")
    item = page.locator("li", has_text=title).first
    await expect(item).to_be_visible(timeout=8000)
    await item.get_by_role("button", name="Approve").click()
    await expect(page.get_by_text(f"Approved: {title}")).to_be_visible(timeout=8000)
    await page.goto(BASE + "/explore?sort=newest")
    first = page.locator("main li").first
    await expect(first).to_contain_text(title, timeout=8000)
    ok("approved listing leads newest", True)

async def gate(page):
    await page.goto(BASE + "/admin/settings")
    await page.get_by_role("radio", name="Before choosing tickets").click()
    await expect(page.get_by_text("You have unsaved changes.")).to_be_visible()
    await page.get_by_role("button", name="Save settings").click()
    await expect(page.get_by_text("Settings saved")).to_be_visible(timeout=8000)
    ok("settings save", True)
    await page.goto(BASE + "/")
    await page.get_by_role("button", name=re.compile("Demo controls|Fan")).first.click()
    await page.locator('[aria-label="Fan level"] button', has_text="Explorer").click()
    await page.keyboard.press("Escape")
    await page.goto(BASE + "/a/sunset-sessions-rooftop")
    await expect(page.locator("#book").get_by_text("Sign up to choose tickets")).to_be_visible(timeout=8000)
    ok("explorer gated before selection", True)
    await page.locator("#book").get_by_role("button", name="Sign up").click()
    dlg = page.get_by_role("dialog")
    await dlg.get_by_label("Your name").fill("Neema Test")
    await dlg.get_by_label("Mobile number").fill("0655 123 456")
    await dlg.get_by_role("button", name="Create account").click()
    await expect(page.locator("#book").get_by_role("button", name="Get tickets")).to_be_visible(timeout=8000)
    ok("quick register unlocks selection", True)
    await page.goto(BASE + "/admin/settings")
    await page.get_by_role("radio", name="At checkout").click()
    await page.get_by_role("button", name="Save settings").click()
    await expect(page.get_by_text("Settings saved")).to_be_visible(timeout=8000)

async def themes(page):
    await page.goto(BASE + "/")
    theme = lambda: page.evaluate("document.documentElement.dataset.theme")
    ok("default theme is sunrise", await theme() == "sunrise")
    await page.get_by_role("radio", name="Moonlight").click()
    ok("header switches to moonlight", await theme() == "moonlight")
    await page.reload()
    await page.wait_for_timeout(300)
    ok("theme survives reload", await theme() == "moonlight")
    await page.get_by_role("radio", name="Moonlight").focus()
    await page.keyboard.press("ArrowLeft")
    ok("arrow keys move between themes", await theme() == "sunset")
    bg = await page.evaluate("getComputedStyle(document.body).backgroundColor")
    ok("sunset canvas applied", bg == "rgb(255, 243, 232)", bg)
    await page.get_by_role("radio", name="Morning sunrise").click()

async def keyboard(page):
    await page.goto(BASE + "/")
    await page.keyboard.press("Tab")
    txt = await page.evaluate("document.activeElement.textContent")
    ok("first tab stop is skip link", "Skip to content" in txt, txt)

async def mobile(page):
    for r in ["/checkout", "/a/dj-kivuli", "/a/kilele-rooftop", "/a/sunset-sessions-rooftop", "/a/mbio-saturday-long-run", "/me?tab=hire", "/studio/check-in", "/admin/revenue"]:
        await page.goto(BASE + r)
        await page.wait_for_timeout(1500)
        over = await page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(f"mobile 360 no overflow {r}", over == 0, str(over))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None)
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        for name, fn in [("ticket", ticket), ("declined", declined), ("hire", hire), ("checkin", checkin), ("wizard", wizard), ("gate", gate), ("themes", themes), ("keyboard", keyboard)]:
            await run(name, fn, ctx)
        mctx = await b.new_context(viewport={"width": 360, "height": 780}, reduced_motion="reduce")
        await run("mobile", mobile, mctx)
        await b.close()
    fails = [r for r in results if r[0] == "FAIL"]
    print(f"\n{len(results) - len(fails)} passed, {len(fails)} failed")
    sys.exit(1 if fails else 0)

asyncio.run(main())
