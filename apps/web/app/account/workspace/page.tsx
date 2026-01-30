'use client'

import { Building2, Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function WorkspacePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
      {/* Current Workspace */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-cyan)]/20">
            <Building2 className="h-5 w-5 text-[var(--color-neon-cyan)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Personal Workspace</h2>
            <p className="text-sm text-white/60">
              Your personal workspace for individual projects
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
            <div>
              <p className="font-medium text-white">Workspace ID</p>
              <p className="text-sm text-white/60">ws_personal_default</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-purple)]/20">
              <Users className="h-5 w-5 text-[var(--color-neon-purple)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Team Members</h2>
              <p className="text-sm text-white/60">
                Invite team members to collaborate
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>

        <div className="rounded-lg border border-dashed border-white/20 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-white/40" />
          <p className="mt-2 text-sm text-white/60">
            No team members yet. Upgrade to Pro to invite team members.
          </p>
        </div>
      </div>

      {/* Create New Workspace */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <h3 className="mb-2 text-lg font-semibold text-white">Create New Workspace</h3>
        <p className="mb-4 text-sm text-white/60">
          Create a separate workspace for different projects or teams.
          Available on Pro and Ultimate plans.
        </p>
        <Button
          variant="outline"
          className="border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </div>
    </div>
  )
}
