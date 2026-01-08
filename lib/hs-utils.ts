import { createClient } from '@/lib/supabase/client';
import type {
  HSChapter,
  HSHeading,
  HSCode,
  HSCodeSearchResult,
  HSCodeRates,
  HSPreferentialRate,
  DutyCalculation,
  FTACode,
  HSChapterRow,
  HSHeadingRow,
  HSCodeRow,
  HSPreferentialRateRow,
  FTA_CODES,
} from '@/types/hs-codes';

// Transform database rows to application types
export function transformChapter(row: HSChapterRow): HSChapter {
  return {
    id: row.id,
    chapterCode: row.chapter_code,
    chapterName: row.chapter_name,
    chapterNameId: row.chapter_name_id ?? undefined,
    sectionNumber: row.section_number ?? undefined,
    sectionName: row.section_name ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformHeading(row: HSHeadingRow): HSHeading {
  return {
    id: row.id,
    headingCode: row.heading_code,
    chapterId: row.chapter_id,
    headingName: row.heading_name,
    headingNameId: row.heading_name_id ?? undefined,
    chapter: row.chapter ? transformChapter(row.chapter) : undefined,
    createdAt: row.created_at,
  };
}

export function transformHSCode(row: HSCodeRow): HSCode {
  return {
    id: row.id,
    hsCode: row.hs_code,
    headingId: row.heading_id,
    description: row.description,
    descriptionId: row.description_id ?? undefined,
    statisticalUnit: row.statistical_unit ?? undefined,
    mfnRate: Number(row.mfn_rate),
    ppnRate: Number(row.ppn_rate),
    ppnbmRate: Number(row.ppnbm_rate),
    pphImportRate: Number(row.pph_import_rate),
    hasRestrictions: row.has_restrictions,
    restrictionType: row.restriction_type ?? undefined,
    issuingAuthority: row.issuing_authority ?? undefined,
    hasExportRestrictions: row.has_export_restrictions,
    exportRestrictionType: row.export_restriction_type ?? undefined,
    isActive: row.is_active,
    heading: row.heading ? transformHeading(row.heading as HSHeadingRow) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformPreferentialRate(row: HSPreferentialRateRow): HSPreferentialRate {
  return {
    id: row.id,
    hsCodeId: row.hs_code_id,
    ftaCode: row.fta_code as FTACode,
    preferentialRate: Number(row.preferential_rate),
    effectiveFrom: row.effective_from ?? undefined,
    effectiveTo: row.effective_to ?? undefined,
    requiresCoo: row.requires_coo,
    createdAt: row.created_at,
  };
}


// Calculate relevance score for search ranking
export function calculateRelevance(query: string, description: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  // Exact match gets highest score
  if (lowerDesc === lowerQuery) return 100;
  
  // Starts with query gets high score
  if (lowerDesc.startsWith(lowerQuery)) return 90;
  
  // Contains query as whole word
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(lowerQuery)}\\b`, 'i');
  if (wordBoundaryRegex.test(lowerDesc)) return 80;
  
  // Contains query anywhere
  if (lowerDesc.includes(lowerQuery)) return 70;
  
  // Partial word match
  const words = lowerQuery.split(/\s+/);
  const matchedWords = words.filter(word => lowerDesc.includes(word));
  if (matchedWords.length > 0) {
    return 50 + (matchedWords.length / words.length) * 20;
  }
  
  return 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search HS codes by code prefix or description
export async function searchHSCodes(
  query: string,
  limit: number = 20
): Promise<HSCodeSearchResult[]> {
  const supabase = createClient();
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery) return [];
  
  // Check if query is numeric (search by code prefix)
  const isNumeric = /^\d+$/.test(trimmedQuery);
  
  if (isNumeric) {
    const { data, error } = await supabase
      .from('hs_codes')
      .select(`
        *,
        heading:hs_headings(
          heading_name,
          heading_name_id,
          chapter:hs_chapters(chapter_name, chapter_name_id)
        )
      `)
      .like('hs_code', `${trimmedQuery}%`)
      .eq('is_active', true)
      .order('hs_code')
      .limit(limit);
    
    if (error) throw error;
    
    return (data || []).map((row) => ({
      ...transformHSCode(row as unknown as HSCodeRow),
      relevanceScore: 1,
      chapterName: (row as { heading?: { chapter?: { chapter_name?: string } } }).heading?.chapter?.chapter_name,
      headingName: (row as { heading?: { heading_name?: string } }).heading?.heading_name,
    }));
  }
  
  // Text search by description
  const { data, error } = await supabase
    .from('hs_codes')
    .select(`
      *,
      heading:hs_headings(
        heading_name,
        heading_name_id,
        chapter:hs_chapters(chapter_name, chapter_name_id)
      )
    `)
    .or(`description.ilike.%${trimmedQuery}%,description_id.ilike.%${trimmedQuery}%`)
    .eq('is_active', true)
    .limit(limit * 2); // Get more results for relevance sorting
  
  if (error) throw error;
  
  const results = (data || []).map((row) => {
    const hsCode = transformHSCode(row as unknown as HSCodeRow);
    const rowWithHeading = row as { description: string; description_id?: string; heading?: { chapter?: { chapter_name?: string }; heading_name?: string } };
    const relevanceEn = calculateRelevance(trimmedQuery, rowWithHeading.description);
    const relevanceId = rowWithHeading.description_id 
      ? calculateRelevance(trimmedQuery, rowWithHeading.description_id) 
      : 0;
    
    return {
      ...hsCode,
      relevanceScore: Math.max(relevanceEn, relevanceId),
      chapterName: rowWithHeading.heading?.chapter?.chapter_name,
      headingName: rowWithHeading.heading?.heading_name,
    };
  });
  
  // Sort by relevance and limit
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

// Get HS code by exact code
export async function getHSCodeByCode(hsCode: string): Promise<HSCode | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hs_codes')
    .select(`
      *,
      heading:hs_headings(
        *,
        chapter:hs_chapters(*)
      )
    `)
    .eq('hs_code', hsCode)
    .single();
  
  if (error || !data) return null;
  
  return transformHSCode(data as HSCodeRow);
}

// Get duty rates for an HS code
export async function getHSCodeRates(hsCode: string): Promise<HSCodeRates | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hs_codes')
    .select('mfn_rate, ppn_rate, pph_import_rate, ppnbm_rate, has_restrictions, restriction_type, has_export_restrictions, export_restriction_type')
    .eq('hs_code', hsCode)
    .single();
  
  if (error || !data) return null;
  
  return {
    bmRate: Number(data.mfn_rate) || 0,
    ppnRate: Number(data.ppn_rate) || 11,
    pphRate: Number(data.pph_import_rate) || 2.5,
    ppnbmRate: Number(data.ppnbm_rate) || 0,
    hasRestrictions: data.has_restrictions || false,
    restrictionType: data.restriction_type ?? undefined,
    hasExportRestrictions: data.has_export_restrictions || false,
    exportRestrictionType: data.export_restriction_type ?? undefined,
  };
}


// Get preferential rate for specific FTA
export async function getPreferentialRate(
  hsCode: string,
  ftaCode: FTACode
): Promise<number | null> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  
  // First get the HS code ID
  const { data: hsCodeRecord, error: hsError } = await supabase
    .from('hs_codes')
    .select('id')
    .eq('hs_code', hsCode)
    .single();
  
  if (hsError || !hsCodeRecord) return null;
  
  // Get preferential rate with date validation
  const { data: prefRate, error: prefError } = await supabase
    .from('hs_preferential_rates')
    .select('preferential_rate, effective_from, effective_to')
    .eq('hs_code_id', hsCodeRecord.id)
    .eq('fta_code', ftaCode)
    .single();
  
  if (prefError || !prefRate) return null;
  
  // Validate date range
  if (prefRate.effective_from && prefRate.effective_from > today) {
    return null; // Not yet effective
  }
  if (prefRate.effective_to && prefRate.effective_to < today) {
    return null; // Expired
  }
  
  return Number(prefRate.preferential_rate);
}

// Get all preferential rates for an HS code
export async function getPreferentialRates(hsCode: string): Promise<HSPreferentialRate[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: hsCodeRecord, error: hsError } = await supabase
    .from('hs_codes')
    .select('id')
    .eq('hs_code', hsCode)
    .single();
  
  if (hsError || !hsCodeRecord) return [];
  
  const { data, error } = await supabase
    .from('hs_preferential_rates')
    .select('*')
    .eq('hs_code_id', hsCodeRecord.id)
    .or(`effective_from.is.null,effective_from.lte.${today}`)
    .or(`effective_to.is.null,effective_to.gte.${today}`);
  
  if (error || !data) return [];
  
  return data.map((row) => transformPreferentialRate(row as unknown as HSPreferentialRateRow));
}

// Calculate duties from rates (pure function for testing)
export function calculateDutiesFromRates(
  cifValue: number,
  bmRate: number,
  ppnRate: number,
  ppnbmRate: number,
  pphRate: number
): Omit<DutyCalculation, 'usedPreferentialRate' | 'ftaCode'> {
  // BM (Import Duty) = CIF × BM Rate
  const bmAmount = cifValue * (bmRate / 100);
  
  // PPN Base = CIF + BM
  const ppnBase = cifValue + bmAmount;
  
  // PPN = (CIF + BM) × PPN Rate
  const ppnAmount = ppnBase * (ppnRate / 100);
  
  // PPnBM = (CIF + BM) × PPnBM Rate
  const ppnbmAmount = ppnBase * (ppnbmRate / 100);
  
  // PPh Base = CIF + BM + PPN + PPnBM
  const pphBase = cifValue + bmAmount + ppnAmount + ppnbmAmount;
  
  // PPh = (CIF + BM + PPN + PPnBM) × PPh Rate
  const pphAmount = pphBase * (pphRate / 100);
  
  // Total Duties = BM + PPN + PPnBM + PPh
  const totalDuties = bmAmount + ppnAmount + ppnbmAmount + pphAmount;
  
  return {
    cifValue,
    bmRate,
    bmAmount,
    ppnBase,
    ppnRate,
    ppnAmount,
    ppnbmRate,
    ppnbmAmount,
    pphBase,
    pphRate,
    pphAmount,
    totalDuties,
  };
}

// Calculate total duties for an HS code
export async function calculateDuties(
  hsCode: string,
  cifValue: number,
  ftaCode?: FTACode
): Promise<DutyCalculation | null> {
  const rates = await getHSCodeRates(hsCode);
  if (!rates) return null;
  
  let bmRate = rates.bmRate;
  let usedPreferentialRate = false;
  
  // Check for preferential rate if FTA specified
  if (ftaCode) {
    const prefRate = await getPreferentialRate(hsCode, ftaCode);
    if (prefRate !== null) {
      bmRate = prefRate;
      usedPreferentialRate = true;
    }
  }
  
  const calculation = calculateDutiesFromRates(
    cifValue,
    bmRate,
    rates.ppnRate,
    rates.ppnbmRate,
    rates.pphRate
  );
  
  return {
    ...calculation,
    usedPreferentialRate,
    ftaCode: usedPreferentialRate ? ftaCode : undefined,
  };
}


// Get all HS chapters
export async function getHSChapters(): Promise<HSChapter[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hs_chapters')
    .select('*')
    .order('chapter_code');
  
  if (error) throw error;
  
  return (data || []).map((row) => transformChapter(row as unknown as HSChapterRow));
}

// Get headings for a chapter
export async function getHSHeadings(chapterId: string): Promise<HSHeading[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hs_headings')
    .select(`
      *,
      chapter:hs_chapters(*)
    `)
    .eq('chapter_id', chapterId)
    .order('heading_code');
  
  if (error) throw error;
  
  return (data || []).map((row) => transformHeading(row as unknown as HSHeadingRow));
}

// Get headings by chapter code
export async function getHSHeadingsByChapterCode(chapterCode: string): Promise<HSHeading[]> {
  const supabase = createClient();
  
  const { data: chapter, error: chapterError } = await supabase
    .from('hs_chapters')
    .select('id')
    .eq('chapter_code', chapterCode)
    .single();
  
  if (chapterError || !chapter) return [];
  
  return getHSHeadings(chapter.id);
}

// Get HS codes for a heading
export async function getHSCodesForHeading(headingId: string): Promise<HSCode[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hs_codes')
    .select(`
      *,
      heading:hs_headings(
        *,
        chapter:hs_chapters(*)
      )
    `)
    .eq('heading_id', headingId)
    .eq('is_active', true)
    .order('hs_code');
  
  if (error) throw error;
  
  return (data || []).map((row) => transformHSCode(row as unknown as HSCodeRow));
}

// Get HS codes by heading code
export async function getHSCodesByHeadingCode(headingCode: string): Promise<HSCode[]> {
  const supabase = createClient();
  
  const { data: heading, error: headingError } = await supabase
    .from('hs_headings')
    .select('id')
    .eq('heading_code', headingCode)
    .single();
  
  if (headingError || !heading) return [];
  
  return getHSCodesForHeading(heading.id);
}

// Get frequently used HS codes for a user
export async function getFrequentHSCodes(
  userId: string,
  limit: number = 10
): Promise<HSCode[]> {
  const supabase = createClient();
  
  // Get last 100 searches for the user
  const { data: history, error: historyError } = await supabase
    .from('hs_code_search_history')
    .select('selected_hs_code')
    .eq('user_id', userId)
    .order('searched_at', { ascending: false })
    .limit(100);
  
  if (historyError || !history || history.length === 0) return [];
  
  // Count frequency
  const frequency: Record<string, number> = {};
  for (const { selected_hs_code } of history) {
    if (selected_hs_code) {
      frequency[selected_hs_code] = (frequency[selected_hs_code] || 0) + 1;
    }
  }
  
  // Get top codes
  const topCodes = Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([code]) => code);
  
  if (topCodes.length === 0) return [];
  
  // Fetch HS code details
  const { data: hsCodes, error: hsError } = await supabase
    .from('hs_codes')
    .select(`
      *,
      heading:hs_headings(
        *,
        chapter:hs_chapters(*)
      )
    `)
    .in('hs_code', topCodes)
    .eq('is_active', true);
  
  if (hsError || !hsCodes) return [];
  
  // Sort by frequency
  const codeMap = new Map((hsCodes as HSCodeRow[]).map((row: HSCodeRow) => [row.hs_code, transformHSCode(row)]));
  return topCodes
    .map(code => codeMap.get(code))
    .filter((code): code is HSCode => code !== undefined);
}

// Validate FTA code
export function isValidFTACode(code: string): code is FTACode {
  return ['ATIGA', 'ACFTA', 'AKFTA', 'AJCEP', 'AANZFTA', 'IJEPA'].includes(code);
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format percentage for display
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(2)}%`;
}
