'use client'

import * as React from 'react'
import { Camera, X } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const SOCIAL_HANDLE_REGEX = /^[a-zA-Z0-9_.]*$/
const MAX_BIO_LENGTH = 500
const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 30

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onSave?: (data: ProfileFormData) => void
}

export interface ProfileFormData {
  username: string
  bio: string
  avatarUrl: string | null
  coverUrl: string | null
  socialLinks: {
    x: string
    instagram: string
    youtube: string
    tiktok: string
  }
}

interface FormErrors {
  username?: string
  bio?: string
  avatar?: string
  cover?: string
  socialLinks?: {
    x?: string
    instagram?: string
    youtube?: string
    tiktok?: string
  }
}

export function EditProfileModal({
  open,
  onOpenChange,
  user,
  onSave,
}: EditProfileModalProps) {
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  const coverInputRef = React.useRef<HTMLInputElement>(null)

  const defaultUsername =
    user.user_metadata?.user_name ||
    user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_') ||
    'user'

  const [formData, setFormData] = React.useState<ProfileFormData>({
    username: defaultUsername,
    bio: user.user_metadata?.bio || '',
    avatarUrl: user.user_metadata?.avatar_url || null,
    coverUrl: user.user_metadata?.cover_url || null,
    socialLinks: {
      x: user.user_metadata?.social_links?.x || '',
      instagram: user.user_metadata?.social_links?.instagram || '',
      youtube: user.user_metadata?.social_links?.youtube || '',
      tiktok: user.user_metadata?.social_links?.tiktok || '',
    },
  })

  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    formData.avatarUrl
  )
  const [coverPreview, setCoverPreview] = React.useState<string | null>(
    formData.coverUrl
  )
  const [errors, setErrors] = React.useState<FormErrors>({})

  const initials = (user.user_metadata?.full_name || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'JPG, PNG, WebP, GIF 형식만 허용됩니다'
    }
    if (file.size > MAX_FILE_SIZE) {
      return '파일 크기는 5MB 이하여야 합니다'
    }
    return null
  }

  const validateUsername = (value: string): string | null => {
    if (value.length < MIN_USERNAME_LENGTH) {
      return `사용자명은 최소 ${MIN_USERNAME_LENGTH}자 이상이어야 합니다`
    }
    if (value.length > MAX_USERNAME_LENGTH) {
      return `사용자명은 ${MAX_USERNAME_LENGTH}자 이하여야 합니다`
    }
    if (!USERNAME_REGEX.test(value)) {
      return '영문, 숫자, 밑줄(_)만 허용됩니다'
    }
    return null
  }

  const validateSocialHandle = (value: string): string | null => {
    if (value && !SOCIAL_HANDLE_REGEX.test(value)) {
      return '유효하지 않은 사용자명입니다'
    }
    return null
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileError = validateFile(file)
    if (fileError) {
      setErrors((prev) => ({ ...prev, avatar: fileError }))
      return
    }

    setErrors((prev) => ({ ...prev, avatar: undefined }))
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setAvatarPreview(result)
      setFormData((prev) => ({ ...prev, avatarUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileError = validateFile(file)
    if (fileError) {
      setErrors((prev) => ({ ...prev, cover: fileError }))
      return
    }

    setErrors((prev) => ({ ...prev, cover: undefined }))
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setCoverPreview(result)
      setFormData((prev) => ({ ...prev, coverUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleUsernameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, username: value }))
    const usernameError = validateUsername(value)
    setErrors((prev) => ({ ...prev, username: usernameError || undefined }))
  }

  const handleSocialLinkChange = (
    platform: keyof ProfileFormData['socialLinks'],
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }))
    const handleError = validateSocialHandle(value)
    setErrors((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: handleError || undefined,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const usernameError = validateUsername(formData.username)
    const socialErrors = {
      x: validateSocialHandle(formData.socialLinks.x) || undefined,
      instagram: validateSocialHandle(formData.socialLinks.instagram) || undefined,
      youtube: validateSocialHandle(formData.socialLinks.youtube) || undefined,
      tiktok: validateSocialHandle(formData.socialLinks.tiktok) || undefined,
    }

    const hasErrors =
      usernameError ||
      Object.values(socialErrors).some(Boolean) ||
      errors.avatar ||
      errors.cover

    if (hasErrors) {
      setErrors((prev) => ({
        ...prev,
        username: usernameError || undefined,
        socialLinks: socialErrors,
      }))
      return
    }

    onSave?.(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border-white/10 bg-[#1a1a1a] p-0 text-white"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 px-6 py-4">
          <DialogTitle className="text-lg font-semibold text-white">
            Edit profile
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          {/* Cover Image */}
          <div className="relative">
            <div
              className="relative h-20 w-full overflow-hidden rounded-lg"
              style={{
                background: coverPreview
                  ? `url(${coverPreview}) center/cover`
                  : 'linear-gradient(90deg, var(--color-neon-lime) 0%, var(--color-neon-cyan) 100%)',
              }}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                aria-label="Change cover image"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
                className="absolute right-2 top-2 border-white/30 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                Change Cover
              </Button>
              {errors.cover && (
                <p className="absolute -bottom-5 left-0 text-xs text-red-400">
                  {errors.cover}
                </p>
              )}
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-6 left-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-4 border-[#1a1a1a]">
                  <AvatarImage src={avatarPreview || undefined} alt="Profile" />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--color-neon-lime)] to-[var(--color-neon-cyan)] text-lg font-semibold text-black">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  aria-label="Change profile picture"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#1a1a1a] bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  aria-label="Change profile picture"
                >
                  <Camera className="h-3 w-3" />
                </button>
                {errors.avatar && (
                  <p className="absolute -bottom-5 left-0 whitespace-nowrap text-xs text-red-400">
                    {errors.avatar}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="mt-8 space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-white/60">
                Username<span className="text-red-400">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                required
                maxLength={MAX_USERNAME_LENGTH}
                className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 ${
                  errors.username ? 'border-red-400' : ''
                }`}
              />
              {errors.username && (
                <p className="text-xs text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio" className="text-sm text-white/60">
                  Bio
                </Label>
                <span className="text-xs text-white/40">
                  {formData.bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Type bio here..."
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                className="resize-none border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    x.com/
                  </span>
                  <Input
                    value={formData.socialLinks.x}
                    onChange={(e) => handleSocialLinkChange('x', e.target.value)}
                    placeholder=""
                    className={`border-white/10 bg-white/5 pl-14 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 ${
                      errors.socialLinks?.x ? 'border-red-400' : ''
                    }`}
                  />
                </div>
                {errors.socialLinks?.x && (
                  <p className="mt-1 text-xs text-red-400">{errors.socialLinks.x}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    instagram.com/
                  </span>
                  <Input
                    value={formData.socialLinks.instagram}
                    onChange={(e) =>
                      handleSocialLinkChange('instagram', e.target.value)
                    }
                    placeholder=""
                    className={`border-white/10 bg-white/5 pl-[7.5rem] text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 ${
                      errors.socialLinks?.instagram ? 'border-red-400' : ''
                    }`}
                  />
                </div>
                {errors.socialLinks?.instagram && (
                  <p className="mt-1 text-xs text-red-400">{errors.socialLinks.instagram}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    youtube.com/@
                  </span>
                  <Input
                    value={formData.socialLinks.youtube}
                    onChange={(e) =>
                      handleSocialLinkChange('youtube', e.target.value)
                    }
                    placeholder=""
                    className={`border-white/10 bg-white/5 pl-[7.5rem] text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 ${
                      errors.socialLinks?.youtube ? 'border-red-400' : ''
                    }`}
                  />
                </div>
                {errors.socialLinks?.youtube && (
                  <p className="mt-1 text-xs text-red-400">{errors.socialLinks.youtube}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    tiktok.com/@
                  </span>
                  <Input
                    value={formData.socialLinks.tiktok}
                    onChange={(e) =>
                      handleSocialLinkChange('tiktok', e.target.value)
                    }
                    placeholder=""
                    className={`border-white/10 bg-white/5 pl-[6.5rem] text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 ${
                      errors.socialLinks?.tiktok ? 'border-red-400' : ''
                    }`}
                  />
                </div>
                {errors.socialLinks?.tiktok && (
                  <p className="mt-1 text-xs text-red-400">{errors.socialLinks.tiktok}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-white text-black hover:bg-white/90"
            >
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
