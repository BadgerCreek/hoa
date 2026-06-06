import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { db } from '@/db'
import { tasks, proposals, auditLogs, transactions, budgets } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export const agentTools = {
  getRecentTransactions: tool({
    description: 'Fetch the most recent HOA transactions for financial analysis',
    inputSchema: zodSchema(z.object({ limit: z.number().min(1).max(50).default(20) })),
    execute: async ({ limit }: { limit: number }) => {
      return db.select().from(transactions).orderBy(desc(transactions.date)).limit(limit)
    },
  }),

  getCurrentBudget: tool({
    description: 'Get the current fiscal year budget with totals',
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const year = new Date().getFullYear()
      return db.query.budgets.findFirst({
        where: eq(budgets.fiscalYear, year),
        with: { transactions: true },
      })
    },
  }),

  getOpenTasks: tool({
    description: 'List tasks that need attention',
    inputSchema: zodSchema(z.object({
      status: z.enum(['pending', 'in_progress', 'awaiting_human']).optional(),
    })),
    execute: async ({ status }: { status?: 'pending' | 'in_progress' | 'awaiting_human' }) => {
      return db.query.tasks.findMany({
        where: status ? eq(tasks.status, status) : undefined,
        limit: 20,
        orderBy: desc(tasks.createdAt),
      })
    },
  }),

  createTask: tool({
    description: 'Create a task that requires human review before execution',
    inputSchema: zodSchema(z.object({
      title: z.string(),
      description: z.string(),
      agentThoughts: z.string().describe('Step-by-step reasoning that led to this task'),
      assignedToAgentRole: z.string().optional(),
    })),
    execute: async (
      { title, description, agentThoughts, assignedToAgentRole }: {
        title: string; description: string; agentThoughts: string; assignedToAgentRole?: string
      }
    ) => {
      const [task] = await db.insert(tasks).values({
        title,
        description,
        status: 'awaiting_human',
        agentThoughts,
        assignedToAgentRole,
        createdByAgent: assignedToAgentRole ?? 'agent',
      }).returning()

      await db.insert(auditLogs).values({
        action: 'task.created_by_agent',
        entityType: 'task',
        entityId: task.id,
        performedBy: assignedToAgentRole ?? 'agent',
        details: { title },
      })

      return { taskId: task.id, status: 'awaiting_human' }
    },
  }),

  draftProposal: tool({
    description: 'Draft a proposal for human review and board voting',
    inputSchema: zodSchema(z.object({
      title: z.string(),
      content: z.string().describe('Full proposal text with rationale, costs, and expected outcomes'),
      agentId: z.string().describe('Your agent role, e.g. treasurer'),
    })),
    execute: async ({ title, content, agentId }: { title: string; content: string; agentId: string }) => {
      const [proposal] = await db.insert(proposals).values({
        title,
        content,
        status: 'draft',
        agentId,
      }).returning()

      await db.insert(auditLogs).values({
        action: 'proposal.drafted_by_agent',
        entityType: 'proposal',
        entityId: proposal.id,
        performedBy: agentId,
        details: { title },
      })

      return { proposalId: proposal.id, status: 'draft', message: 'Proposal drafted — awaiting board review' }
    },
  }),
}
