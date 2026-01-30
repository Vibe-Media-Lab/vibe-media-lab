'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Upload, X, FileVideo, FileImage, FileAudio } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { MediaUploadStepConfig } from '@vibe-media-lab/shared'

interface UploadedFile {
  id: string
  file: File
  preview?: string
}

interface MediaUploadStepProps {
  stepId: string
  label: string
  description?: string
  config: MediaUploadStepConfig
  value: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('audio/')) return FileAudio
  return Upload
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaUploadStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
}: MediaUploadStepProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const acceptString = config.accept.join(',')
  const maxSizeBytes = config.maxSizeMb * 1024 * 1024

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: UploadedFile[] = []

    for (const file of Array.from(fileList)) {
      if (file.size > maxSizeBytes) {
        continue
      }

      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview,
      })
    }

    if (config.multiple) {
      onChange([...value, ...newFiles])
    } else {
      value.forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
      onChange(newFiles.slice(0, 1))
    }
  }

  const handleRemove = (id: string) => {
    const fileToRemove = value.find((f) => f.id === id)
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
    onChange(value.filter((f) => f.id !== id))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium text-white">{label}</Label>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3',
          'rounded-xl border-2 border-dashed',
          'transition-colors duration-200',
          isDragging
            ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/5'
            : 'border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={config.multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />

        <Upload className="h-10 w-10 text-white/60" />
        <div className="text-center">
          <p className="text-sm font-medium text-white">
            클릭하거나 파일을 드래그하세요
          </p>
          <p className="mt-1 text-xs text-white/60">
            최대 {config.maxSizeMb}MB
            {config.multiple && ' (여러 파일 가능)'}
          </p>
        </div>
      </div>

      {config.hint && (
        <p className="text-xs text-white/60">{config.hint}</p>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((uploadedFile) => {
            const Icon = getFileIcon(uploadedFile.file.type)

            return (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-3 rounded-lg bg-white/5 p-3"
              >
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-6 w-6 text-white/60" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-white/60">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(uploadedFile.id)
                  }}
                  className="shrink-0 text-white/60 hover:text-white hover:bg-white/10"
                  aria-label="파일 제거"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
