import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFHeader } from './components/pdf-header'
import { PDFFooter } from './components/pdf-footer'
import { CompanySettingsForPDF, formatDateForPDF, formatCurrencyForPDF } from './pdf-utils'

const STATUS_LABELS: Record<string, string> = {
  requested: 'Diminta',
  scheduled: 'Terjadwal',
  in_progress: 'Sedang Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const FEASIBILITY_LABELS: Record<string, string> = {
  feasible: 'Layak',
  feasible_with_conditions: 'Layak Bersyarat',
  not_feasible: 'Tidak Layak',
}

const ROAD_CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Buruk',
  impassable: 'Tidak Dapat Dilalui',
}

const WAYPOINT_TYPE_LABELS: Record<string, string> = {
  start: 'Awal',
  checkpoint: 'Checkpoint',
  obstacle: 'Hambatan',
  bridge: 'Jembatan',
  intersection: 'Persimpangan',
  underpass: 'Underpass',
  overhead: 'Overhead',
  turn: 'Belokan',
  rest_point: 'Titik Istirahat',
  destination: 'Tujuan',
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
  feasibilitySection: {
    padding: 16,
    backgroundColor: '#f0f4ff',
    marginBottom: 16,
    alignItems: 'center',
  },
  feasibilityLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
  },
  feasibilityValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  costGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  costItem: {
    width: '50%',
    marginBottom: 6,
  },
  costLabel: {
    fontSize: 8,
    color: '#666',
  },
  costValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalCost: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 6,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  totalCostLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalCostValue: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
})

interface WaypointData {
  waypoint_order: number
  waypoint_type: string
  location_name: string
  km_from_start?: number | null
  road_condition?: string | null
  road_width_m?: number | null
  vertical_clearance_m?: number | null
  horizontal_clearance_m?: number | null
  bridge_name?: string | null
  bridge_capacity_tons?: number | null
  obstacle_type?: string | null
  obstacle_description?: string | null
  is_passable: boolean
  action_required?: string | null
}

export interface SurveyPDFProps {
  survey: {
    survey_number: string
    status: string
    cargo_description: string
    cargo_weight_tons?: number | null
    total_length_m?: number | null
    total_width_m?: number | null
    total_height_m?: number | null
    total_weight_tons?: number | null
    origin_location: string
    origin_address?: string | null
    destination_location: string
    destination_address?: string | null
    route_distance_km?: number | null
    estimated_travel_time_hours?: number | null
    survey_date?: string | null
    surveyor_name?: string | null
    feasibility?: string | null
    feasibility_notes?: string | null
    escort_required: boolean
    escort_type?: string | null
    escort_vehicles_count?: number | null
    travel_time_restrictions?: string | null
    survey_cost?: number | null
    permit_cost_estimate?: number | null
    escort_cost_estimate?: number | null
    road_repair_cost_estimate?: number | null
    total_route_cost_estimate?: number | null
    notes?: string | null
    created_at: string
  }
  customer?: { name: string } | null
  project?: { name: string } | null
  surveyor?: { full_name: string } | null
  waypoints: WaypointData[]
  company: CompanySettingsForPDF
}

export function SurveyPDF({
  survey,
  customer,
  project,
  surveyor,
  waypoints,
  company,
}: SurveyPDFProps) {
  const statusLabel = STATUS_LABELS[survey.status] || survey.status
  const feasibilityLabel = survey.feasibility
    ? (FEASIBILITY_LABELS[survey.feasibility] || survey.feasibility)
    : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          company={company}
          documentTitle="LAPORAN SURVEI RUTE"
          documentNumber={survey.survey_number}
          documentDate={formatDateForPDF(survey.survey_date || survey.created_at)}
        />

        {/* General Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{statusLabel}</Text>
          </View>
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
          {survey.survey_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Survei:</Text>
              <Text style={styles.infoValue}>{formatDateForPDF(survey.survey_date)}</Text>
            </View>
          )}
          {(surveyor || survey.surveyor_name) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Surveyor:</Text>
              <Text style={styles.infoValue}>{surveyor?.full_name || survey.surveyor_name}</Text>
            </View>
          )}
        </View>

        {/* Route Details */}
        <Text style={styles.sectionTitle}>Detail Rute</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Asal:</Text>
            <Text style={styles.infoValue}>
              {survey.origin_location}
              {survey.origin_address ? ` - ${survey.origin_address}` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tujuan:</Text>
            <Text style={styles.infoValue}>
              {survey.destination_location}
              {survey.destination_address ? ` - ${survey.destination_address}` : ''}
            </Text>
          </View>
          {survey.route_distance_km && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jarak Rute:</Text>
              <Text style={styles.infoValue}>{survey.route_distance_km} km</Text>
            </View>
          )}
          {survey.estimated_travel_time_hours && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimasi Waktu Tempuh:</Text>
              <Text style={styles.infoValue}>{survey.estimated_travel_time_hours} jam</Text>
            </View>
          )}
          {survey.travel_time_restrictions && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Batasan Waktu:</Text>
              <Text style={styles.infoValue}>{survey.travel_time_restrictions}</Text>
            </View>
          )}
        </View>

        {/* Cargo & Transport */}
        <Text style={styles.sectionTitle}>Muatan & Transportasi</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Deskripsi Muatan:</Text>
            <Text style={styles.infoValue}>{survey.cargo_description}</Text>
          </View>
          {survey.total_weight_tons && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Berat Total:</Text>
              <Text style={styles.infoValue}>{survey.total_weight_tons} ton</Text>
            </View>
          )}
          {survey.total_length_m && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Panjang Total:</Text>
              <Text style={styles.infoValue}>{survey.total_length_m} m</Text>
            </View>
          )}
          {survey.total_width_m && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lebar Total:</Text>
              <Text style={styles.infoValue}>{survey.total_width_m} m</Text>
            </View>
          )}
          {survey.total_height_m && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tinggi Total:</Text>
              <Text style={styles.infoValue}>{survey.total_height_m} m</Text>
            </View>
          )}
        </View>

        {/* Feasibility Assessment */}
        {feasibilityLabel && (
          <>
            <Text style={styles.sectionTitle}>Penilaian Kelayakan</Text>
            <View style={styles.feasibilitySection}>
              <Text style={styles.feasibilityLabel}>Kelayakan Rute</Text>
              <Text style={[
                styles.feasibilityValue,
                {
                  color: survey.feasibility === 'feasible' ? '#16a34a'
                    : survey.feasibility === 'feasible_with_conditions' ? '#ca8a04'
                    : '#dc2626'
                },
              ]}>
                {feasibilityLabel}
              </Text>
            </View>
            {survey.feasibility_notes && (
              <View style={{ padding: 12, backgroundColor: '#f9f9f9', marginBottom: 16 }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>Catatan Kelayakan:</Text>
                <Text style={{ fontSize: 9 }}>{survey.feasibility_notes}</Text>
              </View>
            )}
          </>
        )}

        {/* Escort */}
        {survey.escort_required && (
          <>
            <Text style={styles.sectionTitle}>Kebutuhan Escort</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Escort Diperlukan:</Text>
                <Text style={styles.infoValue}>Ya</Text>
              </View>
              {survey.escort_type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipe Escort:</Text>
                  <Text style={styles.infoValue}>{survey.escort_type}</Text>
                </View>
              )}
              {survey.escort_vehicles_count && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Jumlah Kendaraan:</Text>
                  <Text style={styles.infoValue}>{survey.escort_vehicles_count}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Waypoints Table */}
        {waypoints.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Titik Jalan ({waypoints.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 20 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Lokasi</Text>
                <Text style={[styles.tableHeaderCell, { width: 60 }]}>Tipe</Text>
                <Text style={[styles.tableHeaderCell, { width: 30 }]}>KM</Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>Kondisi</Text>
                <Text style={[styles.tableHeaderCell, { width: 40 }]}>Lebar</Text>
                <Text style={[styles.tableHeaderCell, { width: 40 }]}>Lewat</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Catatan</Text>
              </View>
              {waypoints.map((wp, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 20 }]}>{wp.waypoint_order}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{wp.location_name}</Text>
                  <Text style={[styles.tableCell, { width: 60 }]}>
                    {WAYPOINT_TYPE_LABELS[wp.waypoint_type] || wp.waypoint_type}
                  </Text>
                  <Text style={[styles.tableCell, { width: 30 }]}>{wp.km_from_start ?? '-'}</Text>
                  <Text style={[styles.tableCell, { width: 50 }]}>
                    {wp.road_condition ? (ROAD_CONDITION_LABELS[wp.road_condition] || wp.road_condition) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: 40 }]}>
                    {wp.road_width_m ? `${wp.road_width_m}m` : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: 40 }]}>
                    {wp.is_passable ? 'Ya' : 'Tidak'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {wp.obstacle_description || wp.action_required || '-'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Cost Estimates */}
        {survey.total_route_cost_estimate && (
          <>
            <Text style={styles.sectionTitle}>Estimasi Biaya</Text>
            <View style={styles.costGrid}>
              {survey.survey_cost && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Biaya Survei</Text>
                  <Text style={styles.costValue}>{formatCurrencyForPDF(survey.survey_cost)}</Text>
                </View>
              )}
              {survey.permit_cost_estimate && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Biaya Perizinan</Text>
                  <Text style={styles.costValue}>{formatCurrencyForPDF(survey.permit_cost_estimate)}</Text>
                </View>
              )}
              {survey.escort_cost_estimate && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Biaya Escort</Text>
                  <Text style={styles.costValue}>{formatCurrencyForPDF(survey.escort_cost_estimate)}</Text>
                </View>
              )}
              {survey.road_repair_cost_estimate && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Biaya Perbaikan Jalan</Text>
                  <Text style={styles.costValue}>{formatCurrencyForPDF(survey.road_repair_cost_estimate)}</Text>
                </View>
              )}
            </View>
            <View style={styles.totalCost}>
              <Text style={styles.totalCostLabel}>Total Estimasi:</Text>
              <Text style={styles.totalCostValue}>{formatCurrencyForPDF(survey.total_route_cost_estimate)}</Text>
            </View>
          </>
        )}

        {/* Notes */}
        {survey.notes && (
          <>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <View style={{ padding: 12, backgroundColor: '#f9f9f9', marginBottom: 16 }}>
              <Text style={{ fontSize: 9 }}>{survey.notes}</Text>
            </View>
          </>
        )}

        <PDFFooter message="Dokumen resmi PT. Gama Intisamudera" showPageNumber />
      </Page>
    </Document>
  )
}
