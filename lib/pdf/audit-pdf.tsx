import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatDateForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Terjadwal',
  in_progress: 'Sedang Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const RATING_LABELS: Record<string, string> = {
  pass: 'Lulus',
  conditional_pass: 'Lulus Bersyarat',
  fail: 'Gagal',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kritis',
  major: 'Besar',
  minor: 'Kecil',
  observation: 'Observasi',
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
  scoreSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  ratingBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  findingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  findingCount: {
    alignItems: 'center',
  },
  findingCountNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  findingCountLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#444',
  },
  tableCell: {
    fontSize: 8,
    color: '#333',
  },
  checklistResponse: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistQuestion: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  checklistAnswer: {
    fontSize: 9,
    color: '#444',
  },
  checklistNotes: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 1,
  },
})

interface ChecklistResponseData {
  section: string
  item_index: number
  response: boolean | string | number | null
  notes?: string | null
  question?: string
}

interface FindingData {
  finding_number: number
  severity: string
  finding_description: string
  corrective_action?: string | null
  status: string
  category?: string | null
  location_detail?: string | null
}

export interface AuditPDFProps {
  audit: {
    audit_number?: string
    status: string
    scheduled_date?: string | null
    conducted_date?: string | null
    location?: string | null
    auditor_name?: string | null
    overall_score?: number | null
    overall_rating?: string | null
    summary?: string | null
    critical_findings: number
    major_findings: number
    minor_findings: number
    observations: number
    created_at: string
  }
  auditType?: {
    type_code: string
    type_name: string
    category: string
  } | null
  checklistResponses: ChecklistResponseData[]
  findings: FindingData[]
  company: CompanySettingsForPDF
}

export function AuditPDF({
  audit,
  auditType,
  checklistResponses,
  findings,
  company,
}: AuditPDFProps) {
  const statusLabel = STATUS_LABELS[audit.status] || audit.status
  const ratingLabel = audit.overall_rating ? (RATING_LABELS[audit.overall_rating] || audit.overall_rating) : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle="LAPORAN AUDIT"
          documentNumber={audit.audit_number || '-'}
          documentDate={formatDateForPDF(audit.conducted_date || audit.created_at)}
        />

        {/* General Info */}
        <View style={styles.infoBox}>
          {auditType && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipe Audit:</Text>
              <Text style={styles.infoValue}>{auditType.type_name} ({auditType.type_code})</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
          </View>
          {audit.location && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lokasi:</Text>
              <Text style={styles.infoValue}>{audit.location}</Text>
            </View>
          )}
          {audit.scheduled_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Terjadwal:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(audit.scheduled_date)}</Text>
            </View>
          )}
          {audit.conducted_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Pelaksanaan:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(audit.conducted_date)}</Text>
            </View>
          )}
          {audit.auditor_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Auditor:</Text>
              <Text style={styles.infoValue}>{audit.auditor_name}</Text>
            </View>
          )}
        </View>

        {/* Score & Rating */}
        {audit.overall_score !== null && audit.overall_score !== undefined && (
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>Skor Audit</Text>
            <Text style={styles.scoreValue}>{audit.overall_score}%</Text>
            {ratingLabel && (
              <Text style={styles.ratingBadge}>{ratingLabel}</Text>
            )}
          </View>
        )}

        {/* Finding Summary */}
        <Text style={styles.sectionTitle}>Ringkasan Temuan</Text>
        <View style={styles.findingSummary}>
          <View style={styles.findingCount}>
            <Text style={[styles.findingCountNumber, { color: '#dc2626' }]}>{audit.critical_findings}</Text>
            <Text style={styles.findingCountLabel}>Kritis</Text>
          </View>
          <View style={styles.findingCount}>
            <Text style={[styles.findingCountNumber, { color: '#ea580c' }]}>{audit.major_findings}</Text>
            <Text style={styles.findingCountLabel}>Besar</Text>
          </View>
          <View style={styles.findingCount}>
            <Text style={[styles.findingCountNumber, { color: '#ca8a04' }]}>{audit.minor_findings}</Text>
            <Text style={styles.findingCountLabel}>Kecil</Text>
          </View>
          <View style={styles.findingCount}>
            <Text style={[styles.findingCountNumber, { color: '#2563eb' }]}>{audit.observations}</Text>
            <Text style={styles.findingCountLabel}>Observasi</Text>
          </View>
        </View>

        {/* Checklist Responses */}
        {checklistResponses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Checklist ({checklistResponses.length} item)</Text>
            <View style={{ marginBottom: 16 }}>
              {checklistResponses.map((resp, idx) => (
                <View key={idx} style={styles.checklistResponse}>
                  <Text style={styles.checklistQuestion}>
                    {resp.question || `${resp.section} - Item ${resp.item_index + 1}`}
                  </Text>
                  <Text style={styles.checklistAnswer}>
                    Jawaban: {resp.response === true ? 'Ya' : resp.response === false ? 'Tidak' : String(resp.response ?? '-')}
                  </Text>
                  {resp.notes && (
                    <Text style={styles.checklistNotes}>Catatan: {resp.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Findings Table */}
        {findings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Detail Temuan ({findings.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 25 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 55 }]}>Severity</Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Deskripsi</Text>
                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Tindakan Korektif</Text>
              </View>
              {findings.map((finding, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 25 }]}>{finding.finding_number}</Text>
                  <Text style={[styles.tableCell, { width: 55 }]}>
                    {SEVERITY_LABELS[finding.severity] || finding.severity}
                  </Text>
                  <Text style={[styles.tableCell, { width: 50 }]}>{finding.status}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{finding.finding_description}</Text>
                  <Text style={[styles.tableCell, { width: 120 }]}>{finding.corrective_action || '-'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Summary / Notes */}
        {audit.summary && (
          <>
            <Text style={styles.sectionTitle}>Ringkasan Audit</Text>
            <View style={styles.infoBox}>
              <Text style={{ fontSize: 9 }}>{audit.summary}</Text>
            </View>
          </>
        )}

        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" showPageNumber />
      </Page>
    </Document>
  )
}
