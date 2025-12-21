// v0.33: HR Skills Management Types

export type SkillCriticality = 'low' | 'medium' | 'high' | 'critical';
export type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type ExpiryStatus = 'ok' | 'warning' | 'critical' | 'expired';

export interface SkillCategory {
  id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Skill {
  id: string;
  skill_code: string;
  skill_name: string;
  category_id: string | null;
  description: string | null;
  requires_certification: boolean;
  certification_validity_months: number | null;
  criticality: SkillCriticality;
  target_coverage_percent: number;
  is_active: boolean;
  created_at: string;
  // Joined fields
  category?: SkillCategory;
}

export interface EmployeeSkill {
  id: string;
  employee_id: string;
  skill_id: string;
  level: ProficiencyLevel;
  is_certified: boolean;
  certification_number: string | null;
  certification_date: string | null;
  expiry_date: string | null;
  certificate_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  skill?: Skill;
  employee?: {
    id: string;
    full_name: string;
    employee_code: string;
    department_id: string | null;
  };
}

export interface SkillGapAnalysis {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  criticality: SkillCriticality;
  target_coverage_percent: number;
  requires_certification: boolean;
  category_name: string | null;
  ops_staff_count: number;
  staff_with_skill: number;
  current_coverage_percent: number | null;
  gap_percent: number | null;
}

export interface ExpiringCertification {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  skill_id: string;
  skill_name: string;
  skill_code: string;
  certification_number: string | null;
  certification_date: string | null;
  expiry_date: string;
  days_until_expiry: number;
  expiry_status: ExpiryStatus;
}

export interface SkillsStats {
  totalSkills: number;
  totalCategories: number;
  employeesWithSkills: number;
  expiringCertifications: number;
  skillGaps: number;
}

export interface EmployeeSkillProfile {
  employee: {
    id: string;
    full_name: string;
    employee_code: string;
    department_name: string | null;
    position_name: string | null;
  };
  skills: (EmployeeSkill & { skill: Skill })[];
  totalSkills: number;
  certifiedSkills: number;
  expiringCertifications: number;
}

// Form types
export interface EmployeeSkillFormData {
  employee_id: string;
  skill_id: string;
  level: ProficiencyLevel;
  is_certified: boolean;
  certification_number?: string;
  certification_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface BulkSkillAssignment {
  employee_ids: string[];
  skill_id: string;
  level: ProficiencyLevel;
  is_certified: boolean;
  certification_number?: string;
  certification_date?: string;
  expiry_date?: string;
}
