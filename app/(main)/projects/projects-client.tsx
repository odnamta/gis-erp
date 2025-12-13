'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'
import { ProjectTable, ProjectWithCustomer } from '@/components/projects/project-table'
import { ProjectDialog } from '@/components/projects/project-dialog'
import { ProjectFormData } from '@/components/projects/project-form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createProject, updateProject, deleteProject } from './actions'

interface ProjectsClientProps {
  projects: ProjectWithCustomer[]
  customers: Customer[]
  openAddDialog?: boolean
  preselectedCustomerId?: string
}

export function ProjectsClient({ 
  projects, 
  customers, 
  openAddDialog = false,
  preselectedCustomerId 
}: ProjectsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(openAddDialog)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithCustomer | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithCustomer | null>(null)

  const handleAdd = () => {
    setSelectedProject(null)
    setDialogOpen(true)
  }

  const handleEdit = (project: ProjectWithCustomer) => {
    setSelectedProject(project)
    setDialogOpen(true)
  }

  const handleDeleteClick = (project: ProjectWithCustomer) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return

    const result = await deleteProject(projectToDelete.id)
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      })
      router.refresh()
    }
    
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }

  const handleSubmit = async (data: ProjectFormData): Promise<{ error?: string }> => {
    if (selectedProject) {
      const result = await updateProject(selectedProject.id, data)
      if (!result.error) {
        toast({
          title: 'Success',
          description: 'Project updated successfully',
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
      return result
    } else {
      const result = await createProject(data)
      if (!result.error) {
        toast({
          title: 'Success',
          description: 'Project created successfully',
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
      return result
    }
  }

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage your projects and track their progress
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <ProjectTable
        projects={projects}
        customers={customers}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <ProjectDialog
        project={selectedProject}
        customers={customers}
        preselectedCustomerId={preselectedCustomerId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
