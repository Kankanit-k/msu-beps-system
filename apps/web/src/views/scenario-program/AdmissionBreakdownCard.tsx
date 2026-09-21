'use client';

/**
 * ห่อ AdmissionBreakdown ให้ใช้เดี่ยวๆ ได้โดยไม่ต้องให้หน้าที่เรียกจัดการสถานะเอง
 *
 * หน้า /scenario/program ต้องการแค่การ์ดใบเดียว ส่วนหน้า /scenario/admission-plan
 * มีสามการ์ดที่ต้องใช้สถานะร่วมกัน จึงเรียก useAdmissionPlan เองที่ระดับหน้า
 */

import Snackbar from '@mui/material/Snackbar';

import AdmissionBreakdown from './AdmissionBreakdown';
import { useAdmissionPlan } from './useAdmissionPlan';

const AdmissionBreakdownCard = ({
  qStar,
  programName,
}: {
  qStar: number | null;
  programName: string;
}) => {
  const state = useAdmissionPlan(programName, qStar);

  return (
    <>
      <AdmissionBreakdown qStar={qStar} programName={programName} state={state} />
      <Snackbar
        open={!!state.toast}
        autoHideDuration={4000}
        onClose={() => state.setToast(null)}
        message={state.toast}
      />
    </>
  );
};

export default AdmissionBreakdownCard;
