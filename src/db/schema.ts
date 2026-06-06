import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
  numeric,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Users & Auth ────────────────────────────────────────────────────────────

// Auth.js v5 adapter requires these exact column shapes
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  // HOA-specific
  role: text('role')
    .$type<'resident' | 'board_president' | 'board_vp' | 'board_secretary' | 'board_treasurer' | 'admin'>()
    .default('resident'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const accounts = pgTable('accounts', {
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// ─── Board ────────────────────────────────────────────────────────────────────

// boardMembers adds term tracking on top of the role field in users
export const boardMembers = pgTable('board_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  termStart: date('term_start').notNull(),
  termEnd: date('term_end'),
  active: boolean('active').default(true),
})

// ─── Core HOA Data ───────────────────────────────────────────────────────────

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').references(() => users.id),
  address: text('address').notNull(),
  unitNumber: text('unit_number'),
  squareFeet: integer('square_feet'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  fiscalYear: integer('fiscal_year').notNull(),
  totalBudget: numeric('total_budget', { precision: 12, scale: 2 }).notNull(),
  allocated: numeric('allocated', { precision: 12, scale: 2 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id').references(() => budgets.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').$type<'income' | 'expense'>().notNull(),
  description: text('description').notNull(),
  date: date('date').notNull(),
  approvedBy: text('approved_by').references(() => users.id),
  agentId: text('agent_id'), // e.g. 'treasurer' if agent-initiated
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Tasks & Proposals ───────────────────────────────────────────────────────

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status')
    .$type<'pending' | 'in_progress' | 'awaiting_human' | 'completed' | 'rejected'>()
    .default('pending'),
  assignedToUserId: text('assigned_to_user_id').references(() => users.id),
  assignedToAgentRole: text('assigned_to_agent_role'), // 'treasurer' | 'president' | etc.
  agentThoughts: text('agent_thoughts'), // transparency — what the agent was thinking
  createdByAgent: text('created_by_agent'), // e.g. 'treasurer'
  completedBy: text('completed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status')
    .$type<'draft' | 'open' | 'closed' | 'approved' | 'rejected'>()
    .default('draft'),
  agentId: text('agent_id'), // which agent drafted this
  createdBy: text('created_by').references(() => users.id),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// votes is separate (not jsonb on proposals) — enables querying by voter
export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proposalId: uuid('proposal_id').references(() => proposals.id, { onDelete: 'cascade' }).notNull(),
    voterId: text('voter_id').references(() => users.id).notNull(),
    vote: text('vote').$type<'yes' | 'no' | 'abstain'>().notNull(),
    castAt: timestamp('cast_at').defaultNow(),
  },
  (t) => [index('votes_proposal_voter_idx').on(t.proposalId, t.voterId)]
)

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(), // Vercel Blob signed URL
  category: text('category').$type<'minutes' | 'financial' | 'legal' | 'maintenance' | 'other'>(),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Agent Memory ────────────────────────────────────────────────────────────

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentRole: text('agent_role').notNull(), // 'president' | 'vp' | 'secretary' | 'treasurer'
  context: jsonb('context'), // persistent state, summaries, long-term facts
  lastUpdated: timestamp('last_updated').defaultNow(),
})

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(), // e.g. 'task.created', 'proposal.approved'
  entityType: text('entity_type'), // 'task' | 'proposal' | 'transaction' | ...
  entityId: text('entity_id'),
  performedBy: text('performed_by').notNull(), // user id or agent role string
  details: jsonb('details'),
  timestamp: timestamp('timestamp').defaultNow(),
})

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  tasks: many(tasks),
  boardMemberships: many(boardMembers),
}))

export const budgetsRelations = relations(budgets, ({ many }) => ({
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  budget: one(budgets, { fields: [transactions.budgetId], references: [budgets.id] }),
}))

export const proposalsRelations = relations(proposals, ({ many }) => ({
  votes: many(votes),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  proposal: one(proposals, { fields: [votes.proposalId], references: [proposals.id] }),
  voter: one(users, { fields: [votes.voterId], references: [users.id] }),
}))
