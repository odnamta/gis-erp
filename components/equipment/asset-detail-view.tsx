'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Ruler,
  Weight,
  Gauge,
  User,
  Briefcase,
  Shield,
  Clock,
} from 'lucide-react'
import { AssetWithRelations, AssetStatusHistory } from '@/types/assets'
import { AssetStatusBadge } from './asset-status-badge'
import {
  formatAssetCurrency,
  formatAssetDate,
  getDepreciationMethodLabel,
  calculateAssetAge,
  calculateStraightLineDepreciation,
} from '@/lib/asset-utils'
import { usePermissions } from '@/components/providers/permission-provider'

interface AssetDetailViewProps {
  asset: AssetWithRelations
  statusHistory?: AssetStatusHistory[]
}

export function AssetDetailView({ asset, statusHistory = [] }: AssetDetailViewProps) {
  const { canAccess } = usePermissions()
  const canViewFinancials = canAccess('assets.view_financials')

  // Calculate depreciation if applicable
  let depreciation = null
  if (asset.purchase_price && asset.useful_life_years && asset.purchase_date) {
    const yearsElapsed = calculateAssetAge(asset.purchase_date)
    depreciation = calculateStraightLineDepreciation(
      asset.purchase_price,
      asset.salvage_value || 0,
      asset.useful_life_years,
      yearsElapsed
    )
  }

  return (
    <div className="space-y-6">
      {/* Status and Basic Info */}
      <div className="flex flex-wrap items-center gap-2">
        <AssetStatusBadge status={asset.status} />
        {asset.category && (
          <Badge variant="outline">{asset.category.category_name}</Badge>
        )}
        {asset.location && (
          <Badge variant="secondary">
            <MapPin className="mr-1 h-3 w-3" />
            {asset.location.location_name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.registration_number && (
              <div>
                <p className="text-sm font-medium">Registration Number</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {asset.registration_number}
                </p>
              </div>
            )}
            {(asset.brand || asset.model) && (
              <div>
                <p className="text-sm font-medium">Brand / Model</p>
                <p className="text-sm text-muted-foreground">
                  {[asset.brand, asset.model].filter(Boolean).join(' ')}
                </p>
              </div>
            )}
            {asset.year_manufactured && (
              <div>
                <p className="text-sm font-medium">Year Manufactured</p>
                <p className="text-sm text-muted-foreground">{asset.year_manufactured}</p>
              </div>
            )}
            {asset.color && (
              <div>
                <p className="text-sm font-medium">Color</p>
                <p className="text-sm text-muted-foreground">{asset.color}</p>
              </div>
            )}
            {asset.vin_number && (
              <div>
                <p className="text-sm font-medium">VIN Number</p>
                <p className="text-sm text-muted-foreground font-mono">{asset.vin_number}</p>
              </div>
            )}
            {asset.engine_number && (
              <div>
                <p className="text-sm font-medium">Engine Number</p>
                <p className="text-sm text-muted-foreground font-mono">{asset.engine_number}</p>
              </div>
            )}
            {asset.chassis_number && (
              <div>
                <p className="text-sm font-medium">Chassis Number</p>
                <p className="text-sm text-muted-foreground font-mono">{asset.chassis_number}</p>
              </div>
            )}
            {!asset.registration_number && !asset.brand && !asset.model && (
              <p className="text-sm text-muted-foreground">No vehicle information</p>
            )}
          </CardContent>
        </Card>

        {/* Capacity & Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Capacity & Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.capacity_tons && (
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Capacity</p>
                  <p className="text-sm text-muted-foreground">{asset.capacity_tons} tons</p>
                </div>
              </div>
            )}
            {asset.capacity_cbm && (
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Volume Capacity</p>
                  <p className="text-sm text-muted-foreground">{asset.capacity_cbm} CBM</p>
                </div>
              </div>
            )}
            {asset.axle_configuration && (
              <div>
                <p className="text-sm font-medium">Axle Configuration</p>
                <p className="text-sm text-muted-foreground">{asset.axle_configuration}</p>
              </div>
            )}
            {(asset.length_m || asset.width_m || asset.height_m) && (
              <div>
                <p className="text-sm font-medium">Dimensions (L × W × H)</p>
                <p className="text-sm text-muted-foreground">
                  {asset.length_m || '-'} × {asset.width_m || '-'} × {asset.height_m || '-'} m
                </p>
              </div>
            )}
            {asset.weight_kg && (
              <div>
                <p className="text-sm font-medium">Weight</p>
                <p className="text-sm text-muted-foreground">
                  {asset.weight_kg.toLocaleString()} kg
                </p>
              </div>
            )}
            {!asset.capacity_tons && !asset.capacity_cbm && !asset.length_m && (
              <p className="text-sm text-muted-foreground">No capacity/dimension data</p>
            )}
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.assigned_employee ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Assigned Employee</p>
                  <p className="text-sm text-muted-foreground">
                    {asset.assigned_employee.full_name} ({asset.assigned_employee.employee_code})
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned to any employee</p>
            )}
            {asset.assigned_job ? (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Assigned Job</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {asset.assigned_job.jo_number}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned to any job</p>
            )}
          </CardContent>
        </Card>

        {/* Insurance & Registration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Insurance & Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.insurance_provider && (
              <div>
                <p className="text-sm font-medium">Insurance Provider</p>
                <p className="text-sm text-muted-foreground">{asset.insurance_provider}</p>
              </div>
            )}
            {asset.insurance_policy_number && (
              <div>
                <p className="text-sm font-medium">Policy Number</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {asset.insurance_policy_number}
                </p>
              </div>
            )}
            {asset.insurance_expiry_date && (
              <div>
                <p className="text-sm font-medium">Insurance Expiry</p>
                <p className="text-sm text-muted-foreground">
                  {formatAssetDate(asset.insurance_expiry_date)}
                </p>
              </div>
            )}
            {asset.registration_expiry_date && (
              <div>
                <p className="text-sm font-medium">Registration Expiry</p>
                <p className="text-sm text-muted-foreground">
                  {formatAssetDate(asset.registration_expiry_date)}
                </p>
              </div>
            )}
            {asset.kir_expiry_date && (
              <div>
                <p className="text-sm font-medium">KIR Expiry</p>
                <p className="text-sm text-muted-foreground">
                  {formatAssetDate(asset.kir_expiry_date)}
                </p>
              </div>
            )}
            {!asset.insurance_provider && !asset.registration_expiry_date && (
              <p className="text-sm text-muted-foreground">No insurance/registration data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Information - Permission Gated */}
      {canViewFinancials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Purchase Details</h4>
                {asset.purchase_date && (
                  <div>
                    <p className="text-sm font-medium">Purchase Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAssetDate(asset.purchase_date)}
                    </p>
                  </div>
                )}
                {asset.purchase_price && (
                  <div>
                    <p className="text-sm font-medium">Purchase Price</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAssetCurrency(asset.purchase_price)}
                    </p>
                  </div>
                )}
                {asset.purchase_vendor && (
                  <div>
                    <p className="text-sm font-medium">Vendor</p>
                    <p className="text-sm text-muted-foreground">{asset.purchase_vendor}</p>
                  </div>
                )}
                {asset.purchase_invoice && (
                  <div>
                    <p className="text-sm font-medium">Invoice Number</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {asset.purchase_invoice}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Depreciation</h4>
                <div>
                  <p className="text-sm font-medium">Method</p>
                  <p className="text-sm text-muted-foreground">
                    {getDepreciationMethodLabel(asset.depreciation_method)}
                  </p>
                </div>
                {asset.useful_life_years && (
                  <div>
                    <p className="text-sm font-medium">Useful Life</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.useful_life_years} years
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Salvage Value</p>
                  <p className="text-sm text-muted-foreground">
                    {formatAssetCurrency(asset.salvage_value)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Current Values</h4>
                {depreciation && (
                  <>
                    <div>
                      <p className="text-sm font-medium">Annual Depreciation</p>
                      <p className="text-sm text-muted-foreground">
                        {formatAssetCurrency(depreciation.annualDepreciation)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Accumulated Depreciation</p>
                      <p className="text-sm text-muted-foreground">
                        {formatAssetCurrency(depreciation.accumulatedDepreciation)}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-medium">Book Value</p>
                  <p className="text-lg font-bold text-primary">
                    {formatAssetCurrency(depreciation?.bookValue ?? asset.book_value)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {asset.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {asset.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      {statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusHistory.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {index < statusHistory.length - 1 && (
                      <div className="h-full w-px bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      {history.previous_status && (
                        <>
                          <AssetStatusBadge status={history.previous_status} />
                          <span className="text-muted-foreground">→</span>
                        </>
                      )}
                      <AssetStatusBadge status={history.new_status} />
                    </div>
                    <p className="mt-1 text-sm">{history.reason}</p>
                    {history.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{history.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAssetDate(history.changed_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
