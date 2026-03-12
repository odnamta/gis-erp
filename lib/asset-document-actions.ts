'use server';

import { createClient } from '@/lib/supabase/server';
import { AssetDocumentType, DocumentExpiryStatus } from '@/types/assets';
import { getDocumentExpiryStatus } from '@/lib/asset-utils';

export interface AssetDocumentWithAsset {
  id: string;
  asset_id: string;
  document_type: AssetDocumentType;
  document_name: string;
  document_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  reminder_days: number;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  asset_code: string;
  asset_name: string;
  registration_number: string | null;
  expiry_status: DocumentExpiryStatus;
}

export interface CertificationStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

export interface AssetDocumentFilters {
  search?: string;
  documentType?: AssetDocumentType | 'all';
  expiryStatus?: 'all' | 'valid' | 'expiring_soon' | 'expired';
}

async function fetchDocumentsWithAssets(
  typeFilter?: AssetDocumentType[]
): Promise<AssetDocumentWithAsset[]> {
  const supabase = await createClient();

  let query = supabase
    .from('asset_documents' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .order('expiry_date', { ascending: true, nullsFirst: false });

  if (typeFilter && typeFilter.length > 0) {
    query = query.in('document_type', typeFilter);
  }

  const { data: docs, error } = await query;
  if (error) {
    console.error('[AssetDocs] fetch failed:', error);
    return [];
  }

  if (!docs || docs.length === 0) return [];

  // Fetch asset info for all docs
  const assetIds = [...new Set((docs as any[]).map((d: any) => d.asset_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: assets } = await supabase
    .from('equipment_assets' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, asset_code, asset_name, registration_number')
    .in('id', assetIds);

  const assetMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (assets || []).forEach((a: any) => assetMap.set(a.id, a)); // eslint-disable-line @typescript-eslint/no-explicit-any

  return (docs as any[]).map((doc: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const asset = assetMap.get(doc.asset_id) || {};
    return {
      id: doc.id,
      asset_id: doc.asset_id,
      document_type: doc.document_type,
      document_name: doc.document_name,
      document_url: doc.document_url,
      issue_date: doc.issue_date,
      expiry_date: doc.expiry_date,
      reminder_days: doc.reminder_days || 30,
      notes: doc.notes,
      uploaded_by: doc.uploaded_by,
      uploaded_at: doc.uploaded_at || doc.created_at,
      asset_code: asset.asset_code || '-',
      asset_name: asset.asset_name || '-',
      registration_number: asset.registration_number || null,
      expiry_status: getDocumentExpiryStatus(doc.expiry_date, doc.reminder_days || 30),
    };
  });
}

function applyFilters(
  docs: AssetDocumentWithAsset[],
  filters?: AssetDocumentFilters
): AssetDocumentWithAsset[] {
  if (!filters) return docs;

  let result = docs;

  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (d) =>
        d.asset_name.toLowerCase().includes(s) ||
        d.asset_code.toLowerCase().includes(s) ||
        d.document_name.toLowerCase().includes(s) ||
        (d.registration_number && d.registration_number.toLowerCase().includes(s))
    );
  }

  if (filters.documentType && filters.documentType !== 'all') {
    result = result.filter((d) => d.document_type === filters.documentType);
  }

  if (filters.expiryStatus && filters.expiryStatus !== 'all') {
    result = result.filter((d) => d.expiry_status === filters.expiryStatus);
  }

  return result;
}

export async function getCertificationDocuments(
  filters?: AssetDocumentFilters
): Promise<AssetDocumentWithAsset[]> {
  const docs = await fetchDocumentsWithAssets(['certification', 'silo']);
  return applyFilters(docs, filters);
}

export async function getCertificationStats(): Promise<CertificationStats> {
  const docs = await fetchDocumentsWithAssets(['certification', 'silo']);
  return {
    total: docs.length,
    valid: docs.filter((d) => d.expiry_status === 'valid' || d.expiry_status === 'no_expiry').length,
    expiringSoon: docs.filter((d) => d.expiry_status === 'expiring_soon').length,
    expired: docs.filter((d) => d.expiry_status === 'expired').length,
  };
}

export async function getAllAssetDocuments(
  filters?: AssetDocumentFilters
): Promise<AssetDocumentWithAsset[]> {
  const docs = await fetchDocumentsWithAssets();
  return applyFilters(docs, filters);
}

export async function getAssetDocumentStats(): Promise<{
  total: number;
  withExpiry: number;
  expiringSoon: number;
  expired: number;
}> {
  const docs = await fetchDocumentsWithAssets();
  return {
    total: docs.length,
    withExpiry: docs.filter((d) => d.expiry_date !== null).length,
    expiringSoon: docs.filter((d) => d.expiry_status === 'expiring_soon').length,
    expired: docs.filter((d) => d.expiry_status === 'expired').length,
  };
}
