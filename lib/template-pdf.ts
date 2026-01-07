'use server';

// =====================================================
// v0.55: CUSTOMS - DOCUMENT TEMPLATES PDF Generation
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { fillTemplate } from '@/lib/template-utils';
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils';
import type { CustomsDocumentTemplate } from '@/types/customs-templates';

/**
 * Generates a company header HTML for PDF documents
 */
async function generateCompanyHeader(): Promise<string> {
  const settings = await getCompanySettingsForPDF();
  
  return `
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
      ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
      <h1 style="margin: 0; font-size: 18px;">${settings.company_name}</h1>
      ${settings.company_address ? `<p style="margin: 5px 0; font-size: 11px;">${settings.company_address}</p>` : ''}
      ${settings.company_phone || settings.company_email ? 
        `<p style="margin: 5px 0; font-size: 11px;">
          ${settings.company_phone ? `Tel: ${settings.company_phone}` : ''}
          ${settings.company_phone && settings.company_email ? ' | ' : ''}
          ${settings.company_email ? `Email: ${settings.company_email}` : ''}
        </p>` : ''}
    </div>
  `;
}

/**
 * Generates the full HTML for PDF rendering
 */
export async function generatePdfHtml(
  template: CustomsDocumentTemplate,
  documentData: Record<string, unknown>
): Promise<string> {
  // Fill the template with data
  let filledHtml = fillTemplate(template.template_html, documentData);
  
  // Add company header if enabled
  if (template.include_company_header) {
    const header = await generateCompanyHeader();
    // Insert header after <body> tag
    filledHtml = filledHtml.replace(/<body[^>]*>/i, (match) => `${match}${header}`);
  }
  
  // Add print styles for paper size and orientation
  const printStyles = `
    <style>
      @page {
        size: ${template.paper_size} ${template.orientation};
        margin: 15mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  `;
  
  // Insert print styles in head
  if (filledHtml.includes('</head>')) {
    filledHtml = filledHtml.replace('</head>', `${printStyles}</head>`);
  } else if (filledHtml.includes('<body')) {
    filledHtml = filledHtml.replace('<body', `${printStyles}<body`);
  } else {
    filledHtml = printStyles + filledHtml;
  }
  
  return filledHtml;
}

/**
 * Generates PDF for a document and stores it
 * Note: This is a placeholder that generates HTML for client-side PDF generation
 * In production, you would use a service like Puppeteer, wkhtmltopdf, or a PDF API
 */
export async function generateDocumentPdf(
  documentId: string
): Promise<{ success: boolean; pdfUrl?: string; html?: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get document with template
    const { data: document, error: docError } = await supabase
      .from('generated_customs_documents')
      .select(`
        *,
        template:customs_document_templates(*)
      `)
      .eq('id', documentId)
      .single();
    
    if (docError || !document) {
      return { success: false, error: 'Document not found' };
    }
    
    const template = document.template as unknown as CustomsDocumentTemplate;
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    // Generate the full HTML
    const html = await generatePdfHtml(template, document.document_data as Record<string, unknown>);
    
    // For now, return the HTML for client-side PDF generation
    // In production, you would:
    // 1. Use a PDF generation service (Puppeteer, wkhtmltopdf, etc.)
    // 2. Upload the PDF to Supabase Storage
    // 3. Update the document with the PDF URL
    
    return { 
      success: true, 
      html,
      // pdfUrl would be set after actual PDF generation and upload
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: 'Failed to generate PDF' };
  }
}

/**
 * Gets the filename for a document PDF
 */
export function getDocumentFilename(
  documentNumber: string,
  templateName: string
): string {
  const sanitizedName = templateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${documentNumber}-${sanitizedName}.pdf`;
}
