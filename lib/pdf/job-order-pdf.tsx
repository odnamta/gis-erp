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
    marginBottom: 8,
    marginTop: 15,
  },
  table: {
    marginTop: 5,
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
  colDescription: {
    width: '40%',
  },
  colQty: {
    width: '20%',
    textAlign: 'center',
  },
  colUnitPrice: {
    width: '20%',
    textAlign: 'right',
  },
  colSubtotal: {
    width: '20%',
    textAlign: 'right',
  },
  // Cost table columns
  colCategory: {
    width: '25%',
  },
  colCostDescription: {
    width: '30%',
  },
  colEstimated: {
    width: '15%',
    textAlign: 'right',
  },
  colActual: {
    width: '15%',
    textAlign: 'right',
  },
  colVariance: {
    width: '15%',
    textAlign: 'right',
  },
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
  profitPositive: {
    color: '#16a34a',
  },
  profitNegative: {
    color: '#dc2626',
  },
})

export interface JobOrderPDFProps {
  jobOrder: {
    jo_number: string
    status: string
    description: string | null
    final_revenue: number | null
    final_cost: number | null
    completed_at: string | null
    created_at: string | null
  }
  customer: { name: string }
  project: { name: string }
  pjo: {
    pjo_number: string
    commodity: string | null
    quantity: number | null
    quantity_unit: string | null
    pol: string | null
    pod: string | null
    etd: string | null
    eta: string | null
    carrier_type: string | null
  } | null
  revenueItems: Array<{
    description: string
    quantity: number | null
    unit_price: number
    subtotal: number | null
  }>
  costItems: Array<{
    category: string
    description: string
    estimated_amount: number
    actual_amount: number | null
  }>
  company: CompanySettingsForPDF
}

export function JobOrderPDF({
  jobOrder,
  customer,
  project,
  pjo,
  revenueItems,
  costItems,
  company,
}: JobOrderPDFProps) {
  const finalRevenue = jobOrder.final_revenue || 0
  const finalCost = jobOrder.final_cost || 0
  const profit = finalRevenue - finalCost
  const margin = finalRevenue > 0 ? (profit / finalRevenue) * 100 : 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          company={company}
          documentTitle="JOB ORDER"
          documentNumber={jobOrder.jo_number}
          documentDate={formatDateForPDF(jobOrder.created_at)}
          additionalInfo={[
            { label: 'Status', value: jobOrder.status.toUpperCase() },
          ]}
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
          {pjo && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Source PJO:</Text>
                <Text style={styles.infoValue}>{pjo.pjo_number}</Text>
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
              {(pjo.etd || pjo.eta) && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ETD / ETA:</Text>
                  <Text style={styles.infoValue}>
                    {formatDateForPDF(pjo.etd)} / {formatDateForPDF(pjo.eta)}
                  </Text>
                </View>
              )}
              {pjo.carrier_type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Carrier:</Text>
                  <Text style={styles.infoValue}>{pjo.carrier_type}</Text>
                </View>
              )}
            </>
          )}
          {jobOrder.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{jobOrder.description}</Text>
            </View>
          )}
          {jobOrder.completed_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(jobOrder.completed_at)}</Text>
            </View>
          )}
        </View>

        {/* Revenue Items Table */}
        {revenueItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Revenue Items</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colDescription}>Description</Text>
                <Text style={styles.colQty}>Qty</Text>
                <Text style={styles.colUnitPrice}>Unit Price</Text>
                <Text style={styles.colSubtotal}>Subtotal</Text>
              </View>
              {revenueItems.map((item, index) => (
                <View
                  key={index}
                  style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                >
                  <Text style={styles.colDescription}>{item.description}</Text>
                  <Text style={styles.colQty}>{item.quantity ?? '-'}</Text>
                  <Text style={styles.colUnitPrice}>{formatCurrencyForPDF(item.unit_price)}</Text>
                  <Text style={styles.colSubtotal}>
                    {formatCurrencyForPDF(item.subtotal ?? (item.quantity || 1) * item.unit_price)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Cost Items Table */}
        {costItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cost Items</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colCategory}>Category</Text>
                <Text style={styles.colCostDescription}>Description</Text>
                <Text style={styles.colEstimated}>Estimated</Text>
                <Text style={styles.colActual}>Actual</Text>
                <Text style={styles.colVariance}>Variance</Text>
              </View>
              {costItems.map((item, index) => {
                const actual = item.actual_amount ?? 0
                const variance = actual - item.estimated_amount
                return (
                  <View
                    key={index}
                    style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                  >
                    <Text style={styles.colCategory}>{item.category}</Text>
                    <Text style={styles.colCostDescription}>{item.description}</Text>
                    <Text style={styles.colEstimated}>{formatCurrencyForPDF(item.estimated_amount)}</Text>
                    <Text style={styles.colActual}>
                      {item.actual_amount !== null ? formatCurrencyForPDF(item.actual_amount) : '-'}
                    </Text>
                    <Text style={styles.colVariance}>
                      {item.actual_amount !== null ? formatCurrencyForPDF(variance) : '-'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Summary */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final Revenue:</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(finalRevenue)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final Cost:</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(finalCost)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Profit:</Text>
            <Text style={[styles.grandTotalValue, profit >= 0 ? styles.profitPositive : styles.profitNegative]}>
              {formatCurrencyForPDF(profit)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Margin:</Text>
            <Text style={[styles.totalValue, profit >= 0 ? styles.profitPositive : styles.profitNegative]}>
              {margin.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Footer */}
        <PDFFooter message="Final document — amounts are locked" />
      </Page>
    </Document>
  )
}
