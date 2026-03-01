'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Loader2, MessageSquare, Bot, User, Shield } from 'lucide-react'
import {
  getOrCreateThread,
  getThreadMessages,
  sendThreadMessage,
  updateThreadStatus,
  markThreadMessagesRead,
} from '@/lib/support-thread-actions'
import type {
  SupportThread as SupportThreadType,
  SupportMessage,
  ThreadStatus,
} from '@/types/support-thread'
import {
  THREAD_STATUS_LABELS,
  THREAD_STATUS_COLORS,
} from '@/types/support-thread'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SupportThreadProps {
  entityType: string
  entityId: string
  currentUserId: string
  isAdmin?: boolean
  title?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Relative timestamp (Bahasa Indonesia)
// ---------------------------------------------------------------------------

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 7) return `${diffDays} hari lalu`

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Sender icon
// ---------------------------------------------------------------------------

function SenderIcon({ senderType }: { senderType: string }) {
  switch (senderType) {
    case 'admin':
      return <Shield className="h-3.5 w-3.5 text-blue-600" />
    case 'agent':
      return <Bot className="h-3.5 w-3.5 text-green-600" />
    default:
      return <User className="h-3.5 w-3.5 text-gray-500" />
  }
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  isOwnMessage,
}: {
  message: SupportMessage
  isOwnMessage: boolean
}) {
  const isRight =
    message.sender_type === 'admin' || message.sender_type === 'agent'

  const bubbleClasses = cn(
    'max-w-[80%] rounded-lg px-3 py-2 text-sm',
    message.sender_type === 'admin' && 'bg-blue-50 border border-blue-200',
    message.sender_type === 'agent' && 'bg-green-50 border border-green-200',
    message.sender_type === 'user' && 'bg-gray-100'
  )

  return (
    <div
      className={cn('flex mb-3', isRight ? 'justify-end' : 'justify-start')}
    >
      <div className={bubbleClasses}>
        {/* Sender name + icon */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <SenderIcon senderType={message.sender_type} />
          <span className="text-xs font-semibold text-gray-700">
            {message.sender_name || (isOwnMessage ? 'Anda' : 'Pengguna')}
          </span>
        </div>

        {/* Message body */}
        <p className="whitespace-pre-wrap break-words text-gray-800">
          {message.message}
        </p>

        {/* Timestamp */}
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SupportThread({
  entityType,
  entityId,
  currentUserId,
  isAdmin = false,
  title,
  className,
}: SupportThreadProps) {
  // State
  const [thread, setThread] = useState<SupportThreadType | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Load thread + messages on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const { thread: loadedThread, error: threadError } =
          await getOrCreateThread(entityType, entityId)

        if (cancelled) return

        if (threadError || !loadedThread) {
          setError(threadError || 'Gagal memuat thread')
          setIsLoading(false)
          return
        }

        setThread(loadedThread)

        // Load messages
        const loadedMessages = await getThreadMessages(loadedThread.id)
        if (cancelled) return
        setMessages(loadedMessages)

        // Mark as read
        await markThreadMessagesRead(loadedThread.id)
      } catch {
        if (!cancelled) {
          setError('Terjadi kesalahan saat memuat pesan')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [entityType, entityId])

  // Auto-scroll when messages change or loading finishes
  useEffect(() => {
    if (!isLoading) {
      const timeout = setTimeout(scrollToBottom, 50)
      return () => clearTimeout(timeout)
    }
  }, [messages, isLoading, scrollToBottom])

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = newMessage.trim()
    if (!trimmed || isSending) return

    setIsSending(true)

    // Optimistic update
    const optimisticMessage: SupportMessage = {
      id: `optimistic-${Date.now()}`,
      thread_id: thread?.id || '',
      sender_id: currentUserId,
      sender_type: isAdmin ? 'admin' : 'user',
      message: trimmed,
      metadata: {},
      is_read: false,
      created_at: new Date().toISOString(),
      sender_name: isAdmin ? 'Admin' : 'Anda',
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      const result = await sendThreadMessage({
        entityType,
        entityId,
        message: trimmed,
      })

      if (result.success && result.message) {
        // Replace optimistic message with server response
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? result.message! : m
          )
        )

        // If thread was just created, refresh it
        if (!thread) {
          const { thread: refreshedThread } = await getOrCreateThread(
            entityType,
            entityId
          )
          if (refreshedThread) setThread(refreshedThread)
        }
      } else {
        // Revert optimistic message on failure
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        )
        setError(result.error || 'Gagal mengirim pesan')
        setNewMessage(trimmed)
      }
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMessage.id)
      )
      setError('Gagal mengirim pesan')
      setNewMessage(trimmed)
    } finally {
      setIsSending(false)
    }
  }, [newMessage, isSending, thread, currentUserId, isAdmin, entityType, entityId])

  // Ctrl+Enter to send
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Admin: change thread status
  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!thread || isUpdatingStatus) return

      setIsUpdatingStatus(true)
      try {
        const result = await updateThreadStatus(
          thread.id,
          newStatus as ThreadStatus
        )
        if (result.success) {
          setThread((prev) =>
            prev ? { ...prev, status: newStatus as ThreadStatus } : null
          )
        } else {
          setError(result.error || 'Gagal mengubah status')
        }
      } catch {
        setError('Gagal mengubah status')
      } finally {
        setIsUpdatingStatus(false)
      }
    },
    [thread, isUpdatingStatus]
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className={cn('border rounded-lg p-6', className)}>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Memuat pesan...</span>
        </div>
      </div>
    )
  }

  if (error && !thread && messages.length === 0) {
    return (
      <div className={cn('border rounded-lg p-6', className)}>
        <div className="text-center text-sm text-red-600">{error}</div>
      </div>
    )
  }

  const ALL_STATUSES: ThreadStatus[] = [
    'open',
    'needs_clarification',
    'in_progress',
    'scoped',
    'resolved',
    'closed',
  ]

  return (
    <div className={cn('border rounded-lg flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {title || 'Diskusi'}
          </span>
          {thread && (
            <Badge
              className={cn(
                'text-[10px] px-1.5 py-0 border-0',
                THREAD_STATUS_COLORS[thread.status]
              )}
            >
              {THREAD_STATUS_LABELS[thread.status]}
            </Badge>
          )}
        </div>

        {/* Admin: status dropdown */}
        {isAdmin && thread && (
          <Select
            value={thread.status}
            onValueChange={handleStatusChange}
            disabled={isUpdatingStatus}
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder="Ubah status" />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        THREAD_STATUS_COLORS[status].split(' ')[0]
                      )}
                    />
                    {THREAD_STATUS_LABELS[status]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 max-h-[400px]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">
              Belum ada pesan. Mulai percakapan di bawah.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender_id === currentUserId}
            />
          ))
        )}
      </div>

      {/* Inline error (dismissible) */}
      {error && thread && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded px-3 py-1.5 text-xs text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Reply input */}
      <div className="border-t px-4 py-3">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan... (Ctrl+Enter untuk kirim)"
            rows={2}
            className="resize-none text-sm min-h-[60px]"
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
