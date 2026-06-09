'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FileText, Upload, Trash2, FolderOpen, FolderPlus, Eye, EyeOff, GripVertical } from 'lucide-react'

type Doc = {
  id: string
  title: string
  fileUrl: string
  category: string | null
  folderId: string | null
  createdAt: Date | null
  uploader: { name: string | null; email: string } | null
}

type FolderType = {
  id: string
  name: string
  visibleToResidents: boolean
  sortOrder: number
  documents: Doc[]
}

type DocActions = {
  isAdmin: boolean
  confirmId: string | null
  deletingId: string | null
  onConfirm: (id: string) => void
  onCancelConfirm: () => void
  onDelete: (id: string, folderId: string | null) => void
}

const CATEGORIES = [
  { value: 'minutes',      label: 'Minutes' },
  { value: 'financial',   label: 'Financial' },
  { value: 'legal',       label: 'Legal' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other',       label: 'Other' },
]

const categoryLabel: Record<string, string> = {
  minutes: 'Minutes', financial: 'Financial', legal: 'Legal',
  maintenance: 'Maintenance', other: 'Other',
}

// ─── Draggable doc row ───────────────────────────────────────────────────────

function DraggableDocRow({ doc, folderId, isAdmin, confirmId, deletingId, onConfirm, onCancelConfirm, onDelete }: { doc: Doc; folderId: string | null } & DocActions) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: doc.id,
    data: { type: 'doc', sourceFolderId: folderId },
    disabled: !isAdmin,
  })

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.35 : 1 }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b last:border-b-0">
        {isAdmin && (
          <button
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-sm font-medium hover:underline truncate">
          {doc.title}
        </a>
        <div className="flex items-center gap-2 shrink-0">
          {doc.category && (
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              {categoryLabel[doc.category] ?? doc.category}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden md:block">
            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
          </span>
          {isAdmin && (confirmId !== doc.id ? (
            <Button size="sm" variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
              onClick={() => onConfirm(doc.id)} disabled={!!deletingId}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Sure?</span>
              <Button size="sm" variant="destructive"
                onClick={() => onDelete(doc.id, folderId)} disabled={deletingId === doc.id}>
                {deletingId === doc.id ? '…' : 'Yes'}
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelConfirm}>No</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sortable folder ─────────────────────────────────────────────────────────

function SortableFolder({
  folder, isOpen, isDropTarget, togglingFolderId,
  onToggle, onToggleVisibility,
  isAdmin, confirmId, deletingId, onConfirm, onCancelConfirm, onDelete,
}: {
  folder: FolderType
  isOpen: boolean
  isDropTarget: boolean
  togglingFolderId: string | null
  onToggle: (id: string) => void
  onToggleVisibility: (folder: FolderType) => void
} & DocActions) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
    data: { type: 'folder' },
  })

  const docActions: DocActions = { isAdmin, confirmId, deletingId, onConfirm, onCancelConfirm, onDelete }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <Card className={`overflow-hidden py-0 transition-shadow ${isDropTarget ? 'ring-2 ring-primary shadow-md' : ''}`}>
        <div className="flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors select-none">
          {isAdmin && (
            <button
              className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <button className="flex-1 flex items-center gap-2 text-left min-w-0" onClick={() => onToggle(folder.id)}>
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={folder.visibleToResidents ? 'default' : 'outline'} className="text-xs">
              {folder.visibleToResidents ? 'Public' : 'Board only'}
            </Badge>
            {isAdmin && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                title={folder.visibleToResidents ? 'Hide from residents' : 'Show to residents'}
                disabled={togglingFolderId === folder.id}
                onClick={() => onToggleVisibility(folder)}>
                {folder.visibleToResidents
                  ? <Eye className="h-3.5 w-3.5" />
                  : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            )}
            <button className="text-muted-foreground text-xs w-4" onClick={() => onToggle(folder.id)}>
              {isOpen ? '▲' : '▼'}
            </button>
          </div>
        </div>
        {isOpen && (
          folder.documents.length === 0
            ? <div className={`px-4 py-4 border-t text-sm text-center transition-colors ${isDropTarget ? 'text-primary font-medium bg-primary/5' : 'text-muted-foreground'}`}>
                {isDropTarget ? 'Drop here to file in this folder' : 'No documents in this folder.'}
              </div>
            : <div className="border-t">
                {folder.documents.map(doc => (
                  <DraggableDocRow key={doc.id} doc={doc} folderId={folder.id} {...docActions} />
                ))}
              </div>
        )}
      </Card>
    </div>
  )
}

// ─── Droppable unfiled section ────────────────────────────────────────────────

function DroppableUnfiled({ docs, isDropTarget, isAdmin, confirmId, deletingId, onConfirm, onCancelConfirm, onDelete }: { docs: Doc[]; isDropTarget: boolean } & DocActions) {
  const { setNodeRef } = useDroppable({ id: 'unfiled' })
  const docActions: DocActions = { isAdmin, confirmId, deletingId, onConfirm, onCancelConfirm, onDelete }

  return (
    <div ref={setNodeRef}>
      <h2 className="text-base font-semibold mb-3">Unfiled Documents</h2>
      {docs.length === 0 ? (
        <div className={`rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ${isDropTarget ? 'border-primary text-primary font-medium bg-primary/5' : 'border-muted text-muted-foreground'}`}>
          {isDropTarget ? 'Drop here to unfile' : 'No unfiled documents.'}
        </div>
      ) : (
        <Card className={`overflow-hidden py-0 transition-shadow ${isDropTarget ? 'ring-2 ring-primary shadow-md' : ''}`}>
          <CardContent className="p-0">
            {docs.map(doc => (
              <DraggableDocRow key={doc.id} doc={doc} folderId={null} {...docActions} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentsClient({
  folders: initialFolders,
  unfiledDocs: initialUnfiled,
  isAdmin,
}: {
  folders: FolderType[]
  unfiledDocs: Doc[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [folders, setFolders] = useState(() =>
    [...initialFolders].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [unfiled, setUnfiled] = useState(initialUnfiled)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [togglingFolderId, setTogglingFolderId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<'folder' | 'doc' | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('other')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderVisible, setFolderVisible] = useState(false)
  const [savingFolder, setSavingFolder] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function toggleFolder(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragType(event.active.data.current?.type ?? null)
    setActiveDragId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    setOverId(over?.id as string ?? null)

    if (active.data.current?.type === 'folder' && over && active.id !== over.id) {
      setFolders(prev => {
        const oldIdx = prev.findIndex(f => f.id === active.id)
        const newIdx = prev.findIndex(f => f.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return prev
        return arrayMove(prev, oldIdx, newIdx)
      })
    } else if (active.data.current?.type === 'doc' && over && over.id !== 'unfiled') {
      // Auto-open folder when doc is dragged over it
      setOpenIds(prev => {
        if (prev.has(over.id as string)) return prev
        const next = new Set(prev)
        next.add(over.id as string)
        return next
      })
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setOverId(null)
    setActiveDragType(null)
    setActiveDragId(null)

    if (!over) return

    const activeType = active.data.current?.type as 'folder' | 'doc' | undefined

    if (activeType === 'folder') {
      await fetch('/api/document-folders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: folders.map(f => f.id) }),
      })
      return
    }

    if (activeType === 'doc') {
      const docId = active.id as string
      const sourceFolderId: string | null = active.data.current?.sourceFolderId ?? null
      const targetFolderId: string | null = over.id === 'unfiled' ? null : over.id as string

      if (targetFolderId === sourceFolderId) return

      let doc: Doc | undefined
      if (sourceFolderId) {
        doc = folders.find(f => f.id === sourceFolderId)?.documents.find(d => d.id === docId)
      } else {
        doc = unfiled.find(d => d.id === docId)
      }
      if (!doc) return

      const updatedDoc: Doc = { ...doc, folderId: targetFolderId }

      // Remove from source
      if (sourceFolderId) {
        setFolders(prev => prev.map(f =>
          f.id === sourceFolderId ? { ...f, documents: f.documents.filter(d => d.id !== docId) } : f
        ))
      } else {
        setUnfiled(prev => prev.filter(d => d.id !== docId))
      }

      // Add to target
      if (targetFolderId) {
        setFolders(prev => prev.map(f =>
          f.id === targetFolderId ? { ...f, documents: [...f.documents, updatedDoc] } : f
        ))
      } else {
        setUnfiled(prev => [...prev, updatedDoc])
      }

      await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      })
    }
  }

  async function handleDelete(id: string, folderId: string | null) {
    setDeletingId(id)
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) { setConfirmId(null); return }
    setConfirmId(null)
    if (folderId) {
      setFolders(prev => prev.map(f =>
        f.id === folderId ? { ...f, documents: f.documents.filter(d => d.id !== id) } : f
      ))
    } else {
      setUnfiled(prev => prev.filter(d => d.id !== id))
    }
  }

  async function handleToggleVisibility(folder: FolderType) {
    setTogglingFolderId(folder.id)
    await fetch(`/api/document-folders/${folder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibleToResidents: !folder.visibleToResidents }),
    })
    setFolders(prev => prev.map(f =>
      f.id === folder.id ? { ...f, visibleToResidents: !f.visibleToResidents } : f
    ))
    setTogglingFolderId(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setUploading(true)
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    form.append('title', title.trim())
    form.append('category', category)
    if (selectedFolderId) form.append('folderId', selectedFolderId)
    const res = await fetch('/api/documents', { method: 'POST', body: form })
    setUploading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error ?? 'Upload failed.')
      return
    }
    setTitle('')
    setCategory('other')
    setSelectedFolderId('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!folderName.trim()) return
    setSavingFolder(true)
    const res = await fetch('/api/document-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName.trim(), visibleToResidents: folderVisible }),
    })
    setSavingFolder(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFolderError(data.error ?? 'Failed to create folder.')
      return
    }
    setCreatingFolder(false)
    setFolderName('')
    setFolderVisible(false)
    setFolderError(null)
    router.refresh()
  }

  const isDraggingDoc = activeDragType === 'doc'

  const activeDragDoc = isDraggingDoc && activeDragId
    ? (unfiled.find(d => d.id === activeDragId) ?? folders.flatMap(f => f.documents).find(d => d.id === activeDragId) ?? null)
    : null
  const activeDragFolder = activeDragType === 'folder' && activeDragId
    ? folders.find(f => f.id === activeDragId) ?? null
    : null

  const docActions: DocActions = {
    isAdmin,
    confirmId,
    deletingId,
    onConfirm: setConfirmId,
    onCancelConfirm: () => setConfirmId(null),
    onDelete: handleDelete,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Upload form */}
        {isAdmin && (
          <div>
            <h2 className="text-base font-semibold mb-3">Upload Document</h2>
            <Card>
              <CardContent className="pt-5">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-title">Title</Label>
                      <Input id="doc-title" value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. March 2026 Meeting Minutes" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-category">Category</Label>
                      <select id="doc-category" value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {folders.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-folder">Folder <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <select id="doc-folder" value={selectedFolderId} onChange={e => setSelectedFolderId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <option value="">No folder (unfiled)</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-file">File</Label>
                    <input id="doc-file" ref={fileRef} type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                      onChange={e => setFile(e.target.files?.[0] ?? null)} required
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />
                  </div>
                  {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                  <Button type="submit" disabled={uploading || !file || !title.trim()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Folders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Folders</h2>
            {isAdmin && !creatingFolder && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreatingFolder(true)}>
                <FolderPlus className="h-3.5 w-3.5" />
                New Folder
              </Button>
            )}
          </div>

          {creatingFolder && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <form onSubmit={handleCreateFolder} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input id="folder-name" value={folderName} onChange={e => setFolderName(e.target.value)}
                      placeholder="e.g. FY 2024/25 or Meeting Minutes" required autoFocus />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="folder-visible" checked={folderVisible} onCheckedChange={setFolderVisible} />
                    <Label htmlFor="folder-visible" className="cursor-pointer">Visible to residents on portal</Label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={savingFolder || !folderName.trim()}>
                        {savingFolder ? 'Creating…' : 'Create Folder'}
                      </Button>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => { setCreatingFolder(false); setFolderName(''); setFolderVisible(false); setFolderError(null) }}>
                        Cancel
                      </Button>
                    </div>
                    {folderError && <p className="text-sm text-destructive">{folderError}</p>}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {folders.length === 0 && !creatingFolder ? (
            <p className="text-sm text-muted-foreground">No folders yet. Create one to organize documents by year or topic.</p>
          ) : (
            <SortableContext items={folders.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {folders.map(folder => (
                  <SortableFolder
                    key={folder.id}
                    folder={folder}
                    isOpen={openIds.has(folder.id)}
                    isDropTarget={isDraggingDoc && overId === folder.id}
                    togglingFolderId={togglingFolderId}
                    onToggle={toggleFolder}
                    onToggleVisibility={handleToggleVisibility}
                    {...docActions}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

        {/* Unfiled */}
        <DroppableUnfiled
          docs={unfiled}
          isDropTarget={isDraggingDoc && overId === 'unfiled'}
          {...docActions}
        />
      </div>

      <DragOverlay>
        {activeDragDoc && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-background shadow-lg text-sm font-medium opacity-95 cursor-grabbing">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            {activeDragDoc.title}
          </div>
        )}
        {activeDragFolder && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-background shadow-lg text-sm font-medium opacity-95 cursor-grabbing">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            {activeDragFolder.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
