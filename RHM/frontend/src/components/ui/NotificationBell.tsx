import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { toast } from 'sonner'
import { generateGoogleCalendarLink, generateOutlookCalendarLink, downloadICSFile } from '../../utils/calendar'

interface Notification {
  id: string
  type: 'message' | 'meeting_invitation' | 'test_invitation' | 'application_status'
  title: string
  message: string
  conversationId?: string
  applicationId?: string
  testId?: string
  meetingData?: {
    date: string
    time: string
    address: string
  }
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const lastCheckRef = useRef<number>(0)
  const shownToastIdsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const [notifs, count] = await Promise.all([
        api.getNotifications().catch(() => []),
        api.getUnreadNotificationsCount().catch(() => 0)
      ])
      
      setNotifications(notifs)
      setUnreadCount(count)

      // Afficher des toasts pour les nouvelles notifications (seulement celles créées dans les 2 dernières minutes)
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000
      notifs.forEach((notif: Notification) => {
        const createdAt = new Date(notif.createdAt).getTime()
        if (!notif.read && createdAt > twoMinutesAgo && !shownToastIdsRef.current.has(notif.id)) {
          shownToastIdsRef.current.add(notif.id)
          
          if (notif.type === 'meeting_invitation') {
            toast.info(notif.title, {
              description: notif.message,
              duration: 5000,
              action: {
                label: 'Voir',
                onClick: () => {
                  if (notif.conversationId) {
                    navigate(`/messaging?conversationId=${notif.conversationId}`)
                  }
                }
              }
            })
          } else if (notif.type === 'test_invitation') {
            toast.info(notif.title, {
              description: notif.message,
              duration: 5000,
              action: {
                label: 'Passer le test',
                onClick: () => {
                  if (notif.testId) {
                    navigate(`/tests?testId=${notif.testId}`)
                  }
                }
              }
            })
          } else if (notif.type === 'message') {
            toast.info(notif.title, {
              description: notif.message,
              duration: 4000,
              action: {
                label: 'Répondre',
                onClick: () => {
                  if (notif.conversationId) {
                    navigate(`/messaging?conversationId=${notif.conversationId}`)
                  }
                }
              }
            })
          }
        }
      })
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Vérifier immédiatement
    fetchNotifications()

    // Vérifier toutes les 20 secondes
    const interval = setInterval(() => {
      const now = Date.now()
      // Éviter les appels trop fréquents (minimum 15 secondes entre deux appels)
      if (now - lastCheckRef.current > 15000) {
        lastCheckRef.current = now
        fetchNotifications()
      }
    }, 20000)

    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId)
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      const deleted = notifications.find(n => n.id === notificationId)
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      markAsRead(notif.id)
    }
    
    if (notif.conversationId) {
      navigate(`/messaging?conversationId=${notif.conversationId}`)
      setShowDropdown(false)
    } else if (notif.testId) {
      navigate(`/tests?testId=${notif.testId}`)
      setShowDropdown(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setShowDropdown(!showDropdown)
          if (!showDropdown) {
            fetchNotifications()
          }
        }}
        className="relative rounded-full p-2 text-text-muted hover:bg-bg transition-colors"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-bg-elevated shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-xs font-semibold text-text">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[10px] text-linkedin hover:underline"
                  >
                    Tout marquer comme lu
                  </button>
                )}
                {isLoading && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-linkedin border-t-transparent" />
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-[11px] text-text-muted">
                  Aucune notification
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`border-b border-border/50 px-4 py-3 transition-colors cursor-pointer hover:bg-bg ${
                      !notif.read ? 'bg-linkedin/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className={`text-[11px] font-semibold ${!notif.read ? 'text-text' : 'text-text-muted'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-linkedin flex-shrink-0" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-text-muted line-clamp-2">{notif.message}</p>
                        {notif.meetingData && (
                          <>
                            <p className="mt-1 text-[9px] text-text-muted">
                              📍 {notif.meetingData.address}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <a
                                href={generateGoogleCalendarLink(notif.meetingData, notif.title)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] text-linkedin hover:underline"
                              >
                                + Google
                              </a>
                              <span className="text-[9px] text-text-muted">•</span>
                              <a
                                href={generateOutlookCalendarLink(notif.meetingData, notif.title)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] text-linkedin hover:underline"
                              >
                                + Outlook
                              </a>
                              <span className="text-[9px] text-text-muted">•</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadICSFile(notif.meetingData!, notif.title)
                                }}
                                className="text-[9px] text-linkedin hover:underline"
                              >
                                Télécharger
                              </button>
                            </div>
                          </>
                        )}
                        <p className="mt-1 text-[9px] text-text-muted">
                          {new Date(notif.createdAt).toLocaleString('fr-FR', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="text-[10px] text-text-muted hover:text-danger flex-shrink-0"
                        aria-label="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
