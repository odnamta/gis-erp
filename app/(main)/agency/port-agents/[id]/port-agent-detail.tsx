'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Star,
  Globe,
  Phone,
  Mail,
  MapPin,
  Anchor,
  User,
  FileText,
  Building2,
  Loader2,
} from 'lucide-react';
import { PortAgent, PORT_AGENT_SERVICE_LABELS } from '@/types/agency';
import { deletePortAgent, submitAgentRating } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

interface PortAgentDetailProps {
  portAgent: PortAgent;
}

export function PortAgentDetail({ portAgent }: PortAgentDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deletePortAgent(portAgent.id);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Port agent deleted',
      });
      router.push('/agency/port-agents');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete port agent',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
    setDeleteDialogOpen(false);
  };

  const handleSubmitRating = async () => {
    if (ratingValue < 1 || ratingValue > 5) {
      toast({
        title: 'Error',
        description: 'Please select a rating between 1 and 5',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingRating(true);
    const result = await submitAgentRating(portAgent.id, ratingValue, ratingFeedback || undefined);
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Rating submitted successfully',
      });
      setRatingValue(0);
      setRatingFeedback('');
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to submit rating',
        variant: 'destructive',
      });
    }
    setIsSubmittingRating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/agency/port-agents')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Port Agents
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{portAgent.agentName}</h1>
            {portAgent.isPreferred && (
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <p className="text-muted-foreground">{portAgent.agentCode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/agency/port-agents/${portAgent.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Port Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5" />
              Port Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Port</p>
              <p className="font-medium">{portAgent.portName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p className="font-medium">{portAgent.portCountry}</p>
            </div>
            {portAgent.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p>{portAgent.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portAgent.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={portAgent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {portAgent.website}
                </a>
              </div>
            )}
            {portAgent.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${portAgent.phone}`} className="hover:underline">
                  {portAgent.phone}
                </a>
              </div>
            )}
            {portAgent.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${portAgent.email}`} className="hover:underline">
                  {portAgent.email}
                </a>
              </div>
            )}
            {!portAgent.website && !portAgent.phone && !portAgent.email && (
              <p className="text-muted-foreground">No contact information available</p>
            )}
          </CardContent>
        </Card>

        {/* Services & Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Services & Rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portAgent.services.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Services Offered</p>
                <div className="flex flex-wrap gap-2">
                  {portAgent.services.map((service) => (
                    <Badge key={service} variant="secondary">
                      {PORT_AGENT_SERVICE_LABELS[service]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {portAgent.serviceRating && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Service Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(portAgent.serviceRating!)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-medium">{portAgent.serviceRating.toFixed(1)}</span>
                  {portAgent.ratingCount && (
                    <span className="text-muted-foreground ml-1">
                      ({portAgent.ratingCount} rating{portAgent.ratingCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Licenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Licenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portAgent.customsLicense && (
              <div>
                <p className="text-sm text-muted-foreground">Customs License</p>
                <p className="font-medium">{portAgent.customsLicense}</p>
              </div>
            )}
            {portAgent.ppjkLicense && (
              <div>
                <p className="text-sm text-muted-foreground">PPJK License</p>
                <p className="font-medium">{portAgent.ppjkLicense}</p>
              </div>
            )}
            {portAgent.otherLicenses.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Other Licenses</p>
                <ul className="list-disc list-inside">
                  {portAgent.otherLicenses.map((license, index) => (
                    <li key={index} className="font-medium">{license}</li>
                  ))}
                </ul>
              </div>
            )}
            {!portAgent.customsLicense && !portAgent.ppjkLicense && portAgent.otherLicenses.length === 0 && (
              <p className="text-muted-foreground">No licenses on file</p>
            )}
          </CardContent>
        </Card>

        {/* Commercial Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Commercial Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portAgent.paymentTerms && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{portAgent.paymentTerms}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{portAgent.currency}</p>
            </div>
            {!portAgent.paymentTerms && (
              <p className="text-muted-foreground">No payment terms specified</p>
            )}
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portAgent.bankName && (
              <div>
                <p className="text-sm text-muted-foreground">Bank Name</p>
                <p className="font-medium">{portAgent.bankName}</p>
              </div>
            )}
            {portAgent.bankAccount && (
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-medium">{portAgent.bankAccount}</p>
              </div>
            )}
            {portAgent.bankSwift && (
              <div>
                <p className="text-sm text-muted-foreground">SWIFT Code</p>
                <p className="font-medium">{portAgent.bankSwift}</p>
              </div>
            )}
            {!portAgent.bankName && !portAgent.bankAccount && !portAgent.bankSwift && (
              <p className="text-muted-foreground">No bank details on file</p>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        {portAgent.contacts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {portAgent.contacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.role}</p>
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground">{contact.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Rating */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Submit Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-1 hover:scale-110 transition-transform"
                    disabled={isSubmittingRating}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredStar || ratingValue)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {ratingValue > 0 && (
                  <span className="ml-2 text-lg font-medium">{ratingValue}/5</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Share your experience with this agent..."
                rows={3}
                disabled={isSubmittingRating}
              />
            </div>
            <Button 
              onClick={handleSubmitRating} 
              disabled={ratingValue === 0 || isSubmittingRating}
            >
              {isSubmittingRating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Rating'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notes */}
        {portAgent.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{portAgent.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Port Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{portAgent.agentName}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
