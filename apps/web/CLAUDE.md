# CLAUDE.md

Guidance for AI agents (and humans) working in this repo. Read this first — it tells you
where things live and how to make the most common changes without breaking the template.

## What this is

A **Next.js 16 (App Router) + MUI 7** admin dashboard template (based on Materio), customized
for Mahasarakham University (MSU) projects. It ships with:

- A vertical **and** horizontal layout, a theme **Customizer**, and light/dark modes.
- Cookie-persisted theme settings (mode, skin, layout, primary color).
- NextAuth (ERP-MSU OAuth) wiring and a small Express + Prisma backend under `backend/`.
- Brand defaults from the **MSU-BEPS** reference design: **Sarabun** body font,
  **Manrope / IBM Plex Sans Thai** headings, and a **purple** primary (`#6D4CFF`).

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`).

```bash
pnpm install        # also runs build:icons via postinstall
pnpm dev            # next dev --turbopack (http://localhost:3000)
pnpm build          # production build
pnpm start          # run the production build
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm format         # prettier write on src
pnpm build:icons    # regenerate the bundled Iconify CSS (run if you add new icons)
```

> Fonts are loaded with `next/font/google`, so **the first build needs network access** to
> fetch Sarabun / Manrope / IBM Plex Sans Thai.

## Project map

```
src/
  app/                         Next.js App Router
    (private)/                 Authenticated area (shares the dashboard layout)
      layout.tsx               Wraps pages in the vertical/horizontal layout
      home/ about/ users/      Example pages — copy these
      dashboards/{crm,analytics}/
    (blank-layout-pages)/      No-chrome pages (e.g. /login)
    api/auth/[...nextauth]/    NextAuth route
    layout.tsx                 Root layout: <html>, fonts, color-scheme script
    globals.css                Tailwind v4 layers + CSS variables
  @core/                       Template core — theme, hooks, settings, MUI overrides
    theme/index.ts             ★ Typography + shape + shadows wiring
    theme/fonts.ts             ★ Font definitions (Sarabun / Manrope / IBM Plex Sans Thai)
    theme/colorSchemes.ts      ★ Full light/dark palettes
    styles/vertical/           ★ Sidebar item + section styling
    contexts/settingsContext   Default settings + cookie persistence
  @layouts/ @menu/             Layout primitives and the menu engine (rarely edited)
  components/
    GenerateMenu.tsx           Renders menu data → MUI menu components
    layout/{vertical,horizontal}/  Navbar, Navigation, *Menu wiring
    layout/shared/Logo.tsx     ★ Sidebar brand block (title + subtitle)
    theme/index.tsx            CustomThemeProvider (merges primaryColor into the theme)
  libs/logger/                 ★ Logging: daily files + Discord alerts (see docs/logging.md)
    index.ts                   server logger (`logger`) — server-only
    client.ts                  browser logger (`clientLogger`) → POST /api/log
    withLogging.ts             wrapper for API route handlers
    config.ts                  every LOG_* / DISCORD_WEBHOOK_* env var
    fileTransport.ts           daily file, rotation, retention
    discordTransport.ts        webhook embeds, dedupe, rate limit
  instrumentation.ts           ★ Global error capture (onRequestError + process hooks)
  configs/
    themeConfig.ts             ★ templateName, subtitle, layout, homePageUrl, cookie name
    primaryColorConfig.ts      ★ Primary color palette; FIRST entry = default
  data/navigation/
    verticalMenuData.tsx       ★ Sidebar menu (single source of truth)
    horizontalMenuData.tsx     ★ Top menu (horizontal layout)
  views/                       Page-specific composition (dashboard widgets, etc.)
  types/menuTypes.ts           Menu data types (Section / SubMenu / Item)
backend/                       Express + Prisma API (separate package.json)
```

★ = the files you will most often edit. Path aliases: `@/* → src/*`, plus `@core`, `@layouts`,
`@menu`, `@components`, `@configs`, `@views`, `@assets` (see `tsconfig.json`).

## How to… (common tasks)

### Add a new page + sidebar entry

1. Create `src/app/(private)/<route>/page.tsx` (copy `home/page.tsx` or `about/page.tsx`).
2. Add an item to `src/data/navigation/verticalMenuData.tsx` (and `horizontalMenuData.tsx`
   if you use the horizontal layout) **in the right group** (see below). Use a Remix Icon class.
3. That's it — the menu is data-driven; no component edits needed.

Full recipe with snippets: `.claude/skills/add-page/SKILL.md`.

### Access control & routing (read before adding routes)

Four access tiers (low → high), defined in [src/configs/accessControl.ts](src/configs/accessControl.ts)
and **enforced** by [src/middleware.ts](src/middleware.ts). Tiers are inclusive — a higher tier sees
everything below it.

| Tier              | ใคร                      | Routes (without basePath)                                                                                  | Sidebar section              |
| :---------------- | :----------------------- | :--------------------------------------------------------------------------------------------------------- | :--------------------------- |
| `public`          | ทุกคน — ไม่ต้องล็อกอิน   | `/login`, `/api/auth/*`, static **+ any route in `publicRoutes`** (e.g. `/dashboards/analytics`, `/users`) | shown with a `สาธารณะ` badge |
| `user`            | ผู้ใช้ที่ล็อกอินแล้ว     | ทุกหน้าใน `(private)`: `/`, `/home`, `/about`, `/users`, `/dashboards/**`                                  | แดชบอร์ด, ตาราง, อื่น ๆ      |
| `deptAdmin`       | ผู้ดูแล **หน่วยงาน/คณะ** | `/admin/**`                                                                                                | ผู้ดูแลหน่วยงาน              |
| `universityAdmin` | ผู้ดูแล **มหาวิทยาลัย**  | `/admin/university/**`                                                                                     | ผู้ดูแลมหาวิทยาลัย           |

Anything not listed in `routeAccessRules` defaults to `user` (login required).

**Conventions**

- Keep paths shallow — aim for ≤ 3 segments (`/admin/manage-users`, `/admin/university/units`, `/api/test`).
- Admin pages go under `/admin/**`; university-wide pages under `/admin/university/**`.
- Group sidebar items by purpose: `แดชบอร์ด` (dashboards), `ตาราง` (tables), then admin sections.

**Protect a new route:** its tier comes from its path prefix in `routeAccessRules` (accessControl.ts).
To raise the tier of an area, add/adjust a prefix rule there — middleware applies it automatically.
The menu (`verticalMenuData(role)`) shows admin sections only at the matching tier; that's _visibility_,
not enforcement.

**Make a dashboard/table public (no login):** add its path to `publicRoutes` in
[accessControl.ts](src/configs/accessControl.ts). Middleware then skips the auth check for it, and
the sidebar item automatically gets a `สาธารณะ` badge (the page still renders inside the dashboard
layout). Examples shipped: `/dashboards/analytics` and `/users`.

**No forced auto-login.** [LayoutWrapper.tsx](src/@layouts/LayoutWrapper.tsx) calls
`signIn('erpauth')` for anonymous visitors **only on routes that are not public**
(`isPublicRoute(usePathname())`). Public report/table pages stay readable without an
account; editing belongs behind the login.

> ⚠️ If you add any login-forcing logic to a layout, it **must** exempt public routes —
> otherwise the client bounces visitors to ERP even though middleware let them through.
> That bug is invisible to `curl` (no JS runs); test it in a real browser.
>
> `AUTH_DISABLED` is server-side only. The client reads `NEXT_PUBLIC_AUTH_DISABLED` —
> keep both set to the same value.

**Wiring real auth (currently placeholders):**

- `resolveUserLevel(token)` (accessControl.ts) maps the NextAuth token → tier. Add a `role` claim in the
  `jwt` callback of [src/libs/ErpAuth.ts](src/libs/ErpAuth.ts) (derive from the user's ERP permissions),
  then it works end-to-end.
- The sidebar **role toggle** ([SidebarFooter.tsx](src/components/layout/vertical/SidebarFooter.tsx))
  switches the _viewed_ role via `useRole()`; `useIsAdmin()` ([src/hooks/useRole.ts](src/hooks/useRole.ts))
  gates whether it appears — wire it to the real session.
- **Local dev:** set `AUTH_DISABLED=true` in `.env.local` to bypass all checks while developing
  (already set). Keep it `false`/unset in production.

### Change the primary (accent) color

Edit the **first** entry of `src/configs/primaryColorConfig.ts` (`primary-msu`). That value is
the runtime default (`settingsContext` → `primaryColor`) and overrides the palette. For
consistency, mirror it in `src/@core/theme/colorSchemes.ts` (`primary.main/light/dark`).

### Change fonts or sizes

All fonts live in `src/@core/theme/fonts.ts`. Swap the `next/font/google` loaders and keep the
exported `bodyFontFamily` / `headingFontFamily` strings. Base font **size** and heading scale
are in `src/@core/theme/index.ts` (`typography`).

### Restyle the sidebar

- Item look (active pill, left accent bar, radius): `src/@core/styles/vertical/menuItemStyles.ts`
- Section heading look (uppercase purple label): `src/@core/styles/vertical/menuSectionStyles.ts`
- Brand block (logo, title, subtitle): `src/components/layout/shared/Logo.tsx` +
  `templateName`/`templateSubtitle` in `src/configs/themeConfig.ts`.

### Default layout / mode

`src/configs/themeConfig.ts` — `layout` (`vertical` | `collapsed` | `horizontal`), `mode`
(`system` | `light` | `dark`), `homePageUrl`. Note: mode/skin/layout are cookie-backed, so to
see config changes locally you must **reset via the Customizer** or clear the settings cookie
(`themeConfig.settingsCookieName`).

### Logging & error alerts (read before adding try/catch)

ทุก error ของระบบถูกบันทึกลงไฟล์ **วันละ 1 ไฟล์** (`logs/app-YYYY-MM-DD.log` + `logs/error-YYYY-MM-DD.log`)
และส่งเข้า **Discord webhook** อัตโนมัติ ตั้งค่าที่ `DISCORD_WEBHOOK_URL` ใน `.env` อย่างเดียว

**สำคัญที่สุด: error ที่ throw ออกมาถูกจับให้อัตโนมัติอยู่แล้ว — ไม่ต้องเขียน try/catch เพื่อให้ log**
สิ่งที่ทำให้ error หายคือการ _กลืน_ มัน (`catch {}` หรือ `catch (e) { console.error(e) }`)
`console.*` ไม่ลงไฟล์และไม่เข้า Discord — ถ้าจำเป็นต้อง catch ให้ `logger.error(msg, { error, context })` ก่อนเสมอ

| อยากได้อะไร                                | ใช้                                                                                                      |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| Log ฝั่ง server (page, server action, lib) | `import { logger } from '@/libs/logger'` → `logger.info/warn/error/fatal(msg, { error, context })`       |
| API route ใหม่                             | ห่อด้วย `withLogging` (`@/libs/logger/withLogging`) → ได้ requestId, timing, จับ error + ตอบ 500 ให้     |
| Log ฝั่ง client (`'use client'`)           | `import { clientLogger } from '@/libs/logger/client'` (ห้าม import `@/libs/logger` — เป็น `server-only`) |
| ระบบภายนอก / non-React                     | `POST {basePath}/api/log` — public route, body: `{ level, source, message, error, context }`             |

จุดที่ดัก error ให้อัตโนมัติแล้ว: `src/instrumentation.ts` (server error ทุกชนิด + uncaughtException/
unhandledRejection), `src/app/error.tsx`, `src/app/global-error.tsx`, `src/components/ErrorReporter.tsx`
(window.onerror + promise rejection) และ `src/app/api/log/route.ts`
middleware รันบน edge runtime — เขียนไฟล์ไม่ได้ **ห้าม import logger ที่นั่น**

ถ้า webhook อยู่ใน **forum channel** ต้องตั้ง `DISCORD_WEBHOOK_FORUM=true` (ไม่งั้น Discord ตอบ 400) —
โหมดนี้เปิดโพสต์ใหม่ต่อ error หนึ่งชนิด แล้ว error เดิมตอบกลับเข้าโพสต์เดิม; `DISCORD_WEBHOOK_THREAD_ID`
บังคับให้ทุก alert ไปกองในโพสต์/เธรดเดียว

Key ที่อ่อนไหว (`password`, `token`, `secret`, `cookie`, `authorization`, …) ถูก `[redacted]` ให้เอง
ใส่ข้อมูลใน `context` อย่าใส่ใน `message`. กันสแปม Discord: dedupe 60 วิ + 20 ข้อความ/นาที (ไฟล์ยังครบ)

โค้ดทั้งหมดอยู่ที่ `src/libs/logger/` — คู่มือ: `docs/logging.md`, สูตรสำเร็จ: `.claude/skills/logging/SKILL.md`
ติดตั้งย้อนหลังในโปรเจกต์เก่าที่ generate จาก template ไปก่อนแล้ว: `docs/logging-retrofit.md`
(หรือสั่ง `bash scripts/add-logging.sh <path-to-old-project>`)

### Auth, base path, env

See `guide.md` for `basePath`, NextAuth (`src/libs/ErpAuth.ts`), and the env-var table.

## Conventions

- **TypeScript + functional components.** Named consts exported as default (`const X = () => …; export default X`).
- **Import grouping with banner comments** (`// MUI Imports`, `// Component Imports`, …) —
  match the surrounding files.
- **Logical CSS properties** (`inlineSize`, `paddingInlineStart`, `insetInlineStart`) because the
  template supports RTL. Avoid `left/right/width` in styles.
- **Icons:** Remix Icon classes, e.g. `<i className='ri-user-line' />`. Browse at remixicon.com.
- **MUI Grid v7 API:** `<Grid size={{ xs: 12, md: 6 }}>` (not the old `item xs={}`).
- Run `pnpm lint` before declaring done; there is no test suite.

## Gotchas

- Settings (mode/skin/layout/primaryColor) are stored in a cookie and win over `themeConfig`.
- Don't reference a route in menu data before its `page.tsx` exists (it will 404).
- `next/font` needs network on first build; CI/offline builds must cache the fonts.
- The big `mui-template.tar.gz` at the repo root is a packaging artifact — ignore it for dev.
