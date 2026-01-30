'use client'

import * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EditProfileModal, ProfileFormData } from './edit-profile-modal'

interface AccountContentProps {
  user: User
}

export function AccountContent({ user }: AccountContentProps) {
  const [publishToExplore, setPublishToExplore] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showEditProfile, setShowEditProfile] = React.useState(false)

  const handleSaveProfile = (_data: ProfileFormData) => {
    // TODO: Phase 5 - Save profile data to Supabase
    // Will be implemented when Supabase user_metadata update is ready
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  const username =
    user.user_metadata?.user_name ||
    user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '_') ||
    'user'
  const avatarUrl = user.user_metadata?.avatar_url
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
      {/* Profile Header */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] text-white text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-white">{displayName}</h2>
              <p className="text-sm text-white/60">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditProfile(true)}
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit profile
          </Button>
        </div>
      </div>

      {/* Account Details */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <h3 className="mb-6 text-lg font-semibold text-white">Account details</h3>

        <div className="space-y-6">
          <div>
            <label className="text-sm text-white/40">Username</label>
            <p className="mt-1 text-white">{username}</p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <label className="text-sm text-white/40">Email</label>
            <p className="mt-1 text-white">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Publish to Explore */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Publish to explore</h3>
            <p className="mt-1 text-sm text-white/60">
              All your generations will be automatically published to the Explore page.
              Only premium users can disable this setting.
            </p>
          </div>
          <Switch
            checked={publishToExplore}
            onCheckedChange={setPublishToExplore}
          />
        </div>
      </div>

      {/* Delete Account */}
      <div className="rounded-2xl border border-red-500/20 bg-[#1a1a1a] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            <p className="mt-1 text-sm text-white/60">
              This will permanently delete your account
            </p>
          </div>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Delete
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-red-500/50 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete account
            </Button>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        user={user}
        onSave={handleSaveProfile}
      />
    </div>
  )
}
