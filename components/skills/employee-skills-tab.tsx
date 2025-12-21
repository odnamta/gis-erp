'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, Plus, Search, UserPlus } from 'lucide-react';
import { Skill, ProficiencyLevel, EmployeeSkill } from '@/types/skills';
import { proficiencyConfig } from '@/lib/skills-utils';
import {
  getEmployeeSkills,
  addEmployeeSkill,
  bulkAssignSkill,
} from '@/app/(main)/hr/skills/actions';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmployeeSkillsTabProps {
  employees: { id: string; full_name: string; employee_code: string; department_id: string | null }[];
  skills: Skill[];
  onUpdate: () => void;
}

export function EmployeeSkillsTab({ employees, skills, onUpdate }: EmployeeSkillsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter employees by search
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    startTransition(async () => {
      const skills = await getEmployeeSkills(employeeId);
      setEmployeeSkills(skills);
    });
  };

  const selectedEmployeeData = employees.find((e) => e.id === selectedEmployee);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Employee List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Employees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filteredEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => handleSelectEmployee(emp.id)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  selectedEmployee === emp.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <p className="font-medium text-sm">{emp.full_name}</p>
                <p className={`text-xs ${selectedEmployee === emp.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {emp.employee_code}
                </p>
              </button>
            ))}
          </div>

          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Bulk Assign Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Assign Skill</DialogTitle>
              </DialogHeader>
              <BulkAssignForm
                employees={employees}
                skills={skills}
                onSuccess={() => {
                  setIsBulkDialogOpen(false);
                  onUpdate();
                  if (selectedEmployee) {
                    handleSelectEmployee(selectedEmployee);
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Employee Skills Detail */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedEmployeeData
                ? `${selectedEmployeeData.full_name}'s Skills`
                : 'Select an Employee'}
            </CardTitle>
            {selectedEmployee && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Skill to {selectedEmployeeData?.full_name}</DialogTitle>
                  </DialogHeader>
                  <AddSkillForm
                    employeeId={selectedEmployee}
                    skills={skills}
                    existingSkillIds={employeeSkills.map((es) => es.skill_id)}
                    onSuccess={() => {
                      setIsAddDialogOpen(false);
                      handleSelectEmployee(selectedEmployee);
                      onUpdate();
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedEmployee ? (
            <p className="text-muted-foreground text-center py-8">
              Select an employee to view their skills
            </p>
          ) : isPending ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : employeeSkills.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No skills assigned yet. Click &quot;Add Skill&quot; to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Certified</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSkills.map((es) => {
                  const levelConfig = proficiencyConfig[es.level];
                  return (
                    <TableRow key={es.id}>
                      <TableCell className="font-medium">
                        {es.skill?.skill_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${levelConfig.color} ${levelConfig.bgColor}`}>
                          {levelConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {es.is_certified ? (
                          <span className="text-green-600">✓ {es.certification_number || ''}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {es.expiry_date
                          ? format(new Date(es.expiry_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Add Skill Form Component
function AddSkillForm({
  employeeId,
  skills,
  existingSkillIds,
  onSuccess,
}: {
  employeeId: string;
  skills: Skill[];
  existingSkillIds: string[];
  onSuccess: () => void;
}) {
  const [skillId, setSkillId] = useState('');
  const [level, setLevel] = useState<ProficiencyLevel>('basic');
  const [isCertified, setIsCertified] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [certDate, setCertDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isPending, startTransition] = useTransition();

  const availableSkills = skills.filter((s) => !existingSkillIds.includes(s.id));
  const selectedSkill = skills.find((s) => s.id === skillId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillId) return;

    startTransition(async () => {
      const result = await addEmployeeSkill({
        employee_id: employeeId,
        skill_id: skillId,
        level,
        is_certified: isCertified,
        certification_number: certNumber || undefined,
        certification_date: certDate || undefined,
        expiry_date: expiryDate || undefined,
      });

      if (result.success) {
        toast.success('Skill added successfully');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to add skill');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Skill</Label>
        <Select value={skillId} onValueChange={setSkillId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a skill" />
          </SelectTrigger>
          <SelectContent>
            {availableSkills.map((skill) => (
              <SelectItem key={skill.id} value={skill.id}>
                {skill.skill_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Proficiency Level</Label>
        <Select value={level} onValueChange={(v) => setLevel(v as ProficiencyLevel)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(proficiencyConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSkill?.requires_certification && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="certified"
              checked={isCertified}
              onCheckedChange={(checked) => setIsCertified(checked as boolean)}
            />
            <Label htmlFor="certified">Has Certification</Label>
          </div>

          {isCertified && (
            <>
              <div className="space-y-2">
                <Label>Certification Number</Label>
                <Input
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="e.g., SIM-B2-12345"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Certification Date</Label>
                  <Input
                    type="date"
                    value={certDate}
                    onChange={(e) => setCertDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Button type="submit" className="w-full" disabled={!skillId || isPending}>
        {isPending ? 'Adding...' : 'Add Skill'}
      </Button>
    </form>
  );
}

// Bulk Assign Form Component
function BulkAssignForm({
  employees,
  skills,
  onSuccess,
}: {
  employees: { id: string; full_name: string; employee_code: string }[];
  skills: Skill[];
  onSuccess: () => void;
}) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [skillId, setSkillId] = useState('');
  const [level, setLevel] = useState<ProficiencyLevel>('basic');
  const [isCertified, setIsCertified] = useState(false);
  const [certDate, setCertDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedSkill = skills.find((s) => s.id === skillId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillId || selectedEmployees.length === 0) return;

    startTransition(async () => {
      const result = await bulkAssignSkill({
        employee_ids: selectedEmployees,
        skill_id: skillId,
        level,
        is_certified: isCertified,
        certification_date: certDate || undefined,
        expiry_date: expiryDate || undefined,
      });

      if (result.success) {
        toast.success(`Skill assigned to ${result.assigned} employees`);
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to assign skill');
      }
    });
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((e) => e.id));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Skill to Assign</Label>
        <Select value={skillId} onValueChange={setSkillId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a skill" />
          </SelectTrigger>
          <SelectContent>
            {skills.map((skill) => (
              <SelectItem key={skill.id} value={skill.id}>
                {skill.skill_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Proficiency Level</Label>
        <Select value={level} onValueChange={(v) => setLevel(v as ProficiencyLevel)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(proficiencyConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSkill?.requires_certification && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bulk-certified"
              checked={isCertified}
              onCheckedChange={(checked) => setIsCertified(checked as boolean)}
            />
            <Label htmlFor="bulk-certified">All have certification</Label>
          </div>

          {isCertified && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Certification Date</Label>
                <Input
                  type="date"
                  value={certDate}
                  onChange={(e) => setCertDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Employees ({selectedEmployees.length} selected)</Label>
          <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
            {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="border rounded-md max-h-[200px] overflow-y-auto">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-muted cursor-pointer"
              onClick={() => toggleEmployee(emp.id)}
            >
              <Checkbox checked={selectedEmployees.includes(emp.id)} />
              <span className="text-sm">{emp.full_name}</span>
              <span className="text-xs text-muted-foreground">({emp.employee_code})</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!skillId || selectedEmployees.length === 0 || isPending}
      >
        {isPending ? 'Assigning...' : `Assign to ${selectedEmployees.length} Employees`}
      </Button>
    </form>
  );
}
