// lib/scheduling.ts
//
// Which dates and times staff may offer a mother in a counter-offer. These
// are the same rules her own scheduler applies when she picks a slot
// (AppointmentSchedulerScreen in the Android app), plus one more that only
// makes sense here: the slot she already asked for is not a counter-offer.
//
//   - Past dates are out.
//   - Weekends are out (the facility works Monday to Friday).
//   - Dates the facility has marked unavailable for her pathway are out
//     (Facility.unavailable_donor_dates / unavailable_recipient_dates).
//   - On today's date, a time that has already passed is out.
//   - On the date she asked for, the time she asked for is out.
//
// Everything is in the browser's own timezone, like the existing date input
// it replaces -- toISOString() would convert to UTC first and read as
// yesterday for the first eight hours of a Manila day.

// What the mother's own scheduler offers, in this order. Staff must not be able
// to propose a slot her app would never have let her pick.
export const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM',
] as const

/** yyyy-mm-dd for a Date, in local time. */
export function toDateString(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** A yyyy-mm-dd string as a local Date at midnight (not UTC midnight). */
export function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isWeekend(dateString: string): boolean {
  const day = parseDateString(dateString).getDay()
  return day === 0 || day === 6
}

/** Hour of day (0-23) for a slot label like "1:00 PM", or null if unreadable. */
export function slotHour(slot: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot.trim())
  if (!match) return null
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hour += 12
  return hour
}

/** Why a date can't be offered, or null if it can. */
export function dateBlockedReason(
  dateString: string,
  unavailableDates: readonly string[],
  now: Date = new Date()
): string | null {
  if (dateString < toDateString(now)) return 'This date has passed'
  // Today, once the last slot has started, has nothing left to offer.
  if (dateString === toDateString(now) && TIME_SLOTS.every((slot) => hasStarted(slot, now))) {
    return 'No times left today'
  }
  if (isWeekend(dateString)) return 'Weekends are not available'
  if (unavailableDates.includes(dateString)) return 'The facility is unavailable this day'
  return null
}

/** Why a time can't be offered on the chosen date, or null if it can. */
export function slotBlockedReason(
  slot: string,
  dateString: string,
  requested: { date: string; time: string },
  now: Date = new Date()
): string | null {
  if (dateString === requested.date && slot === requested.time) {
    return 'This is the time she already asked for'
  }
  if (dateString === toDateString(now) && hasStarted(slot, now)) return 'This time has already passed'
  return null
}

/** True once today's slot has begun (a slot starting exactly now counts as begun). */
function hasStarted(slot: string, now: Date): boolean {
  const hour = slotHour(slot)
  if (hour === null) return false
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0).getTime() <= now.getTime()
}
