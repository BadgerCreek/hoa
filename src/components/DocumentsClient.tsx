'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FileText, Upload, Trash2, FolderOpen, FolderPlus, Eye, EyeOff } from 'lucide-react'

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
  documents: Doc[]
}

const CATEGORIES = [
  { value: 'minutes',   label: 'Minutes' },
  { value: 'financial', label: 'Financial' },
  { value: 'legal',     label: 'Legal' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other',     label: 'Other' },
]

const categoryLabel: Record<string, string> = {
  minutes: 'Minutes', financial: 'Financial', legal: 'Legal',
  maintenance: 'Maintenance', other: 'Other',
}

function DocRow({
  doc, folderId, isAdmin, confirmId, deletingId, onConfirm, onCancelConfirm, onDelete,
}: {
  doc: Doc
  folderId: string | null
  isAdmin: boolean
  confirmId: string | null
  deletingId: string | null
  onConfirm: (id: string) => void
  onCancelConfirm: () => void
  onDelete: (id: string, folderId: string | null) => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
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
  )
}

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

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('other')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [localFolders, setLocalFolders] = useState(initialFolders)
  const [localUnfiled, setLocalUnfiled] = useState(initialUnfiled)
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(
    () => new Set(initialFolders.map(f => f.id))
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [togglingFolderId, setTogglingFolderId] = useState<string | null>(null)

  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderVisible, setFolderVisible] = useState(false)
  const [savingFolder, setSavingFolder] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

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

  async function handleDelete(id: string, folderId: string | null) {
    setDeletingId(id)
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) { setConfirmId(null); return }
    setConfirmId(null)
    if (folderId) {
      setLocalFolders(prev => prev.map(f =>
        f.id === folderId ? { ...f, documents: f.documents.filter(d => d.id !== id) } : f
      ))
    } else {
      setLocalUnfiled(prev => prev.filter(d => d.id !== id))
    }
  }

  async function handleToggleVisibility(folder: FolderType) {
    setTogglingFolderId(folder.id)
    await fetch(`/api/document-folders/${folder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibleToResidents: !folder.visibleToResidents }),
    })
    setLocalFolders(prev => prev.map(f =>
      f.id === folder.id ? { ...f, visibleToResidents: !f.visibleToResidents } : f
    ))
    setTogglingFolderId(null)
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

  function toggleFolder(id: string) {
    setOpenFolderIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const docRowProps = { isAdmin, confirmId, deletingId, onConfirm: setConfirmId, onCancelConfirm: () => setConfirmId(null), onDelete: handleDelete }

  return (
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
                {localFolders.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-folder">Folder <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <select id="doc-folder" value={selectedFolderId} onChange={e => setSelectedFolderId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <option value="">No folder (unfiled)</option>
                      {localFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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

        {localFolders.length === 0 && !creatingFolder ? (
          <p className="text-sm text-muted-foreground">No folders yet. Create one to organize documents by year or topic.</p>
        ) : (
          <div className="space-y-3">
            {localFolders.map(folder => {
              const isOpen = openFolderIds.has(folder.id)
              return (
                <Card key={folder.id} className="overflow-hidden py-0">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => toggleFolder(folder.id)}>
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium">{folder.name}</span>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <Badge variant={folder.visibleToResidents ? 'default' : 'outline'} className="text-xs">
                        {folder.visibleToResidents ? 'Public' : 'Board only'}
                      </Badge>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title={folder.visibleToResidents ? 'Hide from residents' : 'Show to residents'}
                          disabled={togglingFolderId === folder.id}
                          onClick={() => handleToggleVisibility(folder)}>
                          {folder.visibleToResidents
                            ? <Eye className="h-3.5 w-3.5" />
                            : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      )}
                      <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isOpen && (
                    folder.documents.length === 0
                      ? <div className="px-4 py-3 border-t text-sm text-muted-foreground">No documents in this folder.</div>
                      : <div className="border-t">
                          {folder.documents.map(doc => (
                            <DocRow key={doc.id} doc={doc} folderId={folder.id} {...docRowProps} />
                          ))}
                        </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Unfiled documents */}
      <div>
        <h2 className="text-base font-semibold mb-3">Unfiled Documents</h2>
        {localUnfiled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unfiled documents.</p>
        ) : (
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              {localUnfiled.map(doc => (
                <DocRow key={doc.id} doc={doc} folderId={null} {...docRowProps} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
