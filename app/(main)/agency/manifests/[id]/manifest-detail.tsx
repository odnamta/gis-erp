'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManifestStatusBadge } from '@/components/agency/bl-status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CargoManifest,
  BillOfLading,
  MANIFEST_TYPE_LABELS,
} from '@/types/agency';
import {
  submitManifest,
  approveManifest,
  deleteCargoManifest,
} from '@/app/actions/bl-documentation-actions';
import {
  ArrowLeft,
  Edit,
  Ship,
  Package,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  Send,
  CheckCircle,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface ManifestDetailProps {
  manifest: CargoManifest;
  linkedBLs: BillOfLading[];
}

export function ManifestDetail({ manifest, linkedBLs }: ManifestDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Submit dialog state
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submittedTo, setSubmittedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approve dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const canEdit = manifest.status === 'draft';
  const canDelete = manifest.status === 'draft';
  const canSubmit = manifest.status === 'draft' && manifest.blIds.length > 0;
  const canApprove = manifest.status === 'submitted';

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Get manifest type icon
  const TypeIcon = manifest.manifestType === 'inward' ? ArrowDownLeft : ArrowUpRight;

  const handleSubmit = async () => {
    if (!submittedTo.trim()) {
      toast.error('Please enter the authority/entity to submit to');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitManifest(manifest.id, submittedTo);
      if (result.success) {
        toast.success('Manifest submitted successfully');
        setSubmitDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to submit manifest');
      }
    } catch (error) {
      console.error('Error submitting manifest:', error);
      toast.error('Failed to submit manifest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveManifest(manifest.id, documentUrl || undefined);
      if (result.success) {
        toast.success('Manifest approved successfully');
        setApproveDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to approve manifest');
      }
    } catch (error) {
      console.error('Error approving manifest:', error);
      toast.error('Failed to approve manifest');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteCargoManifest(manifest.id);
      if (result.success) {
        toast.success('Manifest deleted successfully');
        router.push('/agency/manifests');
      } else {
        toast.error(result.error || 'Failed to delete manifest');
      }
    } catch (error) {
      console.error('Error deleting manifest:', error);
      toast.error('Failed to delete manifest');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agency/manifests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{manifest.manifestNumber}</h1>
              <ManifestStatusBadge status={manifest.status} />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TypeIcon className="h-4 w-4" />
              <span>{MANIFEST_TYPE_LABELS[manifest.manifestType]} Manifest</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button onClick={() => setSubmitDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          )}
          {canApprove && (
            <Button onClick={() => setApproveDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {canEdit && (
            <Link href={`/agency/manifests/${manifest.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={isLoading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Manifest?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    cargo manifest {manifest.manifestNumber}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-destructive text-destructive-foreground">
                    {isLoading ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Submission Info */}
      {manifest.submittedAt && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Submitted: </span>
                <span className="font-medium">{formatDate(manifest.submittedAt)}</span>
              </div>
              {manifest.submittedTo && (
                <div>
                  <span className="text-muted-foreground">To: </span>
                  <span className="font-medium">{manifest.submittedTo}</span>
                </div>
              )}
              {manifest.documentUrl && (
                <div>
                  <a 
                    href={manifest.documentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    View Document
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B/Ls</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manifest.totalBls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Containers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manifest.totalContainers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manifest.totalPackages.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weight (kg)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manifest.totalWeightKg.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CBM</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manifest.totalCbm.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="bls">Bills of Lading ({linkedBLs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Vessel & Voyage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Vessel & Voyage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Vessel Name</p>
                  <p className="font-medium">{manifest.vesselName}</p>
                </div>
                {manifest.voyageNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Voyage Number</p>
                    <p className="font-medium">{manifest.voyageNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ports */}
          {(manifest.portOfLoading || manifest.portOfDischarge) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {manifest.portOfLoading && (
                    <div>
                      <p className="text-sm text-muted-foreground">Port of Loading</p>
                      <p className="font-medium">{manifest.portOfLoading}</p>
                    </div>
                  )}
                  {manifest.portOfDischarge && (
                    <div>
                      <p className="text-sm text-muted-foreground">Port of Discharge</p>
                      <p className="font-medium">{manifest.portOfDischarge}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule */}
          {(manifest.departureDate || manifest.arrivalDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {manifest.departureDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Departure Date</p>
                      <p className="font-medium">{formatDate(manifest.departureDate)}</p>
                    </div>
                  )}
                  {manifest.arrivalDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Arrival Date</p>
                      <p className="font-medium">{formatDate(manifest.arrivalDate)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Manifest Type</p>
                  <p className="font-medium">{MANIFEST_TYPE_LABELS[manifest.manifestType]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(manifest.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Bills of Lading</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedBLs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No Bills of Lading linked to this manifest</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">B/L Number</th>
                        <th className="text-left py-2 px-2">Shipper</th>
                        <th className="text-left py-2 px-2">Consignee</th>
                        <th className="text-right py-2 px-2">Containers</th>
                        <th className="text-right py-2 px-2">Packages</th>
                        <th className="text-right py-2 px-2">Weight (kg)</th>
                        <th className="text-right py-2 px-2">CBM</th>
                        <th className="text-center py-2 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedBLs.map((bl) => (
                        <tr key={bl.id} className="border-b">
                          <td className="py-2 px-2 font-mono">{bl.blNumber}</td>
                          <td className="py-2 px-2 truncate max-w-[150px]">{bl.shipperName}</td>
                          <td className="py-2 px-2 truncate max-w-[150px]">
                            {bl.consigneeToOrder ? 'To Order' : bl.consigneeName || '-'}
                          </td>
                          <td className="py-2 px-2 text-right">{bl.containers?.length || 0}</td>
                          <td className="py-2 px-2 text-right">{bl.numberOfPackages?.toLocaleString() || '-'}</td>
                          <td className="py-2 px-2 text-right">{bl.grossWeightKg?.toLocaleString() || '-'}</td>
                          <td className="py-2 px-2 text-right">{bl.measurementCbm?.toLocaleString() || '-'}</td>
                          <td className="py-2 px-2 text-center">
                            <Link href={`/agency/bl/${bl.id}`}>
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-medium bg-muted/50">
                        <td className="py-2 px-2" colSpan={3}>Total</td>
                        <td className="py-2 px-2 text-right">{manifest.totalContainers}</td>
                        <td className="py-2 px-2 text-right">{manifest.totalPackages.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{manifest.totalWeightKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{manifest.totalCbm.toLocaleString()}</td>
                        <td className="py-2 px-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Manifest</DialogTitle>
            <DialogDescription>
              Submit manifest {manifest.manifestNumber} to customs or port authority.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="submittedTo">Submit To *</Label>
              <Input
                id="submittedTo"
                placeholder="e.g., Port Authority, Customs Office"
                value={submittedTo}
                onChange={(e) => setSubmittedTo(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the authority or entity this manifest is being submitted to
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !submittedTo.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Manifest</DialogTitle>
            <DialogDescription>
              Mark manifest {manifest.manifestNumber} as approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="documentUrl">Document URL (Optional)</Label>
              <Input
                id="documentUrl"
                placeholder="https://..."
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                disabled={isApproving}
              />
              <p className="text-xs text-muted-foreground">
                Optionally attach a URL to the approved document
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
