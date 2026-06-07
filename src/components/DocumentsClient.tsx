'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FileText, Upload, Trash2 } from 'lucide-react'

type Doc = {
  id: string
  title: string
  fileUrl: string
  category: string | null
  createdAt: Date | null
  uploader: { name: string | null; email: string } | null
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

export function DocumentsClient({ docs, isAdmin }: { docs: Doc[]; isAdmin: boolean }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('other')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [localDocs, setLocalDocs] = useState(docs)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setUploading(true)
    setUploadError('')

    const form = new FormData()
    form.append('file', file)
    form.append('title', title.trim())
    form.append('category', category)

    const res = await fetch('/api/documents', { method: 'POST', body: form })
    setUploading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error ?? 'Upload failed.')
      return
    }

    setTitle('')
    setCategory('other')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmId(null)
    setLocalDocs((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Upload form */}
      {isAdmin && <div>
        <h2 className="text-base font-semibold mb-3">Upload Document</h2>
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. March 2026 Meeting Minutes"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-category">Category</Label>
                  <select
                    id="doc-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-file">File</Label>
                <input
                  id="doc-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>

              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

              <Button type="submit" disabled={uploading || !file || !title.trim()} className="gap-2">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>}

      {/* Document list */}
      <div>
        <h2 className="text-base font-semibold mb-3">All Documents</h2>
        {localDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              {localDocs.map((doc, idx) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3 px-4 py-3 ${idx !== localDocs.length - 1 ? 'border-b' : ''}`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm font-medium hover:underline truncate"
                  >
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                        onClick={() => setConfirmId(doc.id)}
                        disabled={!!deletingId}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Sure?</span>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id}>
                          {deletingId === doc.id ? '…' : 'Yes'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>No</Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
