'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useMediaStore } from '@/lib/stores/media-store'

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (정사각형)' },
  { value: '16:9', label: '16:9 (와이드)' },
  { value: '9:16', label: '9:16 (세로)' },
  { value: '4:3', label: '4:3 (표준)' },
  { value: '3:4', label: '3:4 (세로)' },
]

const MODELS = [
  { value: 'gemini-2.5-flash-image', label: 'Gemini Flash (빠름)' },
  { value: 'gemini-3-pro-image-preview', label: 'Gemini Pro (고품질)' },
]

export function ImageGenerator() {
  const { status, result, error, startGeneration, setResult, setError, reset } =
    useMediaStore()

  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [model, setModel] = useState('gemini-2.5-flash-image')

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요')
      return
    }

    startGeneration()

    try {
      const response = await fetch('/api/media/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: 'image',
          prompt: prompt.trim(),
          aspectRatio,
          model,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성에 실패했습니다')
      }

      setResult({
        id: data.id,
        runId: data.runId,
        mediaType: 'image',
        prompt: prompt.trim(),
        outputUrl: data.outputUrl,
        provider: data.provider,
        model: data.model,
        createdAt: new Date(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    }
  }

  return (
    <>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>이미지 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">프롬프트</Label>
            <Textarea
              id="prompt"
              placeholder="생성할 이미지를 설명해주세요… (영어 권장)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={5000}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground text-right">
              {prompt.length} / 5000
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aspectRatio">화면 비율</Label>
              <Select
                id="aspectRatio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                options={ASPECT_RATIOS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">모델</Label>
              <Select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                options={MODELS}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={status === 'generating' || !prompt.trim()}
              className="flex-1"
            >
              {status === 'generating' ? (
                <>
                  <Spinner size="sm" className="mr-2" label="이미지 생성 중" />
                  생성 중…
                </>
              ) : (
                '이미지 생성'
              )}
            </Button>
            {(result || error) && (
              <Button variant="outline" onClick={reset}>
                초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result Section */}
      <Card>
        <CardHeader>
          <CardTitle>결과</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'idle' && !result && (
            <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
              <p className="text-muted-foreground">
                이미지를 생성하면 여기에 표시됩니다
              </p>
            </div>
          )}

          {status === 'generating' && (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed gap-4">
              <Spinner size="lg" />
              <p className="text-muted-foreground">이미지 생성 중…</p>
            </div>
          )}

          {status === 'completed' && result?.outputUrl && (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <Image
                  src={result.outputUrl}
                  alt={result.prompt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain"
                />
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">프롬프트: </span>
                  {result.prompt}
                </p>
                <p>
                  <span className="text-muted-foreground">모델: </span>
                  {result.model}
                </p>
                <p>
                  <span className="text-muted-foreground">제공자: </span>
                  {result.provider}
                </p>
              </div>
              <Button variant="outline" asChild className="w-full">
                <a href={result.outputUrl} download target="_blank" rel="noopener">
                  다운로드
                </a>
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-destructive/50">
              <p className="text-destructive">{error || '생성에 실패했습니다'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
