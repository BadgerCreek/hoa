import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import { auth } from '@/lib/auth'
import { agentPrompts, type AgentRole } from '@/lib/agents/prompts'
import { agentTools } from '@/lib/agents/tools'
import { VeniceModel } from '@/lib/venice'
import { db } from '@/db'
import { auditLogs } from '@/db/schema'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']
const VALID_AGENT_ROLES = ['president', 'vp', 'secretary', 'treasurer'] as const

export async function POST(
  req: Request,
  { params }: { params: Promise<{ role: string }> }
) {
  const session = await auth()
  const { role } = await params

  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  if (!VALID_AGENT_ROLES.includes(role as AgentRole)) {
    return new Response('Invalid agent role', { status: 400 })
  }

  const { messages } = await req.json()

  await db.insert(auditLogs).values({
    action: 'agent.invoked',
    entityType: 'agent',
    performedBy: session.user.id!,
    details: { agentRole: role, messageCount: messages.length },
  })

  const result = streamText({
    model: VeniceModel.smart,
    system: agentPrompts[role as AgentRole],
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(5),
    temperature: 0.3,
  })

  return result.toUIMessageStreamResponse()
}
