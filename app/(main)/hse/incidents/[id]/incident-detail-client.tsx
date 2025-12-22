'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  IncidentDetailHeader,
  InvestigationPanel,
  ActionsList,
  AddActionDialog,
  IncidentTimeline,
  CloseIncidentDialog,
  PersonsList,
} from '@/components/hse';
import {
  startInvestigation,
  updateRootCause,
  addCorrectiveAction,
  addPreventiveAction,
  completeAction,
  closeIncident,
} from '@/lib/incident-actions';
import {
  Incident,
  IncidentHistoryEntry,
  ContributingFactor,
  AddActionInput,
} from '@/types/incident';
import { getLocationTypeLabel, getIncidentTypeLabel, formatIncidentDate } from '@/lib/incident-utils';

interface Employee {
  id: string;
  full_name: string;
}

interface IncidentDetailClientProps {
  incident: Incident;
  history: IncidentHistoryEntry[];
  employees: Employee[];
}

export function IncidentDetailClient({
  incident: initialIncident,
  history,
  employees,
}: IncidentDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [incident, setIncident] = useState(initialIncident);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showAddCorrectiveAction, setShowAddCorrectiveAction] = useState(false);
  const [showAddPreventiveAction, setShowAddPreventiveAction] = useState(false);

  const canStartInvestigation = incident.status === 'reported' && incident.investigationRequired;
  const canClose = ['pending_actions', 'under_investigation'].includes(incident.status);
  const canReject = incident.status === 'reported';
  const canAddActions = ['under_investigation', 'pending_actions'].includes(incident.status);
  const canCompleteActions = true;
  const isReadonly = ['closed', 'rejected'].includes(incident.status);

  const handleStartInvestigation = async () => {
    // For now, assign to current user - in real app, show dialog to select investigator
    const investigatorId = employees[0]?.id;
    if (!investigatorId) {
      toast({ title: 'Error', description: 'No investigator available', variant: 'destructive' });
      return;
    }

    const result = await startInvestigation(incident.id, investigatorId);
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Investigasi dimulai' });
      router.refresh();
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  const handleSaveRootCause = async (rootCause: string, factors: ContributingFactor[]) => {
    const result = await updateRootCause(incident.id, { rootCause, contributingFactors: factors });
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Root cause disimpan' });
      setIncident({ ...incident, rootCause, contributingFactors: factors });
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddCorrectiveAction = async (action: AddActionInput) => {
    const result = await addCorrectiveAction(incident.id, action);
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Tindakan korektif ditambahkan' });
      router.refresh();
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddPreventiveAction = async (action: AddActionInput) => {
    const result = await addPreventiveAction(incident.id, action);
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Tindakan preventif ditambahkan' });
      router.refresh();
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  const handleCompleteCorrectiveAction = async (actionId: string) => {
    const result = await completeAction(incident.id, actionId, 'corrective');
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Tindakan diselesaikan' });
      router.refresh();
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  const handleCompletePreventiveAction = async (actionId: string) => {
    const result = await completeAction(incident.id, actionId, 'preventive');
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Tindakan diselesaikan' });
      router.refresh();
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  const handleCloseIncident = async (closureNotes: string) => {
    const result = await closeIncident(incident.id, { closureNotes });
    if (result.success) {
      toast({ title: 'Berhasil', description: 'Insiden ditutup' });
      router.refresh();
    } else {
      toast({ title: 'Gagal', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <IncidentDetailHeader
        incident={incident}
        onStartInvestigation={handleStartInvestigation}
        onClose={() => setShowCloseDialog(true)}
        canStartInvestigation={canStartInvestigation}
        canClose={canClose}
        canReject={canReject}
      />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detail</TabsTrigger>
          <TabsTrigger value="investigation">Investigasi</TabsTrigger>
          <TabsTrigger value="actions">Tindakan</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informasi Insiden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Jenis:</span>
                  <span>{getIncidentTypeLabel(incident.incidentType)}</span>
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span>{formatIncidentDate(incident.incidentDate)}</span>
                  <span className="text-muted-foreground">Lokasi:</span>
                  <span>{incident.locationName || getLocationTypeLabel(incident.locationType)}</span>
                  {incident.jobOrderNumber && (
                    <>
                      <span className="text-muted-foreground">Job Order:</span>
                      <span>{incident.jobOrderNumber}</span>
                    </>
                  )}
                  {incident.assetName && (
                    <>
                      <span className="text-muted-foreground">Asset:</span>
                      <span>{incident.assetCode} - {incident.assetName}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deskripsi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
                {incident.immediateActions && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-1">Tindakan Segera:</p>
                    <p className="text-sm text-muted-foreground">{incident.immediateActions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orang Terlibat</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonsList
                persons={incident.persons?.map((p) => ({
                  personType: p.personType,
                  employeeId: p.employeeId,
                  personName: p.personName,
                  personCompany: p.personCompany,
                  personPhone: p.personPhone,
                  injuryType: p.injuryType,
                  injuryDescription: p.injuryDescription,
                  bodyPart: p.bodyPart,
                  treatment: p.treatment,
                  daysLost: p.daysLost,
                  statement: p.statement,
                })) || []}
                employees={employees}
                onRemove={() => {}}
                readonly
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investigation">
          <InvestigationPanel
            incident={incident}
            onSave={handleSaveRootCause}
            readonly={isReadonly}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <ActionsList
            title="Tindakan Korektif"
            actions={incident.correctiveActions || []}
            onComplete={handleCompleteCorrectiveAction}
            onAdd={() => setShowAddCorrectiveAction(true)}
            canAdd={canAddActions}
            canComplete={canCompleteActions}
          />
          <ActionsList
            title="Tindakan Preventif"
            actions={incident.preventiveActions || []}
            onComplete={handleCompletePreventiveAction}
            onAdd={() => setShowAddPreventiveAction(true)}
            canAdd={canAddActions}
            canComplete={canCompleteActions}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <IncidentTimeline history={history} />
        </TabsContent>
      </Tabs>

      <CloseIncidentDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        incident={incident}
        onClose={handleCloseIncident}
      />

      <AddActionDialog
        open={showAddCorrectiveAction}
        onOpenChange={setShowAddCorrectiveAction}
        onAdd={handleAddCorrectiveAction}
        employees={employees}
        actionType="corrective"
      />

      <AddActionDialog
        open={showAddPreventiveAction}
        onOpenChange={setShowAddPreventiveAction}
        onAdd={handleAddPreventiveAction}
        employees={employees}
        actionType="preventive"
      />
    </div>
  );
}
