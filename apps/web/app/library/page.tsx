'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, Search, LayoutGrid, ImageIcon, VideoIcon, AudioLines, Music, ChevronRight, ChevronDown, Plus, FolderOpen, Clock, CheckCircle, Pencil, Check, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AssetCard, AudioAssetCard, type AssetItem } from '@/components/library/asset-card'

interface LibraryGroup {
  date: string
  label: string
  items: AssetItem[]
}

interface MediaCounts {
  all: number
  image: number
  video: number
}

type MediaFilter = 'all' | 'liked' | 'image' | 'video' | 'tts' | 'bgm'

interface LibraryData {
  groups: LibraryGroup[]
  counts: MediaCounts
  pagination: {
    total: number
    hasMore: boolean
    nextCursor: string | null
    nextCursorId: string | null
  }
}

interface Project {
  id: string
  templateId: string
  title: string
  currentStepIndex: number
  status: 'in_progress' | 'completed' | 'cancelled'
  thumbnailUrl: string | null
  updatedAt: string
}

type ToolFilter = 'all' | 'liked' | 'image' | 'video' | 'tts' | 'bgm'

interface SidebarProps {
  counts: MediaCounts & { liked?: number; tts?: number; bgm?: number }
  activeFilter: ToolFilter
  onFilterChange: (filter: ToolFilter) => void
  searchValue: string
  onSearchChange: (value: string) => void
  projects: Project[]
  isLoadingProjects: boolean
  onRenameProject: (id: string, title: string) => Promise<void>
  onDeleteProject: (id: string) => void
  activeProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
}

function Sidebar({
  counts,
  activeFilter,
  onFilterChange,
  searchValue,
  onSearchChange,
  projects,
  isLoadingProjects,
  onRenameProject,
  onDeleteProject,
  activeProjectId,
  onProjectSelect,
}: SidebarProps) {
  const [personalExpanded, setPersonalExpanded] = React.useState(true)

  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const completedProjects = projects.filter(p => p.status === 'completed')

  return (
    <aside className="w-56 shrink-0 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          type="text"
          placeholder="Search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/20 h-9 text-sm"
        />
      </div>

      {/* Main Filters */}
      <div className="space-y-0.5">
        <SidebarItem
          icon={LayoutGrid}
          label="All"
          count={counts.all}
          active={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
        />
        <SidebarItem
          icon={Heart}
          label="Liked"
          count={counts.liked ?? 0}
          active={activeFilter === 'liked'}
          onClick={() => onFilterChange('liked')}
        />
      </div>

      {/* Tools Section */}
      <div className="space-y-0.5">
        <div className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">
          Tools
        </div>
        <SidebarItem
          icon={ImageIcon}
          label="Image"
          count={counts.image}
          active={activeFilter === 'image'}
          onClick={() => onFilterChange('image')}
          indent
        />
        <SidebarItem
          icon={VideoIcon}
          label="Video"
          count={counts.video}
          active={activeFilter === 'video'}
          onClick={() => onFilterChange('video')}
          indent
        />
        <SidebarItem
          icon={AudioLines}
          label="TTS"
          count={counts.tts ?? 0}
          active={activeFilter === 'tts'}
          onClick={() => onFilterChange('tts')}
          indent
        />
        <SidebarItem
          icon={Music}
          label="BGM"
          count={counts.bgm ?? 0}
          active={activeFilter === 'bgm'}
          onClick={() => onFilterChange('bgm')}
          indent
        />
      </div>

      {/* Shared with me */}
      <div className="space-y-0.5">
        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer">
          <ChevronRight className="h-4 w-4" />
          <span>Shared with me</span>
        </button>
      </div>

      {/* Personal projects */}
      <div className="space-y-0.5">
        <button
          onClick={() => setPersonalExpanded(!personalExpanded)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer group"
        >
          <span className="flex items-center gap-2">
            <ChevronDown className={cn('h-4 w-4 transition-transform', !personalExpanded && '-rotate-90')} />
            <span>Personal projects</span>
          </span>
          <span className="text-xs text-white/30">{projects.length}</span>
        </button>

        {personalExpanded && (
          <div className="ml-4 space-y-1 border-l border-white/10 pl-2">
            {isLoadingProjects ? (
              <div className="px-3 py-2 text-xs text-white/30">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-white/30">No projects yet</div>
            ) : (
              <>
                {/* In Progress */}
                {inProgressProjects.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="px-2 py-1 text-[10px] font-medium text-white/30 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      In Progress
                    </div>
                    {inProgressProjects.map((project) => (
                      <ProjectItem key={project.id} project={project} onRename={onRenameProject} onDelete={onDeleteProject} isActive={activeProjectId === project.id} onSelectAssets={onProjectSelect} />
                    ))}
                  </div>
                )}

                {/* Completed */}
                {completedProjects.length > 0 && (
                  <div className="space-y-0.5 mt-2">
                    <div className="px-2 py-1 text-[10px] font-medium text-white/30 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </div>
                    {completedProjects.map((project) => (
                      <ProjectItem key={project.id} project={project} onRename={onRenameProject} onDelete={onDeleteProject} isActive={activeProjectId === project.id} onSelectAssets={onProjectSelect} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Team projects */}
      <div className="space-y-0.5">
        <button className="flex w-full items-center justify-between px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer">
          <span className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <span>Team projects</span>
          </span>
          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100" />
        </button>
      </div>
    </aside>
  )
}

function ProjectItem({ project, onRename, onDelete, isActive, onSelectAssets }: { project: Project; onRename: (id: string, title: string) => Promise<void>; onDelete: (id: string) => void; isActive: boolean; onSelectAssets: (projectId: string | null) => void }) {
  const isInProgress = project.status === 'in_progress'
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(project.title)
  const [isSaving, setIsSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editTitle.trim() === '' || editTitle === project.title) {
      setEditTitle(project.title)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onRename(project.id, editTitle.trim())
      setIsEditing(false)
    } catch {
      setEditTitle(project.title)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(project.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className="flex-1 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded border border-white/20 focus:border-white/40 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-0.5 text-green-400 hover:text-green-300 cursor-pointer"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-0.5 text-red-400 hover:text-red-300 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  const handleDelete = () => {
    onDelete(project.id)
  }

  return (
    <div className="space-y-0.5">
      <div className="group flex items-center gap-1 min-w-0">
        <Link
          href={`/templates/${project.templateId}/workflow?projectId=${project.id}`}
          className={cn(
            'flex-1 min-w-0 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
            'text-white/60 hover:bg-white/5 hover:text-white/80'
          )}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1">{project.title}</span>
          {isInProgress && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--color-neon-pink)] animate-pulse" />
          )}
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault()
            setIsEditing(true)
          }}
          className="shrink-0 p-1 text-white/30 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="이름 변경"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="shrink-0 p-1 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="프로젝트 삭제"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <button
        onClick={() => onSelectAssets(isActive ? null : project.id)}
        className={cn(
          'w-full flex items-center gap-2 rounded-md pl-8 pr-2 py-1 text-[11px] transition-colors cursor-pointer',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-white/40 hover:bg-white/5 hover:text-white/60'
        )}
      >
        <LayoutGrid className="h-3 w-3 shrink-0" />
        Assets
      </button>
    </div>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  indent,
}: {
  icon: React.ElementType
  label: string
  count: number
  active: boolean
  onClick: () => void
  indent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
        indent && 'pl-6',
        active
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:bg-white/5 hover:text-white/80'
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className={cn(
        'text-xs tabular-nums',
        active ? 'text-white/80' : 'text-white/40'
      )}>
        {count}
      </span>
    </button>
  )
}

export default function LibraryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = React.useState<LibraryData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [localSearch, setLocalSearch] = React.useState('')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Projects state
  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true)

  // Delete confirm dialog state
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    type: 'project' | 'asset'
    id: string
    title: string
    description: string
    hasProject?: boolean
  }>({ open: false, type: 'asset', id: '', title: '', description: '' })
  const [isDeleting, setIsDeleting] = React.useState(false)

  const activeFilter = (searchParams.get('type') as MediaFilter) || 'all'
  const search = searchParams.get('search') || ''
  const activeProjectId = searchParams.get('projectId') || null

  React.useEffect(() => {
    setLocalSearch(search)
  }, [search])

  // Fetch projects
  React.useEffect(() => {
    async function fetchProjects() {
      setIsLoadingProjects(true)
      try {
        const response = await fetch('/api/projects?limit=50')
        const result = await response.json()

        if (result.success) {
          setProjects(result.projects || [])
        }
      } catch {
        // Silent fail for projects
      } finally {
        setIsLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [])

  // Delete project - 다이얼로그 열기
  const handleDeleteProject = React.useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    setDeleteDialog({
      open: true,
      type: 'project',
      id: projectId,
      title: '프로젝트 삭제',
      description: `"${project?.title || '프로젝트'}"를 삭제하시겠습니까? 연결된 에셋도 함께 삭제됩니다.`,
    })
  }, [projects])

  // Rename project
  const handleRenameProject = React.useCallback(async (projectId: string, newTitle: string) => {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })

    if (!response.ok) {
      throw new Error('Failed to rename project')
    }

    // Update local state
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, title: newTitle } : p))
    )
  }, [])

  const fetchData = React.useCallback(async (cursor?: string | null, cursorId?: string | null) => {
    const isLoadMore = !!cursor
    setIsLoading(true)
    if (!isLoadMore) setError(null)

    try {
      const params = new URLSearchParams()
      if (activeFilter !== 'all') {
        params.set('type', activeFilter)
      }
      if (search) {
        params.set('search', search)
      }
      if (activeProjectId) {
        params.set('project_id', activeProjectId)
      }
      if (cursor && cursorId) {
        params.set('cursor', cursor)
        params.set('cursor_id', cursorId)
      }

      const response = await fetch(`/api/library?${params.toString()}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load library')
      }

      // Load More: 기존 데이터에 새 데이터 추가
      if (isLoadMore) {
        setData((prevData) => {
          if (!prevData) return result

          // 기존 그룹을 Map으로 변환 (date 기준)
          const groupMap = new Map<string, LibraryGroup>()
          for (const group of prevData.groups) {
            groupMap.set(group.date, { ...group, items: [...group.items] })
          }

          // 새 그룹 병합
          for (const newGroup of result.groups) {
            const existingGroup = groupMap.get(newGroup.date)
            if (existingGroup) {
              // 같은 날짜 그룹이면 아이템 병합 (중복 제거)
              const existingIds = new Set(existingGroup.items.map((item: AssetItem) => item.id))
              const newItems = newGroup.items.filter((item: AssetItem) => !existingIds.has(item.id))
              existingGroup.items = [...existingGroup.items, ...newItems]
            } else {
              // 새 날짜 그룹이면 추가
              groupMap.set(newGroup.date, newGroup)
            }
          }

          // 날짜 역순 정렬 (최신 날짜 먼저)
          const mergedGroups = Array.from(groupMap.values()).sort(
            (a, b) => b.date.localeCompare(a.date)
          )

          return {
            ...result,
            groups: mergedGroups,
          }
        })
      } else {
        setData(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, search, activeProjectId])

  // 초기 로드 및 필터/검색 변경 시 fresh fetch
  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }

    const queryString = params.toString()
    router.push(queryString ? `/library?${queryString}` : '/library')
  }

  const handleFilterChange = (filter: MediaFilter) => {
    updateUrl({ type: filter === 'all' ? null : filter, projectId: null })
  }

  const handleProjectSelect = (projectId: string | null) => {
    updateUrl({ projectId })
  }

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      updateUrl({ search: value || null })
    }, 300)
  }

  const handleFavoriteToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/library/${id}`, { method: 'PATCH' })
      const result = await response.json()

      if (result.success && data) {
        setData({
          ...data,
          groups: data.groups.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === id
                ? { ...item, is_favorite: result.data.is_favorite }
                : item
            ),
          })),
        })
      }
    } catch {
      // silently fail - UI state already updated optimistically
    }
  }

  const handleDelete = (id: string, hasProject: boolean) => {
    setDeleteDialog({
      open: true,
      type: 'asset',
      id,
      hasProject,
      title: hasProject ? '프로젝트 연결 에셋 삭제' : '에셋 삭제',
      description: hasProject
        ? '이 에셋은 프로젝트에 연결되어 있습니다. 삭제하면 해당 프로젝트에서도 사라집니다.'
        : '이 에셋을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    })
  }

  const executeDelete = async () => {
    setIsDeleting(true)
    try {
      if (deleteDialog.type === 'project') {
        const response = await fetch(`/api/projects/${deleteDialog.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setProjects((prev) => prev.filter((p) => p.id !== deleteDialog.id))
          fetchData()
        }
      } else {
        const response = await fetch(`/api/library/${deleteDialog.id}`, { method: 'DELETE' })
        const result = await response.json()
        if (result.success) fetchData()
      }
    } catch {
      // Silent fail
    } finally {
      setIsDeleting(false)
      setDeleteDialog((prev) => ({ ...prev, open: false }))
    }
  }

  const handleLoadMore = () => {
    if (data?.pagination.hasMore && data.pagination.nextCursor && data.pagination.nextCursorId) {
      fetchData(data.pagination.nextCursor, data.pagination.nextCursorId)
    }
  }

  const counts = data?.counts || { all: 0, image: 0, video: 0, liked: 0, tts: 0, bgm: 0 }
  const totalCount = data?.pagination.total || 0

  const filterLabels: Record<MediaFilter, string> = {
    all: 'All assets',
    liked: 'Liked',
    image: 'Images',
    video: 'Videos',
    tts: 'TTS',
    bgm: 'BGM',
  }

  return (
    <div className="flex gap-8">
      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title={deleteDialog.title}
        description={deleteDialog.description}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="destructive"
        onConfirm={executeDelete}
        isLoading={isDeleting}
      />

      {/* Sidebar */}
      <Sidebar
        counts={counts}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        searchValue={localSearch}
        onSearchChange={handleSearchChange}
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        activeProjectId={activeProjectId}
        onProjectSelect={handleProjectSelect}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {activeProjectId
              ? `"${projects.find(p => p.id === activeProjectId)?.title ?? 'Project'}" 에셋`
              : filterLabels[activeFilter]}
          </h1>
          <p className="text-sm text-white/50">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Content */}
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 rounded-xl border border-white/10 bg-white/5">
            <p className="text-red-400">{error}</p>
          </div>
        ) : !data || data.groups.length === 0 ? (
          <div className="flex items-center justify-center h-64 rounded-xl border border-white/10 bg-white/5">
            <p className="text-white/50">
              {search
                ? `No results found for "${search}"`
                : 'No assets yet. Start creating!'}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {data.groups.map((group) => (
              <section key={group.date}>
                {/* Date Header */}
                <div className="sticky top-16 z-10 bg-[#0a0a0a]/95 backdrop-blur py-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                    <span className="text-xs text-white/40">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Grid */}
                {(() => {
                  const visualItems = group.items.filter(
                    (a) => a.media_type !== 'tts' && a.media_type !== 'bgm'
                  )
                  const audioItems = group.items.filter(
                    (a) => a.media_type === 'tts' || a.media_type === 'bgm'
                  )
                  return (
                    <>
                      {visualItems.length > 0 && (
                        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 space-y-4">
                          {visualItems.map((asset) => (
                            <div key={asset.id} className="break-inside-avoid">
                              <AssetCard
                                asset={asset}
                                onFavoriteToggle={handleFavoriteToggle}
                                onDelete={handleDelete}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {audioItems.length > 0 && (
                        <div className={cn(
                          'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3',
                          visualItems.length > 0 && 'mt-4'
                        )}>
                          {audioItems.map((asset) => (
                            <AudioAssetCard
                              key={asset.id}
                              asset={asset}
                              onFavoriteToggle={handleFavoriteToggle}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </section>
            ))}

            {data.pagination.hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-[var(--color-neon-pink)] hover:text-[var(--color-neon-pink)]/80 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
