/**
 * Character Creator E2E 테스트용 API Mock 응답
 */

export const MOCK_PROJECT = {
  success: true,
  project: {
    id: 'test-project-e2e',
    templateId: 'character-creator',
    title: 'E2E 테스트',
    stepData: {},
    currentStepIndex: 0,
    outputUrl: null,
    status: 'in_progress',
  },
}

export const MOCK_QUICKSTART = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    profile: {
      name: '아라곤',
      personality: '용감하고 지혜로운 전사. 어려운 상황에서도 결코 포기하지 않는다.',
      visualDescription: 'A cheerful 3D boy character with bright colors and expressive eyes',
      backstory: '오래전 잃어버린 왕국의 후예. 세상을 구하기 위해 모험을 떠났다.',
      archetype: 'bright-3d-boy',
    },
    styleHint: {
      visualStyle: 'bright-3d',
      promptKeywords: ['Pixar 3D animation style', 'Disney 3D rendering', 'bright colors', 'soft lighting', 'expressive eyes', 'round features'],
    },
  },
}

export const MOCK_MAIN_VISUAL_SUCCESS = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    images: [
      { id: 'portrait-1', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+1', prompt: 'bright-3d-boy portrait 1', status: 'completed' },
      { id: 'portrait-2', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+2', prompt: 'bright-3d-boy portrait 2', status: 'completed' },
      { id: 'portrait-3', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+3', prompt: 'bright-3d-boy portrait 3', status: 'completed' },
      { id: 'portrait-4', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+4', prompt: 'bright-3d-boy portrait 4', status: 'completed' },
    ],
  },
}

export const MOCK_MAIN_VISUAL_PARTIAL_FAIL = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    images: [
      { id: 'portrait-1', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+1', prompt: 'bright-3d-boy portrait 1', status: 'completed' },
      { id: 'portrait-2', url: '', prompt: 'bright-3d-boy portrait 2', status: 'failed' },
      { id: 'portrait-3', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+3', prompt: 'bright-3d-boy portrait 3', status: 'completed' },
      { id: 'portrait-4', url: '', prompt: 'bright-3d-boy portrait 4', status: 'failed' },
    ],
  },
}

export const MOCK_MAIN_VISUAL_REGENERATED = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    images: [
      { id: 'portrait-2', url: 'https://placehold.co/512x512/1a1a2e/green?text=Regen+2', prompt: 'bright-3d-boy portrait 2 regen', status: 'completed' },
    ],
  },
}

export const MOCK_CHARACTER_SHEET_SUCCESS = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    selectedImageUrl: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+1',
    characterName: '아라곤',
    characterDescription: 'A cheerful 3D boy with bright expressive eyes',
    sheets: [
      { id: 'front_view', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Front', variation: '정면', status: 'completed' },
      { id: 'three_quarter', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=3Q', variation: '3/4 뷰', status: 'completed' },
      { id: 'happy_expression', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Happy', variation: '행복 표정', status: 'completed' },
      { id: 'action_pose', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Action', variation: '액션 포즈', status: 'completed' },
    ],
  },
}

export const MOCK_CHARACTER_SHEET_PARTIAL_FAIL = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    selectedImageUrl: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+1',
    characterName: '아라곤',
    characterDescription: 'A cheerful 3D boy with bright expressive eyes',
    sheets: [
      { id: 'front_view', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Front', variation: '정면', status: 'completed' },
      { id: 'three_quarter', url: '', variation: '3/4 뷰', status: 'failed' },
      { id: 'happy_expression', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Happy', variation: '행복 표정', status: 'completed' },
      { id: 'action_pose', url: 'https://placehold.co/512x512/1a1a2e/cyan?text=Action', variation: '액션 포즈', status: 'completed' },
    ],
  },
}

export const MOCK_SHEET_REGENERATED = {
  success: true,
  data: {
    sessionId: 'e2e-session',
    selectedImageUrl: 'https://placehold.co/512x512/1a1a2e/cyan?text=Portrait+1',
    characterName: '아라곤',
    characterDescription: 'A cheerful 3D boy with bright expressive eyes',
    sheets: [
      { id: 'three_quarter', url: 'https://placehold.co/512x512/1a1a2e/green?text=Regen+3Q', variation: '3/4 뷰', status: 'completed' },
    ],
  },
}
