import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { CompanySettingsForPDF } from '../pdf-utils'

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyInfo: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 50,
    objectFit: 'contain',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: '#444',
    marginBottom: 2,
  },
  documentInfo: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  documentDetail: {
    fontSize: 10,
    marginBottom: 3,
  },
})

interface PDFHeaderProps {
  company: CompanySettingsForPDF
  documentTitle: string
  documentNumber: string
  documentDate?: string
  additionalInfo?: Array<{ label: string; value: string }>
}

export function PDFHeader({
  company,
  documentTitle,
  documentNumber,
  documentDate,
  additionalInfo = [],
}: PDFHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.companyInfo}>
        {company.logo_url && (
          /* eslint-disable-next-line jsx-a11y/alt-text */
          <Image src={company.logo_url} style={styles.logo} />
        )}
        <Text style={styles.companyName}>{company.company_name}</Text>
        {company.company_address && (
          <Text style={styles.companyDetail}>{company.company_address}</Text>
        )}
        {company.company_phone && (
          <Text style={styles.companyDetail}>Tel: {company.company_phone}</Text>
        )}
        {company.company_email && (
          <Text style={styles.companyDetail}>Email: {company.company_email}</Text>
        )}
        {company.company_tax_id && (
          <Text style={styles.companyDetail}>NPWP: {company.company_tax_id}</Text>
        )}
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentTitle}>{documentTitle}</Text>
        <Text style={styles.documentDetail}>No: {documentNumber}</Text>
        {documentDate && (
          <Text style={styles.documentDetail}>Date: {documentDate}</Text>
        )}
        {additionalInfo.map((info, index) => (
          <Text key={index} style={styles.documentDetail}>
            {info.label}: {info.value}
          </Text>
        ))}
      </View>
    </View>
  )
}
