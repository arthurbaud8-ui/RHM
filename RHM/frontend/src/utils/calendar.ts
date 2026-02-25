/**
 * Utilitaires pour l'ajout de rendez-vous aux calendriers (Google Calendar, Outlook, ICS)
 */

interface MeetingData {
  date: string // Format YYYY-MM-DD
  time: string // Format HH:mm
  address: string
  instructions?: string
}

interface CalendarEvent {
  title: string
  description: string
  location: string
  startDate: Date
  endDate: Date
}

/**
 * Convertit les données de rendez-vous en objet CalendarEvent
 */
function parseMeetingToEvent(meetingData: MeetingData, title: string = 'Rendez-vous RHM'): CalendarEvent {
  const [hours, minutes] = meetingData.time.split(':').map(Number)
  const startDate = new Date(meetingData.date)
  startDate.setHours(hours, minutes, 0, 0)
  
  // Durée par défaut : 1 heure
  const endDate = new Date(startDate)
  endDate.setHours(endDate.getHours() + 1)

  const description = meetingData.instructions 
    ? `Adresse : ${meetingData.address}\n\nInstructions : ${meetingData.instructions}`
    : `Adresse : ${meetingData.address}`

  return {
    title,
    description,
    location: meetingData.address,
    startDate,
    endDate
  }
}

/**
 * Formate une date au format ISO pour les URLs de calendrier
 */
function formatDateForCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Génère un lien Google Calendar
 */
export function generateGoogleCalendarLink(meetingData: MeetingData, title?: string): string {
  const event = parseMeetingToEvent(meetingData, title)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateForCalendar(event.startDate)}/${formatDateForCalendar(event.endDate)}`,
    details: event.description,
    location: event.location
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Génère un lien Outlook Calendar
 */
export function generateOutlookCalendarLink(meetingData: MeetingData, title?: string): string {
  const event = parseMeetingToEvent(meetingData, title)
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description,
    location: event.location
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Génère un fichier ICS (iCalendar) pour téléchargement
 */
export function generateICSFile(meetingData: MeetingData, title?: string): string {
  const event = parseMeetingToEvent(meetingData, title)
  
  // Format ICS standard
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RHM//Rendez-vous//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@rhm.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return icsContent
}

/**
 * Télécharge un fichier ICS
 */
export function downloadICSFile(meetingData: MeetingData, title?: string, filename?: string): void {
  const icsContent = generateICSFile(meetingData, title)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `rendez-vous-${meetingData.date}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
