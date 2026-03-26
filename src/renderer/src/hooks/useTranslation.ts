/**
 * useTranslation Hook
 * Provides translation functionality for React components
 */

import { useCallback, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getTranslation, getTranslations, TranslationKeys } from '@/i18n'
import { Language } from '@/store/slices/preferencesSlice'

export interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string | number>) => string
  language: Language
  translations: TranslationKeys
}

/**
 * Hook to access translations in React components
 * @returns Object containing translation function and current language
 * 
 * @example
 * ```tsx
 * const { t, language } = useTranslation()
 * return <div>{t('sidebar.dashboard')}</div>
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const language = useAppSelector((state) => state.preferences.language)
  
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return getTranslation(language, key, params)
    },
    [language]
  )
  
  const translations = useMemo(() => getTranslations(language), [language])
  
  return { t, language, translations }
}

export default useTranslation
