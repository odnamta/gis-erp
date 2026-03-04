import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatDateForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kadaluarsa',
}

const PERMIT_TYPE_LABELS: Record<string, string> = {
  hot_work: 'Pekerjaan Panas',
  confined_space: 'Ruang Terbatas',
  height_work: 'Bekerja di Ketinggian',
  excavation: 'Penggalian',
  electrical: 'Pekerjaan Listrik',
  lifting: 'Pengangkatan',
}

const PPE_LABELS: Record<string, string> = {
  helmet: 'Helm Keselamatan',
  safety_glasses: 'Kacamata Keselamatan',
  face_shield: 'Pelindung Wajah',
  ear_plugs: 'Pelindung Telinga',
  respirator: 'Respirator',
  gloves: 'Sarung Tangan',
  safety_shoes: 'Sepatu Keselamatan',
  safety_vest: 'Rompi Keselamatan',
  harness: 'Full Body Harness',
  fire_blanket: 'Selimut Api',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  infoBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 150,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },
  ppeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  ppeBadge: {
    fontSize: 8,
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    color: '#1e40af',
  },
  precautionBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fefce8',
    borderLeftWidth: 3,
    borderLeftColor: '#ca8a04',
  },
  precautionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#854d0e',
    marginBottom: 4,
  },
  precautionText: {
    fontSize: 9,
    color: '#713f12',
  },
  emergencyBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  emergencyTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 9,
    color: '#7f1d1d',
  },
  approvalSection: {
    marginTop: 16,
  },
  approvalRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  approvalLabel: {
    width: 150,
    fontSize: 9,
    color: '#666',
  },
  approvalValue: {
    flex: 1,
    fontSize: 9,
  },
  approvalDate: {
    width: 100,
    fontSize: 8,
    color: '#888',
    textAlign: 'right',
  },
  closureBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },
  closureTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 4,
  },
  closureText: {
    fontSize: 9,
    color: '#14532d',
  },
})

export interface PermitPDFProps {
  permit: {
    permit_number?: string
    permit_type: string
    status: string
    work_description: string
    work_location: string
    valid_from?: string | null
    valid_to?: string | null
    required_ppe: string[]
    special_precautions?: string | null
    emergency_procedures?: string | null
    requested_at?: string | null
    supervisor_approved_at?: string | null
    hse_approved_at?: string | null
    closed_at?: string | null
    closure_notes?: string | null
    created_at: string
  }
  requestedByName?: string | null
  supervisorApprovedByName?: string | null
  hseApprovedByName?: string | null
  closedByName?: string | null
  jobOrderNumber?: string | null
  company: CompanySettingsForPDF
}

export function PermitPDF({
  permit,
  requestedByName,
  supervisorApprovedByName,
  hseApprovedByName,
  closedByName,
  jobOrderNumber,
  company,
}: PermitPDFProps) {
  const statusLabel = STATUS_LABELS[permit.status] || permit.status
  const permitTypeLabel = PERMIT_TYPE_LABELS[permit.permit_type] || permit.permit_type

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle="IZIN KERJA (PERMIT TO WORK)"
          documentNumber={permit.permit_number || '-'}
          documentDate={formatDateForPDF(permit.created_at)}
        />

        {/* Status & Permit Type */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jenis Izin Kerja:</Text>
            <Text style={styles.infoValue}>{permitTypeLabel}</Text>
          </View>
        </View>

        {/* Work Information */}
        <Text style={styles.sectionTitle}>Informasi Pekerjaan</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Deskripsi Pekerjaan:</Text>
            <Text style={styles.infoValue}>{permit.work_description}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lokasi:</Text>
            <Text style={styles.infoValue}>{permit.work_location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Masa Berlaku:</Text>
            <Text style={styles.infoValue}>
              {formatDateForPDF(permit.valid_from)} - {formatDateForPDF(permit.valid_to)}
            </Text>
          </View>
          {jobOrderNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Referensi Job Order:</Text>
              <Text style={styles.infoValue}>{jobOrderNumber}</Text>
            </View>
          )}
        </View>

        {/* Safety Requirements */}
        <Text style={styles.sectionTitle}>Persyaratan Keselamatan</Text>

        {/* Required PPE */}
        {permit.required_ppe && permit.required_ppe.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: '#666', marginBottom: 6 }}>APD yang Diperlukan:</Text>
            <View style={styles.ppeGrid}>
              {permit.required_ppe.map((ppe, idx) => (
                <Text key={idx} style={styles.ppeBadge}>
                  {PPE_LABELS[ppe] || ppe}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Special Precautions */}
        {permit.special_precautions && (
          <View style={styles.precautionBox}>
            <Text style={styles.precautionTitle}>Tindakan Pencegahan Khusus</Text>
            <Text style={styles.precautionText}>{permit.special_precautions}</Text>
          </View>
        )}

        {/* Emergency Procedures */}
        {permit.emergency_procedures && (
          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyTitle}>Prosedur Darurat</Text>
            <Text style={styles.emergencyText}>{permit.emergency_procedures}</Text>
          </View>
        )}

        {/* Approval Section */}
        <Text style={styles.sectionTitle}>Persetujuan</Text>
        <View style={styles.approvalSection}>
          <View style={styles.approvalRow}>
            <Text style={styles.approvalLabel}>Diajukan oleh:</Text>
            <Text style={styles.approvalValue}>{requestedByName || '-'}</Text>
            <Text style={styles.approvalDate}>{formatDateForPDF(permit.requested_at)}</Text>
          </View>
          <View style={styles.approvalRow}>
            <Text style={styles.approvalLabel}>Supervisor:</Text>
            <Text style={styles.approvalValue}>{supervisorApprovedByName || '-'}</Text>
            <Text style={styles.approvalDate}>{formatDateForPDF(permit.supervisor_approved_at)}</Text>
          </View>
          <View style={styles.approvalRow}>
            <Text style={styles.approvalLabel}>HSE:</Text>
            <Text style={styles.approvalValue}>{hseApprovedByName || '-'}</Text>
            <Text style={styles.approvalDate}>{formatDateForPDF(permit.hse_approved_at)}</Text>
          </View>
        </View>

        {/* Closure Section */}
        {permit.status === 'completed' && (
          <>
            <Text style={styles.sectionTitle}>Penutupan</Text>
            <View style={styles.closureBox}>
              {permit.closure_notes && (
                <>
                  <Text style={styles.closureTitle}>Catatan Penutupan</Text>
                  <Text style={styles.closureText}>{permit.closure_notes}</Text>
                </>
              )}
              {closedByName && (
                <Text style={[styles.closureText, { marginTop: 6 }]}>
                  Ditutup oleh: {closedByName} pada {formatDateForPDF(permit.closed_at)}
                </Text>
              )}
            </View>
          </>
        )}

        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" showPageNumber />
      </Page>
    </Document>
  )
}
