import { db } from '@/db'
import { documents, documentFolders } from '@/db/schema'
import { asc, desc, isNull } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { DocumentsClient } from '@/components/DocumentsClient'

export default async function DocumentsPage() {
  const session = await auth()
  const isAdmin = checkAdmin(session?.user?.role, session?.user?.isAdmin)

  const [folders, unfiledRaw] = await Promise.all([
    db.query.documentFolders.findMany({
      orderBy: asc(documentFolders.sortOrder),
      with: {
        documents: {
          orderBy: desc(documents.createdAt),
          with: { uploader: true },
        },
      },
    }),
    db.query.documents.findMany({
      where: isNull(documents.folderId),
      orderBy: desc(documents.createdAt),
      with: { uploader: true },
    }),
  ])

  const mapDoc = (d: typeof unfiledRaw[number]) => ({
    id: d.id,
    title: d.title,
    fileUrl: d.fileUrl,
    category: d.category,
    folderId: d.folderId ?? null,
    createdAt: d.createdAt,
    uploader: d.uploader ? { name: d.uploader.name, email: d.uploader.email } : null,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents</h1>
      <DocumentsClient
        isAdmin={isAdmin}
        folders={folders.map(f => ({
          id: f.id,
          name: f.name,
          visibleToResidents: f.visibleToResidents,
          sortOrder: f.sortOrder,
          documents: f.documents.map(mapDoc),
        }))}
        unfiledDocs={unfiledRaw.map(mapDoc)}
      />
    </div>
  )
}
