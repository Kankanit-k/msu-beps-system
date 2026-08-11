# การควบคุมภายในและ Audit Trail สำหรับระบบ Cost Allocation

## 1. บทสรุปสำหรับผู้บริหาร

ระบบ Cost Allocation มีความเสี่ยงเชิงการควบคุมสูงกว่าระบบรายงานทั่วไป เพราะผลลัพธ์ไม่ได้เป็นเพียงยอดที่ดึงจาก ERP แต่เป็นยอดที่เกิดจากการเลือก mapping, พฤติกรรมต้นทุน, driver, ช่วงเวลา และกติกาปัดเศษ หากองค์ประกอบใดถูกแก้ไขโดยไม่มีการอนุมัติหรือไม่มีหลักฐานย้อนหลัง ตัวเลขจุดคุ้มทุนจะไม่สามารถอธิบายหรือสอบทานได้

กรอบควบคุมที่เสนอจึงต้องรักษา 4 คุณลักษณะพร้อมกัน ได้แก่ **ความครบถ้วน**, **ความถูกต้อง**, **การอนุมัติ**, และ **การตรวจสอบย้อนกลับ** โดยแยกหน้าที่ผู้จัดทำ ผู้ตรวจสอบ ผู้อนุมัติ และผู้ดูแลระบบออกจากกัน

## 2. Risk universe ของระบบ

| รหัส  | ความเสี่ยง                                | ผลกระทบต่อ BEP                                       | ระดับเบื้องต้น | Control objective                                              |
| ----- | ----------------------------------------- | ---------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| IC-01 | นำเข้าข้อมูล ERP ซ้ำหรือขาดบาง batch      | ต้นทุนสูง/ต่ำผิดจากความจริง                          | สูง            | ทุก source record ต้องมี key และ batch ที่ตรวจสอบได้           |
| IC-02 | Mapping ผิดหลักสูตร หน่วยงาน หรือช่วงเวลา | ต้นทุนถูกส่งให้ผู้รับผิดผิดราย                       | สูง            | Mapping ต้องมี effective period, owner และ approval            |
| IC-03 | จำแนก fixed/variable ผิด                  | BEP ผิดทิศทางและ sensitivity ผิด                     | สูง            | ใช้คีย์ผสมและกติกาที่ versioned พร้อม evidence                 |
| IC-04 | Driver ถูกแก้ย้อนหลัง                     | ผลปันส่วนเปลี่ยนโดยไม่ทราบสาเหตุ                     | สูง            | Driver snapshot ต้อง immutable หลัง run ได้รับอนุมัติ          |
| IC-05 | ปัดเศษหรือ denominator ผิด                | ผลรวมไม่เท่ากับ ERP                                  | กลาง-สูง       | Reconciliation และ tolerance control ทุก run                   |
| IC-06 | ผู้จัดทำอนุมัติผลของตนเอง                 | เกิด management override โดยไม่มี independent review | สูง            | Maker-checker และ segregation of duties                        |
| IC-07 | แก้ไขผลลัพธ์โดยตรง                        | สูญเสียความสามารถในการ reproduce                     | สูง            | ผลลัพธ์ immutable; แก้ด้วย run ใหม่หรือ adjustment ที่มีเหตุผล |
| IC-08 | สิทธิ์ฐานข้อมูลกว้างเกินไป                | ข้อมูลและ audit trail ถูกลบ/เปลี่ยน                  | สูง            | Role-based access, RLS, deny direct DML บน audit tables        |
| IC-09 | ปีงบประมาณกับปีการศึกษาจับคู่ผิด          | เปรียบเทียบรายได้กับต้นทุนคนละช่วง                   | สูง            | Period bridge และ validation ก่อนคำนวณ                         |
| IC-10 | รายการ unclassified ถูกนำไปรวมเงียบ ๆ     | ผู้บริหารเข้าใจความมั่นใจของผลผิด                    | กลาง-สูง       | บังคับ quality flag และ exception report                       |

## 3. Control framework ตามวงจรข้อมูล

### 3.1 Source ingestion controls

ระบบควรรับข้อมูลผ่าน `import_batch` ที่มีชื่อไฟล์ hash เวลา ผู้ส่ง จำนวนแถว และผล validation ทุกครั้ง ห้ามให้ผู้ใช้วางข้อมูลลงตาราง production โดยตรง กระบวนการรับเข้าต้องตรวจสอบ schema, data type, duplicate source record, period, organization และยอดรวมเบื้องต้นก่อน promote จาก staging เป็น source ที่ใช้งานได้

**หลักฐานที่ต้องเก็บ:** ไฟล์ต้นฉบับหรือ object URI, SHA-256 hash, import batch id, manifest จำนวนแถว, rejected rows, ผู้ส่ง, เวลา และผลอนุมัติการ promote

### 3.2 Master data and mapping controls

Mapping ระหว่าง ERP กับทะเบียนนิสิตต้องเป็นข้อมูลควบคุม ไม่ควรแก้ไขใน spreadsheet แล้วนำไปทับตารางโดยไม่มี version ระบบควรใช้ workflow `DRAFT → PENDING_APPROVAL → APPROVED → RETIRED` โดยให้เจ้าของข้อมูลเป็นผู้ยืนยันความหมาย และ controller/ผู้มีอำนาจเป็นผู้อนุมัติ

การแก้ mapping ที่มีผลย้อนหลังควรสร้าง version ใหม่และไม่ลบ version เดิม การแก้ไขช่วงเวลาต้องตรวจสอบไม่ให้ business key เดียวกันมีรายการ approved ซ้อนกัน และต้องบันทึกเหตุผล เอกสารอ้างอิง และวันที่มีผล

### 3.3 Cost behavior controls

การจัดประเภท `FIXED`, `VARIABLE`, `MIXED` และ `UNCLASSIFIED` ต้องมีหลักฐานประกอบ เช่น ผังบัญชี รายละเอียดรายการ ลักษณะสัญญา หรือการอนุมัติจากเจ้าของงบประมาณ สำหรับ `MIXED` ต้องบันทึก fixed ratio และ variable ratio รวมกันเป็น 1 เสมอ หากยังจำแนกไม่ได้ให้คงเป็น `UNCLASSIFIED` และส่งเข้า exception report แทนการเดาเป็น fixed หรือ variable

### 3.4 Driver controls

Driver ต้องมาจาก snapshot ของช่วงเวลาเดียวกับ cost pool และต้องมี source reference เมื่อใช้ actual usage ให้เก็บหน่วยวัดและวิธีรวบรวม หากใช้ student headcount ต้องระบุ snapshot date และสถานะนิสิตที่รวม/ไม่รวม หากใช้ program share ต้องติด quality flag `ESTIMATED` และแสดงผลแยกจาก direct/actual allocation

หลัง allocation run เริ่มต้นแล้ว driver snapshot ที่ถูกใช้ต้องไม่ถูกแก้ไข หากพบความผิดพลาดให้สร้าง corrected snapshot และ run ใหม่ เพื่อรักษาความสามารถในการ reproduce ของ run เดิม

### 3.5 Allocation execution controls

การสร้าง run ต้องแยกผู้สร้างจากผู้อนุมัติ โปรแกรมควร lock ขอบเขต period, organization, source basis และ rule version ใน run เดียวกัน เมื่อเริ่มคำนวณต้องเปลี่ยนสถานะเป็น `RUNNING` และป้องกันการแก้ข้อมูล input ที่เกี่ยวข้องจนกว่า run จะเสร็จ

ระบบต้องตรวจสอบอย่างน้อย 6 รายการก่อนให้สถานะ `CALCULATED` หรือ `VALIDATED` ได้แก่ denominator ไม่เป็นศูนย์, allocation ratio รวมต่อ cost pool เท่ากับ 1 ภายใน tolerance, ยอด allocated รวมเท่ากับ source total, ไม่มี cost ที่ตกหล่น, ไม่มี unapproved rule และไม่มี duplicate result key

### 3.6 Approval and posting controls

ผล `CALCULATED` ต้องถูกตรวจสอบโดยผู้ตรวจสอบที่ไม่ใช่ผู้จัดทำ จากนั้นจึงเปลี่ยนเป็น `VALIDATED` และส่งให้ผู้มีอำนาจอนุมัติเป็น `APPROVED` ก่อนนำไปใช้ใน dashboard หรือการตัดสินใจ หากต้องแก้ไขหลังอนุมัติ ห้าม update ผลเดิมโดยตรง ให้สร้าง run ใหม่พร้อมระบุ supersedes_run_id หรือ adjustment line และอ้างอิงเหตุผล

## 4. Audit Trail design

### 4.1 เหตุการณ์ที่ต้องบันทึก

| Domain         | Events ที่ต้องบันทึก                                      | ข้อมูลขั้นต่ำ                                        |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Import         | upload, validate, promote, reject, archive                | actor, batch, file hash, count, result               |
| Mapping        | create, submit, approve, reject, retire                   | before/after, reason, evidence, approver             |
| Rule           | create, change ratio, change method, approve              | old/new behavior, ratios, version                    |
| Driver         | load, correct, lock, use in run                           | snapshot hash, source, unit, period                  |
| Run            | create, start, fail, calculate, validate, approve, cancel | run scope, rule version, actor, timestamps           |
| Reconciliation | check, pass, fail, override                               | source total, allocated total, difference, tolerance |
| Reporting      | publish, refresh, export                                  | report version, filter, requester, output hash       |
| Security       | login, privilege change, role assignment                  | actor, target, before/after, ticket                  |

### 4.2 Audit event ที่ควรมีในทุก record

ทุก event ควรมี `event_time`, `actor`, `action`, `entity_type`, `entity_id`, `request_id`, `reason`, `before_payload`, `after_payload`, `source_ip` และผลการยืนยันความถูกต้องของ event เช่น `event_hash` กับ `previous_event_hash` การทำ hash chain ช่วยตรวจพบการลบหรือแก้ไขลำดับเหตุการณ์ แต่ต้องปกป้อง secret/key และมีการ export audit package ไปยัง storage ที่ผู้ดูแลระบบปกติแก้ไขไม่ได้

### 4.3 Immutability และ retention

ตาราง `audit_event`, `allocation_result` ของ run ที่อนุมัติแล้ว และ input snapshot ที่ถูกใช้ใน run ต้องไม่เปิดให้ application role ทำ `UPDATE` หรือ `DELETE` การแก้ไขต้องผ่าน privileged service ที่มีเหตุผลและ ticket อ้างอิง การเก็บรักษาต้องสอดคล้องกับนโยบายขององค์กรและข้อกำหนดด้านเอกสารการเงิน โดยกำหนด retention period เป็น policy แยกจาก DDL

## 5. Segregation of Duties

| Role                | ทำได้                                      | ห้ามทำ                              |
| ------------------- | ------------------------------------------ | ----------------------------------- |
| Data steward        | แก้ draft mapping และตรวจคุณภาพ input      | อนุมัติ mapping ของตนเอง            |
| Cost analyst        | สร้าง allocation run และวิเคราะห์ผล        | approve/post run ของตนเอง           |
| Reviewer/controller | ตรวจ reconciliation และ quality exceptions | แก้ source input เพื่อให้ยอดผ่าน    |
| Approver            | อนุมัติ mapping/rule/run                   | สร้างหรือแก้ผลก่อนอนุมัติ           |
| DBA/platform admin  | ดูแลโครงสร้างและสิทธิ์                     | แก้ business result โดยไม่มี ticket |
| Auditor/read-only   | อ่านหลักฐานและ export report               | เปลี่ยนข้อมูลใด ๆ                   |

ระบบควรมีการทบทวนสิทธิ์รายไตรมาส, ตรวจบัญชีผู้ใช้ที่ไม่ใช้งาน, บังคับ MFA ตามนโยบายองค์กร และมี emergency access ที่หมดอายุอัตโนมัติพร้อม post-review

## 6. Exception management

ควรสร้าง exception queue อย่างน้อยสำหรับ `UNCLASSIFIED`, `MISSING_DRIVER`, `DUPLICATE_SOURCE`, `PERIOD_MISMATCH`, `MAPPING_OVERLAP`, `RECONCILIATION_FAIL`, `MANUAL_OVERRIDE` และ `ROUNDING_ADJUSTMENT` แต่ละรายการควรมี owner, severity, due date, root cause, corrective action, approved resolution และ link ไปยัง run หรือ source record ที่เกี่ยวข้อง

ไม่ควรใช้การ override เพื่อทำให้ run ผ่านโดยไม่มีเหตุผล เพราะจะทำลายความหมายของ control หากจำเป็นต้อง override ให้บังคับใส่เหตุผล ผู้อนุมัติ จำนวนเงินที่กระทบ และวันหมดอายุของ exception

## 7. Audit procedures ที่ควรทำ

ผู้ตรวจสอบควรทำทั้ง control testing และ substantive analytics ได้แก่ ตรวจว่า source batch ครบถ้วน, สุ่ม trace จาก ERP ไป allocation result และย้อนกลับ, ตรวจ mapping ที่เปลี่ยนในช่วงเวลา, ตรวจผู้สร้างเทียบกับผู้อนุมัติ, recalculation จาก immutable input, ตรวจ reconciliation difference และวิเคราะห์ผลที่มี quality flag สูงผิดปกติ

ควรจัดทำ audit package ต่อ run ประกอบด้วย run metadata, source batch manifest, rule/mapping version, driver snapshot hash, input totals, output totals, reconciliation result, exception disposition, approval evidence และไฟล์ผลลัพธ์ที่มี hash เดียวกับที่ส่งให้ผู้บริหาร

## 8. Control KPIs สำหรับผู้บริหาร

| KPI                           | ความหมาย                                  | สัญญาณเตือน                     |
| ----------------------------- | ----------------------------------------- | ------------------------------- |
| Reconciliation pass rate      | สัดส่วน run ที่ยอดกลับ ERP ผ่าน tolerance | ต่ำกว่า 100%                    |
| Unclassified cost ratio       | ต้นทุนที่ยังจำแนกไม่ได้ต่อ cost pool      | สูงขึ้นต่อเนื่อง                |
| Estimated allocation ratio    | สัดส่วนผลที่ใช้ program share             | สูงเกิน threshold ที่อนุมัติ    |
| Manual override count/value   | จำนวนและมูลค่าการ override                | เพิ่มขึ้นโดยไม่มี root cause    |
| Mapping change after approval | การแก้ mapping ที่กระทบผลหลังอนุมัติ      | มีรายการโดยไม่มี corrective run |
| SoD violation count           | ผู้สร้างและผู้อนุมัติเป็นคนเดียวกัน       | ต้องเป็นศูนย์                   |
| Audit evidence completeness   | run ที่มีหลักฐานครบชุด                    | ต่ำกว่า 100%                    |

## 9. ลำดับการนำไปใช้

ระยะแรกควรทำ role matrix, approval workflow, import manifest, reconciliation และ immutable run ก่อน ระยะถัดไปเพิ่ม hash chain, RLS, exception queue และ audit package แบบลงลายมือชื่อดิจิทัล เมื่อระบบผ่าน pilot จึงกำหนด KPI threshold และ automated alerts สำหรับ controller และผู้บริหาร

## References

[1] COSO, Internal Control—Integrated Framework: https://www.coso.org/internal-control

[2] ISACA, COBIT Framework: https://www.isaca.org/resources/cobit

[3] PostgreSQL Documentation, Auditing and Logging: https://www.postgresql.org/docs/current/runtime-config-logging.html

[4] PostgreSQL Documentation, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
