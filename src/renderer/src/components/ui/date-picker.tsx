import * as React from 'react'
import { Input } from './input'
import { Calendar } from 'lucide-react'

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({ date, onDateChange, placeholder = 'Select date' }: DatePickerProps) {
  const formatDateValue = (date: Date | undefined) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      onDateChange(new Date(value))
    } else {
      onDateChange(undefined)
    }
  }

  return (
    <div className="relative">
      <Input
        type="date"
        value={formatDateValue(date)}
        onChange={handleChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}
