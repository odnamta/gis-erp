'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, User, Building, Bandage } from 'lucide-react';
import { AddPersonInput, PersonType } from '@/types/incident';
import { getPersonTypeLabel, getTreatmentLabel } from '@/lib/incident-utils';

interface Employee {
  id: string;
  full_name: string;
}

interface PersonsListProps {
  persons: AddPersonInput[];
  employees: Employee[];
  onRemove: (index: number) => void;
  readonly?: boolean;
}

function getPersonTypeBadgeVariant(type: PersonType): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'injured':
      return 'destructive';
    case 'witness':
      return 'secondary';
    case 'first_responder':
      return 'default';
    default:
      return 'outline';
  }
}

export function PersonsList({ persons, employees, onRemove, readonly }: PersonsListProps) {
  if (persons.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Belum ada orang yang ditambahkan</p>
      </div>
    );
  }

  const getPersonName = (person: AddPersonInput): string => {
    if (person.employeeId) {
      const employee = employees.find((e) => e.id === person.employeeId);
      return employee?.full_name || 'Unknown Employee';
    }
    return person.personName || 'Unknown';
  };

  return (
    <div className="space-y-2">
      {persons.map((person, index) => (
        <div
          key={index}
          className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getPersonName(person)}</span>
              <Badge variant={getPersonTypeBadgeVariant(person.personType)}>
                {getPersonTypeLabel(person.personType)}
              </Badge>
            </div>
            
            {person.personCompany && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building className="h-3.5 w-3.5" />
                <span>{person.personCompany}</span>
              </div>
            )}

            {person.personType === 'injured' && person.treatment && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Bandage className="h-3.5 w-3.5" />
                <span>
                  {getTreatmentLabel(person.treatment)}
                  {person.daysLost && person.daysLost > 0 && ` • ${person.daysLost} hari hilang`}
                </span>
              </div>
            )}

            {person.injuryType && (
              <p className="text-sm text-muted-foreground">
                Cedera: {person.injuryType}
                {person.bodyPart && ` (${person.bodyPart})`}
              </p>
            )}
          </div>

          {!readonly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
