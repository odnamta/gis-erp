'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaveTypeSelect } from './leave-type-select';
import { LeaveType, LeaveBalance, LeaveRequestFormData, HalfDayType } from '@/types/leave';
import { calculateWorkingDays, formatDays } from '@/lib/leave-utils';
import { submitLeaveRequest } from '@/app/(main)/hr/leave/actions';
import { toast } from 'sonner';
import { AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface LeaveRequestFormProps {
  employeeId: string;
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  employees: { id: string; full_name: string; department: string }[];
  holidays: string[];
}

export function LeaveRequestForm({
  employeeId,
  leaveTypes,
  balances,
  employees,
  holidays,
}: LeaveRequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LeaveRequestFormData>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    is_half_day: false,
    half_day_type: undefined,
    reason: '',
    emergency_contact: '',
    handover_to: '',
    handover_notes: '',
    attachment_url: '',
  });

  const [totalDays, setTotalDays] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  const selectedLeaveType = leaveTypes.find(t => t.id === formData.leave_type_id);
  const selectedBalance = balances.find(b => b.leave_type_id === formData.leave_type_id);

  // Calculate total days when dates change
  useEffect(() => {
    if (formData.is_half_day) {
      setTotalDays(0.5);
    } else if (formData.start_date && formData.end_date) {
      const days = calculateWorkingDays(formData.start_date, formData.end_date, holidays);
      setTotalDays(days);
    } else {
      setTotalDays(0);
    }
  }, [formData.start_date, formData.end_date, formData.is_half_day, holidays]);

  // Check for warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    if (selectedLeaveType && formData.start_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = parseISO(formData.start_date);
      const daysInAdvance = differenceInDays(startDate, today);

      if (daysInAdvance < selectedLeaveType.min_days_advance) {
        newWarnings.push(
          `You need to request at least ${selectedLeaveType.min_days_advance} days in advance for ${selectedLeaveType.type_name}.`
        );
      }
    }

    if (selectedBalance && totalDays > selectedBalance.available_days) {
      newWarnings.push(
        `Insufficient balance. You have ${formatDays(selectedBalance.available_days)} available.`
      );
    }

    if (selectedLeaveType?.requires_attachment && !formData.attachment_url) {
      newWarnings.push(`${selectedLeaveType.type_name} requires an attachment (e.g., medical certificate).`);
    }

    setWarnings(newWarnings);
  }, [selectedLeaveType, selectedBalance, formData.start_date, formData.attachment_url, totalDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (warnings.length > 0) {
      toast.error('Please fix the warnings before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitLeaveRequest(employeeId, formData);
      
      if (result.success) {
        toast.success('Leave request submitted successfully');
        router.push('/hr/my-leave');
      } else {
        toast.error(result.error || 'Failed to submit leave request');
      }
    } catch (error) {
      toast.error('An error occurred while submitting the request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Type</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveTypeSelect
            leaveTypes={leaveTypes}
            balances={balances}
            value={formData.leave_type_id}
            onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_half_day"
              checked={formData.is_half_day}
              onCheckedChange={(checked) => 
                setFormData({ 
                  ...formData, 
                  is_half_day: checked as boolean,
                  half_day_type: checked ? 'morning' : undefined,
                  end_date: checked ? formData.start_date : formData.end_date,
                })
              }
            />
            <Label htmlFor="is_half_day">Half day only</Label>
          </div>

          {formData.is_half_day && (
            <div className="space-y-2">
              <Label>Half Day Type</Label>
              <Select
                value={formData.half_day_type}
                onValueChange={(value) => setFormData({ ...formData, half_day_type: value as HalfDayType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total Days: </span>
            <span className="font-bold text-lg">{formatDays(totalDays)}</span>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for leave..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact">Emergency Contact</Label>
            <Input
              id="emergency_contact"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              placeholder="Name - Phone number"
            />
          </div>

          {selectedLeaveType?.requires_attachment && (
            <div className="space-y-2">
              <Label htmlFor="attachment_url">Attachment URL *</Label>
              <Input
                id="attachment_url"
                value={formData.attachment_url}
                onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                placeholder="Enter attachment URL (e.g., medical certificate)"
                required={selectedLeaveType.requires_attachment}
              />
              <p className="text-xs text-muted-foreground">
                Upload your document to cloud storage and paste the link here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Handover</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handover_to">Handover To</Label>
            <Select
              value={formData.handover_to}
              onValueChange={(value) => setFormData({ ...formData, handover_to: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select colleague" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter(e => e.id !== employeeId)
                  .map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.department})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="handover_notes">Handover Notes</Label>
            <Textarea
              id="handover_notes"
              value={formData.handover_notes}
              onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
              placeholder="Describe tasks to be handed over..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.leave_type_id || !formData.start_date || !formData.end_date || warnings.length > 0}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Request
        </Button>
      </div>
    </form>
  );
}
