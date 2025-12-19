'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Loader2, Star, CheckCircle2, Truck, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VendorDetailView } from '@/components/vendors/vendor-detail-view';
import { EquipmentTable } from '@/components/vendors/equipment-table';
import { VendorDocuments } from '@/components/vendors/vendor-documents';
import { VendorWithStats, VendorEquipment, VendorDocument } from '@/types/vendors';
import { getVendorById, verifyVendor, togglePreferredVendor } from '../actions';
import { getVendorEquipment, deleteEquipment } from '../equipment-actions';
import { getVendorDocuments, uploadVendorDocument, deleteVendorDocument } from '../document-actions';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/components/providers/permission-provider';

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { canAccess } = usePermissions();

  const [vendor, setVendor] = useState<VendorWithStats | null>(null);
  const [equipment, setEquipment] = useState<VendorEquipment[]>([]);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTogglingPreferred, setIsTogglingPreferred] = useState(false);

  const vendorId = params.id as string;
  const canEdit = canAccess('vendors.edit');
  const canVerify = canAccess('vendors.verify');
  const canSetPreferred = canAccess('vendors.set_preferred');
  const canAddEquipment = canAccess('vendors.add_equipment');

  const loadData = async () => {
    const [vendorResult, equipmentResult, documentsResult] = await Promise.all([
      getVendorById(vendorId),
      getVendorEquipment(vendorId),
      getVendorDocuments(vendorId),
    ]);

    if (vendorResult.error) {
      toast({
        title: 'Error',
        description: vendorResult.error,
        variant: 'destructive',
      });
      router.push('/vendors');
      return;
    }

    if (vendorResult.data) {
      setVendor(vendorResult.data);
    }
    if (equipmentResult.data) {
      setEquipment(equipmentResult.data);
    }
    if (documentsResult.data) {
      setDocuments(documentsResult.data);
    }
    setIsLoading(false);
  };

  const loadDocuments = async () => {
    const result = await getVendorDocuments(vendorId);
    if (result.data) {
      setDocuments(result.data);
    }
  };

  useEffect(() => {
    loadData();
  }, [vendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async () => {
    if (!vendor) return;
    setIsVerifying(true);
    const result = await verifyVendor(vendorId);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Vendor verified successfully',
      });
      // Reload vendor data
      const updated = await getVendorById(vendorId);
      if (updated.data) setVendor(updated.data);
    }
    setIsVerifying(false);
  };

  const handleTogglePreferred = async () => {
    if (!vendor) return;
    setIsTogglingPreferred(true);
    const result = await togglePreferredVendor(vendorId, !vendor.is_preferred);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: vendor.is_preferred
          ? 'Vendor removed from preferred list'
          : 'Vendor added to preferred list',
      });
      // Reload vendor data
      const updated = await getVendorById(vendorId);
      if (updated.data) setVendor(updated.data);
    }
    setIsTogglingPreferred(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vendor not found</p>
        <Button variant="link" onClick={() => router.push('/vendors')}>
          Back to Vendors
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/vendors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{vendor.vendor_name}</h1>
            <p className="text-muted-foreground">{vendor.vendor_code}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canVerify && !vendor.is_verified && (
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Verify
            </Button>
          )}

          {canSetPreferred && (
            <Button
              variant="outline"
              onClick={handleTogglePreferred}
              disabled={isTogglingPreferred}
            >
              {isTogglingPreferred ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Star
                  className={`mr-2 h-4 w-4 ${
                    vendor.is_preferred ? 'fill-yellow-500 text-yellow-500' : ''
                  }`}
                />
              )}
              {vendor.is_preferred ? 'Remove Preferred' : 'Set Preferred'}
            </Button>
          )}

          {canAddEquipment && (
            <Button
              variant="outline"
              onClick={() => router.push(`/vendors/${vendorId}/equipment/new`)}
            >
              <Truck className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          )}

          {canEdit && (
            <Button onClick={() => router.push(`/vendors/${vendorId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Vendor Details */}
      <VendorDetailView vendor={vendor} />

      {/* Equipment Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Equipment ({equipment.length})
          </CardTitle>
          {canAddEquipment && (
            <Button
              size="sm"
              onClick={() => router.push(`/vendors/${vendorId}/equipment/new`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <EquipmentTable
            equipment={equipment}
            canEdit={canEdit}
            onEdit={(eq) => router.push(`/vendors/${vendorId}/equipment/${eq.id}/edit`)}
            onDelete={async (equipmentId) => {
              const result = await deleteEquipment(equipmentId, vendorId);
              if (result.error) {
                toast({
                  title: 'Error',
                  description: result.error,
                  variant: 'destructive',
                });
              } else {
                toast({
                  title: 'Success',
                  description: 'Equipment deleted successfully',
                });
                // Reload equipment
                const updated = await getVendorEquipment(vendorId);
                if (updated.data) setEquipment(updated.data);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VendorDocuments
            vendorId={vendorId}
            documents={documents}
            canEdit={canEdit}
            onUpload={async (formData) => {
              const result = await uploadVendorDocument(vendorId, formData);
              if (result.error) {
                toast({
                  title: 'Error',
                  description: result.error,
                  variant: 'destructive',
                });
                return { error: result.error };
              }
              toast({
                title: 'Success',
                description: 'Document uploaded successfully',
              });
              return {};
            }}
            onDelete={async (documentId) => {
              const result = await deleteVendorDocument(documentId, vendorId);
              if (result.error) {
                toast({
                  title: 'Error',
                  description: result.error,
                  variant: 'destructive',
                });
                return { error: result.error };
              }
              toast({
                title: 'Success',
                description: 'Document deleted successfully',
              });
              return {};
            }}
            onRefresh={loadDocuments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
