// v0.33: HR Skills Management Utilities

import {
  SkillCriticality,
  ProficiencyLevel,
  ExpiryStatus,
  SkillGapAnalysis,
  ExpiringCertification,
} from '@/types/skills';

// Criticality display config
export const criticalityConfig: Record<SkillCriticality, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Proficiency level display config
export const proficiencyConfig: Record<ProficiencyLevel, { label: string; color: string; bgColor: string; value: number }> = {
  basic: { label: 'Basic', color: 'text-gray-600', bgColor: 'bg-gray-100', value: 1 },
  intermediate: { label: 'Intermediate', color: 'text-blue-600', bgColor: 'bg-blue-100', value: 2 },
  advanced: { label: 'Advanced', color: 'text-purple-600', bgColor: 'bg-purple-100', value: 3 },
  expert: { label: 'Expert', color: 'text-green-600', bgColor: 'bg-green-100', value: 4 },
};

// Expiry status display config
export const expiryStatusConfig: Record<ExpiryStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  ok: { label: 'Valid', color: 'text-green-600', bgColor: 'bg-green-100', icon: '✅' },
  warning: { label: 'Expiring Soon', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '⚠️' },
  critical: { label: 'Expiring', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '⚠️' },
  expired: { label: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100', icon: '🔴' },
};

/**
 * Calculate gap status for a skill
 */
export function getGapStatus(gap: SkillGapAnalysis): { status: 'met' | 'warning' | 'critical'; label: string; icon: string } {
  const gapPercent = gap.gap_percent ?? 0;
  
  if (gapPercent <= 0) {
    return { status: 'met', label: 'Met', icon: '✅' };
  } else if (gapPercent <= 15) {
    return { status: 'warning', label: `-${gapPercent}%`, icon: '⚠️' };
  } else {
    return { status: 'critical', label: `-${gapPercent}%`, icon: '🔴' };
  }
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry status based on days until expiry
 */
export function getExpiryStatus(daysUntilExpiry: number | null): ExpiryStatus {
  if (daysUntilExpiry === null) return 'ok';
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'critical';
  if (daysUntilExpiry <= 60) return 'warning';
  return 'ok';
}

/**
 * Format days until expiry for display
 */
export function formatDaysUntilExpiry(days: number): string {
  if (days < 0) {
    const absDays = Math.abs(days);
    return `${absDays} day${absDays !== 1 ? 's' : ''} overdue`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Calculate coverage percentage
 */
export function calculateCoveragePercent(staffWithSkill: number, totalStaff: number): number {
  if (totalStaff === 0) return 0;
  return Math.round((staffWithSkill / totalStaff) * 100);
}

/**
 * Sort skills by criticality (critical first)
 */
export function sortByCriticality<T extends { criticality: SkillCriticality }>(items: T[]): T[] {
  const order: Record<SkillCriticality, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  
  return [...items].sort((a, b) => order[a.criticality] - order[b.criticality]);
}

/**
 * Sort expiring certifications by urgency
 */
export function sortByExpiryUrgency(certs: ExpiringCertification[]): ExpiringCertification[] {
  return [...certs].sort((a, b) => a.days_until_expiry - b.days_until_expiry);
}

/**
 * Filter skills with gaps
 */
export function filterSkillsWithGaps(gaps: SkillGapAnalysis[]): SkillGapAnalysis[] {
  return gaps.filter(g => (g.gap_percent ?? 0) > 0);
}

/**
 * Get coverage bar width (capped at 100%)
 */
export function getCoverageBarWidth(coverage: number | null): number {
  if (coverage === null) return 0;
  return Math.min(coverage, 100);
}

/**
 * Get coverage bar color based on target
 */
export function getCoverageBarColor(current: number | null, target: number): string {
  if (current === null) return 'bg-gray-300';
  
  const ratio = current / target;
  if (ratio >= 1) return 'bg-green-500';
  if (ratio >= 0.7) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Generate skill recommendations based on gaps
 */
export function generateRecommendations(gaps: SkillGapAnalysis[], expiring: ExpiringCertification[]): string[] {
  const recommendations: string[] = [];
  
  // Critical skill gaps
  const criticalGaps = gaps.filter(g => g.criticality === 'critical' && (g.gap_percent ?? 0) > 0);
  criticalGaps.forEach(gap => {
    recommendations.push(
      `Schedule ${gap.skill_name} training - only ${gap.current_coverage_percent ?? 0}% coverage vs ${gap.target_coverage_percent}% target`
    );
  });
  
  // High priority gaps
  const highGaps = gaps.filter(g => g.criticality === 'high' && (g.gap_percent ?? 0) > 15);
  highGaps.forEach(gap => {
    recommendations.push(
      `Consider ${gap.skill_name} training program - ${gap.gap_percent}% below target`
    );
  });
  
  // Expiring certifications
  const criticalExpiring = expiring.filter(e => e.expiry_status === 'critical' || e.expiry_status === 'expired');
  if (criticalExpiring.length > 0) {
    recommendations.push(
      `${criticalExpiring.length} staff certification${criticalExpiring.length !== 1 ? 's' : ''} expiring soon - initiate renewal process`
    );
  }
  
  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

/**
 * Group skills by category
 */
export function groupSkillsByCategory<T extends { category_name: string | null }>(
  skills: T[]
): Record<string, T[]> {
  return skills.reduce((acc, skill) => {
    const category = skill.category_name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Validate certification dates
 */
export function validateCertificationDates(
  certDate: string | null,
  expiryDate: string | null
): { valid: boolean; error?: string } {
  if (!certDate && expiryDate) {
    return { valid: false, error: 'Certification date is required when expiry date is set' };
  }
  
  if (certDate && expiryDate) {
    const cert = new Date(certDate);
    const expiry = new Date(expiryDate);
    if (expiry <= cert) {
      return { valid: false, error: 'Expiry date must be after certification date' };
    }
  }
  
  return { valid: true };
}
