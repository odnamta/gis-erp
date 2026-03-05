/**
 * JO Subcategory — granular classification for heavy-haul logistics
 * Used in PJO form to classify shipment type beyond service_scope
 */

export type JOSubcategory =
  | 'trucking'
  | 'heavy_cargo'
  | 'project_cargo'
  | 'handling_warehouse'
  | 'customs_clearance'
  | 'agency_service'
  | 'survey'
  | 'escort'

export const JO_SUBCATEGORY_OPTIONS: { value: JOSubcategory; label: string }[] = [
  { value: 'trucking', label: 'Trucking' },
  { value: 'heavy_cargo', label: 'Heavy Cargo' },
  { value: 'project_cargo', label: 'Project Cargo' },
  { value: 'handling_warehouse', label: 'Handling / Warehouse' },
  { value: 'customs_clearance', label: 'Customs Clearance' },
  { value: 'agency_service', label: 'Agency Service' },
  { value: 'survey', label: 'Survey' },
  { value: 'escort', label: 'Escort' },
]

/**
 * Map service_scope to relevant subcategories for filtered dropdown
 */
export const SERVICE_SCOPE_SUBCATEGORIES: Record<string, JOSubcategory[]> = {
  cargo: ['trucking', 'heavy_cargo', 'project_cargo', 'handling_warehouse', 'escort'],
  customs: ['customs_clearance'],
  agency: ['agency_service'],
  cargo_customs: ['trucking', 'heavy_cargo', 'project_cargo', 'customs_clearance'],
  full_service: ['trucking', 'heavy_cargo', 'project_cargo', 'handling_warehouse', 'customs_clearance', 'agency_service', 'survey', 'escort'],
  other: ['survey', 'escort', 'handling_warehouse'],
}
