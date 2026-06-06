import { AgentChat } from '@/components/AgentChat'

const AGENTS = [
  { role: 'treasurer', label: 'Treasurer', description: 'Financial analysis, budget review, expense approval' },
  { role: 'president', label: 'President', description: 'Strategic proposals, board policy, community initiatives' },
  { role: 'secretary', label: 'Secretary', description: 'Meeting minutes, document management, communications' },
  { role: 'vp', label: 'Vice President', description: 'Operations, maintenance, vendor coordination' },
]

export default function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  return <AgentChatShell searchParams={searchParams} />
}

async function AgentChatShell({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams
  const activeAgent = AGENTS.find((a) => a.role === role) ?? AGENTS[0]

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Consult your AI board members. They can analyze data, draft proposals, and create tasks for your approval.
        </p>
      </div>

      {/* Agent selector */}
      <div className="flex gap-2 flex-wrap">
        {AGENTS.map((agent) => (
          <a
            key={agent.role}
            href={`/agents?role=${agent.role}`}
            className={`px-4 py-2 rounded-md border text-sm transition-colors ${
              agent.role === activeAgent.role
                ? 'bg-foreground text-background'
                : 'hover:bg-muted'
            }`}
          >
            {agent.label}
          </a>
        ))}
      </div>

      <div className="text-sm text-muted-foreground border-l-2 pl-3">
        <strong>{activeAgent.label}:</strong> {activeAgent.description}
      </div>

      <AgentChat agentRole={activeAgent.role} />
    </div>
  )
}
