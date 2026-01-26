/**
 * FAQs Page
 * v0.38.1: Help Center Enhancement
 */

import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getFAQsForRole } from '@/lib/help-center-actions';
import { FAQSearch } from '@/components/help-center/faq-search';

async function getUserRole(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 'viewer';
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  return (profile as { role?: string })?.role || 'viewer';
}

export default async function FAQsPage() {
  const userRole = await getUserRole();
  const faqs = await getFAQsForRole(userRole);

  return (
    <div className="container max-w-4xl py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/help" className="hover:text-foreground transition-colors">
          Help Center
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">FAQs</span>
      </nav>

      {/* Back Link */}
      <Link 
        href="/help" 
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Help Center
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Temukan jawaban untuk pertanyaan yang sering diajukan tentang sistem GAMA ERP
        </p>
      </div>

      {/* FAQ Search and List */}
      <FAQSearch faqs={faqs} />
    </div>
  );
}
