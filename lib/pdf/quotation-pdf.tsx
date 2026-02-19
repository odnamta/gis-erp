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
  clientSection: {
    marginBottom: 20,
  },
  clientLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clientName: {
    fontSize: 11,
    marginBottom: 3,
  },
  clientDetail: {
    fontSize: 9,
    color: '#444',
    marginBottom: 2,
  },
  infoSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
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
  colCategory: {
    width: '20%',
  },
  colDescription: {
    width: '30%',
  },
  colQty: {
    width: '10%',
    textAlign: 'center',
  },
  colUnit: {
    width: '10%',
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
  costColCategory: {
    width: '25%',
  },
  costColDescription: {
    width: '40%',
  },
  costColVendor: {
    width: '15%',
  },
  costColAmount: {
    width: '20%',
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
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#444',
  },
  signatureArea: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 9,
    marginBottom: 40,
  },
  signatureLine: {
    width: '80%',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 9,
  },
})

export interface RevenueLineItem {
  category: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number
  subtotal: number | null
}

export interface CostLineItem {
  category: string
  description: string
  estimated_amount: number
  vendor_name: string | null
}

export interface QuotationPDFProps {
  quotation: {
    quotation_number: string
    title: string
    created_at: string
    rfq_number: string | null
    rfq_date: string | null
    rfq_deadline: string | null
    origin: string
    destination: string
    commodity: string | null
    cargo_weight_kg: number | null
    cargo_length_m: number | null
    cargo_width_m: number | null
    cargo_height_m: number | null
    estimated_shipments: number | null
    total_revenue: number | null
    total_cost: number | null
    gross_profit: number | null
    profit_margin: number | null
    notes: string | null
    status: string | null
  }
  customer: {
    name: string
    email?: string
    phone?: string
    address?: string
  }
  revenueItems: RevenueLineItem[]
  costItems: CostLineItem[]
  company: CompanySettingsForPDF
}

export function QuotationPDF({
  quotation,
  customer,
  revenueItems,
  costItems,
  company,
}: QuotationPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          company={company}
          documentTitle="QUOTATION"
          documentNumber={quotation.quotation_number}
          documentDate={formatDateForPDF(quotation.created_at)}
          additionalInfo={[
            ...(quotation.rfq_number ? [{ label: 'RFQ Ref', value: quotation.rfq_number }] : []),
            ...(quotation.rfq_deadline ? [{ label: 'RFQ Deadline', value: formatDateForPDF(quotation.rfq_deadline) }] : []),
          ]}
        />

        {/* Client Info */}
        <View style={styles.clientSection}>
          <Text style={styles.clientLabel}>Kepada / To:</Text>
          <Text style={styles.clientName}>{customer.name}</Text>
          {customer.address && (
            <Text style={styles.clientDetail}>{customer.address}</Text>
          )}
          {customer.phone && (
            <Text style={styles.clientDetail}>Tel: {customer.phone}</Text>
          )}
          {customer.email && (
            <Text style={styles.clientDetail}>Email: {customer.email}</Text>
          )}
        </View>

        {/* Quotation Info */}
        <View style={styles.infoSection}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 8 }}>
            {quotation.title}
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Asal / Origin:</Text>
            <Text style={styles.infoValue}>{quotation.origin}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tujuan / Destination:</Text>
            <Text style={styles.infoValue}>{quotation.destination}</Text>
          </View>
          {quotation.commodity && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Komoditas / Commodity:</Text>
              <Text style={styles.infoValue}>{quotation.commodity}</Text>
            </View>
          )}
          {quotation.cargo_weight_kg && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Berat / Weight:</Text>
              <Text style={styles.infoValue}>{quotation.cargo_weight_kg.toLocaleString('id-ID')} kg</Text>
            </View>
          )}
          {(quotation.cargo_length_m || quotation.cargo_width_m || quotation.cargo_height_m) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dimensi / Dimensions:</Text>
              <Text style={styles.infoValue}>
                {quotation.cargo_length_m || '-'} x {quotation.cargo_width_m || '-'} x {quotation.cargo_height_m || '-'} m
              </Text>
            </View>
          )}
          {quotation.estimated_shipments && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Est. Shipments:</Text>
              <Text style={styles.infoValue}>{quotation.estimated_shipments}</Text>
            </View>
          )}
        </View>

        {/* Revenue Items Table */}
        {revenueItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Rincian Biaya / Cost Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colCategory}>Category</Text>
                <Text style={styles.colDescription}>Description</Text>
                <Text style={styles.colQty}>Qty</Text>
                <Text style={styles.colUnit}>Unit</Text>
                <Text style={styles.colPrice}>Unit Price</Text>
                <Text style={styles.colAmount}>Amount</Text>
              </View>
              {revenueItems.map((item, index) => (
                <View
                  key={index}
                  style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                >
                  <Text style={styles.colCategory}>{item.category}</Text>
                  <Text style={styles.colDescription}>{item.description}</Text>
                  <Text style={styles.colQty}>{item.quantity || '-'}</Text>
                  <Text style={styles.colUnit}>{item.unit || '-'}</Text>
                  <Text style={styles.colPrice}>{formatCurrencyForPDF(item.unit_price)}</Text>
                  <Text style={styles.colAmount}>{formatCurrencyForPDF(item.subtotal || item.unit_price * (item.quantity || 1))}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Revenue:</Text>
            <Text style={styles.totalValue}>{formatCurrencyForPDF(quotation.total_revenue || 0)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL PENAWARAN:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrencyForPDF(quotation.total_revenue || 0)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quotation.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Catatan / Notes:</Text>
            <Text style={styles.notesText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Signature Area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Hormat kami,</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{company.company_name}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Diterima oleh,</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{customer.name}</Text>
          </View>
        </View>

        {/* Footer */}
        <PDFFooter message="Quotation ini berlaku selama 30 hari sejak tanggal terbit" />
      </Page>
    </Document>
  )
}
