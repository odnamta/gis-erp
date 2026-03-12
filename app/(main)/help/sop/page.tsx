import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, CalendarDays } from 'lucide-react';

const sopTopics = [
  {
    slug: 'reimbursement',
    title: 'SOP Reimbursement',
    description: 'Prosedur pengajuan dan penyelesaian reimbursement biaya operasional',
    icon: FileText,
    color: 'text-blue-600',
  },
  {
    slug: 'hse',
    title: 'SOP HSE (K3)',
    description: 'Kebijakan keselamatan, kesehatan kerja, dan lingkungan',
    icon: Shield,
    color: 'text-green-600',
  },
  {
    slug: 'leave',
    title: 'SOP Pengajuan Cuti',
    description: 'Prosedur pengajuan dan persetujuan cuti karyawan',
    icon: CalendarDays,
    color: 'text-amber-600',
  },
];

export default function SOPIndexPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Standard Operating Procedures (SOP)</h1>
        <p className="text-muted-foreground">
          Panduan prosedur kerja untuk seluruh karyawan PT. Gama Intisamudera
        </p>
      </div>

      <div className="grid gap-4">
        {sopTopics.map((topic) => (
          <Link key={topic.slug} href={`/help/sop/${topic.slug}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <topic.icon className={`h-8 w-8 ${topic.color}`} />
                <div>
                  <CardTitle className="text-lg">{topic.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
