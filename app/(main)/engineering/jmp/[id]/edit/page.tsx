import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { JmpForm } from '@/components/jmp/jmp-form';
import {
  getJmpById,
  getCompletedSurveys,
  getCustomersForSelection,
  getEmployeesForSelection,
} from '@/lib/jmp-actions';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditJmpPage({ params }: PageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/engineering/jmp');
  }
  const { id } = await params;
  const [jmp, surveys, customers, employees] = await Promise.all([
    getJmpById(id),
    getCompletedSurveys(),
    getCustomersForSelection(),
    getEmployeesForSelection(),
  ]);

  if (!jmp) {
    notFound();
  }

  if (jmp.status !== 'draft') {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Cannot Edit</h1>
        <p className="text-muted-foreground mb-4">
          Only draft JMPs can be edited. This JMP is currently in {jmp.status} status.
        </p>
        <Button asChild>
          <Link href={`/engineering/jmp/${id}`}>View JMP</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/engineering/jmp/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit JMP</h1>
          <p className="text-muted-foreground">{jmp.jmpNumber}</p>
        </div>
      </div>
      <JmpForm jmp={jmp} surveys={surveys} customers={customers} employees={employees} />
    </div>
  );
}
