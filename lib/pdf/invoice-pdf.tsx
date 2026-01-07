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
  billTo: {
    marginBottom: 20,
  },
  billToLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  billToName: {
    fontSize: 11,
    marginBottom: 3,
  },
  billToAddress: {
    fontSize: 9,
    color: '#444',
  },
  reference: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  referenceRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  referenceLabel: {
    width: 120,
    fontSize: 9,
    color: '#666',
  },
  referenceValue: {
    flex: 1,
    fontSize: 9,
  },
  table: {
    marginTop: 15,
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
  colDescription: {
    width: '40%',
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colUnit: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '15%',
    textAlign: 'right',
  },
  colAmount: {
    width: '15%',
    textAlign: 'right',
  },
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 250,
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
    width: 250,
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
  bankDetails: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  bankTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bankLabel: {
    width: 100,
    fontSize: 9,
    color: '#666',
  },
  bankValue: {
    flex: 1,
    fontSize: 9,
  },
})

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit?: string
  unit_price: number
  subtotal: number
}

export interface InvoicePDFProps {
  invoice: {
    invoice_number: string
    invoice_date: string
    due_date: string
    subtotal: number
    tax_amount: number
    total_amount: number
    term_description?: string
    notes?: string
  }
  customer: {
    name: string
    address?: string
  }
  jobOrder: {
    jo_number: string
  }
  lineItems: InvoiceLineItem[]
  company: CompanySettingsForPDF
}

export function InvoicePDF({
  invoice,
  customer,
  jobOrder,
  lineItems,
  company,
}: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          company={company}
          documentTitle="INVOICE"
          documentNumber={invoice.invoice_number}
          documentDate={formatDateForPDF(invoice.invoice_date)}
          additionalInfo={[
            { label: 'Due Date', value: formatDateForPDF(invoice.due_date) },
          ]}
        />

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Bill To:</Text>
          <Text style={styles.billToName}>{customer.name}</Text>
          {customer.address && (
            <Text style={styles.billToAddress}>{customer.address}</Text>
          )}
        </View>

        {/* Reference */}
        <View style={styles.reference}>
          <View style={styles.referenceRow}>
            <Text style={styles.referenceLabel}>JO Reference:</Text>
            <Text style={styles.referenceValue}>{jobOrder.jo_number}</Text>
          </View>
          {invoice.term_description && (
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Term:</Text>
              <Text style={styles.referenceValue}>{invoice.term_description}</Text>
            </View>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {lineItems.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit || '-'}</Text>
              <Text style={styles.colPrice}>{formatCurrencyForPDF(item.unit_price)}</Text>
              <Text style={styles.colAmount}>{formatCurrencyForPDF(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT (11%):</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(invoice.tax_amount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrencyForPDF(invoice.total_amount)}</Text>
          </View>
        </View>

        {/* Bank Details */}
        {(company.bank_name || company.bank_account) && (
          <View style={styles.bankDetails}>
            <Text style={styles.bankTitle}>Payment Details:</Text>
            {company.bank_name && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank:</Text>
                <Text style={styles.bankValue}>{company.bank_name}</Text>
              </View>
            )}
            {company.bank_account && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account:</Text>
                <Text style={styles.bankValue}>{company.bank_account}</Text>
              </View>
            )}
            {company.bank_account_name && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Name:</Text>
                <Text style={styles.bankValue}>{company.bank_account_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <PDFFooter message="Thank you for your business" />
      </Page>
    </Document>
  )
}
