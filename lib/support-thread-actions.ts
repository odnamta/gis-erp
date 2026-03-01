'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { ADMIN_ROLES } from '@/lib/permissions'
import type {
  SupportThread,
  SupportMessage,
  ThreadStatus,
  SenderType,
} from '@/types/support-thread'

// ============================================================
// GET OR CREATE THREAD
// ============================================================

/**
 * Get existing thread for an entity, or create one if it doesn't exist.
 * Returns the thread with message count.
 */
export async function getOrCreateThread(
  entityType: string,
  entityId: string
): Promise<{ thread: SupportThread | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { thread: null, error: 'Not authenticated' }

  // Try to get existing thread
  const { data: existing } = await supabase
    .from('support_threads' as any)
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single()

  if (existing) {
    const thread = existing as unknown as SupportThread

    // Get message count
    const { count } = await supabase
      .from('support_messages' as any)
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', thread.id)

    thread.message_count = count || 0

    // Get unread count (messages not sent by current user that are unread)
    const { count: unread } = await supabase
      .from('support_messages' as any)
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', thread.id)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    thread.unread_count = unread || 0

    return { thread }
  }

  // Create new thread
  const { data: newThread, error: createError } = await supabase
    .from('support_threads' as any)
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      created_by: user.id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (createError) {
    return { thread: null, error: createError.message }
  }

  const thread = newThread as unknown as SupportThread
  thread.message_count = 0
  thread.unread_count = 0
  return { thread }
}

// ============================================================
// GET THREAD MESSAGES
// ============================================================

/**
 * Get all messages for a thread, enriched with sender info.
 */
export async function getThreadMessages(
  threadId: string
): Promise<SupportMessage[]> {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('support_messages' as any)
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) return []

  const messageList = messages as unknown as SupportMessage[]

  // Enrich with sender info
  const senderIds = [...new Set(messageList.map(m => m.sender_id))]
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, role, avatar_url')
      .in('user_id', senderIds)

    const profileMap = new Map(
      ((profiles || []) as unknown as { user_id: string; full_name: string; role: string; avatar_url: string }[])
        .map(p => [p.user_id, p])
    )

    messageList.forEach(m => {
      const profile = profileMap.get(m.sender_id)
      if (profile) {
        m.sender_name = profile.full_name
        m.sender_avatar = profile.avatar_url
        m.sender_role = profile.role
      }
    })
  }

  return messageList
}

// ============================================================
// SEND MESSAGE
// ============================================================

/**
 * Send a message to a thread. Auto-creates thread if needed.
 * Returns the created message.
 */
export async function sendThreadMessage(data: {
  entityType: string
  entityId: string
  message: string
  senderType?: SenderType
  metadata?: Record<string, unknown>
}): Promise<{ success: boolean; message?: SupportMessage; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (!data.message.trim()) {
    return { success: false, error: 'Pesan tidak boleh kosong' }
  }

  // Determine sender type
  let senderType: SenderType = data.senderType || 'user'
  if (senderType === 'user') {
    // Check if sender is admin
    const profile = await getUserProfile()
    if (profile && (ADMIN_ROLES as readonly string[]).includes(profile.role)) {
      senderType = 'admin'
    }
  }

  // Get or create thread
  const { thread, error: threadError } = await getOrCreateThread(
    data.entityType,
    data.entityId
  )
  if (!thread || threadError) {
    return { success: false, error: threadError || 'Gagal membuat thread' }
  }

  // Insert message
  const { data: newMessage, error: insertError } = await supabase
    .from('support_messages' as any)
    .insert({
      thread_id: thread.id,
      sender_id: user.id,
      sender_type: senderType,
      message: data.message.trim(),
      metadata: data.metadata || {},
    } as Record<string, unknown>)
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Update thread timestamp
  await supabase
    .from('support_threads' as any)
    .update({ updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', thread.id)

  // If admin/agent replying to open thread, set to in_progress
  if (senderType !== 'user' && thread.status === 'open') {
    await supabase
      .from('support_threads' as any)
      .update({ status: 'in_progress', updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', thread.id)
  }

  const msg = newMessage as unknown as SupportMessage

  // Enrich sender info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (profile) {
    const p = profile as unknown as { full_name: string; role: string; avatar_url: string }
    msg.sender_name = p.full_name
    msg.sender_avatar = p.avatar_url
    msg.sender_role = p.role
  }

  return { success: true, message: msg }
}

// ============================================================
// UPDATE THREAD STATUS
// ============================================================

export async function updateThreadStatus(
  threadId: string,
  status: ThreadStatus
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile()
  if (!profile || !(ADMIN_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('support_threads' as any)
    .update({
      status,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', threadId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ============================================================
// MARK MESSAGES AS READ
// ============================================================

export async function markThreadMessagesRead(
  threadId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('support_messages' as any)
    .update({ is_read: true } as Record<string, unknown>)
    .eq('thread_id', threadId)
    .neq('sender_id', user.id)
    .eq('is_read', false)
}

// ============================================================
// GET THREAD SUMMARY FOR ENTITY LIST
// ============================================================

/**
 * Batch get thread info for multiple entities (for list views with badges).
 * Returns a map of entityId → { messageCount, unreadCount, lastMessageAt }
 */
export async function getThreadSummaries(
  entityType: string,
  entityIds: string[]
): Promise<Map<string, { messageCount: number; unreadCount: number; lastMessageAt: string | null }>> {
  const result = new Map<string, { messageCount: number; unreadCount: number; lastMessageAt: string | null }>()
  if (entityIds.length === 0) return result

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return result

  // Get threads for these entities
  const { data: threads } = await supabase
    .from('support_threads' as any)
    .select('id, entity_id, updated_at')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)

  if (!threads || threads.length === 0) return result

  const threadList = threads as unknown as { id: string; entity_id: string; updated_at: string }[]
  const threadIds = threadList.map(t => t.id)
  const threadEntityMap = new Map(threadList.map(t => [t.id, t.entity_id]))

  // Batch get message counts
  const { data: allMessages } = await supabase
    .from('support_messages' as any)
    .select('thread_id, sender_id, is_read')
    .in('thread_id', threadIds)

  const msgList = (allMessages || []) as unknown as { thread_id: string; sender_id: string; is_read: boolean }[]

  // Aggregate per thread
  const threadCounts = new Map<string, { total: number; unread: number }>()
  msgList.forEach(m => {
    const counts = threadCounts.get(m.thread_id) || { total: 0, unread: 0 }
    counts.total++
    if (!m.is_read && m.sender_id !== user.id) counts.unread++
    threadCounts.set(m.thread_id, counts)
  })

  // Build result map keyed by entity_id
  threadList.forEach(t => {
    const counts = threadCounts.get(t.id) || { total: 0, unread: 0 }
    result.set(t.entity_id, {
      messageCount: counts.total,
      unreadCount: counts.unread,
      lastMessageAt: t.updated_at,
    })
  })

  return result
}
