import { db } from '@/db'
import { documents } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { DocumentsClient } from '@/components/DocumentsClient'

export default async function DocumentsPage() {
  const allDocs = await db.query.documents.findMany({
    orderBy: desc(documents.createdAt),
    with: { uploader: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents</h1>
      <DocumentsClient
        docs={allDocs.map((d) => ({
          id: d.id,
          title: d.title,
          fileUrl: d.fileUrl,
          category: d.category,
          createdAt: d.createdAt,
          uploader: d.uploader ? { name: d.uploader.name, email: d.uploader.email } : null,
        }))}
      />
    </div>
  )
}
