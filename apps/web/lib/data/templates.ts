import type { Template } from '@vibe-media-lab/shared'

export const TEMPLATES: Template[] = [
  // ============================================================
  // Kids Animation Studio (Featured)
  // ============================================================
  {
    id: 'kids-animation',
    title: 'Kids Animation Studio',
    description: 'Disney/Pixar 스타일 아동용 애니메이션',
    longDescription:
      '아이들을 위한 교육적인 애니메이션을 AI로 제작하세요. 손씻기, 채소 먹기 등 교훈적인 스토리를 Disney/Pixar 스타일의 고품질 애니메이션으로 만들어줍니다. 스토리 생성부터 최종 편집까지 단계별로 검토하며 진행합니다.',
    views: '320K',
    video: '/templates/kids-animation.mp4',
    poster: '/templates/kids-animation.jpg',
    badge: 'NEW',
    category: 'kids',
    tags: ['kids', 'animation', 'educational', 'pixar', 'disney', 'story'],
    estimatedTime: '15-30분',
    difficulty: 'medium',
    platforms: ['youtube', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'setup',
          type: 'config',
          label: '프로젝트 설정',
          description: '스토리 주제와 제작 옵션을 설정하세요',
          required: true,
          config: {
            fields: [
              {
                id: 'topic',
                type: 'textarea',
                label: '스토리 주제',
                placeholder: '예: 손씻기, 세균과 싸우는 미시세계',
                required: true,
              },
              {
                id: 'formFactor',
                type: 'select',
                label: '영상 형식',
                options: [
                  { value: 'longform', label: '롱폼 (16:9) - YouTube, 태블릿, TV' },
                  { value: 'shortform', label: '숏폼 (9:16) - TikTok, Reels, Shorts' },
                ],
                default: 'longform',
              },
              {
                id: 'songVersion',
                type: 'toggle',
                label: '노래 버전 생성',
                default: false,
              },
            ],
          },
        },
        {
          id: 'story',
          type: 'generation-review',
          label: '스토리 생성',
          description: 'AI가 6단계 플롯 구조의 스토리를 생성합니다',
          required: true,
          config: {
            generateAction: 'kids/story',
            outputFormat: 'markdown',
            editable: true,
            previewType: 'text',
          },
        },
        {
          id: 'script',
          type: 'generation-review',
          label: '스크립트 생성',
          description: '샷 구성, 나레이션, 프롬프트를 생성합니다',
          required: true,
          config: {
            generateAction: 'kids/script',
            outputFormat: 'json',
            editable: true,
            previewType: 'shot-list',
          },
        },
        {
          id: 'anchors',
          type: 'media-choice',
          label: '앵커 이미지',
          description: '캐릭터/배경 기준 이미지를 준비합니다',
          required: true,
          config: {
            modes: [
              {
                id: 'generate',
                label: 'AI 생성',
                description: '스크립트 기반으로 자동 생성',
                default: true,
              },
              {
                id: 'upload',
                label: '직접 업로드',
                description: '미드저니 등으로 만든 이미지 업로드',
              },
            ],
            uploadConfig: {
              accept: ['image/png', 'image/jpeg', 'image/webp'],
              maxSizeMb: 20,
              multiple: true,
              categories: ['character', 'background'],
            },
            generateAction: 'kids/anchors',
            previewType: 'image-grid',
            progress: {
              show: true,
              perItem: true,
            },
          },
        },
        {
          id: 'expand',
          type: 'generation-review',
          label: '앵커 확장',
          description: '앵커 이미지를 다양한 각도/표정으로 확장합니다',
          required: true,
          config: {
            generateAction: 'kids/expand',
            previewType: 'image-grid',
            regeneratable: true,
            progress: {
              show: true,
              perItem: true,
            },
            hint: '캐릭터: front, three_quarter, happy, sad | 배경: wide, medium',
          },
        },
        {
          id: 'shots',
          type: 'generation-review',
          label: '샷 이미지 생성',
          description: '확장된 앵커를 기반으로 각 장면의 이미지를 생성합니다',
          required: true,
          config: {
            generateAction: 'kids/shots',
            batchSize: 7,
            previewType: 'shot-gallery',
            regeneratable: true,
            progress: {
              show: true,
              perItem: true,
            },
          },
        },
        {
          id: 'videos',
          type: 'generation-review',
          label: '비디오 생성',
          description: '이미지를 애니메이션 비디오로 변환합니다',
          required: true,
          config: {
            generateAction: 'kids/videos',
            previewType: 'video-timeline',
            regeneratable: true,
            progress: {
              show: true,
              perItem: true,
              estimatedTime: true,
            },
          },
        },
        {
          id: 'audio',
          type: 'generation-review',
          label: '오디오 생성',
          description: '나레이션 TTS와 배경 BGM을 생성합니다',
          required: true,
          config: {
            generateAction: 'kids/audio',
            subSteps: [
              { id: 'tts', label: '나레이션' },
              { id: 'bgm', label: 'BGM' },
            ],
            previewType: 'audio-player',
            progress: {
              show: true,
              perItem: true,
            },
          },
        },
        {
          id: 'final',
          type: 'generation-review',
          label: '최종 편집',
          description: '모든 요소를 합성하여 완성본을 생성합니다',
          required: true,
          config: {
            generateAction: 'kids/final',
            subSteps: [
              { id: 'merge', label: '영상 합성' },
              { id: 'thumbnail', label: '썸네일 생성' },
              { id: 'song', label: '노래 버전', conditional: 'songVersion' },
            ],
            previewType: 'video-player',
            downloadable: true,
            progress: {
              show: true,
            },
          },
        },
      ],
      outputConfig: {
        aspectRatio: '16:9',
        format: 'mp4',
      },
    },
    relatedTemplates: ['storytime', 'factbomb', 'tutorial'],
  },
  {
    id: 'brainrot',
    title: 'Brainrot Core',
    description: '서브웨이 서퍼 + 밈 편집의 정석',
    longDescription:
      'TikTok과 YouTube Shorts에서 폭발적인 반응을 얻는 "Brainrot" 스타일의 영상을 손쉽게 만들어보세요. 서브웨이 서퍼 게임플레이와 밈 클립을 조합하여 중독성 있는 콘텐츠를 생성합니다.',
    views: '2.4M',
    video: '/templates/brainrot.mp4',
    poster: '/templates/brainrot.webp',
    badge: 'HOT',
    category: 'shortform',
    tags: ['meme', 'viral', 'subway-surfer', 'tiktok'],
    estimatedTime: '2-3분',
    difficulty: 'easy',
    platforms: ['tiktok', 'instagram', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'script',
          type: 'text-input',
          label: '스크립트 입력',
          description: '영상에 사용할 텍스트나 대사를 입력하세요',
          required: true,
          config: {
            placeholder: '예: 오늘 일어난 미친 일 알려줄게...',
            maxLength: 500,
            rows: 4,
            hint: '짧고 임팩트 있는 문장이 효과적입니다',
          },
        },
        {
          id: 'style',
          type: 'style-select',
          label: '편집 스타일',
          description: '밈 편집 스타일을 선택하세요',
          required: true,
          config: {
            options: [
              {
                id: 'chaos',
                label: 'Chaos Mode',
                description: '빠른 전환, 랜덤 효과',
              },
              {
                id: 'chill',
                label: 'Chill Edit',
                description: '느긋한 전환, 부드러운 효과',
              },
              {
                id: 'hype',
                label: 'Hype Beast',
                description: '비트 싱크, 강렬한 효과',
              },
            ],
          },
        },
        {
          id: 'narration',
          type: 'ai-generate',
          label: 'AI 내레이션',
          description: 'AI가 스크립트를 음성으로 변환합니다',
          required: false,
          config: {
            mediaType: 'tts',
            hint: '스킵하면 텍스트만 표시됩니다',
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '30',
        format: 'mp4',
      },
    },
    examples: [
      { id: 'ex1', thumbnail: '/templates/brainrot-ex1.webp', views: '1.2M' },
      { id: 'ex2', thumbnail: '/templates/brainrot-ex2.webp', views: '890K' },
      { id: 'ex3', thumbnail: '/templates/brainrot-ex3.webp', views: '650K' },
    ],
    relatedTemplates: ['meme', 'gameplay', 'storytime'],
  },
  {
    id: 'storytime',
    title: 'POV: Storytime',
    description: '자막 + 배경영상 + AI 내레이션',
    longDescription:
      '스토리텔링 영상의 정석! 배경 영상 위에 자막과 AI 내레이션을 추가하여 몰입감 있는 스토리타임 콘텐츠를 만들어보세요.',
    views: '850K',
    video: '/templates/storytime.mp4',
    poster: '/templates/storytime.webp',
    category: 'shortform',
    tags: ['story', 'pov', 'narration', 'viral'],
    estimatedTime: '3-5분',
    difficulty: 'easy',
    platforms: ['tiktok', 'instagram', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'story',
          type: 'text-input',
          label: '스토리 입력',
          description: '이야기할 내용을 입력하세요',
          required: true,
          config: {
            placeholder: 'POV: 면접에서 이상한 질문을 받았을 때...',
            maxLength: 1000,
            rows: 6,
            hint: 'POV 형식으로 시작하면 더 임팩트 있어요',
          },
        },
        {
          id: 'background',
          type: 'style-select',
          label: '배경 선택',
          description: '스토리에 맞는 배경 영상을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'minecraft', label: 'Minecraft Parkour' },
              { id: 'subway', label: 'Subway Surfers' },
              { id: 'soap', label: 'Soap Cutting' },
              { id: 'cooking', label: 'Cooking ASMR' },
            ],
          },
        },
        {
          id: 'voice',
          type: 'ai-generate',
          label: 'AI 음성 생성',
          description: 'AI가 스토리를 읽어줍니다',
          required: true,
          config: {
            mediaType: 'tts',
            autoGenerate: true,
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '60',
        format: 'mp4',
      },
    },
    relatedTemplates: ['brainrot', 'factbomb', 'aesthetic'],
  },
  {
    id: 'satisfying',
    title: 'Oddly Satisfying',
    description: 'ASMR 언박싱 & 만족감 영상',
    longDescription:
      '시청자의 마음을 사로잡는 Oddly Satisfying 콘텐츠를 만들어보세요. ASMR 효과와 만족스러운 비주얼로 높은 조회수를 기록하세요.',
    views: '1.2M',
    video: '/templates/satisfying.mp4',
    poster: '/templates/satisfying.webp',
    badge: 'TRENDING',
    category: 'entertainment',
    tags: ['asmr', 'satisfying', 'relaxing', 'unboxing'],
    estimatedTime: '5-10분',
    difficulty: 'medium',
    platforms: ['tiktok', 'instagram', 'youtube'],
    workflow: {
      steps: [
        {
          id: 'media',
          type: 'media-upload',
          label: '영상 업로드',
          description: '만족스러운 장면이 담긴 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm', 'video/mov'],
            maxSizeMb: 500,
            hint: '고화질 영상일수록 좋습니다',
          },
        },
        {
          id: 'effect',
          type: 'style-select',
          label: '효과 선택',
          description: '적용할 효과를 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'slowmo', label: '슬로우 모션' },
              { id: 'zoom', label: '자동 줌 효과' },
              { id: 'loop', label: '무한 루프' },
              { id: 'reverse', label: '역재생 효과' },
            ],
            multiple: true,
          },
        },
        {
          id: 'audio',
          type: 'config',
          label: '오디오 설정',
          description: 'ASMR 효과를 설정하세요',
          required: false,
          config: {
            fields: [
              {
                id: 'volume',
                type: 'slider',
                label: '원본 볼륨',
                min: 0,
                max: 100,
                step: 10,
                default: 80,
              },
              {
                id: 'bassBoost',
                type: 'toggle',
                label: '베이스 부스트',
                default: false,
              },
            ],
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '30',
        format: 'mp4',
      },
    },
    relatedTemplates: ['aesthetic', 'tutorial', 'compare'],
  },
  {
    id: 'gameplay',
    title: 'Gameplay Clips',
    description: '게임 하이라이트 + 밈 효과',
    longDescription:
      '게임 플레이 하이라이트를 밈 스타일로 편집하세요. 자동 하이라이트 감지와 밈 효과로 프로 수준의 게임 클립을 만들 수 있습니다.',
    views: '500K',
    video: '/templates/gameplay.mp4',
    poster: '/templates/gameplay.webp',
    category: 'entertainment',
    tags: ['gaming', 'highlights', 'meme', 'esports'],
    estimatedTime: '5-8분',
    difficulty: 'medium',
    platforms: ['youtube', 'shorts', 'tiktok'],
    workflow: {
      steps: [
        {
          id: 'clip',
          type: 'media-upload',
          label: '게임 클립 업로드',
          description: '편집할 게임 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm'],
            maxSizeMb: 1000,
            hint: '하이라이트 장면이 포함된 영상을 업로드하세요',
          },
        },
        {
          id: 'game',
          type: 'style-select',
          label: '게임 선택',
          description: '게임에 맞는 편집 스타일이 적용됩니다',
          required: true,
          config: {
            options: [
              { id: 'valorant', label: 'Valorant' },
              { id: 'lol', label: 'League of Legends' },
              { id: 'overwatch', label: 'Overwatch 2' },
              { id: 'fortnite', label: 'Fortnite' },
              { id: 'other', label: '기타 게임' },
            ],
          },
        },
        {
          id: 'meme',
          type: 'style-select',
          label: '밈 효과',
          description: '추가할 밈 효과를 선택하세요',
          required: false,
          config: {
            options: [
              { id: 'toBeoContinued', label: 'To Be Continued' },
              { id: 'gta', label: 'GTA Wasted' },
              { id: 'mlg', label: 'MLG Effect' },
              { id: 'anime', label: 'Anime Lines' },
            ],
            multiple: true,
          },
        },
      ],
      outputConfig: {
        aspectRatio: '16:9',
        duration: '60',
        format: 'mp4',
      },
    },
    relatedTemplates: ['brainrot', 'meme', 'challenge'],
  },
  {
    id: 'aicover',
    title: 'AI Cover MV',
    description: 'AI 보이스 커버 + 비주얼라이저',
    longDescription:
      'AI 보이스로 커버곡을 만들고 멋진 비주얼라이저와 함께 뮤직비디오를 완성하세요. 다양한 캐릭터 보이스와 시각 효과를 제공합니다.',
    views: '780K',
    video: '/templates/aicover.mp4',
    poster: '/templates/aicover.webp',
    badge: 'NEW',
    category: 'music',
    tags: ['ai-cover', 'music', 'visualizer', 'song'],
    estimatedTime: '10-15분',
    difficulty: 'hard',
    platforms: ['youtube', 'tiktok', 'instagram'],
    workflow: {
      steps: [
        {
          id: 'lyrics',
          type: 'text-input',
          label: '가사 입력',
          description: '커버할 노래의 가사를 입력하세요',
          required: true,
          config: {
            placeholder: '가사를 입력하세요...',
            maxLength: 3000,
            rows: 10,
          },
        },
        {
          id: 'voice',
          type: 'style-select',
          label: 'AI 보이스 선택',
          description: '커버에 사용할 AI 보이스를 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'female-pop', label: 'Female Pop' },
              { id: 'male-rnb', label: 'Male R&B' },
              { id: 'anime-girl', label: 'Anime Girl' },
              { id: 'rock-vocal', label: 'Rock Vocal' },
            ],
          },
        },
        {
          id: 'visual',
          type: 'style-select',
          label: '비주얼라이저',
          description: '뮤직비디오 스타일을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'wave', label: 'Audio Wave' },
              { id: 'particle', label: 'Particle Effect' },
              { id: 'lyric-video', label: 'Lyric Video' },
              { id: 'ai-art', label: 'AI Generated Art' },
            ],
          },
        },
        {
          id: 'generate',
          type: 'ai-generate',
          label: 'AI 커버 생성',
          description: 'AI가 보이스를 생성합니다',
          required: true,
          config: {
            mediaType: 'tts',
            autoGenerate: true,
          },
        },
      ],
      outputConfig: {
        aspectRatio: '16:9',
        format: 'mp4',
      },
    },
    relatedTemplates: ['challenge', 'aesthetic', 'duet'],
  },
  {
    id: 'factbomb',
    title: 'Fact Bomb',
    description: '팩트폭격 쇼츠 + 다이나믹 텍스트',
    longDescription:
      '흥미로운 사실들을 다이나믹한 텍스트 애니메이션과 함께 전달하세요. 빠른 전환과 임팩트 있는 텍스트로 시청자를 사로잡습니다.',
    views: '620K',
    video: '/templates/factbomb.mp4',
    poster: '/templates/factbomb.webp',
    category: 'education',
    tags: ['facts', 'educational', 'text-animation', 'viral'],
    estimatedTime: '3-5분',
    difficulty: 'easy',
    platforms: ['tiktok', 'shorts', 'instagram'],
    workflow: {
      steps: [
        {
          id: 'facts',
          type: 'text-input',
          label: '팩트 입력',
          description: '전달할 사실들을 한 줄씩 입력하세요',
          required: true,
          config: {
            placeholder:
              '1. 인간의 뇌는 10%만 사용한다는 것은 거짓이다\n2. 꿀은 절대 상하지 않는다\n3. 문어는 심장이 3개다',
            maxLength: 2000,
            rows: 8,
            hint: '5-10개의 팩트가 적당합니다',
          },
        },
        {
          id: 'style',
          type: 'style-select',
          label: '텍스트 스타일',
          description: '텍스트 애니메이션 스타일을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'typewriter', label: '타이프라이터' },
              { id: 'pop', label: '팝 효과' },
              { id: 'slide', label: '슬라이드' },
              { id: 'glitch', label: '글리치' },
            ],
          },
        },
        {
          id: 'bgm',
          type: 'ai-generate',
          label: 'BGM 생성',
          description: '배경 음악을 AI로 생성합니다',
          required: false,
          config: {
            mediaType: 'bgm',
            hint: '스킵하면 기본 BGM이 사용됩니다',
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '30',
        format: 'mp4',
      },
    },
    relatedTemplates: ['storytime', 'tutorial', 'brainrot'],
  },
  {
    id: 'duet',
    title: 'Duet React',
    description: '리액션 듀엣 + 분할 화면',
    longDescription:
      '다른 영상에 리액션하는 듀엣 스타일 콘텐츠를 만들어보세요. 분할 화면과 리액션 효과로 재미있는 콘텐츠를 제작합니다.',
    views: '430K',
    video: '/templates/duet.mp4',
    poster: '/templates/duet.webp',
    category: 'entertainment',
    tags: ['duet', 'reaction', 'split-screen', 'collab'],
    estimatedTime: '5-8분',
    difficulty: 'medium',
    platforms: ['tiktok', 'instagram', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'original',
          type: 'media-upload',
          label: '원본 영상',
          description: '리액션할 원본 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm'],
            maxSizeMb: 200,
          },
        },
        {
          id: 'reaction',
          type: 'media-upload',
          label: '리액션 영상',
          description: '당신의 리액션 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm'],
            maxSizeMb: 200,
          },
        },
        {
          id: 'layout',
          type: 'style-select',
          label: '레이아웃',
          description: '화면 분할 방식을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'side-by-side', label: '좌우 분할' },
              { id: 'top-bottom', label: '상하 분할' },
              { id: 'pip', label: 'PIP (작은 화면)' },
              { id: 'floating', label: '플로팅 리액션' },
            ],
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '60',
        format: 'mp4',
      },
    },
    relatedTemplates: ['gameplay', 'challenge', 'meme'],
  },
  {
    id: 'tutorial',
    title: 'Quick Tutorial',
    description: '30초 튜토리얼 + 스텝 애니메이션',
    longDescription:
      '복잡한 내용도 30초 안에 설명하는 퀵 튜토리얼을 만들어보세요. 스텝별 애니메이션과 하이라이트로 쉽게 따라할 수 있는 가이드를 제작합니다.',
    views: '920K',
    video: '/templates/tutorial.mp4',
    poster: '/templates/tutorial.webp',
    badge: 'TRENDING',
    category: 'education',
    tags: ['tutorial', 'how-to', 'educational', 'guide'],
    estimatedTime: '5-10분',
    difficulty: 'medium',
    platforms: ['tiktok', 'instagram', 'shorts', 'youtube'],
    workflow: {
      steps: [
        {
          id: 'screen',
          type: 'media-upload',
          label: '화면 녹화',
          description: '튜토리얼 화면 녹화를 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm', 'video/mov'],
            maxSizeMb: 500,
          },
        },
        {
          id: 'steps',
          type: 'text-input',
          label: '스텝 설명',
          description: '각 스텝을 번호와 함께 입력하세요',
          required: true,
          config: {
            placeholder:
              '1. 설정 앱을 엽니다\n2. 프로필을 탭합니다\n3. 편집 버튼을 누릅니다',
            maxLength: 1000,
            rows: 6,
          },
        },
        {
          id: 'highlight',
          type: 'style-select',
          label: '하이라이트 스타일',
          description: '중요 부분 강조 방식을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'circle', label: '원형 하이라이트' },
              { id: 'arrow', label: '화살표 포인터' },
              { id: 'zoom', label: '자동 줌' },
              { id: 'glow', label: '글로우 효과' },
            ],
          },
        },
        {
          id: 'narration',
          type: 'ai-generate',
          label: 'AI 내레이션',
          description: '스텝을 읽어주는 내레이션을 생성합니다',
          required: false,
          config: {
            mediaType: 'tts',
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '30',
        format: 'mp4',
      },
    },
    relatedTemplates: ['factbomb', 'compare', 'satisfying'],
  },
  {
    id: 'meme',
    title: 'Meme Machine',
    description: '트렌딩 밈 + 자동 편집',
    longDescription:
      '최신 트렌딩 밈 포맷으로 영상을 자동 편집하세요. 밈 템플릿을 선택하고 내용만 입력하면 바이럴 콘텐츠가 완성됩니다.',
    views: '1.8M',
    video: '/templates/meme.mp4',
    poster: '/templates/meme.webp',
    badge: 'HOT',
    category: 'shortform',
    tags: ['meme', 'viral', 'funny', 'trending'],
    estimatedTime: '2-3분',
    difficulty: 'easy',
    platforms: ['tiktok', 'instagram', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'meme-template',
          type: 'style-select',
          label: '밈 템플릿',
          description: '사용할 밈 템플릿을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'drake', label: 'Drake Approve/Disapprove' },
              { id: 'distracted', label: 'Distracted Boyfriend' },
              { id: 'expanding-brain', label: 'Expanding Brain' },
              { id: 'two-buttons', label: 'Two Buttons' },
              { id: 'change-my-mind', label: 'Change My Mind' },
            ],
          },
        },
        {
          id: 'content',
          type: 'text-input',
          label: '밈 텍스트',
          description: '밈에 들어갈 텍스트를 입력하세요',
          required: true,
          config: {
            placeholder: '위: 정상적인 방법\n아래: 내가 하는 방법',
            maxLength: 500,
            rows: 4,
          },
        },
        {
          id: 'sound',
          type: 'style-select',
          label: '사운드',
          description: '배경 사운드를 선택하세요',
          required: false,
          config: {
            options: [
              { id: 'vine-boom', label: 'Vine Boom' },
              { id: 'bruh', label: 'Bruh Sound' },
              { id: 'emotional', label: 'Emotional Damage' },
              { id: 'none', label: '사운드 없음' },
            ],
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '10',
        format: 'mp4',
      },
    },
    relatedTemplates: ['brainrot', 'gameplay', 'duet'],
  },
  {
    id: 'aesthetic',
    title: 'Aesthetic Vibes',
    description: '감성 브이로그 + 필터 프리셋',
    longDescription:
      '감성적인 브이로그 스타일 영상을 만들어보세요. 트렌디한 필터와 음악으로 무드 있는 콘텐츠를 완성합니다.',
    views: '670K',
    video: '/templates/aesthetic.mp4',
    poster: '/templates/aesthetic.webp',
    category: 'shortform',
    tags: ['aesthetic', 'vlog', 'mood', 'cinematic'],
    estimatedTime: '5-8분',
    difficulty: 'easy',
    platforms: ['instagram', 'tiktok', 'youtube'],
    workflow: {
      steps: [
        {
          id: 'clips',
          type: 'media-upload',
          label: '클립 업로드',
          description: '편집할 영상 클립들을 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm', 'video/mov'],
            maxSizeMb: 500,
            multiple: true,
            hint: '여러 개의 클립을 한 번에 업로드할 수 있습니다',
          },
        },
        {
          id: 'filter',
          type: 'style-select',
          label: '필터 프리셋',
          description: '영상에 적용할 필터를 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'soft-glow', label: 'Soft Glow' },
              { id: 'vintage-film', label: 'Vintage Film' },
              { id: 'neon-nights', label: 'Neon Nights' },
              { id: 'golden-hour', label: 'Golden Hour' },
              { id: 'cyber-punk', label: 'Cyberpunk' },
            ],
          },
        },
        {
          id: 'music',
          type: 'ai-generate',
          label: 'BGM 생성',
          description: '분위기에 맞는 배경 음악을 생성합니다',
          required: false,
          config: {
            mediaType: 'bgm',
            hint: 'Lofi, Chill 스타일의 음악이 생성됩니다',
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '30',
        format: 'mp4',
      },
    },
    relatedTemplates: ['satisfying', 'storytime', 'aicover'],
  },
  {
    id: 'challenge',
    title: 'Dance Challenge',
    description: '댄스 챌린지 + 비트싱크',
    longDescription:
      '트렌딩 댄스 챌린지 영상을 완벽한 비트 싱크로 편집하세요. 자동 비트 감지와 효과로 프로 수준의 챌린지 영상을 만듭니다.',
    views: '2.1M',
    video: '/templates/challenge.mp4',
    poster: '/templates/challenge.webp',
    badge: 'HOT',
    category: 'music',
    tags: ['dance', 'challenge', 'beat-sync', 'trend'],
    estimatedTime: '5-8분',
    difficulty: 'medium',
    platforms: ['tiktok', 'instagram', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'dance-video',
          type: 'media-upload',
          label: '댄스 영상',
          description: '챌린지 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['video/mp4', 'video/webm'],
            maxSizeMb: 300,
          },
        },
        {
          id: 'song',
          type: 'style-select',
          label: '챌린지 곡',
          description: '사용할 곡을 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'trending1', label: '트렌딩 #1' },
              { id: 'trending2', label: '트렌딩 #2' },
              { id: 'trending3', label: '트렌딩 #3' },
              { id: 'custom', label: '직접 업로드' },
            ],
          },
        },
        {
          id: 'effect',
          type: 'style-select',
          label: '효과',
          description: '추가할 효과를 선택하세요',
          required: false,
          config: {
            options: [
              { id: 'flash', label: '비트 플래시' },
              { id: 'zoom', label: '비트 줌' },
              { id: 'shake', label: '쉐이크' },
              { id: 'glow', label: '글로우' },
            ],
            multiple: true,
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '30',
        format: 'mp4',
      },
    },
    relatedTemplates: ['aicover', 'duet', 'meme'],
  },
  {
    id: 'compare',
    title: 'Before & After',
    description: '비포애프터 + 트랜지션 효과',
    longDescription:
      '임팩트 있는 비포 & 애프터 영상을 만들어보세요. 다양한 트랜지션 효과로 변화를 극적으로 보여줍니다.',
    views: '540K',
    video: '/templates/compare.mp4',
    poster: '/templates/compare.webp',
    badge: 'NEW',
    category: 'shortform',
    tags: ['before-after', 'transformation', 'comparison', 'transition'],
    estimatedTime: '3-5분',
    difficulty: 'easy',
    platforms: ['tiktok', 'instagram', 'shorts'],
    workflow: {
      steps: [
        {
          id: 'before',
          type: 'media-upload',
          label: 'Before 이미지/영상',
          description: '변화 전 이미지나 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
            maxSizeMb: 100,
          },
        },
        {
          id: 'after',
          type: 'media-upload',
          label: 'After 이미지/영상',
          description: '변화 후 이미지나 영상을 업로드하세요',
          required: true,
          config: {
            accept: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
            maxSizeMb: 100,
          },
        },
        {
          id: 'transition',
          type: 'style-select',
          label: '트랜지션',
          description: '전환 효과를 선택하세요',
          required: true,
          config: {
            options: [
              { id: 'wipe', label: '와이프' },
              { id: 'split', label: '화면 분할' },
              { id: 'morph', label: '모프' },
              { id: 'flash', label: '플래시' },
              { id: 'zoom', label: '줌 인/아웃' },
            ],
          },
        },
        {
          id: 'caption',
          type: 'text-input',
          label: '캡션 (선택)',
          description: 'Before/After 대신 표시할 텍스트',
          required: false,
          config: {
            placeholder: '예: 1일차 / 30일차',
            maxLength: 50,
            rows: 1,
          },
        },
      ],
      outputConfig: {
        aspectRatio: '9:16',
        duration: '10',
        format: 'mp4',
      },
    },
    relatedTemplates: ['tutorial', 'satisfying', 'aesthetic'],
  },
]

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: string): Template[] {
  if (category === 'all') return TEMPLATES
  return TEMPLATES.filter((t) => t.category === category)
}

export function getRelatedTemplates(templateId: string): Template[] {
  const template = getTemplateById(templateId)
  if (!template?.relatedTemplates) return []
  return template.relatedTemplates
    .map((id) => getTemplateById(id))
    .filter((t): t is Template => t !== undefined)
}

export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: '전체', icon: 'grid' },
  { id: 'shortform', label: '숏폼', icon: 'smartphone' },
  { id: 'longform', label: '롱폼', icon: 'film' },
  { id: 'music', label: '뮤직', icon: 'music' },
  { id: 'education', label: '교육', icon: 'graduation-cap' },
  { id: 'entertainment', label: '엔터', icon: 'sparkles' },
  { id: 'kids', label: '키즈', icon: 'baby' },
] as const
