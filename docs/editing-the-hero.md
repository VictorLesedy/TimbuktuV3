# Editing the home hero

The hero is the big photo at the top of the home page. Each theme (Morning sunrise, Sunset, Moonlight) has its own photo, greeting, headline, paragraph and button. Everything you need lives in four places:

| What you want to change | File |
| --- | --- |
| The photos | `public/hero/` |
| Which photo each theme uses, how it is cropped, text colour and shading | `app/globals.css` |
| The words | `messages/en.ts` |
| Text sizes and hero height | `components/fan/hero.tsx` |

Start the app with `pnpm dev` and keep it running. The page in your browser updates by itself every time you save a file.

To see the phone layout on your laptop, open Chrome's developer tools (Cmd + Option + I), then turn on the device toolbar (Cmd + Shift + M) and pick an iPhone. Use the theme buttons in the top bar to check all three themes.

## 1. Change a photo

**Easiest way:** replace the file and keep its name.

1. Get the new image. For laptops, a landscape image at least 2000 px wide looks sharpest. For phones, portrait works best. One image serves both, so pick one that still looks good when cropped either way.
2. Shrink it for the web. Go to https://squoosh.app, drop the image in, choose **WebP** on the right, set quality to about 75, and set the width to about 1600 to 2000 px under "Resize". Aim for under 300 KB.
3. Download it and save it over the old one in `public/hero/`, using the same name: `sunrise.webp`, `sunset.webp` or `moonlight.webp`.

**Using a new file name, or a JPG:** put the file in `public/hero/`, then open `app/globals.css`, find the theme block (search for `data-theme="sunset"`, for example) and change this line:

```css
--tb-art: url("/hero/sunset.webp");
```

to your file, for example `url("/hero/kasbah.jpg")`. The path always starts with `/hero/`, because everything in `public/` is served from the site root.

If you change the file name, also update the matching line in `lib/theme.ts` (`THEME_ART`). It makes the photo start loading a little earlier.

## 2. Move the crop

The photo always fills the hero, so part of it gets cut off. Two lines in the same theme block in `app/globals.css` decide which part stays visible:

```css
--tb-art-pos-sm: 50% 30%;   /* phones */
--tb-art-pos: 50% 48%;      /* laptops and tablets */
```

The two numbers are **left–right** and **top–bottom**.

- `50%` means centred.
- For the second number, `0%` shows the top of the photo and `100%` shows the bottom.
- If the moon is cut off on laptops, lower the second number (towards `0%`). If the camels are cut off, raise it.
- The first number only matters when the sides get cropped, which happens mostly on phones.

Change one number by about 10% at a time, save, and look.

## 3. Keep the words readable

Each theme has a shade behind the words, plus a text colour:

```css
--tb-art-ink: #fff3e8;         /* text colour on the photo */
--tb-art-shadow: 0 2px 22px rgb(20 6 12 / 0.55);   /* soft glow behind the text, or none */
--tb-art-scrim: linear-gradient(...);      /* shade on phones, rising from the bottom */
--tb-art-scrim-lg: radial-gradient(...);   /* shade on laptops, from the bottom-left corner */
```

- **Bright photo:** use dark text (for example `#1c2638`) and a light shade (colours like `rgb(247 249 252 / 0.9)`).
- **Dark photo:** use light text and a dark shade.
- **Stronger shade:** in the `rgb(… / 0.84)` values, the last number is how solid the shade is, from `0` (invisible) to `1` (solid). Raise it for more shade.
- **Bigger shade on laptops:** raise the size numbers in `ellipse 110% 130%`.

Check the words on both a phone and a laptop view after any photo change.

## 4. Change the words

Open `messages/en.ts` and search for `hero:`. Each theme looks like this:

```ts
sunset: {
  greeting: "Habari za jioni",
  title: ["Golden hour", "in Timbuktu."],
  body: "Rooftop sets, match days, dhow cruises and long dinners ...",
  cta: "Plan your evening",
},
```

- `title` is a list: each item is one line of the headline. Keep each line short (about 12 characters) so it stays big.
- `cta` is the button text.
- Keep the quotes and commas exactly as they are. If the page shows an error after saving, a missing quote or comma is the usual cause.

## 5. Change text sizes and hero height

Open `components/fan/hero.tsx`. Near the top is a block called `HERO`:

```ts
const HERO = {
  height: "h-[calc(100svh-8rem-env(safe-area-inset-bottom))] min-h-[560px] md:h-[calc(100svh-4rem)]",
  greeting: "text-sm md:text-lg",
  title: "text-[clamp(3rem,13vw,4.75rem)] md:text-[clamp(5rem,8.8vw,9.5rem)]",
  body: "text-base md:text-2xl md:leading-snug",
  ...
};
```

These are [Tailwind](https://tailwindcss.com/docs/font-size) classes. Three rules explain almost all of them:

1. **`md:` means "on screens 768 px and wider".** A class without `md:` is for phones. So `text-sm md:text-lg` is small on phones and large on laptops. Change only the `md:` part to affect laptops without touching phones.
2. **Named sizes go in steps:** `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`. Move one step up or down.
3. **`text-[clamp(MIN,PREFERRED,MAX)]` grows with the screen.**
   - `rem` is 16 px, so `5rem` is 80 px and `9.5rem` is 152 px.
   - `vw` is a percentage of the screen width, so `8.8vw` is 8.8% of it.
   - The text follows the preferred size but never goes below MIN or above MAX.
   - For a bigger laptop headline, raise the last two numbers, for example `md:text-[clamp(5rem,10vw,11rem)]`.

For the height, `100svh` is the full screen height and `4rem` is the top bar. Use `md:h-[80svh]` for a shorter hero on laptops.

## 6. Before you share it

Run these three commands and make sure each finishes without errors:

```bash
pnpm lint        # style and common mistakes
pnpm typecheck   # catches typos in code
pnpm build       # the real production build
```

If `pnpm lint` only complains about formatting, `pnpm format` fixes it for you.
