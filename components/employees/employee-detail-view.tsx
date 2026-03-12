'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EmployeeWithRelations } from '@/types/employees';
import { EmployeeStatusBadge } from './employee-status-badge';
import {
  formatEmployeeDate,
  formatSalary,
  getEmploymentTypeLabel,
  getGenderLabel,
  getMaritalStatusLabel,
  calculateYearsOfService,
} from '@/lib/employee-utils';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

interface EmployeeDetailViewProps {
  employee: EmployeeWithRelations;
  canViewSalary?: boolean;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />}
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}

export function EmployeeDetailView({ employee, canViewSalary = false }: EmployeeDetailViewProps) {
  const yearsOfService = calculateYearsOfService(employee.join_date);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              {employee.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={employee.photo_url}
                  alt={employee.full_name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{employee.full_name}</h2>
                <EmployeeStatusBadge status={employee.status} />
              </div>
              {employee.nickname && (
                <p className="text-muted-foreground">({employee.nickname})</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="font-mono">{employee.employee_code}</span>
                <span>•</span>
                <span>{employee.position?.position_name || 'No position'}</span>
                <span>•</span>
                <span>{employee.department?.department_name || 'No department'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{getEmploymentTypeLabel(employee.employment_type)}</Badge>
                <Badge variant="secondary">{yearsOfService} years</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="ID Number (KTP)" value={employee.id_number} />
            <InfoRow label="Tax ID (NPWP)" value={employee.tax_id} />
            <InfoRow label="Date of Birth" value={formatEmployeeDate(employee.date_of_birth)} />
            <InfoRow label="Place of Birth" value={employee.place_of_birth} />
            <InfoRow label="Gender" value={employee.gender ? getGenderLabel(employee.gender) : null} />
            <InfoRow label="Religion" value={employee.religion} />
            <InfoRow label="Marital Status" value={employee.marital_status ? getMaritalStatusLabel(employee.marital_status) : null} />
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="Email" value={employee.email} icon={Mail} />
            <InfoRow label="Phone" value={employee.phone} icon={Phone} />
            <InfoRow label="City" value={employee.city} icon={MapPin} />
            <InfoRow label="Address" value={employee.address} />
            
            <Separator className="my-4" />
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Emergency Contact
            </h4>
            <InfoRow label="Name" value={employee.emergency_contact_name} />
            <InfoRow label="Phone" value={employee.emergency_contact_phone} />
            <InfoRow label="Relation" value={employee.emergency_contact_relation} />
          </CardContent>
        </Card>


        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="Department" value={employee.department?.department_name || null} icon={Building2} />
            <InfoRow label="Position" value={employee.position?.position_name || null} icon={Briefcase} />
            <InfoRow
              label="Reports To"
              value={
                employee.reporting_manager
                  ? `${employee.reporting_manager.full_name} (${employee.reporting_manager.employee_code})`
                  : null
              }
            />
            <InfoRow label="Employment Type" value={getEmploymentTypeLabel(employee.employment_type)} />
            <InfoRow label="Join Date" value={formatEmployeeDate(employee.join_date)} icon={Calendar} />
            {employee.end_date && (
              <InfoRow label="End Date" value={formatEmployeeDate(employee.end_date)} />
            )}
            {employee.resignation_date && (
              <>
                <InfoRow label="Resignation Date" value={formatEmployeeDate(employee.resignation_date)} />
                {employee.resignation_reason && (
                  <InfoRow label="Resignation Reason" value={employee.resignation_reason} />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Compensation - Only shown if user has permission */}
        {canViewSalary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compensation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow
                label="Base Salary"
                value={formatSalary(employee.base_salary, employee.salary_currency)}
                icon={CreditCard}
              />
              <Separator className="my-4" />
              <h4 className="text-sm font-medium">Bank Details</h4>
              <InfoRow label="Bank Name" value={employee.bank_name} />
              <InfoRow label="Account Number" value={employee.bank_account} />
              <InfoRow label="Account Name" value={employee.bank_account_name} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {employee.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{employee.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Created: {formatEmployeeDate(employee.created_at)}</span>
            <span>Last Updated: {formatEmployeeDate(employee.updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
