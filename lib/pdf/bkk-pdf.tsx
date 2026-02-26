import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatCurrencyForPDF, formatDateForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  released: 'Dicairkan',
  settled: 'Diselesaikan',
  cancelled: 'Dibatalkan',
}

const RELEASE_METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer Bank',
  check: 'Cek/Giro',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  infoBox: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 130,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },
  amountSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  timelineLabel: {
    width: 130,
    fontSize: 9,
    color: '#666',
  },
  timelineValue: {
    flex: 1,
    fontSize: 9,
  },
  timelineExtra: {
    fontSize: 9,
    color: '#444',
    marginLeft: 130,
    marginBottom: 6,
  },
  settlementSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 3,
  },
  settlementLabel: {
    fontSize: 10,
  },
  settlementValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  settlementReturnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 6,
    marginTop: 4,
  },
  settlementReturnLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  settlementReturnValue: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },
})

export interface BKKPDFProps {
  bkk: {
    bkk_number: string
    status: string
    purpose: string
    amount_requested: number
    budget_category: string | null
    notes: string | null
    release_method: string | null
    release_reference: string | null
    amount_spent: number | null
    amount_returned: number | null
    requested_at: string
    approved_at: string | null
    released_at: string | null
    settled_at: string | null
  }
  jobOrder: { jo_number: string }
  requester: { full_name: string } | null
  approver: { full_name: string } | null
  releaser: { full_name: string } | null
  settler: { full_name: string } | null
  costItem: { category: string; description: string; estimated_amount: number } | null
  company: CompanySettingsForPDF
}

export function BKKPDF({
  bkk,
  jobOrder,
  requester,
  approver,
  releaser,
  settler,
  costItem,
  company,
}: BKKPDFProps) {
  const statusLabel = STATUS_LABELS[bkk.status] || bkk.status
  const releaseMethodLabel = bkk.release_method
    ? RELEASE_METHOD_LABELS[bkk.release_method] || bkk.release_method
    : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          company={company}
          documentTitle="BUKTI KAS KELUAR"
          documentNumber={bkk.bkk_number}
          documentDate={formatDateForPDF(bkk.requested_at)}
        />

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>JO Reference:</Text>
            <Text style={styles.infoValue}>{jobOrder.jo_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tujuan:</Text>
            <Text style={styles.infoValue}>{bkk.purpose}</Text>
          </View>
          {bkk.budget_category && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kategori Anggaran:</Text>
              <Text style={styles.infoValue}>{bkk.budget_category}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
          </View>
          {bkk.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Catatan:</Text>
              <Text style={styles.infoValue}>{bkk.notes}</Text>
            </View>
          )}
        </View>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Jumlah Diminta</Text>
          <Text style={styles.amountValue}>{formatCurrencyForPDF(bkk.amount_requested)}</Text>
        </View>

        {/* Budget Reference */}
        {costItem && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Referensi Anggaran</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kategori:</Text>
              <Text style={styles.infoValue}>{costItem.category}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deskripsi:</Text>
              <Text style={styles.infoValue}>{costItem.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimasi Anggaran:</Text>
              <Text style={styles.infoValue}>{formatCurrencyForPDF(costItem.estimated_amount)}</Text>
            </View>
          </View>
        )}

        {/* Approval Timeline */}
        <Text style={styles.sectionTitle}>Riwayat Persetujuan</Text>
        <View style={{ marginBottom: 20 }}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Diminta oleh:</Text>
            <Text style={styles.timelineValue}>
              {requester?.full_name || '-'} — {formatDateForPDF(bkk.requested_at)}
            </Text>
          </View>

          {bkk.approved_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Disetujui oleh:</Text>
              <Text style={styles.timelineValue}>
                {approver?.full_name || '-'} — {formatDateForPDF(bkk.approved_at)}
              </Text>
            </View>
          )}

          {bkk.released_at && (
            <>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Dicairkan oleh:</Text>
                <Text style={styles.timelineValue}>
                  {releaser?.full_name || '-'} — {formatDateForPDF(bkk.released_at)}
                </Text>
              </View>
              {releaseMethodLabel && (
                <Text style={styles.timelineExtra}>
                  Metode: {releaseMethodLabel}
                  {bkk.release_reference ? ` (${bkk.release_reference})` : ''}
                </Text>
              )}
            </>
          )}

          {bkk.settled_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Diselesaikan oleh:</Text>
              <Text style={styles.timelineValue}>
                {settler?.full_name || '-'} — {formatDateForPDF(bkk.settled_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Settlement Section */}
        {bkk.status === 'settled' && (
          <View style={styles.settlementSection}>
            <Text style={styles.sectionTitle}>Penyelesaian</Text>
            <View style={styles.settlementRow}>
              <Text style={styles.settlementLabel}>Jumlah Diminta:</Text>
              <Text style={styles.settlementValue}>{formatCurrencyForPDF(bkk.amount_requested)}</Text>
            </View>
            <View style={styles.settlementRow}>
              <Text style={styles.settlementLabel}>Jumlah Dibelanjakan:</Text>
              <Text style={styles.settlementValue}>{formatCurrencyForPDF(bkk.amount_spent ?? 0)}</Text>
            </View>
            <View style={styles.settlementReturnRow}>
              <Text style={styles.settlementReturnLabel}>Jumlah Dikembalikan:</Text>
              <Text style={styles.settlementReturnValue}>{formatCurrencyForPDF(bkk.amount_returned ?? 0)}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" />
      </Page>
    </Document>
  )
}
