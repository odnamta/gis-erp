'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  User,
  FileText,
  CreditCard,
  Star,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { VendorWithStats } from '@/types/vendors';
import {
  getVendorTypeLabel,
  formatVendorCurrency,
  formatRating,
  formatPercentage,
} from '@/lib/vendor-utils';

interface VendorDetailViewProps {
  vendor: VendorWithStats;
}

export function VendorDetailView({ vendor }: VendorDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRating(vendor.average_rating)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {vendor.ratings_count || 0} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(vendor.on_time_rate)}
            </div>
            <p className="text-xs text-muted-foreground">Delivery punctuality</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendor.total_jobs}</div>
            <p className="text-xs text-muted-foreground">Completed jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatVendorCurrency(vendor.total_value)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime value</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                {vendor.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {vendor.is_preferred && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <Star className="mr-1 h-3 w-3" />
                  Preferred
                </Badge>
              )}
              {vendor.is_verified ? (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-500 text-orange-600">
                  <XCircle className="mr-1 h-3 w-3" />
                  Pending Verification
                </Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">
                    {getVendorTypeLabel(vendor.vendor_type)}
                  </p>
                </div>
              </div>

              {vendor.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                  </div>
                </div>
              )}

              {vendor.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{vendor.email}</p>
                  </div>
                </div>
              )}

              {vendor.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {vendor.website}
                    </a>
                  </div>
                </div>
              )}

              {(vendor.address || vendor.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {[vendor.address, vendor.city, vendor.province, vendor.postal_code]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Primary Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.contact_person ? (
              <>
                <div>
                  <p className="text-sm font-medium">{vendor.contact_person}</p>
                  {vendor.contact_position && (
                    <p className="text-sm text-muted-foreground">
                      {vendor.contact_position}
                    </p>
                  )}
                </div>

                {vendor.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{vendor.contact_phone}</span>
                  </div>
                )}

                {vendor.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{vendor.contact_email}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No contact person set</p>
            )}
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Legal & Tax Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.legal_name && (
              <div>
                <p className="text-sm font-medium">Legal Name</p>
                <p className="text-sm text-muted-foreground">{vendor.legal_name}</p>
              </div>
            )}

            {vendor.tax_id && (
              <div>
                <p className="text-sm font-medium">Tax ID (NPWP)</p>
                <p className="text-sm text-muted-foreground">{vendor.tax_id}</p>
              </div>
            )}

            {vendor.business_license && (
              <div>
                <p className="text-sm font-medium">Business License</p>
                <p className="text-sm text-muted-foreground">{vendor.business_license}</p>
              </div>
            )}

            {!vendor.legal_name && !vendor.tax_id && !vendor.business_license && (
              <p className="text-sm text-muted-foreground">No legal information set</p>
            )}
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.bank_name ? (
              <>
                <div>
                  <p className="text-sm font-medium">Bank</p>
                  <p className="text-sm text-muted-foreground">
                    {vendor.bank_name}
                    {vendor.bank_branch && ` - ${vendor.bank_branch}`}
                  </p>
                </div>

                {vendor.bank_account && (
                  <div>
                    <p className="text-sm font-medium">Account Number</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {vendor.bank_account}
                    </p>
                  </div>
                )}

                {vendor.bank_account_name && (
                  <div>
                    <p className="text-sm font-medium">Account Name</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.bank_account_name}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No bank details set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {vendor.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {vendor.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
