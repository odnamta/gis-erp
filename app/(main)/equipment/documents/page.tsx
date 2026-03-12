import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllAssetDocuments, getAssetDocumentStats } from '@/lib/asset-document-actions';
import { getAssetDocumentTypeLabel } from '@/lib/asset-utils';
import { formatDate } from '@/lib/utils/format';
import { DocumentExpiryStatus } from '@/types/assets';
import { FileText, AlertTriangle, XCircle, Files } from 'lucide-react';
import Link from 'next/link';

function ExpiryBadge({ status }: { status: DocumentExpiryStatus }) {
  switch (status) {
    case 'valid':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Berlaku</Badge>;
    case 'expiring_soon':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Segera Kedaluwarsa</Badge>;
    case 'expired':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Kedaluwarsa</Badge>;
    case 'no_expiry':
      return <Badge variant="outline">-</Badge>;
    default:
      return <Badge variant="outline">-</Badge>;
  }
}

export default async function AssetDocumentsPage() {
  const [documents, stats] = await Promise.all([
    getAllAssetDocuments(),
    getAssetDocumentStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dokumen Aset</h1>
        <p className="text-muted-foreground">
          Kelola seluruh dokumen di semua aset perusahaan
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Untuk menambahkan dokumen, buka halaman detail aset masing-masing dari{' '}
          <Link href="/equipment" className="text-primary hover:underline font-medium">Daftar Aset</Link>.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Dokumen</CardTitle>
            <Files className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dengan Kedaluwarsa</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withExpiry}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Segera Kedaluwarsa</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kedaluwarsa</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aset</TableHead>
                <TableHead>Kode Aset</TableHead>
                <TableHead>Tipe Dokumen</TableHead>
                <TableHead>Nama Dokumen</TableHead>
                <TableHead>Tanggal Terbit</TableHead>
                <TableHead>Kedaluwarsa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Belum ada dokumen aset
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.asset_name}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.asset_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getAssetDocumentTypeLabel(doc.document_type)}</Badge>
                    </TableCell>
                    <TableCell>{doc.document_name}</TableCell>
                    <TableCell>{doc.issue_date ? formatDate(doc.issue_date) : '-'}</TableCell>
                    <TableCell>{doc.expiry_date ? formatDate(doc.expiry_date) : '-'}</TableCell>
                    <TableCell>
                      <ExpiryBadge status={doc.expiry_status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
