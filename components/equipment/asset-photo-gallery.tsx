'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ImageIcon, Star, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AssetPhotoJson } from '@/types/assets'

interface AssetPhotoGalleryProps {
  photos: AssetPhotoJson[]
}

export function AssetPhotoGallery({ photos }: AssetPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No photos uploaded</p>
      </div>
    )
  }

  const primaryPhoto = photos.find((p) => p.is_primary) || photos[0]
  const otherPhotos = photos.filter((p) => p !== primaryPhoto)

  const handlePrevious = () => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1)
  }

  return (
    <>
      <div className="grid gap-4">
        {/* Primary Photo */}
        <div
          className="relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-muted"
          onClick={() => setSelectedIndex(photos.indexOf(primaryPhoto))}
        >
          <Image
            src={primaryPhoto.url}
            alt={primaryPhoto.caption || 'Asset photo'}
            fill
            className="object-cover transition-transform hover:scale-105"
          />
          {primaryPhoto.is_primary && (
            <Badge className="absolute top-2 left-2 gap-1">
              <Star className="h-3 w-3" />
              Primary
            </Badge>
          )}
          {primaryPhoto.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-sm text-white">{primaryPhoto.caption}</p>
            </div>
          )}
        </div>

        {/* Thumbnail Grid */}
        {otherPhotos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {otherPhotos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-md bg-muted"
                onClick={() => setSelectedIndex(photos.indexOf(photo))}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 2}`}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && (
              <div className="relative aspect-video">
                <Image
                  src={photos[selectedIndex].url}
                  alt={photos[selectedIndex].caption || 'Asset photo'}
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {/* Caption */}
            {selectedIndex !== null && photos[selectedIndex].caption && (
              <div className="p-4 text-center">
                <p className="text-white">{photos[selectedIndex].caption}</p>
              </div>
            )}

            {/* Counter */}
            {photos.length > 1 && selectedIndex !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {selectedIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
