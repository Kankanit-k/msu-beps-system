---
name: add-page
description: Scaffold a new authenticated page in this Next.js + MUI template and register it in the sidebar/top menu. Use when the user wants to add a page, route, screen, or menu item to the MSU starter-kit template.
---

# Add a page to the MSU starter-kit template

This template is **data-driven**: pages are Next.js App Router routes, and the navigation is a
single data file. Adding a page is two steps — create the route, then register it in the menu.

## Conventions (read first)

- **Keep paths shallow — aim for ≤ 3 segments.** e.g. `/admin/manage-users`, `/api/test`.
  Avoid deep nesting like `/admin/users/manage/list`.
- **Group menu items by purpose.** Sidebar sections: `แดชบอร์ด` (dashboards), `ตาราง`
  (tables/lists), then admin sections. Add the new page to the matching section.
- **Pick the access tier** (enforced by `src/middleware.ts` via `src/configs/accessControl.ts`):
  - `user` (login) → default; any path under `(private)`.
  - `deptAdmin` (ผู้ดูแลหน่วยงาน) → put the page under `/admin/**` and in the `ผู้ดูแลหน่วยงาน` section.
  - `universityAdmin` (ผู้ดูแลมหาวิทยาลัย) → put it under `/admin/university/**` and in the
    `ผู้ดูแลมหาวิทยาลัย` section.
  - A route's tier comes from its prefix in `routeAccessRules`; unlisted paths default to `user`.
    The menu only _hides_ links — middleware does the real enforcement. Full table: CLAUDE.md.

## Step 1 — Create the route

Create `src/app/(private)/<route>/page.tsx`. The `(private)` group applies the dashboard
layout (sidebar + navbar) and auth. Use this minimal, on-theme starting point:

```tsx
// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

const <PascalCaseName>Page = () => {
  return (
    <Card>
      <CardHeader title='<หัวข้อ>' subheader='<คำอธิบาย>' />
      <CardContent>
        <Typography>เนื้อหาของหน้า…</Typography>
      </CardContent>
    </Card>
  )
}

export default <PascalCaseName>Page
```

Notes:

- Keep it a **server component** (no `'use client'`) unless you use hooks/state/effects/event
  handlers — then add `'use client'` at the top (see `src/app/(private)/users/page.tsx`).
- Nested routes are just nested folders, e.g. `dashboards/reports/page.tsx` → `/dashboards/reports`.
- For a richer example with cards/grid, copy `src/app/(private)/home/page.tsx`.

## Step 2 — Register it in the sidebar

Edit `src/data/navigation/verticalMenuData.tsx`. Add an **item** to the relevant section, or add
a new section. Shapes:

```tsx
// Link item
{ label: 'รายงาน', href: '/dashboards/reports', icon: 'ri-file-chart-line' }

// Expandable group (sub-menu)
{
  label: 'รายงาน',
  icon: 'ri-file-chart-line',
  suffix: { label: 'ใหม่', size: 'small', color: 'primary' }, // optional chip badge
  children: [
    { label: 'รายเดือน', href: '/reports/monthly' },
    { label: 'รายปี', href: '/reports/yearly' }
  ]
}

// Section heading (grey group label)
{ label: 'รายงาน', isSection: true, children: [ /* items / sub-menus */ ] }
```

- `icon` is a **Remix Icon** class (browse at https://remixicon.com), e.g. `ri-user-line`.
- If the project also uses the **horizontal** layout, mirror the entry in
  `src/data/navigation/horizontalMenuData.tsx` (it has no `isSection` — use items/sub-menus).

## Step 3 — Verify

- `pnpm dev` and click the new menu item, **or** `pnpm lint` for a quick static check.
- Don't add a menu entry whose `href` has no `page.tsx` yet — it 404s.

## Reference

- Menu types: `src/types/menuTypes.ts`
- Menu renderer: `src/components/GenerateMenu.tsx`
- Sidebar styling: `src/@core/styles/vertical/{menuItemStyles,menuSectionStyles}.ts`
