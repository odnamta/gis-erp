import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatDateForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draf',
  pending_review: 'Menunggu Review',
  approved: 'Disetujui',
  expired: 'Kadaluarsa',
  superseded: 'Digantikan',
  archived: 'Diarsipkan',
}

const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  extreme: 'Ekstrem',
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
  contentSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  contentText: {
    fontSize: 9,
    lineHeight: 1.5,
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
  acknowledgmentSummary: {
    padding: 12,
    backgroundColor: '#f0f4ff',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acknowledgmentStat: {
    alignItems: 'center',
  },
  acknowledgmentNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  acknowledgmentLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  approvalSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
  },
})

interface JSAHazardData {
  step_number: number
  work_step: string
  hazards: string
  consequences?: string | null
  risk_level?: string | null
  control_measures: string
  responsible?: string | null
}

export interface SafetyDocumentPDFProps {
  document: {
    document_number: string
    title: string
    description?: string | null
    version: string
    revision_number: number
    content?: string | null
    status: string
    effective_date: string
    expiry_date?: string | null
    applicable_locations: string[]
    applicable_departments: string[]
    applicable_job_types: string[]
    requires_acknowledgment: boolean
    created_at: string
  }
  category?: {
    category_code: string
    category_name: string
  } | null
  preparedBy?: string | null
  reviewedBy?: string | null
  approvedBy?: string | null
  preparedAt?: string | null
  reviewedAt?: string | null
  approvedAt?: string | null
  hazards: JSAHazardData[]
  acknowledgmentStats: {
    total_required: number
    total_acknowledged: number
    completion_rate: number
  }
  company: CompanySettingsForPDF
}

export function SafetyDocumentPDF({
  document,
  category,
  preparedBy,
  reviewedBy,
  approvedBy,
  preparedAt,
  reviewedAt,
  approvedAt,
  hazards,
  acknowledgmentStats,
  company,
}: SafetyDocumentPDFProps) {
  const statusLabel = STATUS_LABELS[document.status] || document.status
  const isJSA = category?.category_code?.toLowerCase() === 'jsa'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle={isJSA ? 'JOB SAFETY ANALYSIS' : 'DOKUMEN KESELAMATAN'}
          documentNumber={document.document_number}
          documentDate={formatDateForPDF(document.effective_date)}
        />

        {/* Document Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Judul:</Text>
            <Text style={styles.infoValue}>{document.title}</Text>
          </View>
          {category && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kategori:</Text>
              <Text style={styles.infoValue}>{category.category_name} ({category.category_code})</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versi:</Text>
            <Text style={styles.infoValue}>{document.version} (Rev. {document.revision_number})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal Efektif:</Text>
            <Text style={styles.infoValue}>{formatDateForPDF(document.effective_date)}</Text>
          </View>
          {document.expiry_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Kadaluarsa:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(document.expiry_date)}</Text>
            </View>
          )}
          {document.applicable_locations.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lokasi Berlaku:</Text>
              <Text style={styles.infoValue}>{document.applicable_locations.join(', ')}</Text>
            </View>
          )}
          {document.applicable_departments.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Departemen:</Text>
              <Text style={styles.infoValue}>{document.applicable_departments.join(', ')}</Text>
            </View>
          )}
          {document.applicable_job_types.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipe Pekerjaan:</Text>
              <Text style={styles.infoValue}>{document.applicable_job_types.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {document.description && (
          <>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <View style={styles.contentSection}>
              <Text style={styles.contentText}>{document.description}</Text>
            </View>
          </>
        )}

        {/* Content */}
        {document.content && (
          <>
            <Text style={styles.sectionTitle}>Isi Dokumen</Text>
            <View style={styles.contentSection}>
              <Text style={styles.contentText}>{document.content}</Text>
            </View>
          </>
        )}

        {/* JSA Hazards Table */}
        {isJSA && hazards.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Analisis Bahaya ({hazards.length} langkah)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 25 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 90 }]}>Langkah Kerja</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Bahaya</Text>
                <Text style={[styles.tableHeaderCell, { width: 60 }]}>Konsekuensi</Text>
                <Text style={[styles.tableHeaderCell, { width: 45 }]}>Risiko</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pengendalian</Text>
              </View>
              {hazards.map((hazard, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 25 }]}>{hazard.step_number}</Text>
                  <Text style={[styles.tableCell, { width: 90 }]}>{hazard.work_step}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{hazard.hazards}</Text>
                  <Text style={[styles.tableCell, { width: 60 }]}>{hazard.consequences || '-'}</Text>
                  <Text style={[styles.tableCell, { width: 45 }]}>
                    {hazard.risk_level ? (RISK_LEVEL_LABELS[hazard.risk_level] || hazard.risk_level) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{hazard.control_measures}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Approval Info */}
        {(preparedBy || reviewedBy || approvedBy) && (
          <>
            <Text style={styles.sectionTitle}>Persetujuan</Text>
            <View style={styles.approvalSection}>
              {preparedBy && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Disiapkan oleh:</Text>
                  <Text style={styles.infoValue}>
                    {preparedBy}
                    {preparedAt ? ` — ${formatDateForPDF(preparedAt)}` : ''}
                  </Text>
                </View>
              )}
              {reviewedBy && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Direview oleh:</Text>
                  <Text style={styles.infoValue}>
                    {reviewedBy}
                    {reviewedAt ? ` — ${formatDateForPDF(reviewedAt)}` : ''}
                  </Text>
                </View>
              )}
              {approvedBy && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Disetujui oleh:</Text>
                  <Text style={styles.infoValue}>
                    {approvedBy}
                    {approvedAt ? ` — ${formatDateForPDF(approvedAt)}` : ''}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Acknowledgment Summary */}
        {document.requires_acknowledgment && (
          <>
            <Text style={styles.sectionTitle}>Ringkasan Pengakuan</Text>
            <View style={styles.acknowledgmentSummary}>
              <View style={styles.acknowledgmentStat}>
                <Text style={styles.acknowledgmentNumber}>{acknowledgmentStats.total_required}</Text>
                <Text style={styles.acknowledgmentLabel}>Total Wajib</Text>
              </View>
              <View style={styles.acknowledgmentStat}>
                <Text style={[styles.acknowledgmentNumber, { color: '#16a34a' }]}>
                  {acknowledgmentStats.total_acknowledged}
                </Text>
                <Text style={styles.acknowledgmentLabel}>Sudah Mengakui</Text>
              </View>
              <View style={styles.acknowledgmentStat}>
                <Text style={[styles.acknowledgmentNumber, { color: '#2563eb' }]}>
                  {acknowledgmentStats.completion_rate}%
                </Text>
                <Text style={styles.acknowledgmentLabel}>Tingkat Penyelesaian</Text>
              </View>
            </View>
          </>
        )}

        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" showPageNumber />
      </Page>
    </Document>
  )
}
