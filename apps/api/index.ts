import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

/* ยังไม่มี endpoint โดเมนจริง — ฝั่ง web อ่านจาก fixture ใน apps/web/src/data/fixtures
   ไปก่อน (ดูแผน Phase 2) endpoint จะทยอยเพิ่มตอน Phase 4 หลัง prisma db pull
   โดยให้ shape ตรงกับ apps/web/src/server/beps/* เพื่อสลับได้โดยหน้าจอไม่ต้องแก้ */

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'beps-api', at: new Date().toISOString() });
});

app.listen(port, () => {
  console.warn(`BEPS API listening on http://localhost:${port}`);
});
