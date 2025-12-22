'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Settings } from 'lucide-react';
import { AuditType, ChecklistTemplate } from '@/types/audit';
import { getAuditTypes, updateAuditType, deactivateAuditType } from '@/lib/audit-actions';
import { formatCategory } from '@/lib/audit-utils';
import { AuditTypeForm } from '@/components/hse/audits/audit-type-form';
import { ChecklistTemplateEditor } from '@/components/hse/audits/checklist-template-editor';

export default function AuditTypesPage() {
  const router = useRouter();
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<AuditType | undefined>();
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AuditType | null>(null);
  const [template, setTemplate] = useState<ChecklistTemplate>({ sections: [] });

  useEffect(() => {
    loadAuditTypes();
  }, []);

  async function loadAuditTypes() {
    setLoading(true);
    const { data } = await getAuditTypes();
    setAuditTypes(data);
    setLoading(false);
  }

  function handleNew() {
    setEditingType(undefined);
    setShowForm(true);
  }

  function handleEdit(auditType: AuditType) {
    setEditingType(auditType);
    setShowForm(true);
  }

  function handleEditTemplate(auditType: AuditType) {
    setEditingTemplate(auditType);
    setTemplate(auditType.checklist_template || { sections: [] });
    setShowTemplateEditor(true);
  }

  async function handleSaveTemplate() {
    if (!editingTemplate) return;

    await updateAuditType(editingTemplate.id, {
      checklist_template: template,
    });

    setShowTemplateEditor(false);
    setEditingTemplate(null);
    loadAuditTypes();
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Are you sure you want to deactivate this audit type?')) return;

    await deactivateAuditType(id);
    loadAuditTypes();
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingType(undefined);
    loadAuditTypes();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/hse/audits')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Audit Types</h1>
            <p className="text-muted-foreground">
              Configure audit types and checklist templates
            </p>
          </div>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Audit Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Audit Types</CardTitle>
        </CardHeader>
        <CardContent>
          {auditTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit types configured yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-mono">{type.type_code}</TableCell>
                    <TableCell>{type.type_name}</TableCell>
                    <TableCell>{formatCategory(type.category)}</TableCell>
                    <TableCell>
                      {type.frequency_days
                        ? `Every ${type.frequency_days} days`
                        : 'Ad-hoc'}
                    </TableCell>
                    <TableCell>
                      {type.checklist_template?.sections?.length || 0} sections
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? 'default' : 'secondary'}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTemplate(type)}
                          title="Edit Checklist"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(type)}
                          title="Edit Type"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {type.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(type.id)}
                            title="Deactivate"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit Type Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Audit Type' : 'New Audit Type'}
            </DialogTitle>
          </DialogHeader>
          <AuditTypeForm
            auditType={editingType}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Checklist Template Editor Dialog */}
      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Checklist Template - {editingTemplate?.type_name}
            </DialogTitle>
          </DialogHeader>
          <ChecklistTemplateEditor
            template={template}
            onChange={setTemplate}
            onSave={handleSaveTemplate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
