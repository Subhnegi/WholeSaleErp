import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '@/store/slices/preferencesSlice'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Languages } from 'lucide-react'

export function LanguageSelector() {
  const dispatch = useAppDispatch()
  const { language } = useAppSelector((state) => state.preferences)

  const handleLanguageChange = (newLanguage: Language) => {
    dispatch(setLanguage(newLanguage))
  }

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.code === language)

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="language" className="text-sm font-medium">
        Language
      </Label>
      <Select
        value={language}
        onValueChange={(value) => handleLanguageChange(value as Language)}
      >
        <SelectTrigger id="language" className="w-[180px]">
          <SelectValue>
            {currentLanguage?.nativeName || currentLanguage?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">({lang.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
