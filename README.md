# BEPS-SYSTEM

ระบบวิเคราะห์จุดคุ้มทุนหลักสูตร (Break-Even Point System) มหาวิทยาลัยมหาสารคาม

> **สถานะ: Sprint 0 เสร็จ** — ตั้งโครง monorepo + tooling เรียบร้อย ยังไม่มีแอปจริง
> เอกสารออกแบบทั้งหมดอยู่ใน [`SA.md`](./SA.md) · mockup หน้าจอครบทุกหน้าอยู่ใน [`mockup/`](./mockup/)

## ต้องมีอะไรก่อน

- Node.js 22+ (พัฒนาด้วย v24)
- pnpm 10+ (`corepack enable pnpm`)
- Docker (สำหรับ PostgreSQL ตอน dev)

## เริ่มใช้งาน

```bash
pnpm install
cp .env.example .env
pnpm db:up          # เปิด PostgreSQL 17 ผ่าน docker compose
pnpm verify         # format + lint + typecheck + test
```

> **หมายเหตุเรื่องภาษาไทยใน DB:** database ถูกตั้งให้ใช้ ICU collation `th-TH`
> ถ้าใช้ locale แบบ libc (`C` หรือ `C.UTF-8`) ชื่อที่ขึ้นต้นด้วยสระหน้า (เ แ โ ใ ไ)
> จะถูกดันไปท้ายรายการ เช่น "เกษตรศาสตร์" จะไปอยู่หลังพยัญชนะทั้งหมดแทนที่จะเรียงใต้ ก
> ทดสอบจริงแล้วใน Sprint 0 — **ตั้งค่านี้ให้เหมือนกันบน production ด้วย**
> ถ้าเคย `pnpm db:up` ด้วย config เก่าไว้ ต้อง `docker compose down -v` แล้ว up ใหม่ (initdb ตั้ง collation ได้ครั้งเดียว)

## คำสั่งที่ใช้บ่อย

| คำสั่ง            | ทำอะไร                                         |
| ----------------- | ---------------------------------------------- |
| `pnpm verify`     | รันทุกอย่างที่ CI รัน — ใช้ก่อน commit เสมอ    |
| `pnpm test`       | รันเทสต์ทั้ง repo (vitest)                     |
| `pnpm test:watch` | รันเทสต์แบบ watch ตอนพัฒนา                     |
| `pnpm lint`       | ESLint (type-aware)                            |
| `pnpm lint:fix`   | แก้สิ่งที่ ESLint แก้ได้อัตโนมัติ              |
| `pnpm format`     | จัดรูปแบบโค้ดด้วย Prettier                     |
| `pnpm typecheck`  | `tsc --noEmit` ทุก package                     |
| `pnpm db:up`      | เปิด PostgreSQL                                |
| `pnpm db:down`    | ปิด PostgreSQL (ข้อมูลยังอยู่ใน docker volume) |

## โครงสร้าง

```
beps-system/
├── packages/
│   ├── calc-engine/     ★ สูตรคำนวณจุดคุ้มทุน — แกนความถูกต้องของระบบ (ดู TODO.md ข้างใน)
│   └── shared-types/      Zod schema ที่ frontend/backend ใช้ร่วมกัน
├── apps/                  ยังว่าง — api มาใน Sprint 2, web มาใน Sprint 6
├── docker-compose.yml     PostgreSQL 17 สำหรับ local dev
├── SA.md                  เอกสาร System Analysis ฉบับเต็ม (17 หัวข้อ)
├── ER.html                โครงสร้างฐานข้อมูล v2 32 ตาราง — เปิดดู/ส่งต่อได้ (ดูด้านล่าง)
├── mockup/                ★ Mockup high-fidelity ครบ 20 หน้าจอ W0–W19 — หนึ่งหน้าจอ = หนึ่งไฟล์ (ดู mockup/README.md)
├── WIREFRAME.html         Wireframe 15 หน้าจอ (W0–W14) — โครงหน้าจอ low-fidelity (ยังไม่มี W15)
├── MOCKUP.html            Mockup รุ่นแรก 4 หน้าจอ — แทนที่ด้วย mockup/ แล้ว เก็บไว้อ้างอิง
├── MOCKUP-MASTER.html     Mockup รุ่นแรก หน้าจอ Master & Config — แทนที่ด้วย mockup/ แล้ว เก็บไว้อ้างอิง
├── MSU-BEPS-V9.html       ★ ต้นแบบใช้งานได้จริง 13 หน้าจอ ข้อมูลจริงครบ 4 ชั้น + หน้า Master/Config — เปิดออฟไลน์ได้
├── COMPARISON.md          บันทึกเปรียบเทียบ ER v1 กับข้อเสนอ MANUS
├── MAPPING.md             การแมพข้อมูล ทะเบียน ↔ ERP
├── db/                    schema + เครื่องปันส่วน ที่ทดสอบผ่านบน PostgreSQL 17
└── ไฟล์อ้างอิง/            Excel, docx, prototype HTML เดิม (ดูด้านล่าง)
```

### เอกสารสำหรับนำไปประชุม

**[`mockup/`](./mockup/)** — ต้นแบบหน้าจอครบทั้งระบบ 20 หน้า (W0–W19) คลิกได้จริง ใช้สูตรและข้อมูลจริงปี 2568
เริ่มที่ [`mockup/index.html`](./mockup/index.html) · ใช้เสนอผู้บริหารและส่งต่อ dev ได้ทีละหน้า
ทั้งโฟลเดอร์ต้องส่งไปด้วยกัน (มีไฟล์ CSS/ข้อมูลร่วมอยู่ใน `mockup/assets/`)

> **หมายเหตุเรื่องข้อมูล** — repo นี้เก็บเฉพาะ `mockup/assets/data.sample.js` ที่ตัวเลขถูกสุ่มรบกวนแล้ว
> ข้อมูลจริง (`mockup/assets/data.js`) ถูก `.gitignore` กันไว้ ส่งต่อกันเองนอก git
> วางไฟล์จริงลงใน `mockup/assets/` แล้วหน้าจอจะแสดงตัวเลขจริงเองโดยอัตโนมัติ

`ER.html` (โครงสร้าง 32 ตาราง) และ `WIREFRAME.html` (15 หน้าจอ low-fidelity) เปิดได้โดย**ไม่ต้องต่ออินเทอร์เน็ต**
— `ER.html` ฝังไลบรารี Mermaid ไว้จึงมีขนาด ~3.5 MB ส่งทางอีเมลหรือ USB ได้เลย
ใช้คุยกับกองแผนงาน/กองงบประมาณเพื่อทบทวนโครงสร้างข้อมูลก่อนสร้างจริง

ไฟล์นี้เป็นเอกสารที่ generate ขึ้นจาก **SA.md หัวข้อ 5** ซึ่งถือเป็นต้นฉบับทางการ — ถ้าจะแก้ ER ให้แก้ SA.md ก่อน แล้วอัปเดต `ER.html` ตาม

### ไฟล์อ้างอิงที่ไม่อยู่ใน git — ต้องขอแยก

ไฟล์เหล่านี้มี**ข้อมูลการเงินภายในมหาวิทยาลัย** (ค่าธรรมเนียมทุกหลักสูตร งบประมาณ ค่าเสื่อมราคา ข้อมูลนิสิต แยกรายคณะทั้ง 20 คณะ)
จึงถูกกันไว้ใน `.gitignore` **โดยเจตนา** ต้องขอจากเจ้าของโปรเจกต์แยกต่างหาก แล้ววางไว้ที่ root ของ repo

| ไฟล์                                        | ใช้ทำอะไร                                                         | จำเป็นตอนไหน                |
| ------------------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `20260711_จุดคุ้มทุน update.xlsx`           | **ไฟล์ต้นฉบับที่ใช้จริง** — ที่มาของตัวเลข golden test            | Sprint 1, 2                 |
| `20260711_... update (1).xlsx` / `(2).xlsx` | สำเนาซ้ำ ไม่ใช้ (ยืนยันแล้วว่าให้ใช้ไฟล์แรก)                      | —                           |
| `ที่มาของจุดคุ้มทุน.docx`                   | เอกสารความต้องการต้นฉบับ — ที่มาของ FR ทั้งหมด                    | อ่านประกอบ SA.md            |
| `MSU-BEPS_03June26-1.html`                  | prototype เวอร์ชันเก่า — สรุปผลแกะโค้ดอยู่ใน SA.md หัวข้อ 16 แล้ว | Sprint 1 (เทียบ logic สูตร) |

> **เหตุผลที่ไม่ commit ตั้งแต่แรก:** git เก็บประวัติทุก commit ถ้าวันหน้าเปลี่ยน repo เป็น public
> ไฟล์ที่เคย commit ไว้จะยังดาวน์โหลดได้แม้ลบออกไปแล้ว — การไม่ commit เลยจึงเป็นวิธีเดียวที่ปลอดภัยจริง

## แผนถัดไป

**Sprint 1 เสร็จแล้ว** — `packages/calc-engine` มีสูตร 1–7 ครบ พร้อม golden test เทียบ prototype v8
(67 เทสต์ · `pnpm verify` ผ่านทั้งหมด) port จาก `db/02_functions.sql` ที่ทดสอบผ่านบน PostgreSQL แล้ว

นโยบายการคำนวณไม่ฝังในโค้ด — ทุกฟังก์ชันรับ `CalcPolicy` ที่ตรงกับตาราง `system_setting` หนึ่งต่อหนึ่ง
เหลืองานค้าง: golden test ระดับหลักสูตรครบ 230 รายการ (รอคำตอบข้อ A) และโปรซีเยอร์ `scenario_result`
— รายละเอียดใน [`packages/calc-engine/TODO.md`](./packages/calc-engine/TODO.md)

Sprint 2 คือ Prisma schema 32 ตาราง + import ข้อมูลจริง

แผน sprint ทั้งหมดอยู่ใน SA.md หัวข้อ 14
