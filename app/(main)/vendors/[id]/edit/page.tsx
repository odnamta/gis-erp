'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorForm } from '@/components/vendors/vendor-form';
import { VendorFormData, Vendor } from '@/types/vendors';
import { getVendorById, updateVendor } from '../../actions';
import { useToast } from '@/hooks/use-toast';

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const vendorId = params.id as string;

  useEffect(() => {
    async function loadVendor() {
      const result = await getVendorById(vendorId);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        router.push('/vendors');
      } else if (result.data) {
        setVendor(result.data);
      }
      setIsLoading(false);
    }
    loadVendor();
  }, [vendorId, router, toast]);

  const handleSubmit = async (data: VendorFormData) => {
    setIsSaving(true);
    try {
      const result = await updateVendor(vendorId, data);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Vendor updated successfully',
        });
        router.push(`/vendors/${vendorId}`);
      }
    } finally {
      setIsSaving(false);
    }
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

  // Convert Vendor to VendorFormData
  const vendorFormData: VendorFormData = {
    vendor_name: vendor.vendor_name,
    vendor_type: vendor.vendor_type,
    address: vendor.address || undefined,
    city: vendor.city || undefined,
    province: vendor.province || undefined,
    postal_code: vendor.postal_code || undefined,
    phone: vendor.phone || undefined,
    email: vendor.email || undefined,
    website: vendor.website || undefined,
    contact_person: vendor.contact_person || undefined,
    contact_phone: vendor.contact_phone || undefined,
    contact_email: vendor.contact_email || undefined,
    contact_position: vendor.contact_position || undefined,
    legal_name: vendor.legal_name || undefined,
    tax_id: vendor.tax_id || undefined,
    business_license: vendor.business_license || undefined,
    bank_name: vendor.bank_name || undefined,
    bank_branch: vendor.bank_branch || undefined,
    bank_account: vendor.bank_account || undefined,
    bank_account_name: vendor.bank_account_name || undefined,
    is_active: vendor.is_active,
    is_preferred: vendor.is_preferred,
    notes: vendor.notes || undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Vendor</h1>
          <p className="text-muted-foreground">
            {vendor.vendor_code} - {vendor.vendor_name}
          </p>
        </div>
      </div>

      <VendorForm
        vendor={vendorFormData}
        onSubmit={handleSubmit}
        isLoading={isSaving}
        mode="edit"
      />
    </div>
  );
}
