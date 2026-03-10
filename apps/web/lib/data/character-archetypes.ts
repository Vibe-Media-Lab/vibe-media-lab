export interface CharacterArchetype {
  id: string
  label: string
  description: string
  examplePrompt: string
}

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'warrior',
    label: '전사',
    description: '용감하고 강인한 전사 캐릭터',
    examplePrompt: 'A brave warrior character with battle scars and armor, strong and determined',
  },
  {
    id: 'mage',
    label: '마법사',
    description: '신비로운 마법의 힘을 가진 캐릭터',
    examplePrompt: 'A mystical mage character with flowing robes and glowing magical aura',
  },
  {
    id: 'healer',
    label: '치유사',
    description: '생명을 치유하는 따뜻한 캐릭터',
    examplePrompt: 'A gentle healer character with warm glowing hands and kind expression',
  },
  {
    id: 'rogue',
    label: '도적',
    description: '민첩하고 교활한 그림자의 캐릭터',
    examplePrompt: 'A stealthy rogue character with dark cloak, daggers, and a cunning smile',
  },
  {
    id: 'scholar',
    label: '학자',
    description: '지식을 탐구하는 지적인 캐릭터',
    examplePrompt: 'A scholarly character with spectacles, books, and an inquisitive expression',
  },
  {
    id: 'beast',
    label: '야수',
    description: '자연의 힘을 가진 야생 캐릭터',
    examplePrompt: 'A powerful beast character with animal features, wild and majestic',
  },
  {
    id: 'freetext',
    label: '직접 입력',
    description: '자유롭게 캐릭터를 설명해주세요',
    examplePrompt: '',
  },
]

export function getArchetypeById(id: string): CharacterArchetype | undefined {
  return CHARACTER_ARCHETYPES.find((a) => a.id === id)
}
