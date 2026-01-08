'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Certification } from '@/types/resource-scheduling'
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/pjo-utils'
import { getCertificationStatus } from '@/lib/resource-scheduling-utils'

interface CertificationEditorProps {
  value: Certification[]
  onChange: (certifications: Certification[]) => void
  disabled?: boolean
}

export function CertificationEditor({ value, onChange, disabled }: CertificationEditorProps) {
  const [newCert, setNewCert] = useState<Partial<Certification>>({})

  const addCertification = () => {
    if (!newCert.name) return
    onChange([...value, newCert as Certification])
    setNewCert({})
  }

  const removeCertification = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateCertification = (index: number, field: keyof Certification, fieldValue: string) => {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: fieldValue }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Existing certifications */}
      {value.map((cert, index) => {
        const status = cert.expiry_date ? getCertificationStatus(cert) : 'valid'
        return (
          <Card key={index} className="relative">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={cert.name}
                    onChange={(e) => updateCertification(index, 'name', e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issuing Body</Label>
                  <Input
                    value={cert.issuing_body || ''}
                    onChange={(e) => updateCertification(index, 'issuing_body', e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issued Date</Label>
                  <Input
                    type="date"
                    value={cert.issued_date || ''}
                    onChange={(e) => updateCertification(index, 'issued_date', e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Expiry Date
                    {status === 'expired' && (
                      <span className="text-destructive flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Expired
                      </span>
                    )}
                    {status === 'expiring_soon' && (
                      <span className="text-yellow-600 flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Expiring Soon
                      </span>
                    )}
                    {status === 'valid' && cert.expiry_date && (
                      <span className="text-green-600 flex items-center gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" /> Valid
                      </span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={cert.expiry_date || ''}
                    onChange={(e) => updateCertification(index, 'expiry_date', e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeCertification(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Add new certification */}
      {!disabled && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newCert.name || ''}
                  onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                  placeholder="Certification name"
                />
              </div>
              <div className="space-y-2">
                <Label>Issuing Body</Label>
                <Input
                  value={newCert.issuing_body || ''}
                  onChange={(e) => setNewCert({ ...newCert, issuing_body: e.target.value })}
                  placeholder="e.g., BNSP"
                />
              </div>
              <div className="space-y-2">
                <Label>Issued Date</Label>
                <Input
                  type="date"
                  value={newCert.issued_date || ''}
                  onChange={(e) => setNewCert({ ...newCert, issued_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={newCert.expiry_date || ''}
                  onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addCertification}
              disabled={!newCert.name}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          </CardContent>
        </Card>
      )}

      {value.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground">No certifications</p>
      )}
    </div>
  )
}
