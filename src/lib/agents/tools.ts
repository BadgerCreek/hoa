import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { db } from '@/db'
import { tasks, proposals, auditLogs, transactions, budgets, documents, votes, agentMemory, duesAssessments, maintenanceRequests, meetings, payments } from '@/db/schema'
import { eq, desc, and, gt } from 'drizzle-orm'

// ─── Read Tools ───────────────────────────────────────────────────────────────

const getRecentTransactionsTool = tool({
  description: 'Fetch the most recent HOA transactions for financial analysis',
  inputSchema: zodSchema(z.object({ limit: z.number().min(1).max(50).default(20) })),
  execute: async ({ limit }: { limit: number }) => {
    return db.select().from(transactions).orderBy(desc(transactions.date)).limit(limit)
  },
})

const getCurrentBudgetTool = tool({
  description: 'Get the current fiscal year budget with totals and all transactions',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const year = new Date().getFullYear()
    return db.query.budgets.findFirst({
      where: eq(budgets.fiscalYear, year),
      with: { transactions: true },
    })
  },
})

const getOpenTasksTool = tool({
  description: 'List tasks that need attention, optionally filtered by status',
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
})

const getProposalSummaryTool = tool({
  description: 'Get proposals with their vote tallies. Use for strategic overview or to check voting status.',
  inputSchema: zodSchema(z.object({
    status: z.enum(['draft', 'open', 'closed', 'approved', 'rejected']).optional(),
  })),
  execute: async ({ status }: { status?: 'draft' | 'open' | 'closed' | 'approved' | 'rejected' }) => {
    const all = await db.query.proposals.findMany({
      where: status ? eq(proposals.status, status) : undefined,
      with: { votes: true },
      orderBy: desc(proposals.createdAt),
      limit: 20,
    })
    return all.map(p => ({
      id: p.id,
      title: p.title,
      status: p.status,
      agentId: p.agentId,
      createdAt: p.createdAt,
      tally: {
        yes: p.votes.filter(v => v.vote === 'yes').length,
        no: p.votes.filter(v => v.vote === 'no').length,
        abstain: p.votes.filter(v => v.vote === 'abstain').length,
        total: p.votes.length,
      },
    }))
  },
})

const getDocumentsTool = tool({
  description: 'List HOA documents, optionally filtered by category',
  inputSchema: zodSchema(z.object({
    category: z.enum(['minutes', 'financial', 'legal', 'maintenance', 'other']).optional(),
  })),
  execute: async ({ category }: { category?: 'minutes' | 'financial' | 'legal' | 'maintenance' | 'other' }) => {
    return db.select().from(documents)
      .where(category ? eq(documents.category, category) : undefined)
      .orderBy(desc(documents.createdAt))
      .limit(20)
  },
})

// ─── Write Tools ──────────────────────────────────────────────────────────────

const TASK_TYPES = ['notification', 'schedule_meeting', 'phone_call', 'get_quote', 'request_payment', 'request_invoice', 'general'] as const
type TaskType = typeof TASK_TYPES[number]

const createTaskTool = tool({
  description: 'Create a task that requires human review before execution',
  inputSchema: zodSchema(z.object({
    title: z.string(),
    description: z.string(),
    agentThoughts: z.string().describe('Step-by-step reasoning that led to this task'),
    assignedToAgentRole: z.string().optional(),
    type: z.enum(TASK_TYPES).optional().describe('Task category: notification (draft message to residents), schedule_meeting, phone_call, get_quote, request_payment, request_invoice, general'),
  })),
  execute: async (
    { title, description, agentThoughts, assignedToAgentRole, type }: {
      title: string; description: string; agentThoughts: string; assignedToAgentRole?: string; type?: TaskType
    }
  ) => {
    const [task] = await db.insert(tasks).values({
      title,
      description,
      status: 'awaiting_human',
      type: type ?? 'general',
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
})

const draftProposalTool = tool({
  description: 'Draft a proposal for human review and board voting. ALWAYS use this when asked to create a proposal.',
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
})

const getDuesStatusTool = tool({
  description: 'Get dues assessment status across all properties. Use to find overdue accounts or check payment health.',
  inputSchema: zodSchema(z.object({
    status: z.enum(['pending', 'paid', 'late', 'waived']).optional(),
  })),
  execute: async ({ status }: { status?: 'pending' | 'paid' | 'late' | 'waived' }) => {
    return db.query.duesAssessments.findMany({
      where: status ? eq(duesAssessments.status, status) : undefined,
      with: { property: true },
      orderBy: desc(duesAssessments.dueDate),
      limit: 30,
    })
  },
})

const getMaintenanceRequestsTool = tool({
  description: 'Get maintenance requests, optionally filtered by status or priority.',
  inputSchema: zodSchema(z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  })),
  execute: async ({ status, priority }: { status?: string; priority?: string }) => {
    return db.query.maintenanceRequests.findMany({
      where: status ? eq(maintenanceRequests.status, status as 'open' | 'in_progress' | 'resolved' | 'closed') : undefined,
      with: { submitter: true },
      orderBy: desc(maintenanceRequests.createdAt),
      limit: 20,
    })
  },
})

const getUpcomingMeetingsTool = tool({
  description: 'Get upcoming scheduled meetings.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    return db.select().from(meetings)
      .where(eq(meetings.status, 'scheduled'))
      .orderBy(meetings.scheduledAt)
      .limit(10)
  },
})

const getPendingPaymentsTool = tool({
  description: 'Get payments awaiting treasurer approval.',
  inputSchema: zodSchema(z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  })),
  execute: async ({ status }: { status?: 'pending' | 'approved' | 'rejected' }) => {
    return db.query.payments.findMany({
      where: status ? eq(payments.status, status) : eq(payments.status, 'pending'),
      with: { requester: true },
      orderBy: desc(payments.createdAt),
      limit: 20,
    })
  },
})

const requestPaymentTool = tool({
  description: 'Submit a payment request for treasurer approval. Use when a board member needs to pay a vendor or expense.',
  inputSchema: zodSchema(z.object({
    title: z.string().describe('Short description, e.g. "Snow plowing — XYZ Company"'),
    amount: z.number().positive(),
    vendor: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(['maintenance', 'utilities', 'administrative', 'landscaping', 'insurance', 'other']).default('other'),
    requestedByUserId: z.string().describe('The user ID of the board member requesting this payment'),
  })),
  execute: async ({ title, amount, vendor, description, category, requestedByUserId }: {
    title: string; amount: number; vendor?: string; description?: string; category: string; requestedByUserId: string
  }) => {
    const year = new Date().getFullYear()
    const budget = await db.query.budgets.findFirst({ where: eq(budgets.fiscalYear, year) })

    const [payment] = await db.insert(payments).values({
      title,
      amount: amount.toString(),
      vendor,
      description,
      category: category as 'maintenance' | 'utilities' | 'administrative' | 'landscaping' | 'insurance' | 'other',
      requestedBy: requestedByUserId,
      budgetId: budget?.id,
    }).returning()

    await db.insert(auditLogs).values({
      action: 'payment.requested',
      entityType: 'payment',
      entityId: payment.id,
      performedBy: requestedByUserId,
      details: { title, amount },
    })

    return { paymentId: payment.id, status: 'pending', message: 'Payment submitted — awaiting treasurer approval' }
  },
})

// ─── Memory Tool (factory — captures agent role) ──────────────────────────────

export function createUpdateMemoryTool(agentRole: string) {
  return tool({
    description: 'Save an important fact to your persistent memory. Persists across sessions. Use for key decisions, vendor preferences, recurring issues, or anything the HOA should remember.',
    inputSchema: zodSchema(z.object({
      key: z.string().describe('Short key for this memory (e.g. "preferred_vendor", "budget_concern")'),
      value: z.string().describe('The fact or information to save'),
    })),
    execute: async ({ key, value }: { key: string; value: string }) => {
      const existing = await db.query.agentMemory.findFirst({
        where: eq(agentMemory.agentRole, agentRole),
      })
      const current = (existing?.context as Record<string, string>) ?? {}
      const updated = { ...current, [key]: value }

      if (existing) {
        await db.update(agentMemory)
          .set({ context: updated, lastUpdated: new Date() })
          .where(eq(agentMemory.agentRole, agentRole))
      } else {
        await db.insert(agentMemory).values({ agentRole, context: updated })
      }

      return { ok: true, saved: { [key]: value } }
    },
  })
}

// ─── Role-Specific Toolsets ───────────────────────────────────────────────────

export const agentToolsets = {
  treasurer: {
    getCurrentBudget: getCurrentBudgetTool,
    getRecentTransactions: getRecentTransactionsTool,
    getDuesStatus: getDuesStatusTool,
    getPendingPayments: getPendingPaymentsTool,
    getProposalSummary: getProposalSummaryTool,
    createTask: createTaskTool,
    draftProposal: draftProposalTool,
  },
  vp: {
    getOpenTasks: getOpenTasksTool,
    getMaintenanceRequests: getMaintenanceRequestsTool,
    getProposalSummary: getProposalSummaryTool,
    requestPayment: requestPaymentTool,
    createTask: createTaskTool,
    draftProposal: draftProposalTool,
  },
  secretary: {
    getOpenTasks: getOpenTasksTool,
    getDocuments: getDocumentsTool,
    getUpcomingMeetings: getUpcomingMeetingsTool,
    getProposalSummary: getProposalSummaryTool,
    createTask: createTaskTool,
    draftProposal: draftProposalTool,
  },
  president: {
    getOpenTasks: getOpenTasksTool,
    getCurrentBudget: getCurrentBudgetTool,
    getProposalSummary: getProposalSummaryTool,
    getMaintenanceRequests: getMaintenanceRequestsTool,
    requestPayment: requestPaymentTool,
    createTask: createTaskTool,
    draftProposal: draftProposalTool,
  },
} as const
