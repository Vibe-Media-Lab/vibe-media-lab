'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, Search, LayoutGrid, ImageIcon, VideoIcon, Mic, Sparkles, ChevronRight, ChevronDown, Plus, FolderOpen, Clock, CheckCircle, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { AssetCard, type AssetItem } from '@/components/library/asset-card'

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

type MediaFilter = 'all' | 'liked' | 'image' | 'video' | 'lipsync' | 'upscaled'

interface LibraryData {
  groups: LibraryGroup[]
  counts: MediaCounts
  pagination: {
    page: number
    total: number
    hasMore: boolean
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

type ToolFilter = 'all' | 'liked' | 'image' | 'video' | 'lipsync' | 'upscaled'

interface SidebarProps {
  counts: MediaCounts & { liked?: number; lipsync?: number; upscaled?: number }
  activeFilter: ToolFilter
  onFilterChange: (filter: ToolFilter) => void
  searchValue: string
  onSearchChange: (value: string) => void
  projects: Project[]
  isLoadingProjects: boolean
  onRenameProject: (id: string, title: string) => Promise<void>
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
          icon={Mic}
          label="Lipsync"
          count={counts.lipsync ?? 0}
          active={activeFilter === 'lipsync'}
          onClick={() => onFilterChange('lipsync')}
          indent
        />
        <SidebarItem
          icon={Sparkles}
          label="Upscaled"
          count={counts.upscaled ?? 0}
          active={activeFilter === 'upscaled'}
          onClick={() => onFilterChange('upscaled')}
          indent
        />
      </div>

      {/* Shared with me */}
      <div className="space-y-0.5">
        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ChevronRight className="h-4 w-4" />
          <span>Shared with me</span>
        </button>
      </div>

      {/* Personal projects */}
      <div className="space-y-0.5">
        <button
          onClick={() => setPersonalExpanded(!personalExpanded)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors group"
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
                      <ProjectItem key={project.id} project={project} onRename={onRenameProject} />
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
                      <ProjectItem key={project.id} project={project} onRename={onRenameProject} />
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
        <button className="flex w-full items-center justify-between px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
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

function ProjectItem({ project, onRename }: { project: Project; onRename: (id: string, title: string) => Promise<void> }) {
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
          className="p-0.5 text-green-400 hover:text-green-300"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-0.5 text-red-400 hover:text-red-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1">
      <Link
        href={`/templates/${project.templateId}/workflow?projectId=${project.id}`}
        className={cn(
          'flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
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
        className="p-1 text-white/30 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
        title="이름 변경"
      >
        <Pencil className="h-3 w-3" />
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
        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
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
  const prevPageRef = React.useRef(1)
  const isFirstLoadRef = React.useRef(true)

  // Projects state
  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true)

  const activeFilter = (searchParams.get('type') as MediaFilter) || 'all'
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  React.useEffect(() => {
    setLocalSearch(search)
  }, [search])

  // 필터나 검색 변경 시 refs 리셋
  React.useEffect(() => {
    prevPageRef.current = 1
    isFirstLoadRef.current = true
  }, [activeFilter, search])

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

  const fetchData = React.useCallback(async (isLoadMore = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (activeFilter !== 'all') {
        params.set('type', activeFilter)
      }
      if (search) {
        params.set('search', search)
      }
      params.set('page', String(page))

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
  }, [activeFilter, search, page])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    // 첫 로드 시에는 항상 새로 로드, 이후 page 증가 시에만 Load More
    const shouldLoadMore = !isFirstLoadRef.current && page > prevPageRef.current
    fetchData(shouldLoadMore)
    prevPageRef.current = page
    isFirstLoadRef.current = false
  }, [activeFilter, search, page])

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }

    if ('type' in updates || 'search' in updates) {
      params.delete('page')
    }

    const queryString = params.toString()
    router.push(queryString ? `/library?${queryString}` : '/library')
  }

  const handleFilterChange = (filter: MediaFilter) => {
    updateUrl({ type: filter === 'all' ? null : filter })
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
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const response = await fetch(`/api/library/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) fetchData()
    } catch {}
  }

  const handleLoadMore = () => {
    if (data?.pagination.hasMore) {
      updateUrl({ page: String(page + 1) })
    }
  }

  const counts = data?.counts || { all: 0, image: 0, video: 0, liked: 0, lipsync: 0, upscaled: 0 }
  const totalCount = data?.pagination.total || 0

  const filterLabels: Record<MediaFilter, string> = {
    all: 'All assets',
    liked: 'Liked',
    image: 'Images',
    video: 'Videos',
    lipsync: 'Lipsync',
    upscaled: 'Upscaled',
  }

  return (
    <div className="flex gap-8">
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
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{filterLabels[activeFilter]}</h1>
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
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 space-y-4">
                  {group.items.map((asset) => (
                    <div key={asset.id} className="break-inside-avoid">
                      <AssetCard
                        asset={asset}
                        onFavoriteToggle={handleFavoriteToggle}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {data.pagination.hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-[var(--color-neon-pink)] hover:text-[var(--color-neon-pink)]/80 disabled:opacity-50"
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
