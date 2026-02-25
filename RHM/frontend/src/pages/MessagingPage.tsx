import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, getUploadUrl } from '../services/api'
import type { Conversation, Message } from '../services/api'
import { toast } from 'sonner'
import { generateGoogleCalendarLink, generateOutlookCalendarLink, downloadICSFile } from '../utils/calendar'

export function MessagingPage() {
  const [searchParams] = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<'candidate' | 'recruiter'>('candidate')
  const [tests, setTests] = useState<{ id: string; title: string }[]>([])
  const [showTestPicker, setShowTestPicker] = useState(false)
  const [sendingTestId, setSendingTestId] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await api.getProfile()
        setUserRole(profile.role === 'recruiter' ? 'recruiter' : 'candidate')
        if (profile.role === 'recruiter') {
          const list = await api.getTests().catch(() => [])
          setTests(list.map((t: any) => ({ id: t.id, title: t.title || t.id })))
        }
      } catch {
        setUserRole('candidate')
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        const data = await api.getConversations()
        setConversations(data)
        
        // Vérifier si un conversationId est passé dans l'URL
        const conversationIdFromUrl = searchParams.get('conversationId')
        if (conversationIdFromUrl && data.some(c => c.id === conversationIdFromUrl)) {
          setSelectedConversationId(conversationIdFromUrl)
        } else if (data.length > 0) {
          setSelectedConversationId(data[0].id)
        }
      } catch (error: any) {
        toast.error('Erreur lors du chargement des conversations')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [searchParams])

  useEffect(() => {
    if (selectedConversationId) {
      const fetchMessages = async () => {
        try {
          const data = await api.getMessages(selectedConversationId)
          setMessages(data)
        } catch (error: any) {
          toast.error('Erreur lors du chargement des messages')
          console.error(error)
        }
      }

      fetchMessages()
    }
  }, [selectedConversationId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConversationId) return
    if (!newMessage.trim()) return

    // Pour les candidats : vérifier qu'il y a déjà des messages (conversation initiée par le recruteur)
    if (userRole === 'candidate' && messages.length === 0) {
      toast.error('Vous ne pouvez pas initier une conversation. Seuls les recruteurs peuvent contacter les candidats.')
      return
    }

    try {
      const message = await api.sendMessage({
        content: newMessage,
        from: userRole,
        conversationId: selectedConversationId,
      })
      setMessages([...messages, message])
      setNewMessage('')
      
      // Mettre à jour la liste des conversations pour mettre à jour le dernier message
      const updatedConversations = conversations.map(conv => 
        conv.id === selectedConversationId
          ? { ...conv, lastMessage: { content: newMessage, time: new Date() }, updatedAt: new Date() }
          : conv
      )
      setConversations(updatedConversations)
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi du message')
      console.error(error)
    }
  }

  const handleSendTest = async (testId: string) => {
    if (!selectedConversationId) return
    try {
      setSendingTestId(testId)
      const message = await api.sendMessage({
        from: 'recruiter',
        conversationId: selectedConversationId,
        testId,
      })
      setMessages([...messages, message])
      setShowTestPicker(false)
      toast.success('Test envoyé au candidat')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi du test')
    } finally {
      setSendingTestId(null)
    }
  }

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement des conversations...</div>
      </div>
    )
  }

  return (
    <div className="grid h-[calc(100vh-96px)] gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
      <aside className="hidden flex-col rounded-2xl border border-border bg-bg-elevated p-3 text-xs shadow-sm md:flex">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Conversations
          </h2>
          <button
            type="button"
            className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] text-text-muted hover:border-linkedin hover:text-text"
          >
            Filtrer
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-text-muted">
              Aucune conversation
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedConversationId(conv.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-[11px] ${
                  selectedConversationId === conv.id
                    ? 'border-linkedin/60 bg-white text-linkedin'
                    : 'border-border bg-white text-text-muted hover:bg-slate-50'
                }`}
              >
                <span>
                  {conv.candidate} • {conv.role}
                  {conv.isLocked && (
                    <span className="ml-1 text-[10px] text-text-muted">
                      (verrouillée)
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-text-muted">
                  {new Date(conv.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex flex-col rounded-2xl border border-border bg-bg-elevated text-xs shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
          {selectedConversation ? (
            <div className="flex items-center gap-3 min-w-0">
              {userRole === 'candidate' && selectedConversation.recruiter && (
                <div className="flex-shrink-0">
                  {selectedConversation.recruiter.avatarUrl ? (
                    <img
                      src={getUploadUrl(selectedConversation.recruiter.avatarUrl)}
                      alt={`${selectedConversation.recruiter.prenom} ${selectedConversation.recruiter.nom}`}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-linkedin flex items-center justify-center text-white text-sm font-semibold">
                      {selectedConversation.recruiter.prenom?.charAt(0) || selectedConversation.recruiter.nom?.charAt(0) || 'R'}
                    </div>
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text">
                  {userRole === 'candidate'
                    ? (selectedConversation.recruiter
                        ? `${selectedConversation.recruiter.prenom} ${selectedConversation.recruiter.nom}${selectedConversation.recruiter.companyName ? ` • ${selectedConversation.recruiter.companyName}` : ''}`
                        : 'Recruteur')
                    : selectedConversation.candidate}
                  {' • '}
                  {selectedConversation.role}
                </p>
                <p className="text-[11px] text-text-muted">
                  {selectedConversation.isLocked
                    ? 'Conversation verrouillée (lecture seule).'
                    : 'Conversation active'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-text">
                Sélectionnez une conversation
              </p>
            </div>
          )}
          <button
            type="button"
            className="rounded-full border border-border bg-white px-3 py-1 text-[11px] text-text-muted hover:border-accent hover:text-text"
          >
            Voir la candidature
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-text-muted">
              Aucun message
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.from === 'recruiter' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={[
                    'max-w-[70%] rounded-2xl px-3 py-2 text-[11px] leading-snug shadow-sm',
                    message.from === 'recruiter'
                      ? 'rounded-br-sm bg-linkedin text-white'
                      : 'rounded-bl-sm bg-white text-text border border-border',
                  ].join(' ')}
                >
                  {message.type === 'test_invitation' && message.testId ? (
                    <div>
                      <p className="text-[10px] opacity-90">Test proposé par le recruteur</p>
                      <p className="font-medium">{message.testTitle || 'Test technique'}</p>
                      <Link
                        to={`/tests?testId=${message.testId}`}
                        className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold hover:bg-white/30"
                      >
                        Passer le test
                      </Link>
                    </div>
                  ) : message.type === 'meeting_invitation' && message.meetingData ? (
                    <div>
                      <p className="text-[10px] opacity-90 mb-1">📅 Rendez-vous proposé</p>
                      <p className="font-medium mb-2">
                        {new Date(message.meetingData.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' à '}
                        {message.meetingData.time}
                      </p>
                      <p className="text-[10px] opacity-90 mb-1">📍 {message.meetingData.address}</p>
                      {message.meetingData.instructions && (
                        <p className="text-[10px] opacity-80 mt-1 italic mb-2">{message.meetingData.instructions}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <a
                          href={generateGoogleCalendarLink(message.meetingData, 'Rendez-vous RHM')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            toast.success('Ajout au calendrier Google...')
                          }}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.14c-.22-.69-.35-1.43-.35-2.14s.13-1.45.35-2.14V7.02H2.18C1.43 8.3 1 9.89 1 11.5s.43 3.2 1.18 4.48l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google
                        </a>
                        <a
                          href={generateOutlookCalendarLink(message.meetingData, 'Rendez-vous RHM')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            toast.success('Ajout au calendrier Outlook...')
                          }}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.5 7h9v9h-9z" fill="#0078D4"/>
                            <path d="M7.5 7v9h9V7z" fill="#0078D4"/>
                            <path d="M20.25 2H3.75A1.75 1.75 0 002 3.75v16.5A1.75 1.75 0 003.75 22h16.5A1.75 1.75 0 0022 20.25V3.75A1.75 1.75 0 0020.25 2zM20 20H4V4h16v16z" fill="#0078D4"/>
                          </svg>
                          Outlook
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadICSFile(message.meetingData!, 'Rendez-vous RHM')
                            toast.success('Fichier calendrier téléchargé')
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/30 transition-colors"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Télécharger
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <p className="mt-1 text-[10px] text-text-muted/80">
                    {message.time} •{' '}
                    {message.from === 'recruiter' ? 'Vous' : 'Candidat·e'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="border-t border-border/80 bg-bg-elevated px-4 py-3">
          {userRole === 'recruiter' && tests.length > 0 && (
            <div className="relative mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTestPicker((v) => !v)}
                className="rounded-full border border-border bg-white px-3 py-1 text-[11px] text-text-muted hover:border-linkedin hover:text-linkedin"
              >
                Envoyer un test
              </button>
              {showTestPicker && (
                <div className="absolute bottom-full right-0 mb-1 w-56 rounded-xl border border-border bg-white py-2 shadow-lg">
                  {tests.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={sendingTestId === t.id}
                      onClick={() => handleSendTest(t.id)}
                      className="block w-full px-3 py-2 text-left text-[11px] text-text hover:bg-slate-50 disabled:opacity-50"
                    >
                      {sendingTestId === t.id ? 'Envoi...' : t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!selectedConversation || selectedConversation.isLocked || (userRole === 'candidate' && messages.length === 0)}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-bg px-3 py-2 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none disabled:opacity-50"
              placeholder={
                selectedConversation?.isLocked
                  ? 'Conversation verrouillée'
                  : userRole === 'candidate' && messages.length === 0
                    ? 'Attendez que le recruteur vous contacte...'
                    : 'Envoyer un message professionnel et concis...'
              }
            />
            <button
              type="submit"
              disabled={!selectedConversation || selectedConversation.isLocked || !newMessage.trim() || (userRole === 'candidate' && messages.length === 0)}
              className="rounded-full bg-linkedin px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-linkedin/90 disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </footer>
      </section>
    </div>
  )
}
