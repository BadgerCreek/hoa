'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function AgentChat({ agentRole }: { agentRole: string }) {
  const [input, setInput] = useState('')

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: `/api/agents/${agentRole}` }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ role: 'user', parts: [{ type: 'text', text: input }] })
    setInput('')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[500px] pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask the {agentRole} agent anything. For example: &ldquo;Analyze our current budget&rdquo; or &ldquo;Draft a proposal for parking lot repairs.&rdquo;
          </p>
        )}
        {messages.map((msg) => {
          const textContent = msg.parts
            .filter((p) => p.type === 'text')
            .map((p) => (p as { type: 'text'; text: string }).text)
            .join('')

          type AnyPart = typeof msg.parts[number]
          const toolParts = msg.parts.filter(
            (p) => (p.type as string).startsWith('tool-') || p.type === 'dynamic-tool'
          ) as Array<AnyPart & { toolCallId?: string; toolName?: string; state?: string; output?: unknown }>

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card
                className={`max-w-[80%] px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-foreground text-background rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                }`}
              >
                {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
                {toolParts.length > 0 && (
                  <details className="mt-2 text-xs opacity-70">
                    <summary className="cursor-pointer">Tool calls ({toolParts.length})</summary>
                    {toolParts.map((t, i) => (
                      <div key={t.toolCallId ?? i} className="mt-1 p-2 bg-background/20 rounded">
                        <span className="font-mono">{t.toolName ?? t.type}</span>
                        {t.state === 'output' && t.output != null && (
                          <pre className="mt-1 overflow-x-auto text-[10px]">
                            {JSON.stringify(t.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </details>
                )}
              </Card>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted px-4 py-3 text-sm rounded-bl-none">
              <span className="animate-pulse">Thinking...</span>
            </Card>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={`Ask the ${agentRole} agent...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
