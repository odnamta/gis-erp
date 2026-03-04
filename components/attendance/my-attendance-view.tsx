'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut, Loader2, Calendar, TrendingUp, AlertTriangle, Timer, MapPin } from 'lucide-react';
import { clockIn, clockOut, getTodayAttendance, getCurrentEmployeeInfo } from '@/app/(main)/hr/attendance/clock-actions';
import { getMonthlyAttendanceSummary, getMonthlyAttendanceRecords } from '@/app/(main)/hr/attendance/actions';
import { AttendanceRecord, MonthlySummary } from '@/types/attendance';
import { formatAttendanceTime, formatWorkHours, calculateOngoingWorkHours, getStatusDisplayInfo } from '@/lib/attendance-utils';
import { toast } from 'sonner';

interface MyAttendanceViewProps {
  employeeId?: string;
}

/**
 * Request browser geolocation and return as "lat,lng" string.
 * Returns undefined if geolocation is unavailable or user denies permission.
 */
const getLocation = (): Promise<string | undefined> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
      () => resolve(undefined),
      { timeout: 5000, enableHighAccuracy: false }
    )
  })
}

/**
 * Format an ISO timestamp to HH:MM (24h) for compact display
 */
function formatTimeHHMM(timestamp: string | null): string {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MyAttendanceView({ employeeId }: MyAttendanceViewProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<{ id: string; employee_code: string; full_name: string } | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [currentHours, setCurrentHours] = useState<number>(0);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [attendanceData, empInfo] = await Promise.all([
          getTodayAttendance(),
          getCurrentEmployeeInfo(),
        ]);
        setAttendance(attendanceData);
        setEmployeeInfo(empInfo);

        // Load monthly summary + records if we have employee info
        const empId = employeeId || empInfo?.id;
        if (empId) {
          const [summaryResult, recordsResult] = await Promise.all([
            getMonthlyAttendanceSummary(empId, currentYear, currentMonth),
            getMonthlyAttendanceRecords(empId, currentYear, currentMonth),
          ]);
          setMonthlySummary(summaryResult.data);
          setMonthlyRecords(recordsResult.data || []);
        }
      } catch (error) {
        console.error('Error loading attendance data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [employeeId, currentMonth, currentYear]);

  // Update ongoing hours every minute
  useEffect(() => {
    if (attendance?.clock_in && !attendance?.clock_out) {
      const updateHours = () => {
        const hours = calculateOngoingWorkHours(new Date(attendance.clock_in!));
        setCurrentHours(hours);
      };
      updateHours();
      const interval = setInterval(updateHours, 60000);
      return () => clearInterval(interval);
    }
  }, [attendance?.clock_in, attendance?.clock_out]);

  const handleClockIn = () => {
    startTransition(async () => {
      const location = await getLocation();
      const result = await clockIn(location);
      if (result.success && result.record) {
        setAttendance(result.record);
        toast.success('Berhasil clock in');
      } else {
        toast.error(result.error || 'Gagal clock in');
      }
    });
  };

  const handleClockOut = () => {
    startTransition(async () => {
      const location = await getLocation();
      const result = await clockOut(location);
      if (result.success && result.record) {
        setAttendance(result.record);
        toast.success('Berhasil clock out');
      } else {
        toast.error(result.error || 'Gagal clock out');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employeeInfo) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No employee record linked to your account. Please contact HR.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasClockedIn = !!attendance?.clock_in;
  const hasClockedOut = !!attendance?.clock_out;
  const statusInfo = attendance?.status ? getStatusDisplayInfo(attendance.status) : null;

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="space-y-6">
      {/* Today's Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Hari Ini: {today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Clock In Card */}
            <div className="border rounded-lg p-4 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">CLOCK IN</h3>
              <div className="text-3xl font-bold mb-2">
                {hasClockedIn ? formatAttendanceTime(attendance!.clock_in) : '--:--'}
              </div>
              {hasClockedIn && statusInfo && (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${statusInfo.bgColor} ${statusInfo.color}`}>
                  <span>{statusInfo.icon}</span>
                  <span>{statusInfo.label}</span>
                </div>
              )}
              {!hasClockedIn && (
                <Button
                  onClick={handleClockIn}
                  disabled={isPending}
                  className="mt-2 bg-green-600 hover:bg-green-700"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Clock In
                </Button>
              )}
            </div>

            {/* Clock Out Card */}
            <div className="border rounded-lg p-4 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">CLOCK OUT</h3>
              <div className="text-3xl font-bold mb-2">
                {hasClockedOut ? formatAttendanceTime(attendance!.clock_out) : '--:--'}
              </div>
              {hasClockedIn && !hasClockedOut && (
                <Button
                  onClick={handleClockOut}
                  disabled={isPending}
                  variant="destructive"
                  className="mt-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Clock Out
                </Button>
              )}
              {hasClockedOut && (
                <p className="text-sm text-green-600">Hari selesai</p>
              )}
            </div>
          </div>

          {/* Today's Work Detail */}
          {hasClockedIn && (
            <div className="mt-6 border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Detail Kerja Hari Ini</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {/* Jam Masuk */}
                <div className="flex items-start gap-2">
                  <LogIn className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Jam Masuk:</span>{' '}
                    <span className="font-medium">{formatTimeHHMM(attendance!.clock_in)}</span>
                    {attendance!.clock_in_location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>Lokasi: {attendance!.clock_in_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Jam Keluar */}
                <div className="flex items-start gap-2">
                  <LogOut className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Jam Keluar:</span>{' '}
                    <span className="font-medium">
                      {hasClockedOut ? formatTimeHHMM(attendance!.clock_out) : '-- (belum clock out)'}
                    </span>
                    {attendance!.clock_out_location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>Lokasi: {attendance!.clock_out_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Durasi Kerja */}
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Timer className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Durasi Kerja:</span>{' '}
                    <span className="font-bold">
                      {hasClockedOut
                        ? formatWorkHours(attendance!.work_hours)
                        : `${formatWorkHours(currentHours)} (berlangsung)`}
                    </span>
                    {attendance?.overtime_hours && attendance.overtime_hours > 0 && (
                      <span className="text-green-600 ml-2">
                        (+{formatWorkHours(attendance.overtime_hours)} lembur)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Bulan Ini: {monthNames[currentMonth - 1]} {currentYear}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Hari Kerja</span>
              </div>
              <p className="text-2xl font-bold mt-2">{monthlySummary?.daysWorked || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Hari Terlambat</span>
              </div>
              <p className="text-2xl font-bold mt-2">{monthlySummary?.lateDays || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Jam</span>
              </div>
              <p className="text-2xl font-bold mt-2">{monthlySummary?.totalHours || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Lembur</span>
              </div>
              <p className="text-2xl font-bold mt-2">{monthlySummary?.overtimeHours || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Records Table */}
      {monthlyRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Riwayat Absensi - {monthNames[currentMonth - 1]} {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Tanggal</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Jam Masuk</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Jam Keluar</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Durasi Kerja</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRecords.map((record) => {
                    const recStatusInfo = getStatusDisplayInfo(record.status);
                    const recordDate = new Date(record.attendance_date + 'T00:00:00');
                    const dayName = recordDate.toLocaleDateString('id-ID', { weekday: 'short' });
                    const dayNum = recordDate.getDate();

                    return (
                      <tr key={record.id} className="border-b last:border-b-0 hover:bg-muted/50">
                        <td className="py-2.5 pr-4">
                          <span className="font-medium">{dayNum}</span>
                          <span className="text-muted-foreground ml-1">{dayName}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div>
                            <span className="font-medium">{formatTimeHHMM(record.clock_in)}</span>
                            {record.clock_in_location && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>{record.clock_in_location}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div>
                            <span className="font-medium">{formatTimeHHMM(record.clock_out)}</span>
                            {record.clock_out_location && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>{record.clock_out_location}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-medium">
                          {record.work_hours != null ? formatWorkHours(record.work_hours) : '-'}
                          {record.overtime_hours != null && record.overtime_hours > 0 && (
                            <span className="text-green-600 text-xs ml-1">
                              +{formatWorkHours(record.overtime_hours)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${recStatusInfo.bgColor} ${recStatusInfo.color}`}>
                            <span>{recStatusInfo.icon}</span>
                            <span>{recStatusInfo.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
