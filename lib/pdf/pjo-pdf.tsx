import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatCurrencyForPDF, formatDateForPDF } from './pdf-utils'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  infoBox: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 8,
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  // Revenue table columns
  colRevDescription: {
    width: '40%',
  },
  colRevQty: {
    width: '15%',
    textAlign: 'center',
  },
  colRevUnitPrice: {
    width: '22%',
    textAlign: 'right',
  },
  colRevSubtotal: {
    width: '23%',
    textAlign: 'right',
  },
  // Cost table columns
  colCostCategory: {
    width: '25%',
  },
  colCostDescription: {
    width: '45%',
  },
  colCostAmount: {
    width: '30%',
    textAlign: 'right',
  },
  // Summary totals
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 280,
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: 280,
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 8,
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  marginRow: {
    flexDirection: 'row',
    width: 280,
    justifyContent: 'space-between',
    marginTop: 5,
    paddingVertical: 3,
  },
  marginLabel: {
    fontSize: 10,
    color: '#444',
  },
  marginValue: {
    fontSize: 10,
    textAlign: 'right',
    color: '#444',
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#444',
  },
})

export interface PJOPDFProps {
  pjo: {
    pjo_number: string
    status: string
    commodity: string | null
    quantity: number | null
    quantity_unit: string | null
    pol: string | null
    pod: string | null
    etd: string | null
    eta: string | null
    carrier_type: string | null
    total_revenue: number | null
    total_expenses: number | null
    notes: string | null
    created_at: string | null
  }
  customer: { name: string }
  project: { name: string }
  revenueItems: Array<{
    description: string
    quantity: number | null
    unit_price: number
    subtotal: number | null
    notes: string | null
  }>
  costItems: Array<{
    category: string
    description: string
    estimated_amount: number
  }>
  company: CompanySettingsForPDF
}

export function PJOPDF({
  pjo,
  customer,
  project,
  revenueItems,
  costItems,
  company,
}: PJOPDFProps) {
  const totalRevenue = pjo.total_revenue || 0
  const totalCost = pjo.total_expenses || 0
  const margin = totalRevenue - totalCost
  const marginPercent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          company={company}
          documentTitle="PROFORMA JOB ORDER"
          documentNumber={pjo.pjo_number}
          documentDate={formatDateForPDF(pjo.created_at)}
        />

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer:</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project:</Text>
            <Text style={styles.infoValue}>{project.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{pjo.status}</Text>
          </View>
          {pjo.commodity && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Commodity:</Text>
              <Text style={styles.infoValue}>{pjo.commodity}</Text>
            </View>
          )}
          {(pjo.quantity || pjo.quantity_unit) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quantity:</Text>
              <Text style={styles.infoValue}>
                {pjo.quantity ?? '-'} {pjo.quantity_unit ?? ''}
              </Text>
            </View>
          )}
          {(pjo.pol || pjo.pod) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Route:</Text>
              <Text style={styles.infoValue}>
                {pjo.pol || '-'} → {pjo.pod || '-'}
              </Text>
            </View>
          )}
          {pjo.etd && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ETD:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(pjo.etd)}</Text>
            </View>
          )}
          {pjo.eta && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ETA:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(pjo.eta)}</Text>
            </View>
          )}
          {pjo.carrier_type && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Carrier:</Text>
              <Text style={styles.infoValue}>{pjo.carrier_type}</Text>
            </View>
          )}
        </View>

        {/* Revenue Items Table */}
        <Text style={styles.sectionTitle}>Revenue Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colRevDescription}>Description</Text>
            <Text style={styles.colRevQty}>Qty</Text>
            <Text style={styles.colRevUnitPrice}>Unit Price</Text>
            <Text style={styles.colRevSubtotal}>Subtotal</Text>
          </View>
          {revenueItems.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={styles.colRevDescription}>{item.description}</Text>
              <Text style={styles.colRevQty}>{item.quantity ?? '-'}</Text>
              <Text style={styles.colRevUnitPrice}>{formatCurrencyForPDF(item.unit_price)}</Text>
              <Text style={styles.colRevSubtotal}>
                {formatCurrencyForPDF(item.subtotal ?? item.unit_price * (item.quantity ?? 1))}
              </Text>
            </View>
          ))}
        </View>

        {/* Cost Items Table */}
        <Text style={styles.sectionTitle}>Cost Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCostCategory}>Category</Text>
            <Text style={styles.colCostDescription}>Description</Text>
            <Text style={styles.colCostAmount}>Est. Amount</Text>
          </View>
          {costItems.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={styles.colCostCategory}>{item.category}</Text>
              <Text style={styles.colCostDescription}>{item.description}</Text>
              <Text style={styles.colCostAmount}>{formatCurrencyForPDF(item.estimated_amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Revenue:</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(totalRevenue)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Cost:</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(totalCost)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Est. Margin:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrencyForPDF(margin)}</Text>
          </View>
          <View style={styles.marginRow}>
            <Text style={styles.marginLabel}>Margin %:</Text>
            <Text style={styles.marginValue}>{marginPercent.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Notes */}
        {pjo.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text style={styles.notesText}>{pjo.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <PDFFooter message="This is a proforma document and subject to change" />
      </Page>
    </Document>
  )
}
