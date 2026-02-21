// approve-expense — POST
// Perform workflow transitions (submit/check/approve/reject) on PJO, JO, or BKK documents.
// Ported from lib/workflow-service.ts performWorkflowTransition()

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { createUserClient, createServiceClient } from '../_shared/supabase.ts'
import { getUserProfile } from '../_shared/auth.ts'
import { logWorkflowTransition } from '../_shared/audit.ts'
import {
  WorkflowStatus,
  WorkflowAction,
  WorkflowDocumentType,
  getTargetStatus,
  canTransition,
  mapToWorkflowStatus,
  mapFromWorkflowStatus,
} from '../_shared/workflow.ts'

interface RequestBody {
  document_type: WorkflowDocumentType
  document_id: string
  action: WorkflowAction
  comment?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions()

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Auth
    const { profile, authHeader } = await getUserProfile(req)
    const supabase = createUserClient(authHeader)
    const serviceClient = createServiceClient()

    // 2. Parse + validate request
    const body: RequestBody = await req.json()
    const { document_type, document_id, action, comment } = body

    if (!document_type || !document_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: document_type, document_id, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['pjo', 'jo', 'bkk'].includes(document_type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid document_type. Must be pjo, jo, or bkk' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['submit', 'check', 'approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Must be submit, check, approve, or reject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Comment required for reject
    if (action === 'reject' && !comment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment is required when rejecting' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fetch current document status
    let currentStatus: WorkflowStatus = 'draft'
    let documentNumber = document_id

    if (document_type === 'pjo') {
      const { data, error } = await supabase
        .from('proforma_job_orders')
        .select('id, status, pjo_number')
        .eq('id', document_id)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'PJO document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      currentStatus = mapToWorkflowStatus(data.status)
      documentNumber = data.pjo_number || document_id
    } else if (document_type === 'jo') {
      const { data, error } = await supabase
        .from('job_orders')
        .select('id, status, jo_number')
        .eq('id', document_id)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'JO document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      currentStatus = mapToWorkflowStatus(data.status)
      documentNumber = data.jo_number || document_id
    } else if (document_type === 'bkk') {
      // BKK uses `status` column (not workflow_status)
      const { data, error } = await supabase
        .from('bukti_kas_keluar')
        .select('id, status, bkk_number')
        .eq('id', document_id)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'BKK document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      currentStatus = mapToWorkflowStatus(data.status || 'draft')
      documentNumber = data.bkk_number || document_id
    }

    // 4. Validate transition
    const targetStatus = getTargetStatus(action, currentStatus)

    if (!targetStatus) {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot ${action} from status '${currentStatus}'` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!canTransition(document_type, currentStatus, targetStatus, profile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Role '${profile.role}' cannot ${action} this document` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Build update payload per document type
    // Column availability differs by table:
    //   PJO: checked_by/at, approved_by/at, rejected_by/at, rejection_reason (NO submitted_by/at)
    //   JO:  submitted_by, checked_by/at, approved_by/at, rejected_by/at, rejection_reason (NO submitted_at)
    //   BKK: approved_by/at, rejection_reason (NO submitted_by/at, checked_by/at)
    const now = new Date().toISOString()

    // 6. Update document
    if (document_type === 'bkk') {
      const bkkUpdate: Record<string, unknown> = {
        status: mapFromWorkflowStatus(targetStatus, 'bkk'),
        updated_at: now,
      }
      if (action === 'approve') {
        bkkUpdate.approved_by = profile.user_id
        bkkUpdate.approved_at = now
      } else if (action === 'reject') {
        if (comment) bkkUpdate.rejection_reason = comment
      }

      const { error } = await supabase
        .from('bukti_kas_keluar')
        .update(bkkUpdate)
        .eq('id', document_id)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: `Update failed: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (document_type === 'pjo') {
      const pjoUpdate: Record<string, unknown> = {
        status: mapFromWorkflowStatus(targetStatus, 'pjo'),
        updated_at: now,
      }
      if (action === 'check') {
        pjoUpdate.checked_by = profile.user_id
        pjoUpdate.checked_at = now
      } else if (action === 'approve') {
        pjoUpdate.approved_by = profile.user_id
        pjoUpdate.approved_at = now
      } else if (action === 'reject') {
        pjoUpdate.rejected_by = profile.user_id
        pjoUpdate.rejected_at = now
        if (comment) pjoUpdate.rejection_reason = comment
      }

      const { error } = await supabase
        .from('proforma_job_orders')
        .update(pjoUpdate)
        .eq('id', document_id)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: `Update failed: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (document_type === 'jo') {
      const joUpdate: Record<string, unknown> = {
        status: mapFromWorkflowStatus(targetStatus, 'jo'),
        updated_at: now,
      }
      if (action === 'submit') {
        joUpdate.submitted_by = profile.user_id
      } else if (action === 'check') {
        joUpdate.checked_by = profile.user_id
        joUpdate.checked_at = now
      } else if (action === 'approve') {
        joUpdate.approved_by = profile.user_id
        joUpdate.approved_at = now
      } else if (action === 'reject') {
        joUpdate.rejected_by = profile.user_id
        joUpdate.rejected_at = now
        if (comment) joUpdate.rejection_reason = comment
      }

      const { error } = await supabase
        .from('job_orders')
        .update(joUpdate)
        .eq('id', document_id)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: `Update failed: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 7. Audit log
    await logWorkflowTransition(
      serviceClient,
      profile,
      document_type,
      document_id,
      document_type.toUpperCase(),
      documentNumber,
      action,
      currentStatus,
      targetStatus,
      comment
    )

    return new Response(
      JSON.stringify({
        success: true,
        new_status: targetStatus,
        document_number: documentNumber,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message.includes('Authorization') || message.includes('token') ? 401 : 500

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
