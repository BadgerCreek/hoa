import { createOpenAI } from '@ai-sdk/openai'

// Venice is OpenAI-compatible — no native SDK provider exists
export const veniceProvider = createOpenAI({
  baseURL: 'https://api.venice.ai/api/v1',
  apiKey: process.env.VENICE_API_KEY,
})

// Model tiers — match to task complexity
export const VeniceModel = {
  fast: veniceProvider('llama-3.3-70b'),           // routine analysis, summaries
  smart: veniceProvider('qwen-2.5-vl'),             // complex proposals, reasoning
  deep: veniceProvider('deepseek-r1-671b'),          // financial forecasting, legal review
} as const
