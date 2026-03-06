import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { JmpForm } from '@/components/jmp/jmp-form';
import {
  getCompletedSurveys,
  getCustomersForSelection,
  getEmployeesForSelection,
} from '@/lib/jmp-actions';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export default async function NewJmpPage() {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/engineering/jmp');
  }
  const [surveys, customers, employees] = await Promise.all([
    getCompletedSurveys(),
    getCustomersForSelection(),
    getEmployeesForSelection(),
  ]);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/engineering/jmp">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Journey Management Plan</h1>
          <p className="text-muted-foreground">
            Create a new JMP for heavy-haul transport
          </p>
        </div>
      </div>
      <JmpForm surveys={surveys} customers={customers} employees={employees} />
    </div>
  );
}
