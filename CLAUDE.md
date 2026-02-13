# VIBE Media Lab

AI 기반 미디어 생성 플랫폼 — 사용자의 주제에서 완성된 애니메이션 영상까지 자동 생성

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Frontend**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4, Radix UI
- **State**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **Monitoring**: Sentry (client/server/edge)
- **Validation**: Zod
- **Language**: TypeScript 5.9

## Project Structure

```
vibe-media-lab/
├── apps/web/                         # Next.js 웹 애플리케이션
│   ├── app/
│   │   ├── (auth)/                   # 로그인/회원가입
│   │   ├── (dashboard)/              # 갤러리, 히스토리, 스튜디오
│   │   ├── account/                  # 구독, 프로모코드, 워크스페이스
│   │   ├── api/kids-animation/       # ★ 메인 파이프라인 API (8단계)
│   │   ├── api/library/              # 에셋 라이브러리 CRUD
│   │   ├── api/projects/             # 프로젝트 관리
│   │   ├── library/                  # 라이브러리 페이지
│   │   ├── templates/[id]/workflow/  # 워크플로우 실행 페이지
│   │   ├── error.tsx                 # Error Boundary
│   │   ├── global-error.tsx          # Global Error Boundary
│   │   └── layout.tsx                # 루트 레이아웃 (Toaster 포함)
│   ├── components/
│   │   ├── templates/workflow/steps/ # ★ 워크플로우 UI 컴포넌트
│   │   │   ├── generation-review/    # 생성→리뷰 스텝 (핵심)
│   │   │   │   ├── generation-review-step.tsx  # 메인 컴포넌트 (567줄)
│   │   │   │   ├── model-card.tsx              # 라디오 카드 그룹 (a11y 키보드)
│   │   │   │   └── model-selector.tsx          # 모델 선택 UI (React.memo)
│   │   │   └── media-choice-step.tsx # 앵커 업로드/생성 스텝
│   │   ├── ui/                       # Radix UI 기반 컴포넌트 (13개)
│   │   └── shared/                   # 헤더, 푸터, 프로필
│   ├── lib/
│   │   ├── api/                      # API 핸들러 + 인증 미들웨어
│   │   │   └── kids-animation/types.ts  # Zod 스키마 (모든 API)
│   │   ├── models/                      # ★ 멀티 프로바이더 모델 아키텍처
│   │   │   ├── types.ts                 # ModelCapability, CatalogModel, EnabledConfig
│   │   │   ├── catalog.ts              # 전체 모델 카탈로그 (19개)
│   │   │   ├── enabled.ts              # 활성 모델 + featured + fallback 매핑
│   │   │   ├── router.ts              # prefix 라우팅 + fallback chain
│   │   │   ├── helpers.ts             # UI/Zod 변환 (getModelSelectionConfig)
│   │   │   └── workflow-policies.ts   # 워크플로우별 모델 정책
│   │   ├── constants/model-options.ts   # helpers.ts 위임 (하위 호환)
│   │   ├── data/templates.ts            # 워크플로우 템플릿 정의
│   │   ├── services/                    # ★ 비즈니스 로직 (16개 서비스)
│   │   ├── step-actions/                # ★ StepAction Registry (워크플로우 모듈화)
│   │   │   ├── types.ts                 # StepAction 인터페이스
│   │   │   ├── registry.ts             # side-effect import + assertAllRegistered
│   │   │   ├── _action-map.ts          # Map + register/get (순환 의존 방지)
│   │   │   ├── kids/                   # 파이프라인 8단계 액션
│   │   │   │   ├── _shared.ts          # 공통 유틸 (API 호출, 검증)
│   │   │   │   ├── story-action.ts     # story 생성
│   │   │   │   ├── script-action.ts    # script 생성
│   │   │   │   ├── anchors-action.ts   # 앵커 이미지 생성 + 개별 재생성
│   │   │   │   ├── expand-action.ts    # 앵커 확장
│   │   │   │   ├── shots-action.ts     # 샷 이미지 배치 생성
│   │   │   │   ├── videos-action.ts    # 비디오 변환
│   │   │   │   ├── audio-action.ts     # TTS + BGM
│   │   │   │   └── final-action.ts     # 최종 합성
│   │   │   └── __tests__/              # 10개 테스트 파일 (136 케이스)
│   │   ├── stores/workflow-store.ts     # Zustand 상태 + beforeunload flush
│   │   ├── utils/                       # fetch-with-timeout, retry, mapper
│   │   ├── security/                    # URL 검증 (SSRF 방어)
│   │   └── supabase/                    # Supabase 클라이언트
│   ├── sentry.{client,server,edge}.config.ts
│   ├── instrumentation.ts              # 서버 Sentry 초기화
│   ├── instrumentation-client.ts       # 클라이언트 Sentry 초기화
│   ├── vitest.config.ts                # Vitest 설정
│   └── vitest.setup.ts                 # 테스트 환경 셋업
├── packages/
│   ├── shared/           # 공유 타입 (KidsStory, KidsShot, ModelOption 등)
│   ├── db/               # Supabase 클라이언트 + 마이그레이션
│   ├── media-router/     # 미디어 라우팅 + 비용 추적
│   ├── ui/               # UI 컴포넌트 라이브러리
│   ├── eslint-config/    # ESLint 설정
│   └── typescript-config/ # TypeScript 설정
```

## Commands

```bash
pnpm dev           # 개발 서버
pnpm build         # 빌드
pnpm check-types   # 타입 체크
pnpm lint          # 린트
pnpm format        # 포맷팅
pnpm --filter web test        # Vitest 단위 테스트
pnpm --filter web test:cov    # 커버리지 포함 테스트
```

---

## Kids Animation 파이프라인

핵심 기능. 8단계 순차 처리로 주제 → 완성 애니메이션 영상 생성.

### 파이프라인 흐름

```
story → script → anchors → expand → shots → videos → audio → final
(LLM)   (LLM)   (이미지)   (이미지)  (이미지)  (비디오)  (TTS+BGM) (합성)
```

### API 라우트

| 단계 | 엔드포인트 | 서비스 | 외부 API | maxDuration |
|------|-----------|--------|---------|-------------|
| story | `POST /api/kids-animation/story` | `llmService.generateStory()` | Gemini 2.5 Flash (LLM) | - |
| script | `POST /api/kids-animation/script` | `llmService.generateScript()` | Gemini 2.5 Flash (LLM) | - |
| anchors | `POST /api/kids-animation/anchors` | `generateImage()` | kieai nano-banana-pro (→ Gemini fallback) | 300s |
| expand | `POST /api/kids-animation/expand` | `editImage()` | fal nano-banana-pro/edit (→ Gemini fallback) | 300s |
| shots | `POST /api/kids-animation/shots` | `batchEditImages()` | fal nano-banana-pro/edit (→ Gemini fallback) | 300s |
| shots/regenerate | `POST .../shots/regenerate` | `editImage()` | fal nano-banana-pro/edit (→ Gemini fallback) | 300s |
| videos | `POST /api/kids-animation/videos` | `imageToVideo()` | Kling 2.6 (kieai) | 300s |
| audio | `POST /api/kids-animation/audio` | `generateTTS()` + `generateBGM()` | ElevenLabs (fal.ai / kieai) + Suno (kieai) | 300s |
| final | `POST /api/kids-animation/final` | `composeVideo()` + `generateThumbnail()` | fal.ai (FFmpeg) + Gemini | 300s |

### 서비스 레이어 (`lib/services/`)

| 파일 | 역할 | 외부 API |
|------|------|---------|
| `llm-service.ts` | 스토리/스크립트 LLM 생성 | Gemini 2.5 Flash |
| `gemini-image-client.ts` | Gemini 이미지 생성/편집 (직접 API) | Gemini 3 Pro Image |
| `image-service.ts` | 이미지 서비스 (Router 기반) | kieai (생성) / fal (편집) → Gemini (fallback) |
| `kieai-client.ts` | Kie.ai API 클라이언트 (비디오/TTS/BGM) | Kie.ai |
| `fal-client.ts` | fal.ai API 클라이언트 (비디오/TTS/이미지편집/합성) | fal.ai |
| `video-service.ts` | 이미지→비디오 변환 (Router 기반) | Kling 2.6 (kieai) |
| `audio-service.ts` | TTS + BGM 생성 (Router 기반) | ElevenLabs (fal.ai 기본, kieai fallback) + Suno (kieai) |
| `final-service.ts` | 최종 영상 합성 + Supabase 재업로드 | fal.ai (FFmpeg) |
| `bgm-processor.ts` | BGM 볼륨 조정 (0.125), 페이드아웃 | fal.ai (FFmpeg) |
| `image-storage.ts` | 이미지 Supabase Storage 저장 | Supabase Storage |
| `supabase-storage.ts` | Supabase Storage 클라이언트 (admin) | Supabase |
| `library-saver.ts` | 생성물 자동 라이브러리 저장 | Supabase DB |

### 멀티 프로바이더 모델 아키텍처 (`lib/models/`)

3계층 분리로 모델 추가/제거를 `enabled.ts` 한 파일 수정으로 완료 가능:

```
Catalog (전체 19개 모델) → Enabled (활성 + featured + fallback) → Router (런타임 라우팅)
```

**Router fallback chain** (`router.ts`):
1. 요청 모델의 provider 가용 → 그대로 사용
2. Provider 불가 → `enabled.ts`의 명시 fallback 매핑
3. Fallback도 불가 → capability default 모델
4. 모두 불가 → `null` → `{success: false}` 즉시 반환

**기본값** (`enabled.ts`):

| Capability | 기본 모델 | Provider | Fallback |
|------------|----------|----------|----------|
| text-to-image | `nano-banana-pro` | kieai ($0.09) | Gemini direct |
| image-to-image | `fal-ai/nano-banana-pro/edit` | fal ($0.15) | Gemini direct |
| image-to-video | `kling-2.6/image-to-video` | kieai ($0.28) | - |
| tts | `fal-ai/elevenlabs/tts/multilingual-v2` | fal ($0.007/70자) | kieai multilingual-v2 |
| bgm | `V4_5` (Suno) | kieai | - |

**ResultMeta**: 모든 서비스 결과에 `requestedModel`, `actualModel`, `actualProvider`, `latencyMs`, `fallbackUsed` 기록.

사용자가 UI에서 모델을 직접 선택 가능 (`model-selector.tsx` → API → Router → 서비스).
`model-options.ts`는 `helpers.ts`로 위임하여 하위 호환 유지.

### 워크플로우별 모델 정책 (`workflow-policies.ts`)

워크플로우+스텝별로 모델 노출/기본값/fallback을 커스텀 가능:

```
WorkflowPolicy → StepModelPolicy[] → RouteOverrides → routeModel()
```

- `getModelSelectionConfigForWorkflow(workflowId, stepId, capability)` → UI 모델 목록
- `buildRouteOverrides(workflowId, stepId, capability)` → 서비스 라우팅 오버라이드
- Kids Animation 정책: 6개 스텝 (anchors, expand, shots, videos, audio-tts, audio-bgm)
- override 격리: RouteOverrides는 요청 스코프, 전역 enabled.ts에 누출 방지

### 샷별 참조 이미지 선별 (`shot-anchor-mapper.ts`)

샷에 등장하는 캐릭터/배경만 선별하여 Gemini에 전달. 우선순위:
1. **원본 앵커** (캐릭터 + 배경) — 항상 포함
2. **캐릭터 감정 확장** (emotion → happy/sad/three_quarter 매핑)
3. **배경 medium 확장** — 슬롯이 남으면
4. MAX_REFS=6 상한 (90s 타임아웃 + retry로 안전)
5. 매핑 0건 → 전체 앵커 폴백

### 타임아웃 & 재시도

| 대상 | 타임아웃 | 재시도 |
|------|---------|--------|
| Gemini 이미지 생성 | 90s | 1회 (finishReason:OTHER, 5xx, 타임아웃) |
| Gemini LLM | 90s | 2회 (5xx, 429, 타임아웃) |
| 참조 이미지 다운로드 | 45s | 없음 |
| Kie.ai API | 30s | 없음 (createTask 중복 과금 방지) |
| 샷 이미지 실패 | - | 개별 MAX_RETRIES=2 |

모든 API 라우트는 `Promise.allSettled`로 병렬 실행 (504 방지).

---

## 에러 처리 & 모니터링

### Sentry 설정

- **Config**: `sentry.{client,server,edge}.config.ts` — tracesSampleRate 0.5, replaysOnErrorSampleRate 1.0
- **초기화**: `instrumentation.ts` (서버) + `instrumentation-client.ts` (클라이언트, Turbopack 우회)
- **beforeSend 필터**: 크레딧 부족, 인증 실패, 검증 에러 → Sentry 전송 제외

### 서비스별 에러 캡처

모든 서비스에서 `Sentry.withScope` + `captureException` 패턴 적용:

| 서비스 | 캡처 지점 | 태그 |
|--------|----------|------|
| `image-service.ts` | 4개 catch (Gemini/Kieai) | `service=image-generation` |
| `video-service.ts` | Via Fal/Kieai catch + dispatch/fallback 안전망 | `service=video-generation` |
| `audio-service.ts` | Via Fal catch + TTS 외부 catch + BGM catch | `service=tts-generation`, `service=bgm-generation` |

**Provider 전체 불가 시**: `setFingerprint(['provider-unavailable', capability])` + `captureMessage` → 알림 폭주 방지

### 기타

- **Error Boundary**: `error.tsx` (세그먼트) + `global-error.tsx` (전역), Sentry 자동 보고
- **Toast UX**: `sonner` — `error-messages.ts`에서 한국어 사용자 메시지 매핑
- **API 핸들러**: `createApiHandler`가 `captureException` + breadcrumb 자동 처리
- **URL 보안**: `validateFetchUrl`로 SSRF 방어, `sanitizeAnchorUrls`로 잘못된 URL 필터링

---

## 워크플로우 UI 구조

### StepAction Registry 패턴

파이프라인 각 단계의 비즈니스 로직을 UI에서 분리한 모듈화 아키텍처.

```
UI (generation-review-step.tsx)
  → getAction('kids/shots')     // registry에서 액션 조회
  → action.execute(ctx, cb)     // 컨텍스트 + 콜백으로 실행
  → action.regenerateItem(...)  // 개별 재생성 (선택)
```

- **`types.ts`**: `StepAction` 인터페이스 — `execute()`, `regenerateItem()?`
- **`_action-map.ts`**: `Map<string, StepAction>` + `registerAction`/`getAction` (순환 의존 방지)
- **`registry.ts`**: side-effect import로 모든 액션 등록 + `assertAllRegistered()`
- **`kids/*.ts`**: 파이프라인 8단계 개별 액션 (API 호출, 결과 변환, 에러 처리)
- **`kids/_shared.ts`**: 공통 유틸 (요청 빌드, Zod 검증, 에러 매핑)

### UI 컴포넌트

- **workflow-store.ts**: Zustand — stepData, modelSelections (STEP_CAPABILITY_MAP 기반 마이그레이션), debounced 자동 저장 + `beforeunload` flush (`sendBeacon`)
- **generation-review-step.tsx**: 핵심 컴포넌트 — StepAction을 통한 생성/재생성/다운로드
- **model-card.tsx**: Radio Card Group — ARIA `radiogroup`/`radio`, disabled 스킵 키보드 탐색
- **model-selector.tsx**: 단계별 모델 선택 UI (`React.memo` + `useMemo`, featured 기반 접기/펼치기)
- **media-choice-step.tsx**: 앵커 업로드 또는 AI 생성 선택 — StepAction Adapter 패턴, blob URL 클린업

생성 결과는 `stepData[stepId]`에 저장되고, `__modelSelections`로 모델 선택 영속화.

### ESM 순환 의존 주의

`registry.ts` ↔ action 파일 간 직접 import 시 TDZ 에러. `_action-map.ts`로 Map을 분리하여 해결.
action 파일은 `../_action-map`에서 `registerAction` import. `registry.ts`는 re-export만 담당.

---

## Testing

- **프레임워크**: Vitest 3 + happy-dom + @vitest/coverage-v8
- **테스트 범위**:
  - `lib/step-actions/__tests__/` — 10개 파일, 136 케이스
  - `lib/models/__tests__/` — 1개 파일, 38 케이스
  - 총 174 케이스
- **실행**: `pnpm --filter web test` / `pnpm --filter web test:cov`
- **설정**: `vitest.config.ts` + `vitest.setup.ts`
- **주의**: shared 패키지 타입 변경 시 `cd packages/shared && pnpm build` 필수 (테스트에서 import하므로)

---

## Development Guidelines

### Absolute Rules
1. **WE MUST ALWAYS BE ON THE SAME PAGE**: 항상 서로의 의도와 상황을 일치시킨다
2. **No Assumptions**: 명확히 언급하지 않은 것은 추측하지 말라
3. **Ask Questions**: 불명확한 것은 반드시 질문하라
4. **Lead and Propose**: 적극적으로 제안하며 주도하라
5. **Approval**: 반드시 승인 받은 행동만 수행하라

### Code Style
- 한국어로 대화, 한국어로 문서 작성
- Immutable 패턴 사용 (객체 변경 금지)
- 파일당 200-400줄 유지, 최대 800줄
- 함수당 최대 50줄

### Component Patterns
- Server Components 기본 사용
- Client Components는 `"use client"` 명시
- Radix UI + Tailwind로 UI 구성
- CVA (class-variance-authority)로 variant 관리

### 주의사항
- 외부 CDN URL(fal.ai, kieai)은 만료됨 → Supabase Storage에 재업로드하여 영구 URL 확보
- Supabase Storage 접근은 `createAdminClient` 필수
- cross-origin 다운로드는 `fetch→blob→createObjectURL` 패턴 사용
- Kie.ai `createTask`는 retry 없음 (중복 과금 방지)
- Turbopack에서 sentry.client.config.ts 자동 로드 안 됨 → `instrumentation-client.ts` 필요

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI 서비스
GEMINI_API_KEY=              # Gemini 이미지 + LLM
KIEAI_API_KEY=               # Kie.ai (Kling 비디오, ElevenLabs TTS, Suno BGM)
FAL_KEY=                     # fal.ai (Kling 비디오, ElevenLabs TTS, FFmpeg 합성)

# 모니터링
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output CLAUDE.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-cache-components.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,isolatedDevBuild.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-report-web-vitals.mdx,use-router.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,isolatedDevBuild.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
