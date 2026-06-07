import { createAnthropic } from '@ai-sdk/anthropic'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const VeniceModel = {
  fast: anthropic('claude-haiku-4-5-20251001'),
  smart: anthropic('claude-sonnet-4-6'),
  deep: anthropic('claude-opus-4-8'),
} as const
