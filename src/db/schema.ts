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
  phone: text('phone'),
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
  lotNumber: text('lot_number'),
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
    .$type<'pending' | 'in_progress' | 'awaiting_human' | 'approved' | 'completed' | 'rejected'>()
    .default('pending'),
  type: text('type')
    .$type<'notification' | 'schedule_meeting' | 'phone_call' | 'get_quote' | 'request_payment' | 'request_invoice' | 'general'>()
    .default('general'),
  assignedToUserId: text('assigned_to_user_id').references(() => users.id),
  assignedToAgentRole: text('assigned_to_agent_role'),
  meetingId: uuid('meeting_id'), // 'treasurer' | 'president' | etc.
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

// ─── Budget Line Items ───────────────────────────────────────────────────────

export const budgetLineItems = pgTable('budget_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  fiscalYear: integer('fiscal_year').notNull(), // start year: 2025 = FY 25/26
  section: text('section').$type<'income' | 'expense' | 'reserves'>().notNull(),
  description: text('description').notNull(),
  budgetedAmount: numeric('budgeted_amount', { precision: 10, scale: 2 }),
  actualAmount: numeric('actual_amount', { precision: 10, scale: 2 }),
  proposedAmount: numeric('proposed_amount', { precision: 10, scale: 2 }),
  comment: text('comment'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  vendor: text('vendor'),
  category: text('category').$type<'maintenance' | 'utilities' | 'administrative' | 'landscaping' | 'insurance' | 'other'>().default('other'),
  status: text('status').$type<'pending' | 'approved' | 'rejected'>().default('pending'),
  requestedBy: text('requested_by').references(() => users.id).notNull(),
  approvedBy: text('approved_by').references(() => users.id),
  budgetId: uuid('budget_id').references(() => budgets.id),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  rejectionReason: text('rejection_reason'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Dues & Assessments ──────────────────────────────────────────────────────

export const duesAssessments = pgTable('dues_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  period: text('period').$type<'monthly' | 'quarterly' | 'annual'>().notNull(),
  status: text('status').$type<'pending' | 'paid' | 'late' | 'waived'>().default('pending'),
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Maintenance Requests ────────────────────────────────────────────────────

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  submittedBy: text('submitted_by').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').$type<'plumbing' | 'electrical' | 'landscaping' | 'road' | 'common_area' | 'other'>().default('other'),
  priority: text('priority').$type<'low' | 'medium' | 'high' | 'urgent'>().default('medium'),
  status: text('status').$type<'open' | 'in_progress' | 'resolved' | 'closed'>().default('open'),
  source: text('source').$type<'board' | 'portal'>().default('board'),
  assignedTo: text('assigned_to').references(() => users.id),
  vendorNotes: text('vendor_notes'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Meetings ────────────────────────────────────────────────────────────────

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  type: text('type').$type<'board' | 'annual' | 'special'>().default('board'),
  agenda: text('agenda'),
  minutes: text('minutes'),
  transcript: text('transcript'),
  minutesDocId: uuid('minutes_doc_id').references(() => documents.id),
  status: text('status').$type<'scheduled' | 'completed' | 'cancelled'>().default('scheduled'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── ARC Applications ────────────────────────────────────────────────────────

export const arcApplications = pgTable('arc_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id),
  applicantId: text('applicant_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status')
    .$type<'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_info'>()
    .default('submitted'),
  agentSummary: text('agent_summary'),
  decision: text('decision'),
  decidedBy: text('decided_by').references(() => users.id),
  submittedAt: timestamp('submitted_at').defaultNow(),
  decidedAt: timestamp('decided_at'),
})

// ─── Violations ──────────────────────────────────────────────────────────────

export const violations = pgTable('violations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportedBy: text('reported_by').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<'open' | 'under_review' | 'resolved' | 'dismissed'>().default('open'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Inquiries ────────────────────────────────────────────────────────────────

export const inquiries = pgTable('inquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromUserId: text('from_user_id').references(() => users.id).notNull(),
  category: text('category').$type<'dues' | 'general'>().notNull(),
  message: text('message').notNull(),
  status: text('status').$type<'open' | 'resolved'>().default('open'),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type')
    .$type<'dues_reminder' | 'task_update' | 'proposal_update' | 'maintenance_update' | 'arc_update' | 'hoa_notice'>()
    .notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false),
  link: text('link'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  tasks: many(tasks),
  boardMemberships: many(boardMembers),
  maintenanceRequests: many(maintenanceRequests),
  notifications: many(notifications),
  violations: many(violations),
  inquiries: many(inquiries),
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

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, { fields: [properties.ownerId], references: [users.id] }),
  duesAssessments: many(duesAssessments),
  arcApplications: many(arcApplications),
}))

export const duesAssessmentsRelations = relations(duesAssessments, ({ one }) => ({
  property: one(properties, { fields: [duesAssessments.propertyId], references: [properties.id] }),
}))

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
  submitter: one(users, { fields: [maintenanceRequests.submittedBy], references: [users.id] }),
}))

export const arcApplicationsRelations = relations(arcApplications, ({ one }) => ({
  property: one(properties, { fields: [arcApplications.propertyId], references: [properties.id] }),
  applicant: one(users, { fields: [arcApplications.applicantId], references: [users.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))

export const violationsRelations = relations(violations, ({ one }) => ({
  reporter: one(users, { fields: [violations.reportedBy], references: [users.id] }),
}))

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  from: one(users, { fields: [inquiries.fromUserId], references: [users.id] }),
  resolver: one(users, { fields: [inquiries.resolvedBy], references: [users.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  requester: one(users, { fields: [payments.requestedBy], references: [users.id] }),
  approver: one(users, { fields: [payments.approvedBy], references: [users.id] }),
  budget: one(budgets, { fields: [payments.budgetId], references: [budgets.id] }),
  transaction: one(transactions, { fields: [payments.transactionId], references: [transactions.id] }),
}))
