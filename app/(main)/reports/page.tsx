'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissions } from '@/components/providers/permission-provider'
import { ReportCard } from '@/components/reports/ReportCard'
import { ReportSearchInput } from '@/components/reports/ReportSearchInput'
import { RecentReportsBar } from '@/components/reports/RecentReportsBar'
import {
  getReportsByCategory,
  getCategoryDisplayName,
} from '@/lib/reports/report-permissions'
import {
  getReportsByCategoryDB,
  filterReportsBySearch,
} from '@/lib/reports/report-config-utils'
import { ReportCategory, ReportCategoryDB, ReportConfigurationDB } from '@/types/reports'
import { UserRole } from '@/types/permissions'
import {
  DollarSign,
  Settings,
  Receipt,
  TrendingUp,
  LayoutDashboard,
  LucideIcon,
  Loader2,
} from 'lucide-react'

const categoryIcons: Record<ReportCategory | ReportCategoryDB, LucideIcon> = {
  financial: DollarSign,
  operational: Settings,
  ar: Receipt,
  sales: TrendingUp,
  finance: DollarSign,
  operations: Settings,
  executive: LayoutDashboard,
}

const categoryDisplayNames: Record<ReportCategoryDB, string> = {
  operations: 'Operations',
  finance: 'Finance',
  sales: 'Sales',
  executive: 'Executive',
}

// Category display order
const categoryOrder: ReportCategoryDB[] = ['operations', 'finance', 'sales', 'executive']

export default function ReportsPage() {
  const { profile } = usePermissions()
  const [searchQuery, setSearchQuery] = useState('')
  const [dbReports, setDbReports] = useState<Record<ReportCategoryDB, ReportConfigurationDB[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [useDbConfig, setUseDbConfig] = useState(false)

  // Fetch database-driven reports
  useEffect(() => {
    async function fetchDbReports() {
      if (!profile?.role) return
      
      try {
        const reports = await getReportsByCategoryDB(profile.role)
        if (reports && Object.values(reports).some(arr => arr.length > 0)) {
          setDbReports(reports)
          setUseDbConfig(true)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }

    fetchDbReports()
  }, [profile?.role])

  // Filter reports based on search query
  const filteredDbReports = useMemo(() => {
    if (!dbReports || !searchQuery) return dbReports
    
    const result: Record<ReportCategoryDB, ReportConfigurationDB[]> = {
      operations: [],
      finance: [],
      sales: [],
      executive: [],
    }
    
    for (const category of categoryOrder) {
      result[category] = filterReportsBySearch(dbReports[category], searchQuery)
    }
    
    return result
  }, [dbReports, searchQuery])

  // Fallback to static config
  const staticReportsByCategory = useMemo(() => {
    if (!profile?.role) return null
    return getReportsByCategory(profile.role)
  }, [profile?.role])

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate business reports and analytics</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Render database-driven reports
  if (useDbConfig && filteredDbReports) {
    const nonEmptyCategories = categoryOrder.filter(
      (cat) => filteredDbReports[cat].length > 0
    )

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate business reports and analytics</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <ReportSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search reports..."
          />
          {profile.user_id && (
            <RecentReportsBar userId={profile.user_id} limit={5} />
          )}
        </div>

        {nonEmptyCategories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery
              ? `No reports found matching "${searchQuery}"`
              : "You don't have access to any reports. Contact your administrator for access."}
          </div>
        ) : (
          <div className="space-y-8">
            {nonEmptyCategories.map((category) => {
              const reports = filteredDbReports[category]
              const Icon = categoryIcons[category]

              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">
                      {categoryDisplayNames[category]}
                    </h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {reports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={{
                          id: report.report_code,
                          title: report.report_name,
                          description: report.description || '',
                          href: report.href || `/reports/${report.report_code}`,
                          icon: report.icon || 'FileText',
                          category: category as ReportCategory,
                          allowedRoles: report.allowed_roles as UserRole[],
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Fallback to static configuration
  const categories: ReportCategory[] = ['financial', 'operational', 'ar', 'sales']
  const nonEmptyCategories = staticReportsByCategory
    ? categories.filter((cat) => staticReportsByCategory[cat].length > 0)
    : []

  if (nonEmptyCategories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate business reports and analytics</p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          You don&apos;t have access to any reports. Contact your administrator for access.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate business reports and analytics</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <ReportSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search reports..."
        />
      </div>

      {nonEmptyCategories.map((category) => {
        const reports = staticReportsByCategory![category]
        const Icon = categoryIcons[category]

        // Filter by search if query exists
        const filteredReports = searchQuery
          ? reports.filter(
              (r) =>
                r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : reports

        if (filteredReports.length === 0) return null

        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">
                {getCategoryDisplayName(category)}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
