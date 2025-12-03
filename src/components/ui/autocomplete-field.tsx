import * as React from "react"
import { useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface AutocompleteOption {
  id: number
  name: string
}

interface AutocompleteFieldProps {
  label: string
  placeholder: string
  disabledPlaceholder?: string
  value: string
  options: AutocompleteOption[]
  disabled?: boolean
  onSelect: (item: AutocompleteOption) => void
  onClear: () => void
  onNextField?: () => void
  focusNextField: (input: HTMLInputElement) => void
}

export function AutocompleteField({
  label,
  placeholder,
  disabledPlaceholder,
  value,
  options,
  disabled = false,
  onSelect,
  onClear,
  onNextField,
  focusNextField,
}: AutocompleteFieldProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)

  const filteredOptions = options.filter((item) =>
    item.name.toLowerCase().includes((search || "").toLowerCase())
  )

  const handleSelect = (item: AutocompleteOption) => {
    onSelect(item)
    setSearch("")
    setOpen(false)
    setHighlightIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case "Enter":
      case "Tab":
        if (filteredOptions[highlightIndex]) {
          e.preventDefault()
          handleSelect(filteredOptions[highlightIndex])
          setTimeout(() => {
            focusNextField(e.currentTarget)
            onNextField?.()
          }, 50)
        }
        break
      case "Escape":
        setOpen(false)
        setHighlightIndex(0)
        break
    }
  }

  const handleClear = () => {
    onClear()
    setSearch("")
  }

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <FormControl>
              <Input
                placeholder={disabled ? disabledPlaceholder : placeholder}
                value={search !== "" ? search : value}
                onChange={(e) => {
                  const val = e.target.value
                  setSearch(val)
                  setOpen(true)
                  setHighlightIndex(0)
                  if (!val) {
                    onClear()
                  }
                }}
                onFocus={() => !disabled && setOpen(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setOpen(false)
                    setHighlightIndex(0)
                  }, 150)
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="pr-8"
              />
            </FormControl>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-sm text-muted-foreground">
                No {label.toLowerCase()} found.
              </div>
            ) : (
              filteredOptions.map((item, index) => (
                <div
                  key={item.id}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    index === highlightIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => handleSelect(item)}
                >
                  {item.name}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )
}
