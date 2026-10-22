'use client';

// MUI Imports
import Tooltip from '@mui/material/Tooltip';

import type { ReactNode } from 'react';

/** ไอคอน ⓘ — ชี้/แตะแล้วขึ้นคำอธิบายสูตรหรือที่มาของตัวเลข */
const InfoTip = ({ text }: { text: ReactNode }) => (
  <Tooltip title={text} arrow enterTouchDelay={0} leaveTouchDelay={6000}>
    <i
      className="ri-information-line"
      tabIndex={0}
      aria-label="คำอธิบาย"
      style={{ fontSize: '1rem', cursor: 'help', verticalAlign: 'middle', opacity: 0.6 }}
    />
  </Tooltip>
);

export default InfoTip;
