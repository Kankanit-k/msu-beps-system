'use client'

// MUI Imports
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

// Type Imports
import type { EntityCatalog, EntityKind } from '@/server/beps/entities'

/**
 * ตัวเลือกหน่วยวิเคราะห์ 4 ระดับ — ย้ายจาก .selrow / chEntities() ของ
 * mockup/assets/page-chart.js
 *
 * dropdown ที่ไม่เกี่ยวกับระดับที่เลือกอยู่จะถูกซ่อน (เหมือน mockup) และเมื่อเปลี่ยนคณะ
 * แล้วระดับ/หลักสูตรเดิมไม่มีในคณะใหม่ จะเลื่อนไปตัวแรกที่มีอยู่จริงให้เอง
 */

export type Selection = {
  kind: EntityKind
  faculty: string
  level: string
  programId: string
}

type Props = {
  catalog: EntityCatalog
  selection: Selection
  onChange: (next: Selection) => void
}

const KINDS: { value: EntityKind; label: string }[] = [
  { value: 'university', label: 'มหาวิทยาลัย (รวม)' },
  { value: 'faculty', label: 'รายคณะ' },
  { value: 'faculty_level', label: 'คณะ × ระดับการศึกษา' },
  { value: 'program', label: 'รายหลักสูตร' }
]

const EntitySelector = ({ catalog, selection, onChange }: Props) => {
  const showFaculty = selection.kind !== 'university'
  const showLevel = selection.kind === 'faculty_level' || selection.kind === 'program'
  const showProgram = selection.kind === 'program'

  const levels = catalog.facultyLevels.filter(e => e.faculty === selection.faculty)
  const programs = catalog.programs.filter(e => e.faculty === selection.faculty && e.level === selection.level)

  const handleFacultyChange = (faculty: string) => {
    const nextLevels = catalog.facultyLevels.filter(e => e.faculty === faculty)
    const level = nextLevels.some(e => e.level === selection.level) ? selection.level : (nextLevels[0]?.level ?? '')
    const nextPrograms = catalog.programs.filter(e => e.faculty === faculty && e.level === level)

    onChange({ ...selection, faculty, level, programId: nextPrograms[0]?.id ?? '' })
  }

  const handleLevelChange = (level: string) => {
    const nextPrograms = catalog.programs.filter(e => e.faculty === selection.faculty && e.level === level)

    onChange({ ...selection, level, programId: nextPrograms[0]?.id ?? '' })
  }

  return (
    <div className='flex items-center gap-3 flex-wrap'>
      <TextField
        select
        size='small'
        label='หน่วยวิเคราะห์'
        value={selection.kind}
        onChange={e => onChange({ ...selection, kind: e.target.value as EntityKind })}
        sx={{ minInlineSize: 200 }}
      >
        {KINDS.map(kind => (
          <MenuItem key={kind.value} value={kind.value}>
            {kind.label}
          </MenuItem>
        ))}
      </TextField>

      {showFaculty && (
        <TextField
          select
          size='small'
          label='คณะ'
          value={selection.faculty}
          onChange={e => handleFacultyChange(e.target.value)}
          sx={{ minInlineSize: 260 }}
        >
          {catalog.faculties.map(faculty => (
            <MenuItem key={faculty.id} value={faculty.faculty}>
              {faculty.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {showLevel && (
        <TextField
          select
          size='small'
          label='ระดับการศึกษา'
          value={selection.level}
          onChange={e => handleLevelChange(e.target.value)}
          sx={{ minInlineSize: 180 }}
        >
          {levels.map(level => (
            <MenuItem key={level.id} value={level.level}>
              {level.level}
            </MenuItem>
          ))}
        </TextField>
      )}

      {showProgram && (
        <TextField
          select
          size='small'
          label='หลักสูตร'
          value={selection.programId}
          onChange={e => onChange({ ...selection, programId: e.target.value })}
          sx={{ minInlineSize: 300 }}
        >
          {programs.map(program => (
            <MenuItem key={program.id} value={program.id}>
              {program.shortName}
            </MenuItem>
          ))}
        </TextField>
      )}
    </div>
  )
}

export default EntitySelector
