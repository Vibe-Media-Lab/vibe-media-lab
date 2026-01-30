# vibe-media-lab 스크래치패드

**마지막 업데이트**: 2026-01-31 오전

---

## 현재 상태

- **Phase 5**: Kids Animation Studio
- **진행 중**: 샷 이미지 생성 테스트
- **완료**: 스토리 → 스크립트 → 앵커 이미지 → 앵커 확장

---

## 워크플로우 (9단계)

```
1. setup   → 2. story   → 3. script  → 4. anchors → 5. expand
6. shots   → 7. videos  → 8. audio   → 9. final
```

---

## 핵심 파일

```
apps/web/
├── app/api/kids-animation/
│   ├── story/route.ts, script/route.ts, anchors/route.ts
│   ├── expand/route.ts, shots/route.ts, videos/route.ts
│   └── audio/route.ts, final/route.ts
├── components/templates/workflow/steps/
│   ├── generation-review-step.tsx  # 핵심 생성+검토 컴포넌트
│   └── media-choice-step.tsx       # 앵커 이미지 선택
└── lib/services/
    ├── gemini-image-client.ts  # Gemini 이미지 API
    ├── image-service.ts        # 이미지 생성 통합
    └── llm-service.ts          # Gemini LLM API
```

---

## 환경 변수

```bash
GEMINI_API_KEY=  # LLM + 이미지 생성
KIEAI_API_KEY=   # 비디오(Kling)/오디오(ElevenLabs,Suno)
```

---

## 핵심 패턴

### API 응답 언래핑
```typescript
let unwrapped = data
if ('success' in unwrapped && 'data' in unwrapped) {
  unwrapped = unwrapped.data
}
```

### 로컬 파일 base64 변환 (urlToBase64)
```typescript
if (url.startsWith('/generated/')) {
  const filePath = path.join(process.cwd(), 'public', url)
  const buffer = await fs.readFile(filePath)
  return { base64: buffer.toString('base64'), mimeType }
}
```

### 앵커 프롬프트
- **캐릭터**: `Character design sheet. [설명]. Full body, front view, white background, no text, no labels`
- **배경**: `Environment concept art. [locationVisualDescriptions]. Wide shot, no characters`

---

## 다음 작업

1. **샷 이미지 생성** - expanded 앵커 기반
2. **비디오 생성** - Kling AI
3. **오디오 생성** - TTS + BGM
4. **E2E 테스트**

---

## 알려진 이슈

- 디버그 로그 정리 필요 (script, expand, image-service)
- 이미지 생성 속도 ~30초/장
- generated 폴더 수동 정리 API 미구현

---

## 세션 재개

```bash
cd /Users/baggeun-yeong/Documents/VIBE/vibe-media-lab && pnpm dev
# http://localhost:3000/templates/kids-animation/workflow
```
