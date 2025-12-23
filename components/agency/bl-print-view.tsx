'use client';

import { forwardRef } from 'react';
import { BillOfLading, BL_TYPE_LABELS, FREIGHT_TERMS_LABELS } from '@/types/agency';

interface BLPrintViewProps {
  bl: BillOfLading;
  companyName?: string;
  companyAddress?: string;
  companyLogo?: string;
}

/**
 * Print-ready Bill of Lading layout matching standard B/L format.
 * Per Requirements 1.8, 5.1
 */
export const BLPrintView = forwardRef<HTMLDivElement, BLPrintViewProps>(
  function BLPrintView({ bl, companyName, companyAddress, companyLogo }, ref) {
    // Format date for display
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return dateStr;
      }
    };

    // Format weight with commas
    const formatWeight = (weight?: number) => {
      if (!weight) return '';
      return weight.toLocaleString('en-US', { maximumFractionDigits: 2 });
    };

    return (
      <div 
        ref={ref} 
        className="bg-white p-8 max-w-4xl mx-auto print:p-4 print:max-w-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="border-2 border-black">
          {/* Title Row */}
          <div className="border-b-2 border-black p-4 text-center bg-gray-50">
            <h1 className="text-2xl font-bold tracking-wide">BILL OF LADING</h1>
            <p className="text-sm mt-1">{BL_TYPE_LABELS[bl.blType].toUpperCase()}</p>
          </div>

          {/* B/L Number and Company Info */}
          <div className="grid grid-cols-2 border-b border-black">
            <div className="p-3 border-r border-black">
              <p className="text-xs text-gray-600">B/L Number</p>
              <p className="font-bold text-lg font-mono">{bl.blNumber}</p>
              {bl.carrierBlNumber && (
                <>
                  <p className="text-xs text-gray-600 mt-2">Carrier B/L Number</p>
                  <p className="font-mono">{bl.carrierBlNumber}</p>
                </>
              )}
            </div>
            <div className="p-3">
              {companyLogo && (
                <img src={companyLogo} alt="Company Logo" className="h-12 mb-2" />
              )}
              <p className="font-bold">{companyName || 'PT. Gama Intisamudera'}</p>
              <p className="text-xs text-gray-600 whitespace-pre-line">
                {companyAddress || 'Jakarta, Indonesia'}
              </p>
            </div>
          </div>

          {/* Shipper */}
          <div className="border-b border-black p-3">
            <p className="text-xs text-gray-600 font-semibold">SHIPPER / EXPORTER</p>
            <p className="font-medium mt-1">{bl.shipperName}</p>
            {bl.shipperAddress && (
              <p className="text-sm whitespace-pre-line">{bl.shipperAddress}</p>
            )}
          </div>

          {/* Consignee */}
          <div className="border-b border-black p-3">
            <p className="text-xs text-gray-600 font-semibold">CONSIGNEE</p>
            {bl.consigneeToOrder ? (
              <p className="font-medium mt-1">TO ORDER</p>
            ) : (
              <>
                <p className="font-medium mt-1">{bl.consigneeName || '-'}</p>
                {bl.consigneeAddress && (
                  <p className="text-sm whitespace-pre-line">{bl.consigneeAddress}</p>
                )}
              </>
            )}
          </div>

          {/* Notify Party */}
          <div className="border-b border-black p-3">
            <p className="text-xs text-gray-600 font-semibold">NOTIFY PARTY</p>
            <p className="font-medium mt-1">{bl.notifyPartyName || 'SAME AS CONSIGNEE'}</p>
            {bl.notifyPartyAddress && (
              <p className="text-sm whitespace-pre-line">{bl.notifyPartyAddress}</p>
            )}
          </div>

          {/* Vessel & Voyage Info */}
          <div className="grid grid-cols-4 border-b border-black text-sm">
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Vessel Name</p>
              <p className="font-medium">{bl.vesselName}</p>
            </div>
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Voyage No.</p>
              <p className="font-medium">{bl.voyageNumber || '-'}</p>
            </div>
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Flag</p>
              <p className="font-medium">{bl.flag || '-'}</p>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-600">B/L Type</p>
              <p className="font-medium">{BL_TYPE_LABELS[bl.blType]}</p>
              {bl.blType === 'original' && bl.originalCount && (
                <p className="text-xs">({bl.originalCount} originals)</p>
              )}
            </div>
          </div>

          {/* Ports */}
          <div className="grid grid-cols-2 border-b border-black text-sm">
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Port of Loading</p>
              <p className="font-medium">{bl.portOfLoading}</p>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-600">Port of Discharge</p>
              <p className="font-medium">{bl.portOfDischarge}</p>
            </div>
          </div>

          {/* Places */}
          <div className="grid grid-cols-2 border-b border-black text-sm">
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Place of Receipt</p>
              <p className="font-medium">{bl.placeOfReceipt || '-'}</p>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-600">Place of Delivery</p>
              <p className="font-medium">{bl.placeOfDelivery || '-'}</p>
            </div>
          </div>

          {/* Container Details Table */}
          {bl.containers && bl.containers.length > 0 && (
            <div className="border-b border-black">
              <div className="p-2 bg-gray-50 border-b border-black">
                <p className="text-xs text-gray-600 font-semibold">CONTAINER DETAILS</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black bg-gray-50">
                    <th className="p-2 text-left border-r border-black">Container No.</th>
                    <th className="p-2 text-left border-r border-black">Seal No.</th>
                    <th className="p-2 text-left border-r border-black">Type</th>
                    <th className="p-2 text-right border-r border-black">Packages</th>
                    <th className="p-2 text-right">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {bl.containers.map((container, index) => (
                    <tr key={index} className="border-b border-black last:border-b-0">
                      <td className="p-2 font-mono border-r border-black">{container.containerNo}</td>
                      <td className="p-2 border-r border-black">{container.sealNo || '-'}</td>
                      <td className="p-2 border-r border-black">{container.type}</td>
                      <td className="p-2 text-right border-r border-black">{container.packages?.toLocaleString() || '-'}</td>
                      <td className="p-2 text-right">{formatWeight(container.weightKg) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Marks & Numbers and Cargo Description */}
          <div className="grid grid-cols-3 border-b border-black">
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600 font-semibold">MARKS & NUMBERS</p>
              <p className="text-sm whitespace-pre-line mt-1">{bl.marksAndNumbers || '-'}</p>
            </div>
            <div className="p-2 border-r border-black col-span-2">
              <p className="text-xs text-gray-600 font-semibold">DESCRIPTION OF GOODS</p>
              <p className="text-sm whitespace-pre-line mt-1">{bl.cargoDescription}</p>
            </div>
          </div>

          {/* Cargo Totals */}
          <div className="grid grid-cols-4 border-b border-black text-sm">
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">No. of Packages</p>
              <p className="font-medium">{bl.numberOfPackages?.toLocaleString() || '-'}</p>
              {bl.packageType && <p className="text-xs">{bl.packageType}</p>}
            </div>
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Gross Weight</p>
              <p className="font-medium">{formatWeight(bl.grossWeightKg)} kg</p>
            </div>
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Measurement</p>
              <p className="font-medium">{bl.measurementCbm?.toLocaleString() || '-'} CBM</p>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-600">Containers</p>
              <p className="font-medium">{bl.containers?.length || 0}</p>
            </div>
          </div>

          {/* Freight Terms */}
          <div className="grid grid-cols-3 border-b border-black text-sm">
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Freight Terms</p>
              <p className="font-medium">{FREIGHT_TERMS_LABELS[bl.freightTerms]}</p>
            </div>
            <div className="p-2 border-r border-black">
              <p className="text-xs text-gray-600">Freight Amount</p>
              <p className="font-medium">
                {bl.freightAmount 
                  ? `${bl.freightCurrency || 'USD'} ${bl.freightAmount.toLocaleString()}`
                  : 'AS ARRANGED'
                }
              </p>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-600">Shipped on Board Date</p>
              <p className="font-medium">{formatDate(bl.shippedOnBoardDate) || '-'}</p>
            </div>
          </div>

          {/* Remarks */}
          {bl.remarks && (
            <div className="border-b border-black p-2">
              <p className="text-xs text-gray-600 font-semibold">REMARKS</p>
              <p className="text-sm whitespace-pre-line mt-1">{bl.remarks}</p>
            </div>
          )}

          {/* Dates and Signatures */}
          <div className="grid grid-cols-2">
            <div className="p-3 border-r border-black">
              <p className="text-xs text-gray-600">Place and Date of Issue</p>
              <p className="font-medium mt-1">
                {bl.portOfLoading}, {formatDate(bl.blDate) || formatDate(bl.createdAt)}
              </p>
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-600">Authorized Signature</p>
              <div className="h-16 border-b border-dashed border-gray-400 mt-2"></div>
              <p className="text-xs text-gray-500 mt-1">For and on behalf of the Carrier</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>This is a computer-generated document. No signature required for electronic copies.</p>
          <p className="mt-1">
            Generated on {new Date().toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Print Styles */}
        <style jsx>{`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            .print\\:p-4 {
              padding: 1rem;
            }
            
            .print\\:max-w-none {
              max-width: none;
            }
          }
        `}</style>
      </div>
    );
  }
);

export default BLPrintView;
