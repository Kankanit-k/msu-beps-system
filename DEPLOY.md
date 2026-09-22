# การ deploy ขึ้น Vercel

รีโปนี้ deploy **สองโปรเจกต์จากรากเดียวกัน** ซึ่งเคยชนกันจน production ของเว็บจริง
404 อยู่หลายวัน เอกสารนี้อธิบายโครงสร้างที่แก้แล้วและกับดักที่เจอ

| โปรเจกต์ Vercel   | คืออะไร                       | Root Directory | ไฟล์ตั้งค่า                                    |
| ----------------- | ----------------------------- | -------------- | ---------------------------------------------- |
| `msu-beps-web`    | แอปจริง Next.js               | `apps/web`     | [`apps/web/vercel.json`](apps/web/vercel.json) |
| `msu-beps-mockup` | mockup หน้าจอ W0–W19 (static) | `mockup`       | [`mockup/vercel.json`](mockup/vercel.json)     |

ทั้งสองโปรเจกต์ **ไม่ได้ต่อกับ GitHub** — deploy ด้วย `vercel` CLI จากเครื่องเท่านั้น
push ขึ้น git จึงไม่ทำให้อะไร deploy เอง

**ลิงก์ production ของเว็บจริง:** <https://msu-beps-web.vercel.app/beps/overview/>
(อย่าแจก `https://msu-beps-web.vercel.app/` เปล่า ๆ — root ของโดเมนได้ 404 เพราะ `BASEPATH=/beps`)

## ห้ามวาง `vercel.json` ไว้ที่รากรีโป

`vercel.json` ที่รากมีผลกับ **ทุกโปรเจกต์ที่ deploy จากรากนี้** และ **ทับ** ทั้ง
Project Settings ใน dashboard และ `vercel.json` ที่อยู่ใน Root Directory ของโปรเจกต์
(ทดสอบยืนยันแล้ว — ใส่ `apps/web/vercel.json` ไว้ก็ยังแพ้ไฟล์ที่ราก)

เดิมไฟล์ที่รากเป็นของ mockup จึงสั่งให้ `msu-beps-web` ข้าม build แล้วเสิร์ฟโฟลเดอร์
`mockup` ที่ไม่มีอยู่ใน `apps/web` ผลคือ **404 ทุก path** โดย build ขึ้นสถานะ Ready ปกติ
ดูไม่ออกจากหน้า dashboard เลย — ต้องเปิด build log ถึงจะเห็น

## คำสั่ง

ทุกคำสั่งรันจาก **รากรีโป** และ **ต้องใส่ `--scope plan-b636`** (ดูหัวข้อถัดไป)

```bash
# เว็บจริง — preview
vercel deploy --scope plan-b636

# เว็บจริง — production
vercel deploy --prod --scope plan-b636

# mockup (ต้อง link ไปโปรเจกต์ mockup ก่อน)
vercel link --project msu-beps-mockup && vercel deploy --prod --scope plan-b636
```

### `Not authorized` ตอน deploy

`vercel deploy --prod` เฉย ๆ จะตอบ `{"status":"error","reason":"deploy_failed","message":"Not authorized"}`
ทั้งที่ `vercel whoami` ขึ้นชื่อผู้ใช้ปกติ สาเหตุคือ `orgId` ใน `.vercel/project.json`
เป็นทีมเก่า (`team_i4thRGQUZMTdbFMU4tfv7vlW`) ไม่ตรงกับ scope ที่ล็อกอินอยู่ (`plan-b636`)

แก้เฉพาะหน้า: ใส่ `--scope plan-b636` ทุกครั้ง · แก้ถาวร: `vercel link` ใหม่ให้ `.vercel/project.json`
ชี้ทีมปัจจุบัน

## กับดักของ monorepo (แก้ไว้แล้วใน `apps/web/vercel.json`)

1. **pnpm workspace** — `npm install` พังทันทีที่เจอ `workspace:*` ต้องบังคับใช้ pnpm
2. **pnpm บน build machine เก่าเกินไป** — ขึ้น `ERR_INVALID_THIS`
   (pnpm 8 คุยกับ registry บน Node 20+ ไม่ได้) จึง pin เป็น `npx -y pnpm@10.29.2`
3. **ต้อง install จากรากรีโป** ไม่ใช่ `apps/web` — `pnpm-workspace.yaml` กับ lockfile
   อยู่ที่ราก คำสั่งจึงขึ้นต้นด้วย `cd ../..`

## `.vercelignore`

อยู่ที่รากและใช้ร่วมกันทั้งสองโปรเจกต์ มีสองหน้าที่:

- **กันข้อมูลการเงินขึ้นเว็บ public** — `mockup/assets/data.js`, `*.xlsx`, `*.docx`,
  `*.pdf`, `.env*`, `MSU-BEPS*.html` · ห้ามลบบรรทัดเหล่านี้
- **ลดขนาดที่อัปโหลด** — แต่ **ห้ามตัด** `packages/`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `tsconfig.base.json` เพราะ Next.js ต้องใช้ตอน build
  (เคยตัดไว้สมัยที่รีโปมีแต่ mockup แล้วทำให้ `ERR_PNPM_NO_LOCKFILE`)

## Environment variables

ตั้งใน Vercel dashboard แยกตาม environment — ค่าชนิด Secret **ดึงกลับมาอ่านไม่ได้**
(`vercel env pull` คืน `[SENSITIVE]`) ถ้าต้องตั้ง environment ใหม่ต้องกรอกค่าเองทั้งหมด

ค่าที่ต้องมีอย่างน้อย: `BASEPATH`, `NEXT_PUBLIC_BASEPATH`, `AUTH_DISABLED`,
`NEXT_PUBLIC_AUTH_DISABLED`, `NEXTAUTH_SECRET`, `NEXTAUTH_BASEPATH` (ดู `apps/web/.env.example`)

> **แอปเสิร์ฟใต้ `/beps`** เพราะ `BASEPATH=/beps` — เปิด root ของโดเมนจะได้ 404
> ต้องเข้า `https://<โดเมน>/beps/overview/`

## เช็กว่า deploy สำเร็จจริง

สถานะ Ready ไม่ได้แปลว่าใช้งานได้ ให้ดู build log ว่า **build Next.js จริง** และลองยิง path จริง:

```bash
vercel inspect --logs <deployment-url> --scope plan-b636 | tail -20
vercel curl <deployment-url>/beps/overview/ -s -o /dev/null -w '%{http_code}\n'

# production หลัง alias ขึ้นแล้ว (ต้องมี -L เพราะ /beps/overview redirect 308 ไป /beps/overview/)
curl -sL -o /dev/null -w '%{http_code}\n' https://msu-beps-web.vercel.app/beps/overview/
```

`vercel curl` จะจัดการ Deployment Protection ของ preview ให้เอง (`curl` เปล่าจะได้ 302 ไปหน้า SSO)
