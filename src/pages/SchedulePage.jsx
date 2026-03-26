import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { useAuth } from '../context/AuthContext'
import { fetchTrainingSlots, createTrainingSlot, updateTrainingSlot, deleteTrainingSlot } from '../services/trainingSlots'
import { fetchActiveFields } from '../services/fields'
import { fetchTeams } from '../services/teams'
import { fetchActiveSchedules, fetchSchedules } from '../services/schedules'
import { DAYS, TIME_SLOTS, timeToMinutes } from '../lib/constants'

const SLOT_HEIGHT = 24 // px per 15-min row
const HEADER_HEIGHT = 40
const MIN_SLOT_DURATION = 15 // minimum 15 min

function isLabeledTime(time) {
  return time.endsWith(':00') || time.endsWith(':30')
}

// Convert minutes since midnight back to "HH:MM"
function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function SchedulePage() {
  const { user } = useAuth()
  const isAdmin = !!user

  const [activeSchedules, setActiveSchedules] = useState([])
  const [allSchedules, setAllSchedules] = useState([])
  const [selectedScheduleId, setSelectedScheduleId] = useState(null)
  const [slots, setSlots] = useState([])
  const [fields, setFields] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal day (admin only) — null or day value (1-5)
  const [modalDay, setModalDay] = useState(null)

  // Popover state
  const [popover, setPopover] = useState(null) // { x, y, dayValue, startTime, slot? }
  const popoverRef = useRef(null)

  // Drag selection state (drag-to-create on empty cells)
  const dragRef = useRef({ isDragging: false, startCell: null, currentCell: null, dayValue: null })
  const [highlightedCells, setHighlightedCells] = useState(new Set())

  // Block drag state (move / resize-bottom / resize-right)
  const blockDragRef = useRef({
    type: null, // 'move' | 'resize-bottom' | 'resize-right' | null
    slotId: null,
    startMousePos: { x: 0, y: 0 },
    startCell: { fieldIndex: 0, timeIndex: 0 },
    originalSlot: null,
    originalFieldIds: [],
    originalStartTime: null,
    originalEndTime: null,
    dayValue: null,
    slotDurationSlots: 0, // number of 15-min increments
    slotFieldCount: 0,
    gridRect: null, // bounding rect of the field columns container
    fieldRects: [], // array of { left, width } for each field column
  })
  const [blockDragGhost, setBlockDragGhost] = useState(null) // { x, y, width, height, color, teamNames }
  const [blockDragTarget, setBlockDragTarget] = useState(null) // { fieldStartIndex, fieldCount, timeStartIndex, timeCount }
  const blockDragTargetRef = useRef(null)

  function updateBlockDragTarget(val) {
    blockDragTargetRef.current = val
    setBlockDragTarget(val)
  }

  const scheduleRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  // Register PDF export handler with parent TrainingschemaLayout
  const { registerExportHandler } = useOutletContext() || {}

  const handleExportPdf = async () => {
    if (!scheduleRef.current || exporting) return
    setExporting(true)
    try {
      const element = scheduleRef.current
      element.classList.add('pdf-export')

      const allSections = Array.from(element.querySelectorAll('[data-day-export]'))
      const activeSections = isAdmin
        ? allSections
        : allSections.filter(s => {
            const dayValue = parseInt(s.getAttribute('data-day-export'), 10)
            return slotsByDay[dayValue] && slotsByDay[dayValue].length > 0
          })

      if (activeSections.length === 0) {
        element.classList.remove('pdf-export')
        alert('Geen trainingen om te exporteren.')
        return
      }

      // Render elke dag-sectie op vaste breedte
      const exportWidth = 900
      const canvases = []
      for (const section of activeSections) {
        const originalStyle = section.style.cssText
        section.style.width = `${exportWidth}px`
        section.style.maxWidth = `${exportWidth}px`
        section.style.flexShrink = '0'
        const c = await html2canvas(section, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
        section.style.cssText = originalStyle
        canvases.push(c)
      }

      element.classList.remove('pdf-export')

      // Verdeel canvassen in 2 rijen: eerste 3 en laatste 2
      const row1 = canvases.slice(0, 3)
      const row2 = canvases.slice(3)

      const colWidth = canvases[0]?.width || 0
      const row1Width = row1.reduce((s, c) => s + c.width, 0)
      const row2Width = row2.reduce((s, c) => s + c.width, 0)
      const totalWidth = Math.max(row1Width, row2Width)
      const row1Height = Math.max(...row1.map(c => c.height))
      const row2Height = row2.length ? Math.max(...row2.map(c => c.height)) : 0
      const gap = 20 // px tussenruimte tussen rijen

      const combined = document.createElement('canvas')
      combined.width = totalWidth
      combined.height = row1Height + (row2.length ? gap + row2Height : 0)
      const ctx = combined.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, combined.width, combined.height)

      // Rij 1
      let x = 0
      for (const c of row1) { ctx.drawImage(c, x, 0); x += c.width }

      // Rij 2
      x = 0
      for (const c of row2) { ctx.drawImage(c, x, row1Height + gap); x += c.width }

      const margin = 8
      const imgData = combined.toDataURL('image/jpeg', 0.95)
      const aspectRatio = combined.height / combined.width // hoogte/breedte van het canvas

      // Probeer A4 landscape eerst (297×210mm), anders A3 landscape (420×297mm)
      const formats = [
        { format: 'a4', pageW: 297, pageH: 210 },
        { format: 'a3', pageW: 420, pageH: 297 },
      ]

      let chosen = formats[formats.length - 1] // fallback: A3
      for (const f of formats) {
        const availW = f.pageW - margin * 2
        const drawH = availW * aspectRatio
        if (drawH <= f.pageH - margin * 2) {
          chosen = f
          break
        }
      }

      const availW = chosen.pageW - margin * 2
      const titleH = 8 // ruimte voor titel in mm
      const drawH = availW * aspectRatio
      const y = margin + titleH
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: chosen.format })
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(30, 30, 30)
      pdf.text("Trainingsschema VVZ'49", margin, margin + 5)
      pdf.addImage(imgData, 'JPEG', margin, y, availW, drawH)
      pdf.save('trainingsschema-vvz49.pdf')
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export mislukt. Probeer het opnieuw.')
    } finally {
      setExporting(false)
    }
  }

  // Keep a ref to the latest export handler so the registration stays stable
  const exportHandlerRef = useRef(handleExportPdf)
  exportHandlerRef.current = handleExportPdf

  useEffect(() => {
    if (registerExportHandler) {
      registerExportHandler((...args) => exportHandlerRef.current(...args))
      return () => registerExportHandler(null)
    }
  }, [registerExportHandler])

  const today = useMemo(() => {
    const jsDay = new Date().getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay
    return isoDay >= 1 && isoDay <= 5 ? isoDay : null
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)

    // Haal actieve schema's op
    const scheduleRes = await fetchActiveSchedules()
    const actives = scheduleRes.data || []
    setActiveSchedules(actives)

    // Admin kan alle schema's zien en wisselen
    if (isAdmin) {
      const allRes = await fetchSchedules()
      const all = allRes.data || []
      setAllSchedules(all)
      // Als er nog geen selectie is, kies het schema dat geldig is vandaag, anders het eerste actieve, anders het eerste
      if (!selectedScheduleId) {
        const today = new Date().toISOString().slice(0, 10)
        const current = all.find(s =>
          (!s.valid_from || s.valid_from <= today) &&
          (!s.valid_until || s.valid_until >= today)
        )
        setSelectedScheduleId(current?.id || actives[0]?.id || (all.length > 0 ? all[0].id : null))
      }
    }

    // Voor publieke weergave: initialiseer selectie op het schema dat vandaag geldig is
    let resolvedId = selectedScheduleId
    if (!resolvedId && actives.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const current = actives.find(s =>
        (!s.valid_from || s.valid_from <= today) &&
        (!s.valid_until || s.valid_until >= today)
      )
      resolvedId = current?.id || actives[0].id
      if (!isAdmin) setSelectedScheduleId(resolvedId)
    }

    // Bepaal welk schema geladen moet worden
    const scheduleId = resolvedId

    if (!scheduleId) {
      setSlots([])
      setFields([])
      setLoading(false)
      return
    }

    const fetches = [fetchTrainingSlots(scheduleId), fetchActiveFields()]
    if (isAdmin) fetches.push(fetchTeams())

    const results = await Promise.all(fetches)
    const [slotsRes, fieldsRes] = results

    if (slotsRes.error) setError(slotsRes.error.message)
    else setSlots(slotsRes.data || [])
    if (fieldsRes.error) setError(fieldsRes.error.message)
    else setFields(fieldsRes.data || [])

    if (isAdmin && results[2]) {
      if (!results[2].error) setTeams(results[2].data || [])
    }
    setLoading(false)
  }, [isAdmin, selectedScheduleId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Close popover or modal on Escape
  useEffect(() => {
    if (!popover && !modalDay) return
    function onKey(e) {
      if (e.key === 'Escape') {
        if (popover) setPopover(null)
        else if (modalDay) setModalDay(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popover, modalDay])

  // Close popover on click outside
  useEffect(() => {
    if (!popover) return
    function onClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopover(null)
      }
    }
    // Use setTimeout to avoid the same click that opened it from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', onClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', onClick)
    }
  }, [popover])

  // Cancel drag on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && dragRef.current.isDragging) {
        dragRef.current = { isDragging: false, startCell: null, currentCell: null, dayValue: null }
        setHighlightedCells(new Set())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // End drag on mouseup anywhere (in case mouse leaves grid)
  useEffect(() => {
    function onMouseUp() {
      if (!dragRef.current.isDragging) return
      const { startCell, currentCell, dayValue, _didDrag } = dragRef.current
      dragRef.current = { isDragging: false, startCell: null, currentCell: null, dayValue: null, _didDrag }
      if (!startCell || !currentCell || !_didDrag) {
        setHighlightedCells(new Set())
        return
      }

      // Compute the selected range
      const fieldIds = fields.map(f => f.id)
      const startFieldIdx = fieldIds.indexOf(startCell.fieldId)
      const endFieldIdx = fieldIds.indexOf(currentCell.fieldId)
      const minFieldIdx = Math.min(startFieldIdx, endFieldIdx)
      const maxFieldIdx = Math.max(startFieldIdx, endFieldIdx)

      const startMin = timeToMinutes(startCell.time)
      const endMin = timeToMinutes(currentCell.time)
      const minTime = Math.min(startMin, endMin)
      const maxTime = Math.max(startMin, endMin) + 15

      const selectedFieldIds = fieldIds.slice(minFieldIdx, maxFieldIdx + 1)

      setHighlightedCells(new Set())

      // Open popover pre-filled with selection
      setPopover({
        x: 200,
        y: 200,
        dayValue,
        startTime: minutesToTime(minTime),
        slot: null,
        prefill: {
          field_ids: selectedFieldIds,
          end_time: minutesToTime(maxTime),
        },
      })
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [fields])

  function handleDragStart(dayValue, fieldId, time) {
    if (!isAdmin) return
    dragRef.current = { isDragging: true, startCell: { fieldId, time }, currentCell: { fieldId, time }, dayValue, _didDrag: false }
    computeHighlight(fieldId, time, fieldId, time)
  }

  function handleDragEnter(dayValue, fieldId, time) {
    if (!dragRef.current.isDragging) return
    if (dragRef.current.dayValue !== dayValue) return
    const { startCell } = dragRef.current
    // Mark as actual drag if moved to a different cell
    if (startCell.fieldId !== fieldId || startCell.time !== time) {
      dragRef.current._didDrag = true
    }
    dragRef.current.currentCell = { fieldId, time }
    computeHighlight(startCell.fieldId, startCell.time, fieldId, time)
  }

  function computeHighlight(startFieldId, startTime, endFieldId, endTime) {
    const fieldIds = fields.map(f => f.id)
    const startIdx = fieldIds.indexOf(startFieldId)
    const endIdx = fieldIds.indexOf(endFieldId)
    const minIdx = Math.min(startIdx, endIdx)
    const maxIdx = Math.max(startIdx, endIdx)

    const startMin = timeToMinutes(startTime)
    const endMin = timeToMinutes(endTime)
    const minMin = Math.min(startMin, endMin)
    const maxMin = Math.max(startMin, endMin)

    const cells = new Set()
    for (let fi = minIdx; fi <= maxIdx; fi++) {
      for (let m = minMin; m <= maxMin; m += 15) {
        cells.add(`${dragRef.current.dayValue}:${fieldIds[fi]}:${minutesToTime(m)}`)
      }
    }
    setHighlightedCells(cells)
  }

  // --- Block drag handlers (move / resize) ---

  function handleBlockDragStart(e, slot, type) {
    if (!isAdmin) return
    e.stopPropagation()
    e.preventDefault()

    const slotFields = (slot.fields || []).sort((a, b) => a.display_order - b.display_order)
    const slotFieldIds = slotFields.map(f => f.id)
    const fieldIds = fields.map(f => f.id)
    const startFieldIndex = fieldIds.indexOf(slotFieldIds[0])
    const normalizedStart = slot.start_time?.slice(0, 5)
    const normalizedEnd = slot.end_time?.slice(0, 5)
    const startTimeIndex = TIME_SLOTS.indexOf(normalizedStart)
    const endTimeIndex = TIME_SLOTS.indexOf(normalizedEnd)

    // Bail out if slot times don't match the grid (prevents crash)
    if (startFieldIndex < 0 || startTimeIndex < 0 || endTimeIndex < 0) return

    const durationSlots = endTimeIndex - startTimeIndex

    // Find the grid container (.field-columns-container) from the event
    const gridEl = e.currentTarget.closest('.field-columns-container')
    const gridRect = gridEl ? gridEl.getBoundingClientRect() : null
    const fieldEls = gridEl ? gridEl.querySelectorAll(':scope > .field-column') : []
    const fieldRects = Array.from(fieldEls).map(el => {
      const r = el.getBoundingClientRect()
      return { left: r.left, width: r.width, right: r.right }
    })

    const color = slot.color || '#6B7280'
    const teamNames = (slot.teams || []).map(t => t.name).sort().join(', ')

    blockDragRef.current = {
      type,
      slotId: slot.id,
      startMousePos: { x: e.clientX, y: e.clientY },
      startCell: { fieldIndex: startFieldIndex, timeIndex: startTimeIndex },
      originalSlot: slot,
      originalFieldIds: slotFieldIds,
      originalStartTime: slot.start_time,
      originalEndTime: slot.end_time,
      dayValue: slot.day_of_week,
      slotDurationSlots: durationSlots,
      slotFieldCount: slotFieldIds.length,
      gridRect,
      fieldRects,
      color,
      teamNames,
    }

    if (type === 'move') {
      // Show ghost at current position
      const blockEl = e.currentTarget.closest('[data-training-block]') || e.currentTarget
      const blockRect = blockEl.getBoundingClientRect()
      setBlockDragGhost({
        x: blockRect.left,
        y: blockRect.top,
        width: blockRect.width,
        height: blockRect.height,
        color,
        teamNames,
      })
    }

    updateBlockDragTarget({
      fieldStartIndex: startFieldIndex,
      fieldCount: slotFieldIds.length,
      timeStartIndex: startTimeIndex,
      timeCount: durationSlots,
    })
  }

  // Block drag mousemove/mouseup via window listeners
  useEffect(() => {
    function onMouseMove(e) {
      const bd = blockDragRef.current
      if (!bd.type) return

      const { gridRect, fieldRects, startMousePos, startCell, type } = bd
      if (!gridRect || fieldRects.length === 0) return

      const dx = e.clientX - startMousePos.x
      const dy = e.clientY - startMousePos.y

      if (type === 'move') {
        // Update ghost position
        setBlockDragGhost(prev => prev ? {
          ...prev,
          x: prev.x + (e.clientX - (blockDragRef.current._lastX || startMousePos.x)),
          y: prev.y + (e.clientY - (blockDragRef.current._lastY || startMousePos.y)),
        } : null)
        blockDragRef.current._lastX = e.clientX
        blockDragRef.current._lastY = e.clientY

        // Determine target cell from mouse position
        const fieldIndex = getFieldIndexFromX(e.clientX, fieldRects)
        const timeIndex = getTimeIndexFromY(e.clientY, gridRect)

        if (fieldIndex !== null && timeIndex !== null) {
          // Clamp so the block doesn't go out of bounds
          const maxFieldStart = fields.length - bd.slotFieldCount
          const maxTimeStart = TIME_SLOTS.length - bd.slotDurationSlots
          const clampedField = Math.max(0, Math.min(fieldIndex, maxFieldStart))
          const clampedTime = Math.max(0, Math.min(timeIndex, maxTimeStart))

          updateBlockDragTarget({
            fieldStartIndex: clampedField,
            fieldCount: bd.slotFieldCount,
            timeStartIndex: clampedTime,
            timeCount: bd.slotDurationSlots,
          })
        }
      } else if (type === 'resize-bottom') {
        // Calculate new time end from mouse Y
        const timeIndex = getTimeIndexFromY(e.clientY, gridRect)
        if (timeIndex !== null) {
          const minEndIndex = startCell.timeIndex + 1 // at least 15 min
          const newEndIndex = Math.max(minEndIndex, Math.min(timeIndex + 1, TIME_SLOTS.length))
          updateBlockDragTarget({
            fieldStartIndex: startCell.fieldIndex,
            fieldCount: bd.slotFieldCount,
            timeStartIndex: startCell.timeIndex,
            timeCount: newEndIndex - startCell.timeIndex,
          })
        }
      } else if (type === 'resize-right') {
        // Calculate new field count from mouse X
        const fieldIndex = getFieldIndexFromX(e.clientX, fieldRects)
        if (fieldIndex !== null) {
          const newFieldEnd = Math.max(startCell.fieldIndex + 1, Math.min(fieldIndex + 1, fields.length))
          updateBlockDragTarget({
            fieldStartIndex: startCell.fieldIndex,
            fieldCount: newFieldEnd - startCell.fieldIndex,
            timeStartIndex: startCell.timeIndex,
            timeCount: bd.slotDurationSlots,
          })
        }
      }
    }

    async function onMouseUp() {
      const bd = blockDragRef.current
      if (!bd.type) return

      const target = blockDragTargetRef.current
      blockDragRef.current = { type: null }
      setBlockDragGhost(null)
      updateBlockDragTarget(null)

      if (!target) return
      if (target.timeStartIndex < 0 || target.timeStartIndex >= TIME_SLOTS.length) return
      if (target.fieldStartIndex < 0) return

      // Compute new values
      const fieldIds = fields.map(f => f.id)
      const newFieldIds = fieldIds.slice(target.fieldStartIndex, target.fieldStartIndex + target.fieldCount)
      const newStartTime = TIME_SLOTS[target.timeStartIndex]
      const newEndTime = TIME_SLOTS[target.timeStartIndex + target.timeCount] || TIME_SLOTS[TIME_SLOTS.length - 1]

      // Check if anything actually changed
      const origFieldIds = bd.originalFieldIds
      const sameFields = newFieldIds.length === origFieldIds.length && newFieldIds.every((id, i) => id === origFieldIds[i])
      const sameTime = newStartTime === bd.originalStartTime && newEndTime === bd.originalEndTime

      if (sameFields && sameTime) return

      // Save via updateTrainingSlot
      const teamIds = (bd.originalSlot.teams || []).map(t => t.id)
      await updateTrainingSlot(bd.slotId, {
        field_ids: newFieldIds,
        team_ids: teamIds,
        day_of_week: bd.dayValue,
        start_time: newStartTime,
        end_time: newEndTime,
      })

      loadData()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [fields, loadData])

  // Set cursor during block drag
  useEffect(() => {
    if (!blockDragGhost && !blockDragTarget) return
    const bd = blockDragRef.current
    if (!bd.type) return
    const cursor = bd.type === 'move' ? 'grabbing' : bd.type === 'resize-bottom' ? 's-resize' : 'e-resize'
    document.body.style.cursor = cursor
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [blockDragGhost, blockDragTarget])

  // Cancel block drag on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && blockDragRef.current.type) {
        blockDragRef.current = { type: null }
        setBlockDragGhost(null)
        updateBlockDragTarget(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function getFieldIndexFromX(clientX, fieldRects) {
    for (let i = 0; i < fieldRects.length; i++) {
      if (clientX >= fieldRects[i].left && clientX < fieldRects[i].right) return i
    }
    // Clamp to nearest
    if (clientX < fieldRects[0]?.left) return 0
    if (clientX >= fieldRects[fieldRects.length - 1]?.right) return fieldRects.length - 1
    return null
  }

  function getTimeIndexFromY(clientY, gridRect) {
    if (!gridRect) return null
    const relY = clientY - gridRect.top - HEADER_HEIGHT
    const idx = Math.floor(relY / SLOT_HEIGHT)
    return Math.max(0, Math.min(idx, TIME_SLOTS.length - 1))
  }

  function openPopoverForEmpty(e, dayValue, time) {
    if (!isAdmin) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({
      x: rect.right + 8,
      y: rect.top,
      dayValue,
      startTime: time,
      slot: null,
    })
  }

  function openPopoverForSlot(e, slot) {
    if (!isAdmin) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({
      x: rect.right + 8,
      y: rect.top,
      dayValue: slot.day_of_week,
      startTime: slot.start_time,
      slot,
    })
  }

  function handlePopoverSaved() {
    setPopover(null)
    loadData()
  }

  function handlePopoverDeleted() {
    setPopover(null)
    loadData()
  }

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const map = {}
    for (const day of DAYS) {
      map[day.value] = slots
        .filter(s => s.day_of_week === day.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [slots])

  const allTeams = useMemo(() => {
    const seen = new Map()
    for (const s of slots) {
      for (const t of (s.teams || [])) {
        if (!seen.has(t.id)) seen.set(t.id, t)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [slots])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Fout bij laden: {error}
        </div>
      </div>
    )
  }

  if (!isAdmin && activeSchedules.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gray-50 text-gray-600 p-6 rounded-lg text-center">
          <p className="text-lg font-medium">Er is momenteel geen actief trainingsschema</p>
        </div>
      </div>
    )
  }

  if (isAdmin && allSchedules.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gray-50 text-gray-600 p-6 rounded-lg text-center">
          <p className="text-lg font-medium">Er zijn nog geen schema's aangemaakt</p>
          <p className="mt-2 text-sm">Ga naar Beheer &rarr; Schema's om een schema aan te maken.</p>
        </div>
      </div>
    )
  }

  function formatValidityLabel(schedule) {
    if (!schedule) return null
    const fmt = d => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    const from = schedule.valid_from ? fmt(schedule.valid_from) : null
    const until = schedule.valid_until ? fmt(schedule.valid_until) : 'geen einddatum'
    if (!from && !schedule.valid_until) return null
    if (!from) return `t/m ${until}`
    return `${from} – ${until}`
  }

  const currentSchedule = isAdmin
    ? allSchedules.find(s => s.id === selectedScheduleId)
    : activeSchedules.find(s => s.id === selectedScheduleId) || activeSchedules[0]

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-3 pb-24">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {isAdmin && allSchedules.length > 1 ? (
          <>
            <select
              value={selectedScheduleId || ''}
              onChange={e => setSelectedScheduleId(e.target.value)}
              className="text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-vvz-green"
            >
              {allSchedules.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.active ? ' (actief)' : ' (concept)'}
                </option>
              ))}
            </select>
            {selectedScheduleId && !allSchedules.find(s => s.id === selectedScheduleId)?.active && (
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                Concept
              </span>
            )}
          </>
        ) : activeSchedules.length > 1 ? (
          <select
            value={selectedScheduleId || ''}
            onChange={e => setSelectedScheduleId(e.target.value)}
            className="text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-vvz-green"
          >
            {activeSchedules.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : activeSchedules.length === 1 ? (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {activeSchedules[0].name}
          </span>
        ) : null}
        {formatValidityLabel(currentSchedule) && (
          <span className="text-xs text-gray-400 w-full pl-3 sm:pl-0 sm:w-auto">
            Geldig: {formatValidityLabel(currentSchedule)}
          </span>
        )}
      </div>
      <div ref={scheduleRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {DAYS.map(day => (
          <DaySection
            key={day.value}
            day={day}
            daySlots={slotsByDay[day.value]}
            fields={fields}
            isToday={day.value === today}
            isAdmin={isAdmin}
            isExpanded={false}
            interactive={false}
            onOpenOverlay={isAdmin ? () => setModalDay(day.value) : undefined}
            onEmptyCellClick={openPopoverForEmpty}
            onSlotClick={openPopoverForSlot}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            highlightedCells={highlightedCells}
            isDragging={dragRef}
            onBlockDragStart={handleBlockDragStart}
            blockDragTarget={blockDragTarget}
            blockDragRef={blockDragRef}
          />
        ))}
      </div>


      {/* Day detail modal */}
      {modalDay && (() => {
        const modalDayObj = DAYS.find(d => d.value === modalDay)
        return (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setModalDay(null)}
              aria-hidden="true"
            />
            <div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl w-[95vw] max-w-[900px] max-h-[85vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label={`Dagweergave ${modalDayObj?.label}`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-800">{modalDayObj?.label}</h2>
                <button
                  onClick={() => setModalDay(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
                  aria-label="Sluiten"
                >
                  &times;
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                <DaySection
                  day={modalDayObj}
                  daySlots={slotsByDay[modalDay]}
                  fields={fields}
                  isToday={modalDay === today}
                  isAdmin={isAdmin}
                  isExpanded={true}
                  interactive={true}
                  onOpenOverlay={undefined}
                  onEmptyCellClick={openPopoverForEmpty}
                  onSlotClick={openPopoverForSlot}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  highlightedCells={highlightedCells}
                  isDragging={dragRef}
                  onBlockDragStart={handleBlockDragStart}
                  blockDragTarget={blockDragTarget}
                  blockDragRef={blockDragRef}
                />
              </div>
            </div>
          </>
        )
      })()}

      {/* Popover */}
      {popover && (
        <TrainingPopover
          ref={popoverRef}
          popover={popover}
          teams={teams}
          fields={fields}
          scheduleId={selectedScheduleId || activeSchedules[0]?.id}
          onSaved={handlePopoverSaved}
          onDeleted={handlePopoverDeleted}
          onClose={() => setPopover(null)}
        />
      )}

      {/* FAB — admin shortcut to create training slot */}
      {isAdmin && (
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setPopover({
              x: rect.left - 8,
              y: rect.top - 8,
              dayValue: today ?? 1,
              startTime: '18:00',
            })
          }}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-vvz-green hover:bg-vvz-green-dark text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-vvz-green/50 no-print"
          aria-label="Nieuw trainingsslot toevoegen"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* Block drag ghost */}
      {blockDragGhost && blockDragRef.current.type === 'move' && (
        <div
          style={{
            position: 'fixed',
            left: blockDragGhost.x,
            top: blockDragGhost.y,
            width: blockDragGhost.width,
            height: blockDragGhost.height,
            backgroundColor: blockDragGhost.color,
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 9999,
            borderRadius: 6,
            cursor: 'grabbing',
          }}
          className="shadow-lg"
        >
          <div className="px-1 py-0.5 text-white font-bold text-[10px] truncate">
            {blockDragGhost.teamNames}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   DaySection
   ============================================================ */

function DaySection({ day, daySlots, fields, isToday, isAdmin, isExpanded, interactive, onOpenOverlay, onEmptyCellClick, onSlotClick, onDragStart, onDragEnter, highlightedCells, isDragging, onBlockDragStart, blockDragTarget, blockDragRef }) {
  const timeRange = useMemo(() => {
    // Expanded view (admin): show full time grid
    if (isExpanded) {
      return { visibleSlots: TIME_SLOTS, rangeStartMinutes: timeToMinutes(TIME_SLOTS[0]) }
    }

    // Default fallback range for days without trainings: 14:00-17:00
    const DEFAULT_START = timeToMinutes('14:00')
    const DEFAULT_END = timeToMinutes('17:00')

    if (daySlots.length === 0) {
      const visibleSlots = TIME_SLOTS.filter(t => {
        const m = timeToMinutes(t)
        return m >= DEFAULT_START && m < DEFAULT_END
      })
      return { visibleSlots, rangeStartMinutes: DEFAULT_START }
    }

    let minMinutes = Infinity
    let maxMinutes = -Infinity
    for (const slot of daySlots) {
      const start = timeToMinutes(slot.start_time)
      const end = timeToMinutes(slot.end_time)
      if (start < minMinutes) minMinutes = start
      if (end > maxMinutes) maxMinutes = end
    }

    const gridStart = timeToMinutes(TIME_SLOTS[0])
    const gridEnd = timeToMinutes(TIME_SLOTS[TIME_SLOTS.length - 1]) + 15

    const rangeStart = Math.max(gridStart, Math.floor((minMinutes - 15) / 15) * 15)
    const rangeEnd = Math.min(gridEnd, Math.ceil((maxMinutes + 15) / 15) * 15)

    const visibleSlots = TIME_SLOTS.filter(t => {
      const m = timeToMinutes(t)
      return m >= rangeStart && m < rangeEnd
    })

    return { visibleSlots, rangeStartMinutes: rangeStart }
  }, [daySlots, isExpanded])

  const fieldIndexMap = useMemo(() => {
    const map = {}
    fields.forEach((f, i) => { map[f.id] = i })
    return map
  }, [fields])

  const { spanningSlots, slotsByField } = useMemo(() => {
    const spanning = new Map()
    const perField = {}

    for (const slot of daySlots) {
      const slotFields = slot.fields || []
      if (slotFields.length <= 1) {
        for (const f of slotFields) {
          if (!perField[f.id]) perField[f.id] = []
          perField[f.id].push(slot)
        }
        continue
      }

      const sorted = [...slotFields].sort((a, b) => a.display_order - b.display_order)
      const runs = []
      let runStart = 0
      for (let i = 1; i <= sorted.length; i++) {
        if (i < sorted.length && sorted[i].display_order === sorted[i - 1].display_order + 1) continue
        const runFields = sorted.slice(runStart, i)
        if (runFields.length >= 2) {
          const startCol = fieldIndexMap[runFields[0].id]
          runs.push({ startColIndex: startCol, span: runFields.length, slot })
        } else {
          const f = runFields[0]
          if (!perField[f.id]) perField[f.id] = []
          perField[f.id].push(slot)
        }
        runStart = i
      }

      if (runs.length > 0) spanning.set(slot.id, runs)
    }

    return { spanningSlots: spanning, slotsByField: perField }
  }, [daySlots, fieldIndexMap])

  const activeFieldIds = useMemo(() => {
    const ids = new Set()
    for (const slot of daySlots) {
      for (const f of (slot.fields || [])) ids.add(f.id)
    }
    return ids
  }, [daySlots])

  const allSpanningRuns = useMemo(() => {
    const runs = []
    for (const [, slotRuns] of spanningSlots) runs.push(...slotRuns)
    return runs
  }, [spanningSlots])

  // Build a set of occupied cells for admin empty-click detection: "fieldId-timeSlot"
  const occupiedCells = useMemo(() => {
    const set = new Set()
    for (const slot of daySlots) {
      const startMin = timeToMinutes(slot.start_time)
      const endMin = timeToMinutes(slot.end_time)
      for (const f of (slot.fields || [])) {
        for (let m = startMin; m < endMin; m += 15) {
          set.add(`${f.id}-${minutesToTime(m)}`)
        }
      }
    }
    return set
  }, [daySlots])

  const isEmpty = daySlots.length === 0
  const colCount = fields.length

  // In non-interactive mode, the whole card is clickable for admins to open the overlay
  const cardClickable = isAdmin && !interactive && onOpenOverlay

  return (
    <section
      data-day-export={day.value}
      className={`day-section rounded-lg border overflow-hidden ${
        isToday ? 'border-vvz-green/40 ring-1 ring-vvz-green/20' : 'border-gray-200'
      } ${cardClickable ? 'cursor-pointer hover:border-vvz-green/60 transition-colors group' : ''}`}
      style={{ order: day.value }}
      aria-label={`Trainingen ${day.label}`}
      onClick={cardClickable ? (e) => {
        // Don't interfere with clicks inside the overlay (interactive) mode
        e.stopPropagation()
        onOpenOverlay()
      } : undefined}
      role={cardClickable ? 'button' : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      onKeyDown={cardClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenOverlay() } } : undefined}
    >
      <div
        className={`px-3 py-2 font-semibold text-sm sm:text-base flex items-center gap-2 ${
          isToday ? 'bg-vvz-green/10 text-vvz-green' : 'bg-gray-50 text-gray-700'
        } ${cardClickable ? 'select-none' : ''}`}
      >
        <span>{day.label}</span>
        {isToday && (
          <span className="text-xs font-normal bg-vvz-green text-white px-2 py-0.5 rounded-full">
            Vandaag
          </span>
        )}
        {cardClickable && (
          <span className="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center gap-1" aria-hidden="true" title="Bewerken">
            <span>Bewerken</span>
            <span>&#x2922;</span>
          </span>
        )}
      </div>

      {isEmpty && !isAdmin ? (
        <div className="px-3 py-4 text-sm text-gray-400 italic">
          Geen trainingen gepland
        </div>
      ) : timeRange ? (
        <div className="overflow-x-hidden">
          <div className="flex w-full">
            {/* Time gutter */}
            <div className="flex-shrink-0 w-8 sm:w-10 bg-white">
              <div
                className="border-b border-r border-gray-200 bg-gray-50"
                style={{ height: HEADER_HEIGHT }}
              />
              <div className="relative" style={{ height: timeRange.visibleSlots.length * SLOT_HEIGHT }}>
                {timeRange.visibleSlots.map((time, i) => (
                  <div
                    key={time}
                    className="absolute w-full text-right pr-0.5 leading-none"
                    style={{ top: i * SLOT_HEIGHT - 11 }}
                  >
                    {isLabeledTime(time) && (
                      <span className={`text-[10px] ${
                        time.endsWith(':00') ? 'font-semibold text-gray-700' : 'text-gray-400'
                      }`}>
                        {time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Field columns + spanning overlay */}
            <div className="field-columns-container flex flex-1 relative">
              {fields.map((field, fieldIdx) => (
                <FieldColumn
                  key={field.id}
                  field={field}
                  fieldIndex={fieldIdx}
                  slots={slotsByField[field.id] || []}
                  visibleSlots={timeRange.visibleSlots}
                  rangeStartMinutes={timeRange.rangeStartMinutes}
                  columnCount={colCount}
                  isEmpty={!activeFieldIds.has(field.id)}
                  isAdmin={isAdmin}
                  interactive={interactive}
                  occupiedCells={occupiedCells}
                  dayValue={day.value}
                  onEmptyCellClick={onEmptyCellClick}
                  onSlotClick={onSlotClick}
                  onDragStart={onDragStart}
                  onDragEnter={onDragEnter}
                  highlightedCells={highlightedCells}
                  isDragging={isDragging}
                  onBlockDragStart={onBlockDragStart}
                  blockDragTarget={blockDragTarget}
                  blockDragRef={blockDragRef}
                />
              ))}

              {/* Spanning blocks overlay */}
              {allSpanningRuns.length > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ top: HEADER_HEIGHT }}
                >
                  {allSpanningRuns.map(({ startColIndex, span, slot }) => {
                    const startMin = timeToMinutes(slot.start_time)
                    const endMin = timeToMinutes(slot.end_time)
                    const topPx = ((startMin - timeRange.rangeStartMinutes) / 15) * SLOT_HEIGHT
                    const heightPx = ((endMin - startMin) / 15) * SLOT_HEIGHT
                    const slotTeams = slot.teams || []
                    const color = slot.color || '#6B7280'
                    const teamNames = slotTeams.map(t => t.name).sort().join(', ')
                    const showDetails = heightPx >= 44

                    const leftPct = (startColIndex / colCount) * 100
                    const widthPct = (span / colCount) * 100

                    const isSpanBeingDragged = blockDragRef?.current?.slotId === slot.id && blockDragRef?.current?.type

                    return (
                      <div
                        data-training-block
                        key={`${slot.id}-span-${startColIndex}`}
                        className={`absolute rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${
                          isDragging?.current?.isDragging ? 'pointer-events-none' : 'pointer-events-auto'
                        } ${isAdmin && interactive ? 'cursor-grab' : isAdmin ? 'cursor-pointer' : ''}`}
                        style={{
                          top: topPx,
                          height: heightPx,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          backgroundColor: color,
                          minHeight: 20,
                          zIndex: 10,
                          opacity: isSpanBeingDragged ? 0.4 : 1,
                        }}
                        title={`${teamNames}\n${(slot.fields || []).map(f => f.name).join(', ')}\n${slot.start_time.slice(0,5)} - ${slot.end_time.slice(0,5)}`}
                        role="article"
                        aria-label={`${teamNames}, ${(slot.fields || []).map(f => f.name).join(', ')}, ${slot.start_time.slice(0,5)} tot ${slot.end_time.slice(0,5)}`}
                        onClick={isAdmin ? (e) => { e.stopPropagation(); if (!blockDragRef?.current?.type) onSlotClick(e, slot) } : undefined}
                        onMouseDown={isAdmin && interactive ? (e) => {
                          if (e.button !== 0) return
                          if (e.target.dataset.resizeHandle) return
                          onBlockDragStart(e, slot, 'move')
                        } : undefined}
                      >
                        <div className="px-0.5 py-0.5 h-full flex flex-col justify-center text-white">
                          <span className="font-bold text-[10px] sm:text-xs leading-tight truncate">
                            {slot.description || teamNames}
                          </span>
                          {showDetails && (
                            <>
                              <span className="text-[9px] sm:text-[10px] opacity-80 leading-tight truncate">
                                {(slot.fields || []).map(f => f.name.replace(/^Veld\s+/i, '')).join(' + ')}
                              </span>
                              <span className="text-[9px] sm:text-[10px] opacity-80 leading-tight truncate">
                                {slot.start_time.slice(0,5)}&ndash;{slot.end_time.slice(0,5)}
                              </span>
                              {slot.description && (
                                <span className="text-[8px] sm:text-[9px] opacity-80 leading-tight break-words">
                                  ({teamNames})
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Resize handle: bottom (time) */}
                        {isAdmin && interactive && (
                          <div
                            data-resize-handle="bottom"
                            className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize bg-white/20 hover:bg-white/40 transition-colors"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              onBlockDragStart(e, slot, 'resize-bottom')
                            }}
                          />
                        )}

                        {/* Resize handle: right (field) */}
                        {isAdmin && interactive && (
                          <div
                            data-resize-handle="right"
                            className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize bg-white/20 hover:bg-white/40 transition-colors"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              onBlockDragStart(e, slot, 'resize-right')
                            }}
                          />
                        )}

                        <div className="absolute z-50 hidden group-hover:block left-1/2 -translate-x-1/2 bottom-full mb-1 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none">
                          <div className="font-bold">{teamNames}</div>
                          <div className="text-gray-300 mt-0.5">{(slot.fields || []).map(f => f.name).join(', ')}</div>
                          <div className="text-gray-300">{slot.start_time.slice(0,5)} &ndash; {slot.end_time.slice(0,5)}</div>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Block drag drop-target highlight */}
              {blockDragTarget && blockDragRef?.current?.type && blockDragRef.current.dayValue === day.value && blockDragTarget.timeStartIndex >= 0 && blockDragTarget.timeStartIndex < TIME_SLOTS.length && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: HEADER_HEIGHT + (timeToMinutes(TIME_SLOTS[blockDragTarget.timeStartIndex]) - timeRange.rangeStartMinutes) / 15 * SLOT_HEIGHT,
                    height: blockDragTarget.timeCount * SLOT_HEIGHT,
                    left: `calc(${(blockDragTarget.fieldStartIndex / colCount) * 100}% + 1px)`,
                    width: `calc(${(blockDragTarget.fieldCount / colCount) * 100}% - 2px)`,
                    border: '2px dashed #22c55e',
                    borderRadius: 6,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    zIndex: 20,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

/* ============================================================
   FieldColumn
   ============================================================ */

function FieldColumn({ field, fieldIndex, slots, visibleSlots, rangeStartMinutes, columnCount, isEmpty, isAdmin, interactive, occupiedCells, dayValue, onEmptyCellClick, onSlotClick, onDragStart, onDragEnter, highlightedCells, isDragging, onBlockDragStart, blockDragTarget, blockDragRef }) {
  const gridHeight = visibleSlots.length * SLOT_HEIGHT

  return (
    <div className="field-column flex-1 min-w-0 border-r border-gray-200 last:border-r-0">
      <div
        className={`border-b border-gray-200 flex items-center justify-center px-1 ${
          isEmpty ? 'bg-gray-100' : 'bg-gray-50'
        }`}
        style={{ height: HEADER_HEIGHT }}
      >
        <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${
          isEmpty ? 'text-gray-400' : 'text-gray-700'
        }`}>
          {field.name.replace(/^Veld\s+/i, '')}
        </span>
      </div>

      <div className={`relative ${isEmpty ? 'bg-gray-50/50' : ''}`} style={{ height: gridHeight }}>
        {/* Grid lines + clickable empty cells */}
        {visibleSlots.map((time, i) => {
          const isOccupied = occupiedCells.has(`${field.id}-${time}`)
          const isClickable = interactive && isAdmin && !isOccupied
          const isDraggable = interactive && isAdmin
          const cellKey = `${dayValue}:${field.id}:${time}`
          const isHighlighted = interactive && highlightedCells.has(cellKey)
          const dragging = isDragging?.current?.isDragging
          return (
            <div
              key={time}
              className={`absolute w-full border-t ${
                time.endsWith(':00')
                  ? 'border-gray-300'
                  : time.endsWith(':30')
                    ? 'border-gray-200'
                    : 'border-gray-100'
              } ${isClickable && !dragging ? 'md:cursor-pointer md:hover:bg-green-50/60 transition-colors' : ''} ${
                isDraggable && dragging ? 'cursor-crosshair' : ''
              } ${isHighlighted ? 'bg-green-200/50' : ''}`}
              style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              onClick={isClickable ? (e) => {
                if (isDragging?.current?._didDrag) return
                onEmptyCellClick(e, dayValue, time)
              } : undefined}
              onMouseDown={isDraggable ? (e) => { e.preventDefault(); onDragStart(dayValue, field.id, time) } : undefined}
              onMouseEnter={isDraggable ? () => onDragEnter(dayValue, field.id, time) : undefined}
            />
          )
        })}

        {/* Training blocks */}
        {slots.map(slot => (
          <TrainingBlock
            key={slot.id}
            slot={slot}
            rangeStartMinutes={rangeStartMinutes}
            isAdmin={isAdmin}
            interactive={interactive}
            onSlotClick={onSlotClick}
            isDragging={isDragging}
            onBlockDragStart={onBlockDragStart}
            blockDragRef={blockDragRef}
          />
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   TrainingBlock
   ============================================================ */

function TrainingBlock({ slot, rangeStartMinutes, isAdmin, interactive, onSlotClick, isDragging, onBlockDragStart, blockDragRef }) {
  const startMin = timeToMinutes(slot.start_time)
  const endMin = timeToMinutes(slot.end_time)
  const topPx = ((startMin - rangeStartMinutes) / 15) * SLOT_HEIGHT
  const heightPx = ((endMin - startMin) / 15) * SLOT_HEIGHT

  const slotTeams = slot.teams || []
  const color = slot.color || '#6B7280'
  const teamNames = slotTeams.map(t => t.name).sort().join(', ')
  const showDetails = heightPx >= 44
  const dragging = isDragging?.current?.isDragging
  const isBeingDragged = blockDragRef?.current?.slotId === slot.id && blockDragRef?.current?.type

  return (
    <div
      data-training-block
      className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${
        isAdmin && interactive ? 'cursor-grab' : isAdmin ? 'cursor-pointer' : 'cursor-default'
      } ${dragging ? 'pointer-events-none' : ''}`}
      style={{
        top: topPx,
        height: heightPx,
        backgroundColor: color,
        minHeight: 20,
        zIndex: 5,
        opacity: isBeingDragged ? 0.4 : 1,
      }}
      title={`${teamNames}\n${(slot.fields || []).map(f => f.name).join(', ')}\n${slot.start_time.slice(0,5)} - ${slot.end_time.slice(0,5)}`}
      role="article"
      aria-label={`${teamNames}, ${(slot.fields || []).map(f => f.name).join(', ')}, ${slot.start_time.slice(0,5)} tot ${slot.end_time.slice(0,5)}`}
      onClick={isAdmin ? (e) => { e.stopPropagation(); if (!blockDragRef?.current?.type) onSlotClick(e, slot) } : undefined}
      onMouseDown={isAdmin && interactive ? (e) => {
        // Only left button, and not on resize handles
        if (e.button !== 0) return
        if (e.target.dataset.resizeHandle) return
        onBlockDragStart(e, slot, 'move')
      } : undefined}
    >
      <div className="px-0.5 py-0.5 h-full flex flex-col justify-center text-white">
        <span className="font-bold text-[10px] sm:text-xs leading-tight truncate">
          {slot.description || teamNames}
        </span>
        {showDetails && (
          <span className="text-[9px] sm:text-[10px] opacity-80 leading-tight truncate">
            {slot.start_time.slice(0,5)}&ndash;{slot.end_time.slice(0,5)}
          </span>
        )}
        {showDetails && slot.description && (
          <span className="text-[8px] sm:text-[9px] opacity-80 leading-tight break-words">
            ({teamNames})
          </span>
        )}
      </div>

      {/* Resize handle: bottom (time) */}
      {isAdmin && interactive && (
        <div
          data-resize-handle="bottom"
          className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize bg-white/20 hover:bg-white/40 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            onBlockDragStart(e, slot, 'resize-bottom')
          }}
        />
      )}

      {/* Resize handle: right (field) */}
      {isAdmin && interactive && (
        <div
          data-resize-handle="right"
          className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize bg-white/20 hover:bg-white/40 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            onBlockDragStart(e, slot, 'resize-right')
          }}
        />
      )}

      <div className="absolute z-50 hidden group-hover:block left-1/2 -translate-x-1/2 bottom-full mb-1 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none">
        <div className="font-bold">{teamNames}</div>
        <div className="text-gray-300 mt-0.5">{(slot.fields || []).map(f => f.name).join(', ')}</div>
        <div className="text-gray-300">{slot.start_time.slice(0,5)} &ndash; {slot.end_time.slice(0,5)}</div>
        {slot.description && <div className="text-gray-300 font-bold">({slot.description})</div>}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
      </div>
    </div>
  )
}

/* ============================================================
   TrainingPopover
   ============================================================ */

import { forwardRef } from 'react'

const TrainingPopover = forwardRef(function TrainingPopover({ popover, teams, fields, scheduleId, onSaved, onDeleted, onClose }, ref) {
  const isEdit = !!popover.slot
  const editSlot = popover.slot

  const empty = {
    team_ids: [],
    field_ids: popover.prefill?.field_ids || [],
    day_of_week: popover.dayValue,
    start_time: popover.startTime,
    end_time: popover.prefill?.end_time || (() => {
      const idx = TIME_SLOTS.indexOf(popover.startTime)
      const endIdx = Math.min(idx + 4, TIME_SLOTS.length - 1)
      return TIME_SLOTS[endIdx] || popover.startTime
    })(),
  }

  const initial = isEdit
    ? {
        team_ids: (editSlot.teams || []).map(t => t.id),
        field_ids: (editSlot.fields || []).map(f => f.id),
        day_of_week: editSlot.day_of_week,
        start_time: editSlot.start_time,
        end_time: editSlot.end_time,
        description: editSlot.description || '',
        color: editSlot.color || '#2E7D32',
      }
    : { ...empty, description: '', color: '#2E7D32' }

  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState(null)

  // Group fields
  const fieldGroups = fields.reduce((acc, f) => {
    const short = f.name.replace(/^Veld\s+/i, '')
    const match = short.match(/^(\d+)[A-Za-z]$/)
    const group = match ? `Veld ${match[1]}` : f.name
    if (!acc[group]) acc[group] = []
    acc[group].push(f)
    return acc
  }, {})

  // Group teams by category (dynamic)
  const teamGroups = (() => {
    const categoryOrder = ['Pupillen', 'Junioren', 'Senioren', 'Veteranen']
    const grouped = {}
    teams.forEach(t => {
      const cat = t.category || 'Overig'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(t)
    })
    const groups = []
    categoryOrder.forEach(cat => {
      if (grouped[cat]) groups.push({ label: cat, teams: grouped[cat] })
    })
    if (grouped['Overig']) groups.push({ label: 'Overig', teams: grouped['Overig'] })
    return groups
  })()

  function handleStartTimeChange(newStart) {
    const idx = TIME_SLOTS.indexOf(newStart)
    const endIdx = Math.min(idx + 4, TIME_SLOTS.length - 1)
    setForm(prev => ({ ...prev, start_time: newStart, end_time: TIME_SLOTS[endIdx] }))
    if (errors.time) setErrors(prev => ({ ...prev, time: null }))
  }

  function validate() {
    const newErrors = {}
    if (form.end_time <= form.start_time) newErrors.time = 'Eindtijd moet na begintijd liggen'
    if (form.field_ids.length === 0) newErrors.fields = 'Selecteer minimaal 1 veld'
    if (form.team_ids.length === 0) newErrors.teams = 'Selecteer minimaal 1 team'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function toggleField(fieldId) {
    const ids = form.field_ids.includes(fieldId)
      ? form.field_ids.filter(id => id !== fieldId)
      : [...form.field_ids, fieldId]
    setForm({ ...form, field_ids: ids })
    if (errors.fields && ids.length > 0) setErrors(prev => ({ ...prev, fields: null }))
  }

  function toggleTeam(teamId) {
    const ids = form.team_ids.includes(teamId)
      ? form.team_ids.filter(id => id !== teamId)
      : [...form.team_ids, teamId]
    setForm({ ...form, team_ids: ids })
    if (errors.teams && ids.length > 0) setErrors(prev => ({ ...prev, teams: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSuccessMsg(null)
    const payload = { ...form, day_of_week: Number(form.day_of_week) }
    if (!isEdit && scheduleId) {
      payload.schedule_id = scheduleId
    }
    const { error } = isEdit
      ? await updateTrainingSlot(editSlot.id, payload)
      : await createTrainingSlot(payload)
    setSaving(false)
    if (error) {
      setErrors({ submit: error.message })
    } else {
      onSaved()
    }
  }

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je deze training wilt verwijderen?')) return
    await deleteTrainingSlot(editSlot.id)
    onDeleted()
  }

  // Compute popover position: clamp to viewport
  const style = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const popW = vw >= 768 ? 520 : 380

    // On mobile (< 640px), use near-fullscreen overlay
    if (vw < 640) {
      return {
        position: 'fixed',
        top: '5vh',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '95vh',
        zIndex: 1000,
      }
    }

    const popH = 700

    let x = popover.x
    let y = popover.y

    // If it would go off-right, place it to the left of the click
    if (x + popW > vw - 16) x = Math.max(16, popover.x - popW - 16)
    // Clamp vertical
    if (y + popH > vh - 16) y = Math.max(16, vh - popH - 16)

    return {
      position: 'fixed',
      top: y,
      left: x,
      width: popW,
      maxHeight: popH,
      zIndex: 1000,
    }
  }, [popover.x, popover.y])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <>
      {/* Backdrop on mobile */}
      {isMobile && (
        <div className="fixed inset-0 bg-black/30 z-[999]" onClick={onClose} />
      )}
      <div
        ref={ref}
        style={style}
        className={`bg-white shadow-2xl overflow-y-auto border border-gray-200 ${
          isMobile ? 'rounded-t-2xl' : 'rounded-xl'
        }`}
      >
        {/* Header */}
        <form onSubmit={handleSubmit}>
        <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-vvz-green text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-vvz-green-dark transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving && (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              )}
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                Verwijderen
              </button>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-800">
            {isEdit ? 'Training bewerken' : 'Nieuwe training'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Sluiten"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Submit error */}
          {errors.submit && (
            <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg">{errors.submit}</div>
          )}

          {/* Dag */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Dag</label>
            <div className="flex gap-1.5">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ ...form, day_of_week: d.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.day_of_week === d.value
                      ? 'bg-vvz-green text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.short}
                </button>
              ))}
            </div>
          </div>

          {/* Tijd */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tijd</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Van</label>
                  <select
                    value={form.start_time}
                    onChange={e => handleStartTimeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <span className="text-gray-400 mt-4">&mdash;</span>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Tot</label>
                  <select
                    value={form.end_time}
                    onChange={e => {
                      setForm({ ...form, end_time: e.target.value })
                      if (errors.time) setErrors(prev => ({ ...prev, time: null }))
                    }}
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green ${
                      errors.time ? 'border-red-400' : 'border-gray-300'
                    }`}
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            {errors.time && <p className="text-red-600 text-[10px] mt-1">{errors.time}</p>}
          </div>

          {/* Velden */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Velden</label>
            <div className={`border rounded-lg p-2.5 space-y-1.5 ${errors.fields ? 'border-red-400' : 'border-gray-200'}`}>
                <div className="flex flex-wrap gap-1">
                  {fields.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleField(f.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        form.field_ids.includes(f.id)
                          ? 'bg-vvz-green text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            {errors.fields && <p className="text-red-600 text-[10px] mt-1">{errors.fields}</p>}
          </div>

          {/* Teams */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Teams</label>
            <div className={`border rounded-lg p-2.5 space-y-2 ${errors.teams ? 'border-red-400' : 'border-gray-200'}`}>
                {teamGroups.map(group => (
                  <div key={group.label}>
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{group.label}</span>
                    <div className="flex flex-wrap gap-1">
                      {group.teams.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTeam(t.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            form.team_ids.includes(t.id)
                              ? 'text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          style={form.team_ids.includes(t.id) ? { backgroundColor: form.color } : {}}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            {errors.teams && <p className="text-red-600 text-[10px] mt-1">{errors.teams}</p>}
          </div>

          {/* Omschrijving */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Omschrijving (optioneel)</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="bijv. Keeperstraining, Circuittraining"
                maxLength={60}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
              />
            </div>

          {/* Kleur */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Kleur</label>
            <div className="flex gap-2">
              {[
                { color: '#3EE87D', label: 'Lichtgroen' },
                { color: '#14532D', label: 'Groen' },
                { color: '#052E16', label: 'Donkergroen' },
                { color: '#FACC15', label: 'Geel' },
                { color: '#F97316', label: 'Oranje' },
                { color: '#2563EB', label: 'Blauw' },
              ].map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

        </div>
        </form>
      </div>
    </>
  )
})
