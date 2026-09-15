'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Component Imports
import HighlightText from '@views/beps/shared/HighlightText'
import TableToolbar from '@views/beps/shared/TableToolbar'
import TreeRow, { TREE_COLUMNS } from './TreeRow'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { TreeFaculty } from '@/server/beps/breakeven-tree'
import type { BreakEvenStatus } from '@/server/beps/status'
import type { ComputedProgram } from './tree'

// Util Imports
import { computeTree } from './tree'
import { fmtInt } from '@/utils/beps-format'

/**
 * ต้นไม้ 3 ระดับของ W2 — ย้ายจาก buildTree() ของ mockup/assets/page-breakeven.js
 *
 * พฤติกรรมที่ต้องรักษาไว้จาก mockup:
 *  - คลิกแถวคณะ/ระดับเพื่อกางหรือพับ
 *  - **ระหว่างค้นหาหรือกรอง ต้นไม้กางเองทั้งหมดและกดพับไม่ได้** ไม่งั้นผลการค้นหา
 *    จะซ่อนอยู่หลังโหนดที่พับไว้ ผู้ใช้จะนึกว่าไม่เจอ
 *  - คณะ/ระดับที่ไม่มีหลักสูตรตรงเงื่อนไขจะหายไปทั้งกิ่ง
 */

type QuickFilterValue = 'all' | BreakEvenStatus

const FILTERS: { value: QuickFilterValue; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ok', label: 'คุ้มทุน' },
  { value: 'below', label: 'ยังไม่คุ้ม' },
  { value: 'no_breakeven', label: 'R ≤ AVC' }
]

const HEADERS = [
  'คณะ / ระดับ / หลักสูตร',
  'นิสิต (Q)',
  'จุดคุ้มทุน Q*',
  'รายได้/หัว R',
  'AVC',
  'TR (ลบ.)',
  'ส่วนเกิน (ลบ.)',
  'สถานะ'
]

type Props = {
  faculties: TreeFaculty[]
}

const BreakEvenTree = ({ faculties }: Props) => {
  const { revenueMode } = useBeps()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<QuickFilterValue>('all')
  const [openFaculties, setOpenFaculties] = useState<Record<string, boolean>>({})
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const tree = useMemo(() => computeTree(faculties, revenueMode), [faculties, revenueMode])

  const query = search.trim().toLowerCase()
  const isFiltering = query !== '' || filter !== 'all'

  const matches = (program: ComputedProgram, faculty: string, group: string): boolean => {
    const textHit =
      !query ||
      [program.name, program.degree, program.level, faculty, group].some(value => value.toLowerCase().includes(query))

    return textHit && (filter === 'all' || program.status === filter)
  }

  /* กิ่งที่จะแสดงจริง — คำนวณครั้งเดียวแล้วใช้ทั้งการนับและการวาด */
  const branches = tree
    .map(faculty => ({
      faculty,
      groups: faculty.groups
        .map(group => ({
          group,
          programs: isFiltering ? group.programs.filter(p => matches(p, faculty.name, group.name)) : group.programs
        }))
        .filter(({ programs }) => !isFiltering || programs.length > 0)
    }))
    .filter(({ groups }) => !isFiltering || groups.length > 0)

  const shownPrograms = branches.reduce((sum, b) => sum + b.groups.reduce((s, g) => s + g.programs.length, 0), 0)
  const totalPrograms = tree.reduce((sum, f) => sum + f.groups.reduce((s, g) => s + g.programs.length, 0), 0)

  const expandAll = () => {
    setOpenFaculties(Object.fromEntries(tree.map(f => [f.key, true])))
    setOpenGroups(Object.fromEntries(tree.flatMap(f => f.groups.map(g => [g.key, true]))))
  }

  const collapseAll = () => {
    setOpenFaculties({})
    setOpenGroups({})
  }

  const caret = (open: boolean) => (
    <Box
      component='i'
      className='ri-arrow-right-s-line'
      sx={{
        display: 'inline-block',
        transition: 'transform .15s',
        transform: open ? 'rotate(90deg)' : 'none',
        marginInlineEnd: 1,
        verticalAlign: 'middle'
      }}
    />
  )

  return (
    <Card>
      <CardHeader
        title='เจาะลึกจุดคุ้มทุน 3 ระดับ'
        subheader='คลิกที่คณะเพื่อดูระดับการศึกษา และคลิกระดับเพื่อดูรายหลักสูตร · หรือพิมพ์ค้นหาด้านล่าง'
        action={
          <div className='flex gap-2'>
            <Button size='small' variant='outlined' onClick={expandAll} disabled={isFiltering}>
              ขยายทั้งหมด
            </Button>
            <Button size='small' variant='outlined' onClick={collapseAll} disabled={isFiltering}>
              ย่อทั้งหมด
            </Button>
          </div>
        }
        sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          flexWrap: 'wrap',
          paddingBlock: 3,
          paddingInline: 6,
          borderBlock: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'action.hover'
        }}
      >
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder='ค้นหาคณะ / ระดับ / ชื่อหลักสูตร / ชื่อปริญญา…'
          filters={FILTERS}
          filter={filter}
          onFilterChange={setFilter}
        />
        <Chip
          size='small'
          variant='tonal'
          color='primary'
          label={
            isFiltering
              ? `พบ ${fmtInt(shownPrograms)} หลักสูตร · ${fmtInt(branches.length)} คณะ`
              : `${fmtInt(totalPrograms)} หลักสูตร · ${fmtInt(tree.length)} คณะ`
          }
        />
      </Box>

      <Box sx={{ overflow: 'auto', maxBlockSize: 640 }}>
        <Box sx={{ minInlineSize: 960 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: TREE_COLUMNS,
              gap: 2,
              paddingBlock: 2,
              paddingInline: 4,
              position: 'sticky',
              insetBlockStart: 0,
              zIndex: 1,
              backgroundColor: 'customColors.tableHeaderBg',
              borderBlockEnd: '1px solid',
              borderColor: 'divider'
            }}
          >
            {HEADERS.map((header, index) => (
              <Typography
                key={header}
                variant='caption'
                sx={{ fontWeight: 600, textAlign: index === 0 ? 'start' : 'end' }}
              >
                {header}
              </Typography>
            ))}
          </Box>

          {branches.length === 0 ? (
            <Box sx={{ padding: 10, textAlign: 'center' }}>
              <Typography color='text.disabled'>
                ไม่พบข้อมูลที่ตรงกับ &ldquo;<b>{search}</b>&rdquo;
                {filter !== 'all' ? ' ในตัวกรองที่เลือก' : ''} — ลองคำอื่นหรือกดล้างคำค้นหา
              </Typography>
            </Box>
          ) : (
            branches.map(({ faculty, groups }) => {
              const facultyOpen = isFiltering || Boolean(openFaculties[faculty.key])

              return (
                <Box key={faculty.key}>
                  <TreeRow
                    depth={0}
                    result={faculty.result}
                    status={faculty.status}
                    onClick={
                      isFiltering
                        ? undefined
                        : () => setOpenFaculties(prev => ({ ...prev, [faculty.key]: !prev[faculty.key] }))
                    }
                    label={
                      <>
                        {caret(facultyOpen)}
                        <HighlightText text={faculty.name} query={query} />
                      </>
                    }
                  />

                  {facultyOpen &&
                    groups.map(({ group, programs }) => {
                      const groupOpen = isFiltering || Boolean(openGroups[group.key])

                      return (
                        <Box key={group.key}>
                          <TreeRow
                            depth={1}
                            result={group.result}
                            status={group.status}
                            onClick={
                              isFiltering
                                ? undefined
                                : () => setOpenGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))
                            }
                            label={
                              <>
                                {caret(groupOpen)}
                                <HighlightText text={group.name} query={query} />{' '}
                                <Typography component='span' variant='caption' color='text.disabled'>
                                  ({isFiltering ? `${programs.length} / ` : ''}
                                  {group.programCount} หลักสูตร)
                                </Typography>
                              </>
                            }
                          />

                          {groupOpen &&
                            programs.map(program => (
                              <TreeRow
                                key={program.key}
                                depth={2}
                                result={program.result}
                                status={program.status}
                                label={
                                  <span title={`${program.name} · ${program.degree}`}>
                                    <HighlightText text={program.name} query={query} />{' '}
                                    <Typography component='span' variant='caption' color='text.disabled'>
                                      · <HighlightText text={program.level} query={query} />
                                    </Typography>
                                  </span>
                                }
                              />
                            ))}
                        </Box>
                      )
                    })}
                </Box>
              )
            })
          )}
        </Box>
      </Box>
    </Card>
  )
}

export default BreakEvenTree
