import { useState, useEffect, useRef } from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled = false,
}: DatePickerProps) {
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const [inputValue, setInputValue] = useState(() => {
    // Initialize with formatted value if provided
    if (value) {
      const dateObj = new Date(value)
      if (isValid(dateObj)) {
        return format(dateObj, "dd/MM/yyyy")
      }
    }
    return "__/__/____"
  })
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  useEffect(() => {
    if (value) {
      const dateObj = new Date(value)
      if (isValid(dateObj)) {
        setDate(dateObj)
        setInputValue(format(dateObj, "dd/MM/yyyy"))
      }
    } else {
      setInputValue("__/__/____")
      setDate(undefined)
    }
  }, [value])

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      const displayDate = format(selectedDate, "dd/MM/yyyy")
      const formattedDate = format(selectedDate, "yyyy-MM-dd")
      setInputValue(displayDate)
      if (onChange) {
        onChange(formattedDate)
      }
      setOpen(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent any change - we'll handle it in keyDown
    e.preventDefault()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    let cursorPosition = input.selectionStart || 0
    const key = e.key

    // Allow navigation keys
    if (['ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(key)) {
      return
    }

    e.preventDefault()

    // Handle backspace
    if (key === 'Backspace') {
      if (cursorPosition > 0) {
        // Skip over slashes when backspacing
        if (inputValue[cursorPosition - 1] === '/') {
          cursorPosition--
        }
        if (cursorPosition > 0) {
          const newValue = inputValue.substring(0, cursorPosition - 1) + '_' + inputValue.substring(cursorPosition)
          setInputValue(newValue)
          // Move cursor back, skip slashes
          let newPos = cursorPosition - 1
          if (newValue[newPos] === '/') newPos--
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(newPos, newPos)
            }
          }, 0)

          // Try to parse the date
          if (newValue.replace(/_/g, '').length >= 10) {
            const parsedDate = parse(newValue, "dd/MM/yyyy", new Date())
            if (isValid(parsedDate)) {
              setDate(parsedDate)
              if (onChange) {
                onChange(format(parsedDate, "yyyy-MM-dd"))
              }
            }
          } else {
            setDate(undefined)
            if (onChange) {
              onChange('')
            }
          }
        }
      }
      return
    }

    // Handle delete
    if (key === 'Delete') {
      if (cursorPosition < inputValue.length) {
        // Skip over slashes when deleting
        if (inputValue[cursorPosition] === '/') {
          cursorPosition++
        }
        if (cursorPosition < inputValue.length) {
          const newValue = inputValue.substring(0, cursorPosition) + '_' + inputValue.substring(cursorPosition + 1)
          setInputValue(newValue)
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
            }
          }, 0)
        }
      }
      return
    }

    // Handle number input
    if (key.match(/[0-9]/)) {
      // Skip over slashes automatically
      if (inputValue[cursorPosition] === '/') {
        cursorPosition++
      }

      if (cursorPosition < inputValue.length) {
        const newValue = inputValue.substring(0, cursorPosition) + key + inputValue.substring(cursorPosition + 1)
        setInputValue(newValue)

        // Move cursor forward, skip slashes
        let newPos = cursorPosition + 1
        if (newValue[newPos] === '/') newPos++

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newPos, newPos)
          }
        }, 0)

        // Try to parse the date when complete
        if (!newValue.includes('_')) {
          const parsedDate = parse(newValue, "dd/MM/yyyy", new Date())
          if (isValid(parsedDate)) {
            setDate(parsedDate)
            if (onChange) {
              onChange(format(parsedDate, "yyyy-MM-dd"))
            }
          }
        }
      }
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        className="flex-1 font-mono"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "px-3",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            defaultMonth={date}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
