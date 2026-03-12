import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatCurrencyForPDF, formatDateForPDF } from './pdf-utils'

const _STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Diajukan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoColumn: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 100,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },
  // Table styles
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  colNo: { width: '6%', fontSize: 9, textAlign: 'center' },
  colDesc: { width: '38%', fontSize: 9 },
  colQty: { width: '10%', fontSize: 9, textAlign: 'right' },
  colUnit: { width: '10%', fontSize: 9, textAlign: 'center' },
  colPrice: { width: '18%', fontSize: 9, textAlign: 'right' },
  colTotal: { width: '18%', fontSize: 9, textAlign: 'right' },
  headerText: {
    fontWeight: 'bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  // Totals
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  totalsRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: '#666',
  },
  totalsValue: {
    fontSize: 9,
    textAlign: 'right',
  },
  totalsBold: {
    fontWeight: 'bold',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 4,
    marginTop: 2,
  },
  // Notes
  notesSection: {
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#666',
  },
  // Signatures
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '30%',
    alignItems: 'center',
  },
  signatureTitle: {
    fontSize: 9,
    color: '#666',
    marginBottom: 50,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: '100%',
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 9,
  },
})

export interface POPDFProps {
  po: {
    po_number: string
    status: string
    order_date: string
    delivery_date: string | null
    delivery_address: string | null
    payment_terms: string | null
    notes: string | null
    subtotal: number
    tax_amount: number
    total_amount: number
  }
  vendor: {
    name: string
    contact_person: string | null
  } | null
  lineItems: {
    item_description: string
    quantity: number
    unit: string
    unit_price: number
    total_price: number
  }[]
  approver: { full_name: string } | null
  company: CompanySettingsForPDF
}

export function POPDF({ po, vendor, lineItems, approver, company }: POPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle="PURCHASE ORDER"
          documentNumber={po.po_number}
        />

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendor</Text>
              <Text style={styles.infoValue}>: {vendor?.name || '-'}</Text>
            </View>
            {vendor?.contact_person && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact Person</Text>
                <Text style={styles.infoValue}>: {vendor.contact_person}</Text>
              </View>
            )}
            {po.delivery_address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Alamat Kirim</Text>
                <Text style={styles.infoValue}>: {po.delivery_address}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Order</Text>
              <Text style={styles.infoValue}>: {formatDateForPDF(po.order_date)}</Text>
            </View>
            {po.delivery_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tanggal Kirim</Text>
                <Text style={styles.infoValue}>: {formatDateForPDF(po.delivery_date)}</Text>
              </View>
            )}
            {po.payment_terms && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pembayaran</Text>
                <Text style={styles.infoValue}>: {po.payment_terms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.headerText]}>No</Text>
            <Text style={[styles.colDesc, styles.headerText]}>Deskripsi</Text>
            <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
            <Text style={[styles.colUnit, styles.headerText]}>Satuan</Text>
            <Text style={[styles.colPrice, styles.headerText]}>Harga Satuan</Text>
            <Text style={[styles.colTotal, styles.headerText]}>Total</Text>
          </View>
          {lineItems.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.colNo}>{idx + 1}</Text>
              <Text style={styles.colDesc}>{item.item_description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>{formatCurrencyForPDF(item.unit_price)}</Text>
              <Text style={styles.colTotal}>{formatCurrencyForPDF(item.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrencyForPDF(po.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>PPN 11%</Text>
            <Text style={styles.totalsValue}>{formatCurrencyForPDF(po.tax_amount)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.totalsBold]}>
            <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Total</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 10, textAlign: 'right' }}>
              {formatCurrencyForPDF(po.total_amount)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {po.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Catatan:</Text>
            <Text style={styles.notesText}>{po.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Dibuat oleh</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Administration</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Disetujui oleh</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{approver?.full_name || '________________'}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Diterima oleh</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{vendor?.name || '________________'}</Text>
          </View>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  )
}
