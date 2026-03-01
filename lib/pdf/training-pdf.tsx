import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatDateForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Terjadwal',
  in_progress: 'Sedang Berlangsung',
  completed: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  induction: 'Induksi',
  refresher: 'Penyegaran',
  specialized: 'Khusus',
  certification: 'Sertifikasi',
  toolbox: 'Toolbox Talk',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  certificateFrame: {
    border: 2,
    borderColor: '#1a365d',
    padding: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  certificateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a365d',
    marginBottom: 8,
  },
  certificateSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#444',
    marginBottom: 24,
  },
  certificateBody: {
    textAlign: 'center',
    marginBottom: 16,
  },
  certificateLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  certificateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 16,
  },
  certificateCourse: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  certificateCourseCode: {
    fontSize: 10,
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 9,
    color: '#333',
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f4ff',
  },
  scoreLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreResult: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  validitySection: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
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
  signatureArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    paddingTop: 20,
  },
  signatureBlock: {
    width: 160,
    alignItems: 'center',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: 140,
    marginBottom: 4,
    marginTop: 40,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
  },
})

export interface TrainingPDFProps {
  record: {
    id: string
    training_date: string
    completion_date?: string | null
    training_location?: string | null
    trainer_name?: string | null
    training_provider?: string | null
    status: string
    assessment_score?: number | null
    assessment_passed?: boolean | null
    certificate_number?: string | null
    valid_from?: string | null
    valid_to?: string | null
    notes?: string | null
  }
  employee: {
    full_name: string
    employee_code?: string
    department_name?: string
  }
  course: {
    course_code: string
    course_name: string
    training_type: string
    duration_hours?: number | null
    validity_months?: number | null
    requires_assessment: boolean
    passing_score?: number | null
  }
  company: CompanySettingsForPDF
}

export function TrainingPDF({
  record,
  employee,
  course,
  company,
}: TrainingPDFProps) {
  const statusLabel = STATUS_LABELS[record.status] || record.status
  const trainingTypeLabel = TRAINING_TYPE_LABELS[course.training_type] || course.training_type
  const isCompleted = record.status === 'completed'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle="CATATAN PELATIHAN"
          documentNumber={record.certificate_number || record.id.slice(0, 8).toUpperCase()}
          documentDate={formatDateForPDF(record.training_date)}
        />

        {/* Certificate-style section for completed training */}
        {isCompleted && (
          <View style={styles.certificateFrame}>
            <Text style={styles.certificateTitle}>SERTIFIKAT PELATIHAN</Text>
            <Text style={styles.certificateSubtitle}>Training Certificate</Text>

            <View style={styles.certificateBody}>
              <Text style={styles.certificateLabel}>Diberikan kepada / Awarded to</Text>
              <Text style={styles.certificateName}>{employee.full_name}</Text>

              <Text style={styles.certificateLabel}>Atas keberhasilan menyelesaikan / For successfully completing</Text>
              <Text style={styles.certificateCourse}>{course.course_name}</Text>
              <Text style={styles.certificateCourseCode}>{course.course_code}</Text>

              {record.completion_date && (
                <>
                  <Text style={styles.certificateLabel}>Tanggal Penyelesaian / Completion Date</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>
                    {formatDateForPDF(record.completion_date)}
                  </Text>
                </>
              )}
            </View>

            {/* Signature Area */}
            <View style={styles.signatureArea}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Instruktur / Instructor</Text>
                {record.trainer_name && (
                  <Text style={{ fontSize: 8, color: '#333', marginTop: 2 }}>
                    {record.trainer_name}
                  </Text>
                )}
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>HSE Manager</Text>
              </View>
            </View>
          </View>
        )}

        {/* Detail Section */}
        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Karyawan</Text>
            <Text style={styles.detailValue}>{employee.full_name}</Text>
          </View>
          {employee.employee_code && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Kode Karyawan</Text>
              <Text style={styles.detailValue}>{employee.employee_code}</Text>
            </View>
          )}
          {employee.department_name && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Departemen</Text>
              <Text style={styles.detailValue}>{employee.department_name}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{statusLabel}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Kursus</Text>
            <Text style={styles.detailValue}>{course.course_name}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Kode Kursus</Text>
            <Text style={styles.detailValue}>{course.course_code}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tipe Pelatihan</Text>
            <Text style={styles.detailValue}>{trainingTypeLabel}</Text>
          </View>
          {course.duration_hours && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Durasi</Text>
              <Text style={styles.detailValue}>{course.duration_hours} jam</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tanggal Pelatihan</Text>
            <Text style={styles.detailValue}>{formatDateForPDF(record.training_date)}</Text>
          </View>
          {record.completion_date && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tanggal Selesai</Text>
              <Text style={styles.detailValue}>{formatDateForPDF(record.completion_date)}</Text>
            </View>
          )}
          {record.training_location && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Lokasi</Text>
              <Text style={styles.detailValue}>{record.training_location}</Text>
            </View>
          )}
          {record.trainer_name && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Instruktur</Text>
              <Text style={styles.detailValue}>{record.trainer_name}</Text>
            </View>
          )}
          {record.training_provider && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Provider</Text>
              <Text style={styles.detailValue}>{record.training_provider}</Text>
            </View>
          )}
          {record.certificate_number && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>No. Sertifikat</Text>
              <Text style={styles.detailValue}>{record.certificate_number}</Text>
            </View>
          )}
        </View>

        {/* Assessment Score */}
        {record.assessment_score !== null && record.assessment_score !== undefined && (
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>Nilai Assessment</Text>
            <Text style={styles.scoreValue}>{record.assessment_score}</Text>
            {record.assessment_passed !== null && record.assessment_passed !== undefined && (
              <Text style={[styles.scoreResult, { color: record.assessment_passed ? '#16a34a' : '#dc2626' }]}>
                {record.assessment_passed ? 'LULUS' : 'TIDAK LULUS'}
              </Text>
            )}
            {course.passing_score && (
              <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
                Nilai Minimum: {course.passing_score}
              </Text>
            )}
          </View>
        )}

        {/* Validity */}
        {(record.valid_from || record.valid_to) && (
          <View style={styles.validitySection}>
            {record.valid_from && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Berlaku Dari:</Text>
                <Text style={styles.infoValue}>{formatDateForPDF(record.valid_from)}</Text>
              </View>
            )}
            {record.valid_to && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Berlaku Hingga:</Text>
                <Text style={styles.infoValue}>{formatDateForPDF(record.valid_to)}</Text>
              </View>
            )}
            {course.validity_months && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Masa Berlaku:</Text>
                <Text style={styles.infoValue}>{course.validity_months} bulan</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {record.notes && (
          <View style={{ padding: 12, backgroundColor: '#f9f9f9', marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>Catatan:</Text>
            <Text style={{ fontSize: 9 }}>{record.notes}</Text>
          </View>
        )}

        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" />
      </Page>
    </Document>
  )
}
