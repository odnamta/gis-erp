'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProjectForm, ProjectFormData } from './project-form'
import { Customer, Project } from '@/types'

export type ProjectWithCustomer = Project & {
  customers: { name: string } | null
}

interface ProjectDialogProps {
  project?: ProjectWithCustomer | null
  customers: Customer[]
  preselectedCustomerId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => Promise<{ error?: string }>
  onSuccess: () => void
}

export function ProjectDialog({
  project,
  customers,
  preselectedCustomerId,
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
}: ProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: ProjectFormData) => {
    setIsLoading(true)
    const result = await onSubmit(data)
    setIsLoading(false)

    if (!result.error) {
      onOpenChange(false)
      onSuccess()
    }
  }

  const isEditing = !!project

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Add Project'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the project information below.'
              : 'Fill in the details to add a new project.'}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          customers={customers}
          project={project}
          preselectedCustomerId={preselectedCustomerId}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          mode={isEditing ? 'edit' : 'create'}
        />
      </DialogContent>
    </Dialog>
  )
}
