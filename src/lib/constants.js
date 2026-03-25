export const DAYS = [
  { value: 1, label: 'Maandag', short: 'Ma' },
  { value: 2, label: 'Dinsdag', short: 'Di' },
  { value: 3, label: 'Woensdag', short: 'Wo' },
  { value: 4, label: 'Donderdag', short: 'Do' },
  { value: 5, label: 'Vrijdag', short: 'Vr' },
]

// Generate time slots from 13:45 to 22:45 in 15-minute steps
export function generateTimeSlots() {
  const slots = []
  for (let h = 13; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 13 && m < 45) continue
      if (h === 22 && m > 45) continue
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

export const TIME_SLOTS = generateTimeSlots()

// Convert "HH:MM" to minutes since midnight
export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Start of the grid in minutes
export const GRID_START = timeToMinutes('13:45')
export const GRID_END = timeToMinutes('22:45')
export const SLOT_HEIGHT_PX = 20 // pixels per 15-min slot
