'use client';

// เลือกคณะ/หลักสูตรของบทบาท — เปิดเมื่อสลับเป็นผู้ดูแลคณะหรืออาจารย์ประจำหลักสูตร
// (บัญชีจริงจะได้ขอบเขตจาก ERP — ระหว่างนี้เลือกเองจากเมนูโปรไฟล์)

import { useEffect, useState } from 'react';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { roleDisplay, roleNeedsScope } from '@/configs/accessControl';
import type { AppRole, RoleScope } from '@/configs/accessControl';
import { PG_DATA } from '@views/scenario-program/programData';

interface Props {
  role: AppRole | null;
  initial: RoleScope;
  onClose: () => void;
  onConfirm: (role: AppRole, scope: RoleScope) => void;
}

const RoleScopeDialog = ({ role, initial, onClose, onConfirm }: Props) => {
  const need = role ? roleNeedsScope(role) : null;
  const [fac, setFac] = useState<string | null>(null);

  // เปิดใหม่ทุกครั้ง → ตั้งต้นจากขอบเขตเดิม
  useEffect(() => {
    if (!role) return;
    setFac(initial.faculty);
  }, [role, initial]);

  // อาจารย์ 1 คนอาจอยู่หลายหลักสูตร — ตอนนี้เลือกแค่คณะ (รอแผนยืนยันว่าต้องเลือกหลักสูตรด้วยไหม)
  const ready = !!fac;

  const submit = () => {
    if (!role || !ready) return;
    onConfirm(role, { faculty: fac, program: null });
  };

  return (
    <Dialog open={!!role && !!need} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{role ? roleDisplay[role].label : ''} — เลือกขอบเขต</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 4 }}>
          {need === 'program'
            ? 'อาจารย์ประจำหลักสูตรเห็นและปรับปรุงได้เฉพาะหลักสูตรในคณะของตน'
            : 'ผู้ดูแลคณะตั้งค่าและล็อกวิธีปันส่วนต้นทุนคงที่ได้เฉพาะคณะของตน'}
        </DialogContentText>
        <Stack
          spacing={3}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Autocomplete
            options={PG_DATA.map((g) => g.faculty)}
            value={fac}
            onChange={(_, v) => setFac(v)}
            renderInput={(params) => <TextField {...params} label="คณะ / หน่วยงาน" required />}
          />
          <button type="submit" hidden />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="contained" disabled={!ready} onClick={submit}>
          ใช้มุมมองนี้
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleScopeDialog;
