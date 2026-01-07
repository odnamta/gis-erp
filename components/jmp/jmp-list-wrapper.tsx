'use client';

import { useState, useCallback } from 'react';
import { JmpList } from './jmp-list';
import { JmpWithRelations, JmpFilters } from '@/types/jmp';
import { getJmpList } from '@/lib/jmp-actions';

interface JmpListWrapperProps {
  initialJmps: JmpWithRelations[];
  customers: { id: string; name: string }[];
}

export function JmpListWrapper({ initialJmps, customers }: JmpListWrapperProps) {
  const [jmps, setJmps] = useState<JmpWithRelations[]>(initialJmps);

  const handleFilterChange = useCallback(async (filters: JmpFilters) => {
    const result = await getJmpList(filters);
    setJmps(result);
  }, []);

  return (
    <JmpList
      jmps={jmps}
      customers={customers}
      onFilterChange={handleFilterChange}
    />
  );
}
