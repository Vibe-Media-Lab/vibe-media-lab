# VIBE Media Lab - Design Guidelines

> **마지막 업데이트**: 2026-01-30
>
> **UI 라이브러리**: shadcn/ui (Radix UI 기반)

---

## 0. shadcn/ui 설정

### 0.1 설치 및 설정

프로젝트는 [shadcn/ui](https://ui.shadcn.com/) 공식 컴포넌트를 사용합니다.

**설정 파일** (`apps/web/components.json`):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 0.2 설치된 컴포넌트

| 컴포넌트 | Radix 프리미티브 | 용도 |
|----------|------------------|------|
| `button` | Slot | 버튼, CTA |
| `avatar` | Avatar | 프로필 이미지 |
| `switch` | Switch | 토글 |
| `progress` | Progress | 진행률 바 |
| `dropdown-menu` | DropdownMenu | 드롭다운 메뉴 |
| `card` | - | 카드 컨테이너 |
| `input` | - | 텍스트 입력 |
| `label` | Label | 폼 라벨 |
| `textarea` | - | 멀티라인 입력 |

### 0.3 컴포넌트 추가 방법

```bash
npx shadcn@latest add [component-name]

# 예시
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add tabs
```

---

## 1. 레이아웃 시스템

### 1.1 반응형 여백 (Responsive Padding)

모든 페이지에서 동일한 여백 시스템 사용:

```css
px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40
```

| Breakpoint | Class | Value |
|------------|-------|-------|
| 기본 | `px-4` | 16px |
| sm (640px+) | `px-6` | 24px |
| lg (1024px+) | `px-24` | 96px |
| xl (1280px+) | `px-32` | 128px |
| 2xl (1536px+) | `px-40` | 160px |

**적용 위치:**
- `SiteHeader` nav
- `SiteFooter`
- 메인 페이지 섹션
- Account 레이아웃

### 1.2 콘텐츠 최대 너비

```css
/* 일반 콘텐츠 */
max-w-2xl  /* 672px - 폼, 설정 페이지 */
max-w-4xl  /* 896px - 넓은 콘텐츠 (구독 플랜 등) */
max-w-5xl  /* 1024px - 워크플로우 컨테이너 */
max-w-7xl  /* 1280px - 전체 레이아웃 */
```

### 1.3 템플릿 페이지 레이아웃

템플릿 상세 페이지와 워크플로우 페이지는 동일한 여백 시스템 사용:

```css
/* 페이지 컨테이너 */
mx-auto max-w-7xl px-2 py-8 sm:px-3 lg:px-4
```

| Breakpoint | Class | Value |
|------------|-------|-------|
| 기본 | `px-2` | 8px |
| sm (640px+) | `sm:px-3` | 12px |
| lg (1024px+) | `lg:px-4` | 16px |

```css
/* 워크플로우 컨테이너 */
mx-auto max-w-5xl  /* 1024px */
```

**적용 위치:**
- `/templates/[id]/page.tsx` - 템플릿 상세 페이지
- `/templates/[id]/workflow/page.tsx` - 워크플로우 페이지
- `WorkflowContainer` 컴포넌트

### 1.4 콘텐츠 중앙 정렬

```css
mx-auto max-w-2xl  /* 중앙 정렬 + 최대 너비 */
```

---

## 2. 컬러 시스템

### 2.1 CSS 구조 (Tailwind CSS 4 + shadcn/ui)

`globals.css`에서 두 가지 컬러 시스템을 사용합니다:

**1. shadcn/ui oklch 컬러** (`@theme inline` 블록):
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... shadcn 시맨틱 컬러 ... */
}
```

**2. 네온 브랜드 컬러** (`:root` 블록):
```css
:root {
  --neon-pink: #f4258c;
  --neon-cyan: #00f0ff;
  --neon-lime: #00ff66;
  --neon-green: #00ff66;
  --neon-purple: #a855f7;
}
```

### 2.2 네온 컬러 (브랜드 컬러)

```css
/* Tailwind에서 사용 */
bg-[var(--color-neon-pink)]     /* 주요 CTA, 강조 */
text-[var(--color-neon-cyan)]   /* 보조 강조, 토글 활성 */
bg-[var(--color-neon-lime)]     /* 성공, 진행률 */
bg-[var(--color-neon-green)]    /* lime의 별칭 */
text-[var(--color-neon-purple)] /* 악센트 */
```

### 2.2 배경 컬러

```css
bg-[#0a0a0a]     /* 메인 배경 (다크) */
bg-[#1a1a1a]     /* 카드 배경 */
bg-white/5       /* 미묘한 배경 */
bg-white/10      /* 호버 상태 */
bg-white/20      /* 비활성 토글, 프로그레스 배경 */
```

### 2.3 텍스트 컬러

```css
text-white       /* 주요 텍스트 */
text-white/80    /* 보조 텍스트 */
text-white/60    /* 설명 텍스트 */
text-white/40    /* 라벨, 힌트 */
```

### 2.4 보더 컬러

```css
border-white/10  /* 기본 보더 */
border-white/20  /* 강조 보더 */
border-red-500/20  /* 위험 영역 보더 */
```

---

## 3. 컴포넌트 패턴

### 3.1 카드

```tsx
<div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
  {/* 내용 */}
</div>
```

**위험 카드 (삭제 등):**
```tsx
<div className="rounded-2xl border border-red-500/20 bg-[#1a1a1a] p-6">
```

### 3.2 섹션 헤더 (아이콘 포함)

```tsx
<div className="mb-6 flex items-center gap-3">
  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-purple)]/20">
    <Icon className="h-5 w-5 text-[var(--color-neon-purple)]" />
  </div>
  <div>
    <h2 className="text-lg font-semibold text-white">제목</h2>
    <p className="text-sm text-white/60">설명</p>
  </div>
</div>
```

### 3.3 버튼 스타일

**Primary (네온 핑크):**
```tsx
<Button className="bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90">
```

**Outline (다크 테마):**
```tsx
<Button
  variant="outline"
  className="border-white/20 bg-transparent text-white hover:bg-white/10"
>
```

**Danger:**
```tsx
<Button className="border-red-500/50 bg-transparent text-red-400 hover:bg-red-500/10">
```

### 3.4 입력 필드 (다크 테마)

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// 기본 Input
<Input className="border-white/10 bg-white/5 text-white placeholder:text-white/40" />

// Label + Input 조합
<div className="space-y-2">
  <Label htmlFor="email" className="text-white/60">이메일</Label>
  <Input id="email" type="email" />
</div>

// Textarea
<Textarea
  placeholder="메시지를 입력하세요..."
  className="border-white/10 bg-white/5 text-white"
/>
```

### 3.5 Avatar (Compound 컴포넌트)

shadcn/ui Avatar는 Radix UI 기반 compound 패턴을 사용합니다:

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

// 이미지 + 폴백 (이니셜)
const initials = displayName
  .split(' ')
  .map((n: string) => n[0])
  .join('')
  .toUpperCase()
  .slice(0, 2)

<Avatar size="sm">
  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
  <AvatarFallback className="bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] text-white">
    {initials}
  </AvatarFallback>
</Avatar>
```

**사이즈 옵션:**
- `size="sm"` - 32px (헤더 프로필)
- `size="default"` - 40px (기본)
- `size="lg"` - 48px (프로필 페이지)

### 3.6 네비게이션 링크

**활성 상태:**
```tsx
className={cn(
  'text-sm transition-colors',
  isActive ? 'text-white' : 'text-white/60 hover:text-white'
)}
```

**사이드바 아이템:**
```tsx
className={cn(
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
  isActive
    ? 'bg-white/10 text-white'
    : 'text-white/60 hover:bg-white/5 hover:text-white'
)}
```

### 3.7 Switch (토글)

```tsx
import { Switch } from '@/components/ui/switch'

<Switch
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

### 3.8 Progress (진행률)

```tsx
import { Progress } from '@/components/ui/progress'

<Progress value={68} className="h-1.5 bg-white/20" />
```

---

## 4. 페이지 구조

### 4.1 공용 페이지 (/, /templates)

```tsx
<div className="min-h-screen bg-[#0a0a0a]">
  <SiteHeader />
  <main>{/* 콘텐츠 */}</main>
  <SiteFooter />
</div>
```

### 4.2 Account 페이지 (/account/*)

```tsx
<div className="flex min-h-screen flex-col bg-[#0a0a0a]">
  <SiteHeader />
  <div className="flex flex-1 px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
    <SettingsSidebar />
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
        {/* 콘텐츠 */}
      </div>
    </main>
  </div>
</div>
```

### 4.3 Dashboard 페이지 (/studio, /gallery)

```tsx
// (dashboard)/layout.tsx 사용
// 인증 필수, 밝은 테마 헤더
```

---

## 5. 인증 플로우

### 5.1 리다이렉트 파라미터

로그인/회원가입 시 이전 페이지로 돌아가기:

```tsx
// 링크에 redirect 파라미터 추가
<Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>

// 로그인 후 리다이렉트
const redirectTo = searchParams.get('redirect') || '/studio'
router.push(redirectTo)
```

### 5.2 보호된 라우트

`middleware.ts`에서 관리:
```typescript
const protectedPaths = ['/studio', '/gallery', '/history', '/settings', '/account']
```

### 5.3 인증 상태 체크 (클라이언트)

```tsx
React.useEffect(() => {
  const supabase = createClient()

  const getUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  getUser()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

---

## 6. 컴포넌트 위치

```
components/
├── ui/                    # shadcn/ui 컴포넌트 (Radix UI 기반)
│   ├── avatar.tsx         # Avatar + AvatarImage + AvatarFallback
│   ├── button.tsx         # Button (Radix Slot 지원)
│   ├── card.tsx           # Card + CardHeader + CardContent + ...
│   ├── dropdown-menu.tsx  # DropdownMenu (Radix)
│   ├── input.tsx          # Input
│   ├── label.tsx          # Label (Radix)
│   ├── progress.tsx       # Progress (Radix)
│   ├── switch.tsx         # Switch (Radix)
│   ├── textarea.tsx       # Textarea
│   └── spinner.tsx        # 로딩 스피너 (커스텀)
│
├── shared/                # 공용 레이아웃 컴포넌트
│   ├── site-header.tsx    # 메인 헤더 (인증 상태 반영)
│   ├── site-footer.tsx    # 메인 푸터
│   ├── profile-dropdown.tsx  # 프로필 드롭다운 메뉴
│   └── logout-button.tsx
│
├── settings/              # 계정 설정 컴포넌트
│   ├── settings-sidebar.tsx
│   └── account-content.tsx
│
├── templates/             # 템플릿 관련 컴포넌트
│   ├── template-card.tsx
│   ├── template-grid.tsx
│   └── workflow/
│
└── showcase/              # 메인 페이지 쇼케이스
    ├── template-carousel.tsx
    ├── tools-section.tsx
    └── trending-section.tsx
```

### 6.1 shadcn/ui Import 패턴

```tsx
// shadcn 컴포넌트는 @/components/ui에서 import
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

// cn 유틸리티
import { cn } from '@/lib/utils'
```

---

## 7. 네이밍 컨벤션

### 7.1 파일명

- 컴포넌트: `kebab-case.tsx` (예: `site-header.tsx`)
- 페이지: `page.tsx`
- 레이아웃: `layout.tsx`

### 7.2 컴포넌트명

- PascalCase (예: `SiteHeader`, `ProfileDropdown`)

### 7.3 CSS 클래스 순서

1. 레이아웃 (flex, grid)
2. 크기 (w, h, max-w)
3. 간격 (p, m, gap)
4. 배경/보더
5. 텍스트
6. 상태 (hover, focus)

```tsx
className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/10 text-white hover:bg-white/20"
```

---

## 8. 접근성 (A11y)

### 8.1 Radix UI 내장 접근성

shadcn/ui는 Radix UI 프리미티브를 사용하여 **접근성이 기본 내장**되어 있습니다:

- **Switch**: `role="switch"`, `aria-checked` 자동 처리
- **Progress**: `role="progressbar"`, `aria-valuenow` 자동 처리
- **Avatar**: 이미지 로드 실패 시 폴백 자동 표시
- **DropdownMenu**: 키보드 네비게이션, 포커스 관리 내장

### 8.2 추가 필수 속성

```tsx
// 커스텀 버튼 (아이콘만 있는 경우)
<button aria-label="메뉴 닫기">
  <X className="h-4 w-4" />
</button>

// 네비게이션
<nav aria-label="메인 네비게이션">

// 이미지
<Image alt="설명적인 대체 텍스트" />
```

### 8.3 모션 감소

```css
motion-reduce:animate-none
```

사용자가 "동작 줄이기" 설정을 활성화한 경우 애니메이션을 비활성화합니다.

---

## 9. 반응형 디자인

### 9.1 Breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### 9.2 모바일 우선

기본 스타일은 모바일, 큰 화면에서 확장:

```tsx
className="flex-col sm:flex-row"  // 모바일: 세로, sm+: 가로
className="hidden sm:flex"        // 모바일: 숨김, sm+: 표시
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## 10. 자주 사용하는 패턴

### 10.1 로딩 스켈레톤

```tsx
<div className="h-9 w-20 animate-pulse rounded-md bg-white/10" />
```

### 10.2 빈 상태

```tsx
<div className="rounded-lg border border-dashed border-white/20 p-8 text-center">
  <Icon className="mx-auto h-8 w-8 text-white/40" />
  <p className="mt-2 text-sm text-white/60">내용 없음</p>
</div>
```

### 10.3 그라데이션 텍스트

```tsx
<span className="bg-gradient-to-r from-[var(--color-neon-pink)] via-[var(--color-neon-purple)] to-[var(--color-neon-cyan)] bg-clip-text text-transparent">
  텍스트
</span>
```

### 10.4 호버 드롭다운

```tsx
const [isOpen, setIsOpen] = useState(false)
const timeoutRef = useRef<NodeJS.Timeout | null>(null)

const handleMouseEnter = () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current)
  setIsOpen(true)
}

const handleMouseLeave = () => {
  timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
}
```
