// bkk-generation — POST
// Create a new BKK (Bukti Kas Keluar / cash disbursement) with auto-numbered BKK-YYYY-NNNN.
// Ported from app/actions/bkk-actions.ts createBKK()

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { createUserClient, createServiceClient } from '../_shared/supabase.ts'
import { getUserProfile, type UserRole } from '../_shared/auth.ts'
import { logAudit } from '../_shared/audit.ts'

const ALLOWED_ROLES: UserRole[] = [
  'owner', 'director', 'finance_manager', 'operations_manager',
  'administration', 'finance',
]

interface RequestBody {
  jo_id?: string
  pjo_id?: string
  description: string
  amount: number
  payment_method: 'cash' | 'transfer' | 'check'
  recipient_name: string
  recipient_bank?: string
  recipient_account?: string
  notes?: string
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

    // 1. Auth + role check
    const { profile, authHeader } = await getUserProfile(req)

    if (!ALLOWED_ROLES.includes(profile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Role '${profile.role}' cannot create BKK` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createUserClient(authHeader)
    const serviceClient = createServiceClient()

    // 2. Parse + validate request
    const body: RequestBody = await req.json()

    if (!body.jo_id || !body.description || !body.amount || !body.recipient_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: jo_id, description, amount, recipient_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Amount must be greater than 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Generate BKK number: BKK-YYYY-NNNN
    const year = new Date().getFullYear()

    const { data: lastBkk } = await supabase
      .from('bukti_kas_keluar')
      .select('bkk_number')
      .like('bkk_number', `BKK-${year}-%`)
      .order('bkk_number', { ascending: false })
      .limit(1)

    let sequence = 1
    if (lastBkk && lastBkk.length > 0) {
      const lastNumber = lastBkk[0].bkk_number as string
      const lastSeq = parseInt(lastNumber.split('-')[2], 10)
      if (!isNaN(lastSeq)) sequence = lastSeq + 1
    }

    const bkkNumber = `BKK-${year}-${sequence.toString().padStart(4, '0')}`

    // 4. Insert into bukti_kas_keluar
    // Schema: requested_by (not created_by), status (not workflow_status), no recipient_name column
    const insertData = {
      bkk_number: bkkNumber,
      jo_id: body.jo_id,
      purpose: body.description,
      amount_requested: body.amount,
      notes: body.notes ? `${body.recipient_name} — ${body.notes}` : body.recipient_name,
      requested_by: profile.user_id,
      status: 'draft',
    }

    const { data, error } = await supabase
      .from('bukti_kas_keluar')
      .insert(insertData)
      .select('id, bkk_number')
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: `Insert failed: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Audit log
    await logAudit(serviceClient, profile, {
      action: 'create',
      module: 'bkk',
      recordId: data.id,
      recordType: 'BKK',
      recordNumber: data.bkk_number,
      newValues: body as unknown as Record<string, unknown>,
      changesSummary: `Created BKK ${data.bkk_number}`,
    })

    return new Response(
      JSON.stringify({
        success: true,
        bkk: { id: data.id, bkk_number: data.bkk_number },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
