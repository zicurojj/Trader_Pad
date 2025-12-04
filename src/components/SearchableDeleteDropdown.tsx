import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronsUpDown } from "lucide-react"

interface SearchableDeleteDropdownProps {
  label: string
  items: string[]
  onSelect: (item: string) => void
  placeholder?: string
}

export function SearchableDeleteDropdown({
  label,
  items,
  onSelect,
  placeholder = "Search..."
}: SearchableDeleteDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleSelect = (item: string) => {
    onSelect(item)
    setOpen(false)
    setQuery("")
  }

  const filteredItems = items
    .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-56 justify-between"
        >
          {label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2">
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                onClick={() => handleSelect(item)}
              >
                <span>{item}</span>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
