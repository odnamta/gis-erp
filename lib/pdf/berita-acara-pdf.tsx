import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { SignatureBlock } from './components/signature-block'
import { CompanySettingsForPDF, formatDateForPDF } from './pdf-utils'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    padding: 6,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
  },
  fullWidthItem: {
    width: '100%',
    marginBottom: 8,
  },
  descriptionBox: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  conditionContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  conditionBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginRight: 10,
  },
  conditionLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  conditionValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  conditionGood: {
    color: '#16a34a',
  },
  conditionMinor: {
    color: '#ca8a04',
  },
  conditionMajor: {
    color: '#dc2626',
  },
  conditionNotesBox: {
    flex: 2,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  photoGallery: {
    marginTop: 15,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: '30%',
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
    borderRadius: 4,
  },
  notesSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
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

const CONDITION_LABELS: Record<string, string> = {
  good: 'Good',
  minor_damage: 'Minor Damage',
  major_damage: 'Major Damage',
}

export interface BeritaAcaraPDFProps {
  beritaAcara: {
    ba_number: string
    handover_date: string
    location?: string
    work_description?: string
    cargo_condition?: string
    condition_notes?: string
    company_representative?: string
    client_representative?: string
    photo_urls?: string[]
    notes?: string
  }
  jobOrder: {
    jo_number: string
  }
  customer: {
    name: string
  }
  company: CompanySettingsForPDF
}

export function BeritaAcaraPDF({
  beritaAcara,
  jobOrder,
  customer,
  company,
}: BeritaAcaraPDFProps) {
  const getConditionStyle = (condition?: string) => {
    switch (condition) {
      case 'good':
        return styles.conditionGood
      case 'minor_damage':
        return styles.conditionMinor
      case 'major_damage':
        return styles.conditionMajor
      default:
        return {}
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          company={company}
          documentTitle="BERITA ACARA"
          documentNumber={beritaAcara.ba_number}
          documentDate={formatDateForPDF(beritaAcara.handover_date)}
          additionalInfo={[
            { label: 'JO Ref', value: jobOrder.jo_number },
          ]}
        />

        {/* Handover Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Handover Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>{customer.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{beritaAcara.location || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              {beritaAcara.work_description || 'No description provided'}
            </Text>
          </View>
        </View>

        {/* Cargo Condition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cargo Condition</Text>
          <View style={styles.conditionContainer}>
            <View style={styles.conditionBox}>
              <Text style={styles.conditionLabel}>Status</Text>
              <Text style={[styles.conditionValue, getConditionStyle(beritaAcara.cargo_condition)]}>
                {beritaAcara.cargo_condition 
                  ? CONDITION_LABELS[beritaAcara.cargo_condition] || beritaAcara.cargo_condition
                  : '-'}
              </Text>
            </View>
            <View style={styles.conditionNotesBox}>
              <Text style={styles.conditionLabel}>Condition Notes</Text>
              <Text style={styles.infoValue}>
                {beritaAcara.condition_notes || 'No notes'}
              </Text>
            </View>
          </View>
        </View>

        {/* Photo Gallery */}
        {beritaAcara.photo_urls && beritaAcara.photo_urls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {beritaAcara.photo_urls.slice(0, 6).map((url, index) => (
                <View key={index} style={styles.photoContainer}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={url} style={styles.photo} />
                </View>
              ))}
            </View>
            {beritaAcara.photo_urls.length > 6 && (
              <Text style={{ fontSize: 9, color: '#666', marginTop: 5 }}>
                +{beritaAcara.photo_urls.length - 6} more photos
              </Text>
            )}
          </View>
        )}

        {/* Notes */}
        {beritaAcara.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes:</Text>
            <Text style={styles.notesText}>{beritaAcara.notes}</Text>
          </View>
        )}

        {/* Signature Block */}
        <SignatureBlock
          leftLabel="Company Representative"
          leftName={beritaAcara.company_representative}
          rightLabel="Client Representative"
          rightName={beritaAcara.client_representative}
        />

        {/* Footer */}
        <PDFFooter message="This document serves as official handover record" />
      </Page>
    </Document>
  )
}
