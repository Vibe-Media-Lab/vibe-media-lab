import { createApiHandler } from '@/lib/api'
import { callGeminiJSON } from '@/lib/services/gemini-client'
import {
  QuickstartRequestSchema,
  type QuickstartResponse,
  type CharacterProfile,
} from '@/lib/api/character/types'
import { getArchetypeById } from '@/lib/data/character-archetypes'

const CHARACTER_SYSTEM_PROMPT = `You are a character designer for animation and games.
Given a character archetype or description, create a detailed character profile.
Respond in JSON format with the following fields:
- name: A creative character name (Korean-friendly)
- personality: 2-3 sentences describing personality traits
- visualDescription: Detailed visual description in English for image generation (appearance, clothing, colors, style)
- backstory: 2-3 sentences of character backstory
- archetype: The original archetype or "freetext"

Make the character vivid, memorable, and suitable for animation.
The visualDescription should be in English and very detailed for image generation.`

function buildQuickstartPrompt(archetype: string, freeText?: string): string {
  if (archetype === 'freetext' && freeText) {
    return `Create a character profile based on this description: "${freeText}"`
  }

  const archetypeData = getArchetypeById(archetype)
  const archetypeLabel = archetypeData?.label || archetype
  const examplePrompt = archetypeData?.examplePrompt || ''

  return `Create a character profile for a "${archetypeLabel}" archetype.
Reference visual style: ${examplePrompt}
Make it unique and interesting.`
}

export const POST = createApiHandler<QuickstartResponse>(
  async (request) => {
    const body = await request.json()
    const validated = QuickstartRequestSchema.parse(body)

    const prompt = buildQuickstartPrompt(validated.archetype, validated.freeText)
    const profile = await callGeminiJSON<CharacterProfile>(prompt, {
      systemPrompt: CHARACTER_SYSTEM_PROMPT,
      temperature: 0.8,
    })

    // archetype 필드 보정
    profile.archetype = validated.archetype

    return {
      sessionId: validated.sessionId,
      profile,
    }
  },
  { rateLimit: { maxRequests: 10, windowMs: 60_000 } }
)

export const maxDuration = 60
