// HS Code Management Types

export type FTACode =
  | 'ATIGA'    // ASEAN Trade in Goods Agreement
  | 'ACFTA'    // ASEAN-China FTA
  | 'AKFTA'    // ASEAN-Korea FTA
  | 'AJCEP'    // ASEAN-Japan Comprehensive Economic Partnership
  | 'AANZFTA'  // ASEAN-Australia-New Zealand FTA
  | 'IJEPA';   // Indonesia-Japan Economic Partnership Agreement

export const FTA_CODES: FTACode[] = ['ATIGA', 'ACFTA', 'AKFTA', 'AJCEP', 'AANZFTA', 'IJEPA'];

export const FTA_NAMES: Record<FTACode, string> = {
  ATIGA: 'ASEAN Trade in Goods Agreement',
  ACFTA: 'ASEAN-China FTA',
  AKFTA: 'ASEAN-Korea FTA',
  AJCEP: 'ASEAN-Japan CEP',
  AANZFTA: 'ASEAN-Australia-NZ FTA',
  IJEPA: 'Indonesia-Japan EPA',
};

export interface HSChapter {
  id: string;
  chapterCode: string;
  chapterName: string;
  chapterNameId?: string;
  sectionNumber?: number;
  sectionName?: string;
  createdAt: string;
}

export interface HSHeading {
  id: string;
  headingCode: string;
  chapterId: string;
  headingName: string;
  headingNameId?: string;
  chapter?: HSChapter;
  createdAt: string;
}

export interface HSCode {
  id: string;
  hsCode: string;
  headingId: string;
  description: string;
  descriptionId?: string;
  statisticalUnit?: string;
  mfnRate: number;
  ppnRate: number;
  ppnbmRate: number;
  pphImportRate: number;
  hasRestrictions: boolean;
  restrictionType?: string;
  issuingAuthority?: string;
  hasExportRestrictions: boolean;
  exportRestrictionType?: string;
  isActive: boolean;
  heading?: HSHeading;
  createdAt: string;
  updatedAt: string;
}


export interface HSCodeSearchResult extends HSCode {
  relevanceScore: number;
  chapterName?: string;
  headingName?: string;
}

export interface HSCodeRates {
  bmRate: number;      // Import duty (MFN)
  ppnRate: number;     // VAT
  ppnbmRate: number;   // Luxury goods tax
  pphRate: number;     // Income tax on import
  hasRestrictions: boolean;
  restrictionType?: string;
  hasExportRestrictions: boolean;
  exportRestrictionType?: string;
}

export interface HSPreferentialRate {
  id: string;
  hsCodeId: string;
  ftaCode: FTACode;
  preferentialRate: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  requiresCoo: boolean;
  createdAt: string;
}

export interface DutyCalculation {
  cifValue: number;
  bmRate: number;
  bmAmount: number;
  ppnBase: number;
  ppnRate: number;
  ppnAmount: number;
  ppnbmRate: number;
  ppnbmAmount: number;
  pphBase: number;
  pphRate: number;
  pphAmount: number;
  totalDuties: number;
  usedPreferentialRate: boolean;
  ftaCode?: FTACode;
}

export interface HSCodeSearchHistory {
  id: string;
  userId: string;
  searchTerm: string;
  selectedHsCode: string;
  searchedAt: string;
}

export interface HSCodeInput {
  hsCode: string;
  headingId: string;
  description: string;
  descriptionId?: string;
  statisticalUnit?: string;
  mfnRate?: number;
  ppnRate?: number;
  ppnbmRate?: number;
  pphImportRate?: number;
  hasRestrictions?: boolean;
  restrictionType?: string;
  issuingAuthority?: string;
  hasExportRestrictions?: boolean;
  exportRestrictionType?: string;
}

export interface PreferentialRateInput {
  hsCodeId: string;
  ftaCode: FTACode;
  preferentialRate: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  requiresCoo?: boolean;
}

// Database row types (snake_case)
export interface HSChapterRow {
  id: string;
  chapter_code: string;
  chapter_name: string;
  chapter_name_id: string | null;
  section_number: number | null;
  section_name: string | null;
  created_at: string;
}

export interface HSHeadingRow {
  id: string;
  heading_code: string;
  chapter_id: string;
  heading_name: string;
  heading_name_id: string | null;
  created_at: string;
  chapter?: HSChapterRow;
}

export interface HSCodeRow {
  id: string;
  hs_code: string;
  heading_id: string;
  description: string;
  description_id: string | null;
  statistical_unit: string | null;
  mfn_rate: number;
  ppn_rate: number;
  ppnbm_rate: number;
  pph_import_rate: number;
  has_restrictions: boolean;
  restriction_type: string | null;
  issuing_authority: string | null;
  has_export_restrictions: boolean;
  export_restriction_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  heading?: HSHeadingRow & { chapter?: HSChapterRow };
}

export interface HSPreferentialRateRow {
  id: string;
  hs_code_id: string;
  fta_code: string;
  preferential_rate: number;
  effective_from: string | null;
  effective_to: string | null;
  requires_coo: boolean;
  created_at: string;
}

export interface HSCodeSearchHistoryRow {
  id: string;
  user_id: string;
  search_term: string;
  selected_hs_code: string;
  searched_at: string;
}
