'use client'

import { ModelBanner } from './model-banner'
import { SidebarForm } from './sidebar-form'

export function VideoSidebar() {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[320px] border-r border-white/10 bg-[#0f0f19] overflow-y-auto">
      <div className="flex flex-col gap-5 p-5">
        <ModelBanner />
        <SidebarForm />
      </div>
    </aside>
  )
}
