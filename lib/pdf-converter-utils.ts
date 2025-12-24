/**
 * PDF Converter Utilities
 * Handles HTML to PDF conversion using external API
 * Part of the n8n Document Generation module (v0.68)
 */

import {
  PDFOptions,
  PDFOptionsValidationResult,
  PDFResult,
  MarginSettings,
  PageSize,
  PageOrientation,
  VALID_PAGE_SIZES,
  VALID_ORIENTATIONS,
} from '@/types/document-generation'

// Page size dimensions mapping (for API format)
const PAGE_SIZE_MAP: Record<PageSize, string> = {
  'A4': 'A4',
  'Letter': 'Letter',
  'Legal': 'Legal',
}

/**
 * Validates PDF options for conversion
 * Checks page_size, orientation, and margins are valid
 * 
 * @param options - PDF options to validate
 * @returns Validation result with errors if any
 */
export function validatePDFOptions(options: PDFOptions): PDFOptionsValidationResult {
  const errors: string[] = []

  // Validate page_size
  if (!options.page_size) {
    errors.push('page_size is required')
  } else if (!VALID_PAGE_SIZES.includes(options.page_size)) {
    errors.push(`Invalid page_size: ${options.page_size}. Must be one of: ${VALID_PAGE_SIZES.join(', ')}`)
  }

  // Validate orientation
  if (!options.orientation) {
    errors.push('orientation is required')
  } else if (!VALID_ORIENTATIONS.includes(options.orientation)) {
    errors.push(`Invalid orientation: ${options.orientation}. Must be one of: ${VALID_ORIENTATIONS.join(', ')}`)
  }

  // Validate margins
  if (!options.margins) {
    errors.push('margins is required')
  } else {
    const { top, right, bottom, left } = options.margins
    
    if (typeof top !== 'number' || top < 0) {
      errors.push('margins.top must be a non-negative number')
    }
    if (typeof right !== 'number' || right < 0) {
      errors.push('margins.right must be a non-negative number')
    }
    if (typeof bottom !== 'number' || bottom < 0) {
      errors.push('margins.bottom must be a non-negative number')
    }
    if (typeof left !== 'number' || left < 0) {
      errors.push('margins.left must be a non-negative number')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Builds the complete HTML document with header and footer
 * Wraps content HTML with proper structure for PDF generation
 * 
 * @param html - Main content HTML
 * @param options - PDF options including header/footer
 * @returns Complete HTML document
 */
export function buildCompleteHTML(
  html: string,
  options: PDFOptions
): string {
  // If no header/footer, return as-is
  if (!options.header_html && !options.footer_html) {
    return html
  }

  // Check if html already has full document structure
  const hasDoctype = html.toLowerCase().includes('<!doctype')
  const hasHtmlTag = html.toLowerCase().includes('<html')
  
  if (hasDoctype || hasHtmlTag) {
    // Already a complete document, inject header/footer into body
    let result = html
    
    if (options.header_html) {
      // Insert header after <body> tag
      result = result.replace(
        /(<body[^>]*>)/i,
        `$1<div class="pdf-header">${options.header_html}</div>`
      )
    }
    
    if (options.footer_html) {
      // Insert footer before </body> tag
      result = result.replace(
        /(<\/body>)/i,
        `<div class="pdf-footer">${options.footer_html}</div>$1`
      )
    }
    
    return result
  }

  // Build complete document structure
  const headerSection = options.header_html 
    ? `<div class="pdf-header">${options.header_html}</div>` 
    : ''
  const footerSection = options.footer_html 
    ? `<div class="pdf-footer">${options.footer_html}</div>` 
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    .pdf-header { position: running(header); }
    .pdf-footer { position: running(footer); }
    @page {
      @top-center { content: element(header); }
      @bottom-center { content: element(footer); }
    }
  </style>
</head>
<body>
  ${headerSection}
  <div class="pdf-content">${html}</div>
  ${footerSection}
</body>
</html>`
}

/**
 * Formats margin value for API (converts number to string with unit)
 * 
 * @param value - Margin value in mm
 * @returns Formatted margin string
 */
function formatMargin(value: number): string {
  return `${value}mm`
}

/**
 * Converts HTML to PDF using external HTML2PDF API
 * Applies page settings, margins, and optional header/footer
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * @param html - HTML content to convert
 * @param options - PDF conversion options
 * @returns PDF conversion result with buffer or error
 */
export async function convertToPDF(
  html: string,
  options: PDFOptions
): Promise<PDFResult> {
  // Validate options first
  const validation = validatePDFOptions(options)
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid PDF options: ${validation.errors.join(', ')}`,
    }
  }

  // Validate HTML content
  if (!html || html.trim().length === 0) {
    return {
      success: false,
      error: 'HTML content is required for PDF conversion',
    }
  }

  try {
    // Build complete HTML with header/footer if provided
    const completeHTML = buildCompleteHTML(html, options)

    // Get API configuration
    const apiUrl = process.env.HTML2PDF_API_URL
    const apiKey = process.env.HTML2PDF_API_KEY

    if (!apiUrl) {
      return {
        success: false,
        error: 'HTML2PDF_API_URL environment variable is not configured',
      }
    }

    // Prepare API request
    const requestBody = {
      html: completeHTML,
      options: {
        format: PAGE_SIZE_MAP[options.page_size],
        landscape: options.orientation === 'landscape',
        margin: {
          top: formatMargin(options.margins.top),
          right: formatMargin(options.margins.right),
          bottom: formatMargin(options.margins.bottom),
          left: formatMargin(options.margins.left),
        },
        displayHeaderFooter: !!(options.header_html || options.footer_html),
        ...(options.header_html && { headerTemplate: options.header_html }),
        ...(options.footer_html && { footerTemplate: options.footer_html }),
      },
    }

    // Make API request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `PDF conversion API error (${response.status}): ${errorText}`,
      }
    }

    // Handle response - could be JSON with base64 or direct binary
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      // JSON response with base64 encoded PDF
      const jsonResponse = await response.json()
      
      if (jsonResponse.error) {
        return {
          success: false,
          error: jsonResponse.error,
        }
      }
      
      if (jsonResponse.pdf) {
        // Decode base64 PDF
        const pdfBuffer = Buffer.from(jsonResponse.pdf, 'base64')
        return {
          success: true,
          pdf_buffer: pdfBuffer,
        }
      }
      
      return {
        success: false,
        error: 'Invalid API response: missing PDF data',
      }
    } else {
      // Direct binary PDF response
      const arrayBuffer = await response.arrayBuffer()
      const pdfBuffer = Buffer.from(arrayBuffer)
      
      return {
        success: true,
        pdf_buffer: pdfBuffer,
      }
    }
  } catch (error) {
    // Handle any errors during conversion
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during PDF conversion'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Creates default PDF options from template settings
 * 
 * @param pageSize - Page size setting
 * @param orientation - Page orientation
 * @param margins - Margin settings
 * @param headerHtml - Optional header HTML
 * @param footerHtml - Optional footer HTML
 * @returns PDFOptions object
 */
export function createPDFOptions(
  pageSize: PageSize = 'A4',
  orientation: PageOrientation = 'portrait',
  margins: MarginSettings = { top: 20, right: 20, bottom: 20, left: 20 },
  headerHtml?: string,
  footerHtml?: string
): PDFOptions {
  return {
    page_size: pageSize,
    orientation,
    margins,
    ...(headerHtml && { header_html: headerHtml }),
    ...(footerHtml && { footer_html: footerHtml }),
  }
}

/**
 * Estimates PDF file size based on HTML content length
 * This is a rough estimate for pre-validation purposes
 * 
 * @param html - HTML content
 * @returns Estimated file size in KB
 */
export function estimatePDFSize(html: string): number {
  // Rough estimate: PDF is typically 1.5-3x the HTML size
  // Using 2x as a middle ground
  const htmlSizeKB = Buffer.byteLength(html, 'utf8') / 1024
  return Math.ceil(htmlSizeKB * 2)
}
