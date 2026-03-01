'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, X, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import { uploadAssetPhoto, deleteAssetPhoto } from '@/lib/asset-actions'
import { AssetPhotoJson } from '@/types/assets'

interface AssetPhotoUploadProps {
  assetId: string
  photos: AssetPhotoJson[]
  onSuccess: () => void
}

export function AssetPhotoUpload({ assetId, photos, onSuccess }: AssetPhotoUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Error', description: 'Hanya file JPEG, PNG, dan WebP yang diperbolehkan', variant: 'destructive' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Ukuran file maksimal 10MB', variant: 'destructive' })
      return
    }

    setSelectedFile(file)
    setUploadDialogOpen(true)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (caption) formData.append('caption', caption)
      formData.append('is_primary', isPrimary ? 'true' : 'false')

      const result = await uploadAssetPhoto(assetId, formData)

      if (result.success) {
        toast({ title: 'Success', description: 'Foto berhasil diupload' })
        onSuccess()
        resetForm()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteAssetPhoto(assetId, photoToDelete)

      if (result.success) {
        toast({ title: 'Success', description: 'Foto berhasil dihapus' })
        onSuccess()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setPhotoToDelete(null)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setCaption('')
    setIsPrimary(false)
    setUploadDialogOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openDeleteDialog = (url: string) => {
    setPhotoToDelete(url)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Upload button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Foto
          </Button>
        </div>

        {/* Delete buttons for existing photos */}
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-md bg-muted overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {photo.is_primary && (
                  <div className="absolute top-1 left-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openDeleteDialog(photo.url)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                {photo.caption && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{photo.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Foto</DialogTitle>
            <DialogDescription>
              {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Caption (opsional)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Deskripsi foto..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <Label htmlFor="is_primary">Set sebagai foto utama</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isUploading}>
              Batal
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Foto</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus foto ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhoto}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
