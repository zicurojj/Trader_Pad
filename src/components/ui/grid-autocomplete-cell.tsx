import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { X } from "lucide-react"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"

interface GridAutocompleteOption {
  id: number
  name: string
}

interface GridAutocompleteCellProps {
  placeholder: string
  value: string
  options: GridAutocompleteOption[]
  disabled?: boolean
  showClear?: boolean
  onSelect: (item: GridAutocompleteOption) => void
  onClear: () => void
}

export function GridAutocompleteCell({
  placeholder,
  value,
  options,
  disabled = false,
  showClear = false,
  onSelect,
  onClear,
}: GridAutocompleteCellProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = options.filter((item) =>
    item.name.toLowerCase().includes((search || "").toLowerCase())
  )

  // Reset highlight when filtered options change
  useEffect(() => {
    setHighlightIndex(0)
  }, [filteredOptions.length])

  const handleSelect = (item: GridAutocompleteOption) => {
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
          // Focus next focusable element after selection
          setTimeout(() => {
            const current = inputRef.current
            if (!current) return
            const table = current.closest('table')
            if (!table) return
            const focusables = Array.from(table.querySelectorAll<HTMLElement>(
              'input:not([disabled]), select:not([disabled]), button:not([disabled]):not([type="button"])'
            )).filter(el => el.offsetParent !== null)
            const currentIndex = focusables.indexOf(current)
            if (currentIndex !== -1 && currentIndex < focusables.length - 1) {
              focusables[currentIndex + 1]?.focus()
            }
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

  // Exact same structure as working AutocompleteField
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full h-10">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={search !== "" ? search : value}
            onChange={(e) => {
              const val = e.target.value
              setSearch(val)
              setOpen(true)
              setHighlightIndex(0)
              if (!val && value) {
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
            className="w-full h-full px-3 pr-8 text-sm border-0 outline-none bg-transparent"
          />
          {showClear && value && (
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
              No options found.
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
  )
}
