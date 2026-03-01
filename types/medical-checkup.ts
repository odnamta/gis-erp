// Medical Checkup (MCU) Types

export type CheckupType = 'pre_employment' | 'annual' | 'periodic' | 'follow_up' | 'exit'
export type MedicalStatus = 'fit' | 'conditional_fit' | 'temporary_unfit' | 'unfit'
export type CheckupRecordStatus = 'scheduled' | 'completed' | 'pending_review' | 'approved' | 'cancelled'

export interface MedicalCheckup {
  id: string
  employee_id: string
  checkup_type: CheckupType
  checkup_date: string
  scheduled_date: string | null
  clinic_name: string
  doctor_name: string
  height_cm: number | null
  weight_kg: number | null
  blood_pressure: string | null
  heart_rate: number | null
  vision_left: string | null
  vision_right: string | null
  hearing_left: string | null
  hearing_right: string | null
  blood_test: boolean
  blood_test_result: string | null
  urine_test: boolean
  urine_test_result: string | null
  xray_performed: boolean
  xray_result: string | null
  findings: string
  medical_status: MedicalStatus
  restrictions: string | null
  recommendations: string | null
  referral_required: boolean
  referral_to: string | null
  valid_from: string
  valid_to: string
  status: CheckupRecordStatus
  cost_idr: number | null
  certificate_number: string | null
  certificate_url: string | null
  notes: string | null
  recorded_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  employee_name?: string
  employee_code?: string
  department_name?: string
}

export interface CreateMedicalCheckupInput {
  employee_id: string
  checkup_type: CheckupType
  checkup_date: string
  scheduled_date?: string
  clinic_name: string
  doctor_name: string
  height_cm?: number
  weight_kg?: number
  blood_pressure?: string
  heart_rate?: number
  vision_left?: string
  vision_right?: string
  hearing_left?: string
  hearing_right?: string
  blood_test?: boolean
  blood_test_result?: string
  urine_test?: boolean
  urine_test_result?: string
  xray_performed?: boolean
  xray_result?: string
  findings?: string
  medical_status: MedicalStatus
  restrictions?: string
  recommendations?: string
  referral_required?: boolean
  referral_to?: string
  valid_from?: string
  valid_to?: string
  status?: CheckupRecordStatus
  cost_idr?: number
  certificate_number?: string
  certificate_url?: string
  notes?: string
}

export interface UpdateMedicalCheckupInput {
  checkup_type?: CheckupType
  checkup_date?: string
  scheduled_date?: string
  clinic_name?: string
  doctor_name?: string
  height_cm?: number | null
  weight_kg?: number | null
  blood_pressure?: string | null
  heart_rate?: number | null
  vision_left?: string | null
  vision_right?: string | null
  hearing_left?: string | null
  hearing_right?: string | null
  blood_test?: boolean
  blood_test_result?: string | null
  urine_test?: boolean
  urine_test_result?: string | null
  xray_performed?: boolean
  xray_result?: string | null
  findings?: string
  medical_status?: MedicalStatus
  restrictions?: string | null
  recommendations?: string | null
  referral_required?: boolean
  referral_to?: string | null
  valid_from?: string
  valid_to?: string
  status?: CheckupRecordStatus
  cost_idr?: number | null
  certificate_number?: string | null
  certificate_url?: string | null
  notes?: string | null
}

export interface MedicalCheckupFilters {
  employee_id?: string
  medical_status?: MedicalStatus
  checkup_type?: CheckupType
  status?: CheckupRecordStatus
}

export const CHECKUP_TYPE_LABELS: Record<CheckupType, string> = {
  pre_employment: 'Pra-Kerja',
  annual: 'Tahunan',
  periodic: 'Berkala',
  follow_up: 'Tindak Lanjut',
  exit: 'Akhir Masa Kerja',
}

export const MEDICAL_STATUS_LABELS: Record<MedicalStatus, string> = {
  fit: 'Layak Kerja',
  conditional_fit: 'Layak Bersyarat',
  temporary_unfit: 'Tidak Layak Sementara',
  unfit: 'Tidak Layak Kerja',
}

export const MEDICAL_STATUS_COLORS: Record<MedicalStatus, string> = {
  fit: 'bg-green-100 text-green-800',
  conditional_fit: 'bg-yellow-100 text-yellow-800',
  temporary_unfit: 'bg-orange-100 text-orange-800',
  unfit: 'bg-red-100 text-red-800',
}

export const CHECKUP_STATUS_LABELS: Record<CheckupRecordStatus, string> = {
  scheduled: 'Terjadwal',
  completed: 'Selesai',
  pending_review: 'Menunggu Review',
  approved: 'Disetujui',
  cancelled: 'Dibatalkan',
}

export const CHECKUP_STATUS_COLORS: Record<CheckupRecordStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-800',
}
