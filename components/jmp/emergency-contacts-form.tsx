'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { EmergencyContact, RadioFrequency, NearbyFacility } from '@/types/jmp';

interface EmergencyContactsFormProps {
  emergencyContacts: EmergencyContact[];
  radioFrequencies: RadioFrequency[];
  nearestHospitals: NearbyFacility[];
  nearestWorkshops: NearbyFacility[];
  onChange: (data: {
    emergencyContacts: EmergencyContact[];
    radioFrequencies: RadioFrequency[];
    nearestHospitals: NearbyFacility[];
    nearestWorkshops: NearbyFacility[];
  }) => void;
  readonly?: boolean;
}

export function EmergencyContactsForm({
  emergencyContacts,
  radioFrequencies,
  nearestHospitals,
  nearestWorkshops,
  onChange,
  readonly,
}: EmergencyContactsFormProps) {
  const addContact = () => {
    onChange({
      emergencyContacts: [...emergencyContacts, { name: '', role: '', phone: '' }],
      radioFrequencies,
      nearestHospitals,
      nearestWorkshops,
    });
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ emergencyContacts: updated, radioFrequencies, nearestHospitals, nearestWorkshops });
  };

  const removeContact = (index: number) => {
    onChange({
      emergencyContacts: emergencyContacts.filter((_, i) => i !== index),
      radioFrequencies,
      nearestHospitals,
      nearestWorkshops,
    });
  };

  const addRadio = () => {
    onChange({
      emergencyContacts,
      radioFrequencies: [...radioFrequencies, { channel: '', frequency: '', usage: '' }],
      nearestHospitals,
      nearestWorkshops,
    });
  };

  const updateRadio = (index: number, field: keyof RadioFrequency, value: string) => {
    const updated = [...radioFrequencies];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ emergencyContacts, radioFrequencies: updated, nearestHospitals, nearestWorkshops });
  };

  const removeRadio = (index: number) => {
    onChange({
      emergencyContacts,
      radioFrequencies: radioFrequencies.filter((_, i) => i !== index),
      nearestHospitals,
      nearestWorkshops,
    });
  };

  const addFacility = (type: 'hospital' | 'workshop') => {
    const newFacility: NearbyFacility = { name: '', phone: '' };
    if (type === 'hospital') {
      onChange({ emergencyContacts, radioFrequencies, nearestHospitals: [...nearestHospitals, newFacility], nearestWorkshops });
    } else {
      onChange({ emergencyContacts, radioFrequencies, nearestHospitals, nearestWorkshops: [...nearestWorkshops, newFacility] });
    }
  };

  const updateFacility = (type: 'hospital' | 'workshop', index: number, field: keyof NearbyFacility, value: string) => {
    if (type === 'hospital') {
      const updated = [...nearestHospitals];
      updated[index] = { ...updated[index], [field]: value };
      onChange({ emergencyContacts, radioFrequencies, nearestHospitals: updated, nearestWorkshops });
    } else {
      const updated = [...nearestWorkshops];
      updated[index] = { ...updated[index], [field]: value };
      onChange({ emergencyContacts, radioFrequencies, nearestHospitals, nearestWorkshops: updated });
    }
  };

  const removeFacility = (type: 'hospital' | 'workshop', index: number) => {
    if (type === 'hospital') {
      onChange({ emergencyContacts, radioFrequencies, nearestHospitals: nearestHospitals.filter((_, i) => i !== index), nearestWorkshops });
    } else {
      onChange({ emergencyContacts, radioFrequencies, nearestHospitals, nearestWorkshops: nearestWorkshops.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Emergency Contacts</CardTitle>
          {!readonly && (
            <Button type="button" variant="outline" size="sm" onClick={addContact}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {emergencyContacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contacts added</p>
          ) : (
            emergencyContacts.map((contact, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                <div>
                  <Label>Name</Label>
                  <Input value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} disabled={readonly} />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input value={contact.role} onChange={(e) => updateContact(idx, 'role', e.target.value)} disabled={readonly} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={contact.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} disabled={readonly} />
                </div>
                {!readonly && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Radio Frequencies</CardTitle>
          {!readonly && (
            <Button type="button" variant="outline" size="sm" onClick={addRadio}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {radioFrequencies.length === 0 ? (
            <p className="text-muted-foreground text-sm">No frequencies added</p>
          ) : (
            radioFrequencies.map((radio, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                <div>
                  <Label>Channel</Label>
                  <Input value={radio.channel} onChange={(e) => updateRadio(idx, 'channel', e.target.value)} disabled={readonly} />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Input value={radio.frequency} onChange={(e) => updateRadio(idx, 'frequency', e.target.value)} disabled={readonly} />
                </div>
                <div>
                  <Label>Usage</Label>
                  <Input value={radio.usage} onChange={(e) => updateRadio(idx, 'usage', e.target.value)} disabled={readonly} />
                </div>
                {!readonly && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRadio(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Nearest Hospitals</CardTitle>
            {!readonly && (
              <Button type="button" variant="outline" size="sm" onClick={() => addFacility('hospital')}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {nearestHospitals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hospitals added</p>
            ) : (
              nearestHospitals.map((h, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label>Name</Label>
                    <Input value={h.name} onChange={(e) => updateFacility('hospital', idx, 'name', e.target.value)} disabled={readonly} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={h.phone || ''} onChange={(e) => updateFacility('hospital', idx, 'phone', e.target.value)} disabled={readonly} />
                  </div>
                  {!readonly && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFacility('hospital', idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Nearest Workshops</CardTitle>
            {!readonly && (
              <Button type="button" variant="outline" size="sm" onClick={() => addFacility('workshop')}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {nearestWorkshops.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workshops added</p>
            ) : (
              nearestWorkshops.map((w, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label>Name</Label>
                    <Input value={w.name} onChange={(e) => updateFacility('workshop', idx, 'name', e.target.value)} disabled={readonly} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={w.phone || ''} onChange={(e) => updateFacility('workshop', idx, 'phone', e.target.value)} disabled={readonly} />
                  </div>
                  {!readonly && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFacility('workshop', idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
