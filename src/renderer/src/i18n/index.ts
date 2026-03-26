/**
 * Internationalization (i18n) System
 * Provides multi-language support for the application
 */

import { Language } from '@/store/slices/preferencesSlice'

// Import all translation files
import en from './locales/en.json'
import hi from './locales/hi.json'
import gu from './locales/gu.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import mr from './locales/mr.json'
import bn from './locales/bn.json'
import pn from './locales/pn.json'

// Type for nested translation keys (based on English as the source of truth)
export type TranslationKeys = typeof en

// Type for partial translations (other languages may not have all keys)
type PartialTranslations = Record<string, unknown>

// Map language codes to translation objects
// Use 'as unknown as TranslationKeys' to allow partial translations with fallback
const translations: Record<Language, PartialTranslations> = {
  english: en,
  hindi: hi,
  gujarati: gu,
  tamil: ta,
  telugu: te,
  marathi: mr,
  bengali: bn,
  punjabi: pn
}

/**
 * Get a value from a nested object using dot notation
 */
function getNestedValue(obj: PartialTranslations, path: string): string | undefined {
  const keys = path.split('.')
  let result: unknown = obj
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[k]
    } else {
      return undefined
    }
  }
  
  return typeof result === 'string' ? result : undefined
}

/**
 * Get translation for a specific key path
 * @param language - The current language
 * @param key - Dot-notation path to the translation (e.g., 'sidebar.dashboard')
 * @param params - Optional parameters for interpolation
 * @returns Translated string or the key if not found
 */
export function getTranslation(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  // Try to get from selected language first
  let result = getNestedValue(translations[language] || translations.english, key)
  
  // Fallback to English if not found in selected language
  if (result === undefined && language !== 'english') {
    result = getNestedValue(translations.english, key)
  }
  
  // If still not found, return the key itself
  if (result === undefined) {
    return key
  }
  
  // Handle parameter interpolation (e.g., "Hello {{name}}")
  if (params) {
    return result.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() || `{{${paramKey}}}`
    })
  }
  
  return result
}

/**
 * Get all translations for a specific language
 */
export function getTranslations(language: Language): TranslationKeys {
  return translations[language] as TranslationKeys || translations.english as TranslationKeys
}

export { translations }
