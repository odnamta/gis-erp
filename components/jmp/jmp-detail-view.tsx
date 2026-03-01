'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Pencil,
  Play,
  Printer,
  Send,
  CheckCircle,
  XCircle,
  Truck,
  Users,
  MapPin,
  AlertTriangle,
  Phone,
  FileText,
} from 'lucide-react';
import { JmpWithRelations } from '@/types/jmp';
import { formatJmpStatus, getJmpStatusColor } from '@/lib/jmp-utils';
import {
  submitJmpForReview,
  approveJmp,
  rejectJmp,
  startJourney,
} from '@/lib/jmp-actions';
import { CheckpointTable } from './checkpoint-table';
import { RiskAssessmentTable } from './risk-assessment-table';
import { JmpDocumentUpload } from './jmp-document-upload';
import { PDFButtons } from '@/components/pdf/pdf-buttons';

interface JmpDetailViewProps {
  jmp: JmpWithRelations;
  currentUserId: string;
}

export function JmpDetailView({ jmp, currentUserId }: JmpDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmitForReview = async () => {
    setLoading(true);
    const result = await submitJmpForReview(jmp.id, currentUserId);
    setLoading(false);
    
    if (result.success) {
      toast({ title: 'Success', description: 'JMP submitted for review' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    const result = await approveJmp(jmp.id, currentUserId);
    setLoading(false);
    
    if (result.success) {
      toast({ title: 'Success', description: 'JMP approved' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    setLoading(true);
    const result = await rejectJmp(jmp.id, 'Needs revision');
    setLoading(false);
    
    if (result.success) {
      toast({ title: 'Success', description: 'JMP returned to draft' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleStartJourney = async () => {
    setLoading(true);
    const result = await startJourney(jmp.id);
    setLoading(false);
    
    if (result.success) {
      toast({ title: 'Success', description: 'Journey started' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/engineering/jmp">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{jmp.jmpNumber}</h1>
            <p className="text-muted-foreground">{jmp.journeyTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {jmp.status === 'draft' && (
            <>
              <Link href={`/engineering/jmp/${jmp.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button onClick={handleSubmitForReview} disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </Button>
            </>
          )}
          {jmp.status === 'pending_review' && (
            <>
              <Button variant="outline" onClick={handleReject} disabled={loading}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          {jmp.status === 'approved' && (
            <Button onClick={handleStartJourney} disabled={loading}>
              <Play className="mr-2 h-4 w-4" />
              Start Journey
            </Button>
          )}
          <PDFButtons
            documentType="jmp"
            documentId={jmp.id}
            documentNumber={jmp.jmpNumber}
            size="sm"
            variant="outline"
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{jmp.journeyTitle}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {jmp.customer && <span>Customer: {jmp.customer.name}</span>}
                {jmp.jobOrder && <span>Job: {jmp.jobOrder.jo_number}</span>}
              </div>
            </div>
            <Badge className={`${getJmpStatusColor(jmp.status)} text-lg px-4 py-1`}>
              {formatJmpStatus(jmp.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan" className="gap-2">
            <Truck className="h-4 w-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="checkpoints" className="gap-2">
            <MapPin className="h-4 w-4" />
            Checkpoints
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risks
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Phone className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Route</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <p className="font-medium">{jmp.originLocation}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <p className="font-medium">{jmp.destinationLocation}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Distance:</span>
                  <p className="font-medium">{jmp.routeDistanceKm ? `${jmp.routeDistanceKm} km` : '-'}</p>
                </div>
                {jmp.routeSurvey && (
                  <div>
                    <span className="text-muted-foreground">Survey:</span>
                    <p className="font-medium">{jmp.routeSurvey.survey_number} ✅</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Departure:</span>
                  <p className="font-medium">
                    {jmp.plannedDeparture
                      ? format(new Date(jmp.plannedDeparture), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Arrival:</span>
                  <p className="font-medium">
                    {jmp.plannedArrival
                      ? format(new Date(jmp.plannedArrival), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">
                    {jmp.journeyDurationHours ? `${jmp.journeyDurationHours} hours` : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{jmp.cargoDescription}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-muted-foreground">Length:</span>
                  <p className="font-medium">{jmp.totalLengthM ? `${jmp.totalLengthM} m` : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Width:</span>
                  <p className="font-medium">{jmp.totalWidthM ? `${jmp.totalWidthM} m` : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Height:</span>
                  <p className="font-medium">{jmp.totalHeightM ? `${jmp.totalHeightM} m` : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Weight:</span>
                  <p className="font-medium">{jmp.totalWeightTons ? `${jmp.totalWeightTons} tons` : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-muted-foreground">Convoy Commander:</span>
                <p className="font-medium">
                  {jmp.convoyCommander?.full_name || 'Not assigned'}
                  {jmp.convoyCommander?.phone && ` (${jmp.convoyCommander.phone})`}
                </p>
              </div>
              {jmp.drivers && jmp.drivers.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Drivers:</span>
                  <ul className="mt-2 space-y-1">
                    {jmp.drivers.map((driver, idx) => (
                      <li key={idx} className="text-sm">
                        {driver.name} - {driver.role} ({driver.vehicle}) - {driver.phone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {jmp.escortDetails && (
                <div>
                  <span className="text-muted-foreground">Escort:</span>
                  <p className="font-medium">
                    {jmp.escortDetails.type} - {jmp.escortDetails.company} ({jmp.escortDetails.vehiclesCount} vehicles)
                  </p>
                  <p className="text-sm text-muted-foreground">Contact: {jmp.escortDetails.contact}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkpoints">
          <Card>
            <CardHeader>
              <CardTitle>Checkpoint Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckpointTable checkpoints={jmp.checkpoints || []} readonly />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskAssessmentTable risks={jmp.risks || []} readonly />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {jmp.emergencyContacts && jmp.emergencyContacts.length > 0 ? (
                <ul className="space-y-2">
                  {jmp.emergencyContacts.map((contact, idx) => (
                    <li key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{contact.phone}</p>
                        {contact.availableHours && (
                          <p className="text-sm text-muted-foreground">{contact.availableHours}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No emergency contacts defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <JmpDocumentUpload
                jmpId={jmp.id}
                documents={jmp.documents || []}
                onSuccess={() => router.refresh()}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
