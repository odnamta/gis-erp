import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatDateForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draf',
  pending_review: 'Menunggu Review',
  approved: 'Disetujui',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  extreme: 'Ekstrem',
}

const CHECKPOINT_TYPE_LABELS: Record<string, string> = {
  departure: 'Keberangkatan',
  waypoint: 'Titik Jalan',
  rest_stop: 'Istirahat',
  checkpoint: 'Checkpoint',
  fuel_stop: 'Pengisian BBM',
  arrival: 'Kedatangan',
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
    width: 160,
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
  movementWindowRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  movementWindowLabel: {
    width: 100,
    fontSize: 9,
    color: '#666',
  },
  movementWindowValue: {
    flex: 1,
    fontSize: 9,
  },
})

interface JmpCheckpointData {
  checkpointOrder: number
  locationName: string
  locationType: string
  kmFromStart?: number
  plannedArrival?: string
  plannedDeparture?: string
  stopDurationMinutes?: number
  activities?: string
  status: string
}

interface JmpRiskData {
  riskCategory: string
  riskDescription: string
  likelihood: string
  consequence: string
  riskLevel: string
  controlMeasures: string
  residualRiskLevel?: string
  responsible?: string
}

interface MovementWindowData {
  day: string
  startTime: string
  endTime: string
  notes?: string
}

interface ConvoyConfigData {
  leadVehicle?: { type: string; plateNumber?: string; driver?: string }
  cargoTransport: { type: string; trailerType?: string; plateNumber?: string; driver?: string }
  escortVehicles?: { count: number; type: string; company?: string }
  chaseVehicle?: { type: string; plateNumber?: string; driver?: string }
}

export interface JmpPDFProps {
  jmp: {
    jmp_number: string
    journey_title: string
    journey_description?: string | null
    status: string
    origin_location: string
    destination_location: string
    route_distance_km?: number | null
    planned_departure?: string | null
    planned_arrival?: string | null
    journey_duration_hours?: number | null
    cargo_description: string
    total_weight_tons?: number | null
    total_length_m?: number | null
    total_width_m?: number | null
    total_height_m?: number | null
    convoy_configuration?: ConvoyConfigData | null
    weather_restrictions?: string | null
    go_no_go_criteria?: string | null
    emergency_procedures?: string | null
    created_at: string
    prepared_at?: string | null
    approved_at?: string | null
    actual_departure?: string | null
    actual_arrival?: string | null
    incidents_occurred: boolean
    incident_summary?: string | null
    lessons_learned?: string | null
  }
  customer?: { name: string } | null
  project?: { name: string } | null
  jobOrder?: { jo_number: string } | null
  convoyCommander?: { full_name: string; phone?: string } | null
  checkpoints: JmpCheckpointData[]
  risks: JmpRiskData[]
  movementWindows: MovementWindowData[]
  company: CompanySettingsForPDF
}

export function JmpPDF({
  jmp,
  customer,
  project,
  jobOrder,
  convoyCommander,
  checkpoints,
  risks,
  movementWindows,
  company,
}: JmpPDFProps) {
  const statusLabel = STATUS_LABELS[jmp.status] || jmp.status

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle="JOURNEY MANAGEMENT PLAN"
          documentNumber={jmp.jmp_number}
          documentDate={formatDateForPDF(jmp.created_at)}
        />

        {/* General Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Judul Perjalanan:</Text>
            <Text style={styles.infoValue}>{jmp.journey_title}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
          </View>
          {jmp.journey_description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deskripsi:</Text>
              <Text style={styles.infoValue}>{jmp.journey_description}</Text>
            </View>
          )}
          {customer && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer:</Text>
              <Text style={styles.infoValue}>{customer.name}</Text>
            </View>
          )}
          {project && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Proyek:</Text>
              <Text style={styles.infoValue}>{project.name}</Text>
            </View>
          )}
          {jobOrder && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Job Order:</Text>
              <Text style={styles.infoValue}>{jobOrder.jo_number}</Text>
            </View>
          )}
        </View>

        {/* Route Section */}
        <Text style={styles.sectionTitle}>Rute</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Asal:</Text>
            <Text style={styles.infoValue}>{jmp.origin_location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tujuan:</Text>
            <Text style={styles.infoValue}>{jmp.destination_location}</Text>
          </View>
          {jmp.route_distance_km != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jarak (km):</Text>
              <Text style={styles.infoValue}>{jmp.route_distance_km} km</Text>
            </View>
          )}
          {jmp.journey_duration_hours != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimasi Durasi:</Text>
              <Text style={styles.infoValue}>{jmp.journey_duration_hours} jam</Text>
            </View>
          )}
          {jmp.planned_departure && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Keberangkatan Rencana:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(jmp.planned_departure)}</Text>
            </View>
          )}
          {jmp.planned_arrival && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kedatangan Rencana:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(jmp.planned_arrival)}</Text>
            </View>
          )}
        </View>

        {/* Cargo Section */}
        <Text style={styles.sectionTitle}>Muatan</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Deskripsi Muatan:</Text>
            <Text style={styles.infoValue}>{jmp.cargo_description}</Text>
          </View>
          {jmp.total_weight_tons != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Berat Total:</Text>
              <Text style={styles.infoValue}>{jmp.total_weight_tons} ton</Text>
            </View>
          )}
          {jmp.total_length_m != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Panjang Total:</Text>
              <Text style={styles.infoValue}>{jmp.total_length_m} m</Text>
            </View>
          )}
          {jmp.total_width_m && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lebar Total:</Text>
              <Text style={styles.infoValue}>{jmp.total_width_m} m</Text>
            </View>
          )}
          {jmp.total_height_m && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tinggi Total:</Text>
              <Text style={styles.infoValue}>{jmp.total_height_m} m</Text>
            </View>
          )}
        </View>

        {/* Convoy Section */}
        {(convoyCommander || jmp.convoy_configuration) && (
          <>
            <Text style={styles.sectionTitle}>Konvoi</Text>
            <View style={styles.infoBox}>
              {convoyCommander && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Komandan Konvoi:</Text>
                    <Text style={styles.infoValue}>{convoyCommander.full_name}</Text>
                  </View>
                  {convoyCommander.phone && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Telepon:</Text>
                      <Text style={styles.infoValue}>{convoyCommander.phone}</Text>
                    </View>
                  )}
                </>
              )}
              {jmp.convoy_configuration && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Kendaraan Kargo:</Text>
                    <Text style={styles.infoValue}>
                      {jmp.convoy_configuration.cargoTransport.type}
                      {jmp.convoy_configuration.cargoTransport.plateNumber ? ` (${jmp.convoy_configuration.cargoTransport.plateNumber})` : ''}
                    </Text>
                  </View>
                  {jmp.convoy_configuration.leadVehicle && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Kendaraan Depan:</Text>
                      <Text style={styles.infoValue}>
                        {jmp.convoy_configuration.leadVehicle.type}
                        {jmp.convoy_configuration.leadVehicle.plateNumber ? ` (${jmp.convoy_configuration.leadVehicle.plateNumber})` : ''}
                      </Text>
                    </View>
                  )}
                  {jmp.convoy_configuration.escortVehicles && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Kendaraan Escort:</Text>
                      <Text style={styles.infoValue}>
                        {jmp.convoy_configuration.escortVehicles.count}x {jmp.convoy_configuration.escortVehicles.type}
                        {jmp.convoy_configuration.escortVehicles.company ? ` (${jmp.convoy_configuration.escortVehicles.company})` : ''}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* Movement Windows */}
        {movementWindows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Jendela Pergerakan</Text>
            <View style={styles.infoBox}>
              {movementWindows.map((mw, idx) => (
                <View key={idx} style={styles.movementWindowRow}>
                  <Text style={styles.movementWindowLabel}>{mw.day}:</Text>
                  <Text style={styles.movementWindowValue}>
                    {mw.startTime} - {mw.endTime}
                    {mw.notes ? ` (${mw.notes})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Checkpoints Table */}
        {checkpoints.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Checkpoint ({checkpoints.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 25 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Lokasi</Text>
                <Text style={[styles.tableHeaderCell, { width: 70 }]}>Tipe</Text>
                <Text style={[styles.tableHeaderCell, { width: 40 }]}>KM</Text>
                <Text style={[styles.tableHeaderCell, { width: 70 }]}>Tiba</Text>
                <Text style={[styles.tableHeaderCell, { width: 70 }]}>Berangkat</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Aktivitas</Text>
              </View>
              {checkpoints.map((cp, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 25 }]}>{cp.checkpointOrder}</Text>
                  <Text style={[styles.tableCell, { width: 100 }]}>{cp.locationName}</Text>
                  <Text style={[styles.tableCell, { width: 70 }]}>
                    {CHECKPOINT_TYPE_LABELS[cp.locationType] || cp.locationType}
                  </Text>
                  <Text style={[styles.tableCell, { width: 40 }]}>
                    {cp.kmFromStart ?? '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: 70 }]}>
                    {cp.plannedArrival ? formatDateForPDF(cp.plannedArrival) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: 70 }]}>
                    {cp.plannedDeparture ? formatDateForPDF(cp.plannedDeparture) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {cp.activities || '-'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Risk Assessments Table */}
        {risks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Penilaian Risiko ({risks.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 70 }]}>Kategori</Text>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Deskripsi</Text>
                <Text style={[styles.tableHeaderCell, { width: 55 }]}>Kemungkinan</Text>
                <Text style={[styles.tableHeaderCell, { width: 55 }]}>Dampak</Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>Level</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pengendalian</Text>
              </View>
              {risks.map((risk, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 70 }]}>{risk.riskCategory.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.tableCell, { width: 100 }]}>{risk.riskDescription}</Text>
                  <Text style={[styles.tableCell, { width: 55 }]}>{risk.likelihood}</Text>
                  <Text style={[styles.tableCell, { width: 55 }]}>{risk.consequence}</Text>
                  <Text style={[styles.tableCell, { width: 50 }]}>
                    {RISK_LEVEL_LABELS[risk.riskLevel] || risk.riskLevel}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{risk.controlMeasures}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Weather & Go/No-Go */}
        {(jmp.weather_restrictions || jmp.go_no_go_criteria) && (
          <>
            <Text style={styles.sectionTitle}>Batasan & Kriteria</Text>
            <View style={styles.infoBox}>
              {jmp.weather_restrictions && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Batasan Cuaca:</Text>
                  <Text style={styles.infoValue}>{jmp.weather_restrictions}</Text>
                </View>
              )}
              {jmp.go_no_go_criteria && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kriteria Go/No-Go:</Text>
                  <Text style={styles.infoValue}>{jmp.go_no_go_criteria}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Emergency Procedures */}
        {jmp.emergency_procedures && (
          <>
            <Text style={styles.sectionTitle}>Prosedur Darurat</Text>
            <View style={styles.infoBox}>
              <Text style={{ fontSize: 9 }}>{jmp.emergency_procedures}</Text>
            </View>
          </>
        )}

        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" showPageNumber />
      </Page>
    </Document>
  )
}
