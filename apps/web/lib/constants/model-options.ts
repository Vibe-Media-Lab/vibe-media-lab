/**
 * Model Options — Catalog/Enabled 기반 위임
 *
 * 기존 import 경로 하위 호환 유지.
 * 실제 데이터는 lib/models/ 에서 관리한다.
 */
import { getModelSelectionConfig, getAllowedIds } from '@/lib/models/helpers'

// ─── UI Configs ───
export const IMAGE_GEN_MODELS = getModelSelectionConfig('text-to-image')
export const IMAGE_EDIT_MODELS = getModelSelectionConfig('image-to-image')
export const VIDEO_MODELS = getModelSelectionConfig('image-to-video')
export const TEXT_TO_VIDEO_MODELS = getModelSelectionConfig('text-to-video')
export const TTS_MODELS = getModelSelectionConfig('tts')
export const BGM_MODELS = getModelSelectionConfig('bgm')

// ─── Allowlists (z.enum() 호환) ───
export const ALLOWED_TEXT_TO_IMAGE_MODELS = getAllowedIds('text-to-image')
export const ALLOWED_IMAGE_TO_IMAGE_MODELS = getAllowedIds('image-to-image')
/** @deprecated ALLOWED_TEXT_TO_IMAGE_MODELS 또는 ALLOWED_IMAGE_TO_IMAGE_MODELS 사용 */
export const ALLOWED_IMAGE_MODELS = getAllowedIds('text-to-image')
export const ALLOWED_VIDEO_MODELS = getAllowedIds('image-to-video')
export const ALLOWED_TEXT_TO_VIDEO_MODELS = getAllowedIds('text-to-video')
export const ALLOWED_TTS_MODELS = getAllowedIds('tts')
export const ALLOWED_BGM_MODELS = getAllowedIds('bgm')

// ─── LLM ───
export const LLM_MODELS = getModelSelectionConfig('llm')
export const ALLOWED_LLM_MODELS = getAllowedIds('llm')
