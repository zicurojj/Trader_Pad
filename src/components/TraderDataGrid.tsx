import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Filter, Download } from "lucide-react"
import type { TraderEntry, MasterData } from "@/types"

type TraderDataGridProps = {
  date: string
  entries: TraderEntry[]
  masters: MasterData
  onUpdateEntry: (id: number, updatedEntry: TraderEntry) => void
  onDeleteEntry: (id: number) => void
}

// Filter Popover Component
function FilterPopover({
  field,
  label,
  values,
  activeFilters,
  onToggleFilter,
  onClearFilter,
}: {
  field: string
  label: string
  values: string[]
  activeFilters: string[]
  onToggleFilter: (value: string) => void
  onClearFilter: () => void
}) {
  const hasActiveFilters = activeFilters.length > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${hasActiveFilters ? 'text-blue-600' : ''}`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter {label}</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilter}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {values.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field}-${value}`}
                  checked={activeFilters.includes(value)}
                  onCheckedChange={() => onToggleFilter(value)}
                />
                <label
                  htmlFor={`${field}-${value}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {value}
                </label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function TraderDataGrid({ date, entries, masters, onUpdateEntry, onDeleteEntry }: TraderDataGridProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editedEntry, setEditedEntry] = useState<TraderEntry | null>(null)
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({})

  // Get unique values for each column
  const getUniqueValues = (field: keyof TraderEntry) => {
    return Array.from(new Set(entries.map(entry => entry[field]))).sort()
  }

  // Apply filters to entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      return Object.keys(filters).every(field => {
        const filterValues = filters[field]
        if (!filterValues || filterValues.length === 0) return true
        return filterValues.includes(entry[field as keyof TraderEntry] as string)
      })
    })
  }, [entries, filters])

  // Toggle filter value
  const toggleFilter = (field: string, value: string) => {
    setFilters(prev => {
      const currentFilters = prev[field] || []
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter(v => v !== value)
        : [...currentFilters, value]

      if (newFilters.length === 0) {
        const { [field]: _, ...rest } = prev
        return rest
      }

      return { ...prev, [field]: newFilters }
    })
  }

  // Clear filters for a field
  const clearFilter = (field: string) => {
    setFilters(prev => {
      const { [field]: _, ...rest } = prev
      return rest
    })
  }

  const handleEdit = (entry: TraderEntry) => {
    setEditingId(entry.id)
    setEditedEntry({ ...entry })
  }

  const handleSave = () => {
    if (editedEntry && editingId) {
      onUpdateEntry(editingId, editedEntry)
      setEditingId(null)
      setEditedEntry(null)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditedEntry(null)
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      onDeleteEntry(id)
    }
  }

  const updateField = (field: keyof TraderEntry, value: string) => {
    if (editedEntry) {
      setEditedEntry({ ...editedEntry, [field]: value })
    }
  }

  // Format date from YYYY-MM-DD to DD/MM/YYYY for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  // Download entries as CSV
  const handleDownload = () => {
    // Define CSV headers
    const headers = [
      "Strategy",
      "Code",
      "Exchange",
      "Commodity",
      "Expiry",
      "Contract Type",
      "Trade Type",
      "Strike Price",
      "Option Type",
      "Client Code",
      "Broker",
      "Team Name",
      "Status",
      "Remark",
      "Tag"
    ]

    // Convert entries to CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...filteredEntries.map(entry => [
        entry.strategy,
        entry.code,
        entry.exchange,
        entry.commodity,
        entry.expiry,
        entry.contractType,
        entry.tradeType,
        entry.strikePrice,
        entry.optionType,
        entry.clientCode,
        entry.broker,
        entry.teamName,
        entry.status,
        entry.remark,
        entry.tag
      ].map(field => `"${field}"`).join(",")) // Escape fields with quotes
    ]

    // Create CSV content
    const csvContent = csvRows.join("\n")

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `trade-entries-${date}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="mt-8">
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Entries for {formatDate(date)}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={filteredEntries.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-l border-r overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 hover:bg-slate-100 border-b-2">
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Strategy</span>
                    <FilterPopover
                      field="strategy"
                      label="Strategy"
                      values={getUniqueValues("strategy")}
                      activeFilters={filters.strategy || []}
                      onToggleFilter={(value) => toggleFilter("strategy", value)}
                      onClearFilter={() => clearFilter("strategy")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Code</span>
                    <FilterPopover
                      field="code"
                      label="Code"
                      values={getUniqueValues("code")}
                      activeFilters={filters.code || []}
                      onToggleFilter={(value) => toggleFilter("code", value)}
                      onClearFilter={() => clearFilter("code")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Exchange</span>
                    <FilterPopover
                      field="exchange"
                      label="Exchange"
                      values={getUniqueValues("exchange")}
                      activeFilters={filters.exchange || []}
                      onToggleFilter={(value) => toggleFilter("exchange", value)}
                      onClearFilter={() => clearFilter("exchange")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Commodity</span>
                    <FilterPopover
                      field="commodity"
                      label="Commodity"
                      values={getUniqueValues("commodity")}
                      activeFilters={filters.commodity || []}
                      onToggleFilter={(value) => toggleFilter("commodity", value)}
                      onClearFilter={() => clearFilter("commodity")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs whitespace-nowrap">Expiry</TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Contract Type</span>
                    <FilterPopover
                      field="contractType"
                      label="Contract Type"
                      values={getUniqueValues("contractType")}
                      activeFilters={filters.contractType || []}
                      onToggleFilter={(value) => toggleFilter("contractType", value)}
                      onClearFilter={() => clearFilter("contractType")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Trade Type</span>
                    <FilterPopover
                      field="tradeType"
                      label="Trade Type"
                      values={getUniqueValues("tradeType")}
                      activeFilters={filters.tradeType || []}
                      onToggleFilter={(value) => toggleFilter("tradeType", value)}
                      onClearFilter={() => clearFilter("tradeType")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs whitespace-nowrap">Strike Price</TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Option Type</span>
                    <FilterPopover
                      field="optionType"
                      label="Option Type"
                      values={getUniqueValues("optionType")}
                      activeFilters={filters.optionType || []}
                      onToggleFilter={(value) => toggleFilter("optionType", value)}
                      onClearFilter={() => clearFilter("optionType")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs whitespace-nowrap">Client Code</TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Broker</span>
                    <FilterPopover
                      field="broker"
                      label="Broker"
                      values={getUniqueValues("broker")}
                      activeFilters={filters.broker || []}
                      onToggleFilter={(value) => toggleFilter("broker", value)}
                      onClearFilter={() => clearFilter("broker")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Team Name</span>
                    <FilterPopover
                      field="teamName"
                      label="Team Name"
                      values={getUniqueValues("teamName")}
                      activeFilters={filters.teamName || []}
                      onToggleFilter={(value) => toggleFilter("teamName", value)}
                      onClearFilter={() => clearFilter("teamName")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <FilterPopover
                      field="status"
                      label="Status"
                      values={getUniqueValues("status")}
                      activeFilters={filters.status || []}
                      onToggleFilter={(value) => toggleFilter("status", value)}
                      onClearFilter={() => clearFilter("status")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs whitespace-nowrap">Remark</TableHead>
                <TableHead className="font-bold text-slate-900 border-r h-10 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Tag</span>
                    <FilterPopover
                      field="tag"
                      label="Tag"
                      values={getUniqueValues("tag")}
                      activeFilters={filters.tag || []}
                      onToggleFilter={(value) => toggleFilter("tag", value)}
                      onClearFilter={() => clearFilter("tag")}
                    />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-900 h-10 px-2 text-xs whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={16} className="text-center text-muted-foreground h-24 border-0">
                    {entries.length === 0 ? "No entries found for this date" : "No entries match the current filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry, index) => {
                  const isEditing = editingId === entry.id
                  const displayEntry = isEditing ? editedEntry! : entry

                  return (
                    <TableRow
                      key={entry.id}
                      className={`hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                    >
                      {/* Strategy */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.strategy}
                            onValueChange={(value) => updateField('strategy', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.Strategy?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.strategy
                        )}
                      </TableCell>

                      {/* Code */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.code}
                            onValueChange={(value) => updateField('code', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.Code?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.code
                        )}
                      </TableCell>

                      {/* Exchange */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.exchange}
                            onValueChange={(value) => updateField('exchange', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.Exchange?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.exchange
                        )}
                      </TableCell>

                      {/* Commodity */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.commodity}
                            onValueChange={(value) => updateField('commodity', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.Commodity?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.commodity
                        )}
                      </TableCell>

                      {/* Expiry */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={displayEntry.expiry}
                            onChange={(e) => updateField('expiry', e.target.value)}
                            className="h-8 text-xs"
                          />
                        ) : (
                          displayEntry.expiry
                        )}
                      </TableCell>

                      {/* Contract Type */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.contractType}
                            onValueChange={(value) => updateField('contractType', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters["Contract Type"]?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.contractType
                        )}
                      </TableCell>

                      {/* Trade Type */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.tradeType}
                            onValueChange={(value) => updateField('tradeType', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters["Trade Type"]?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.tradeType
                        )}
                      </TableCell>

                      {/* Strike Price */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={displayEntry.strikePrice}
                            onChange={(e) => updateField('strikePrice', e.target.value)}
                            className="h-8 text-xs"
                          />
                        ) : (
                          displayEntry.strikePrice
                        )}
                      </TableCell>

                      {/* Option Type */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.optionType}
                            onValueChange={(value) => updateField('optionType', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters["Option Type"]?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.optionType
                        )}
                      </TableCell>

                      {/* Client Code */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Input
                            value={displayEntry.clientCode}
                            onChange={(e) => updateField('clientCode', e.target.value)}
                            className="h-8 text-xs"
                          />
                        ) : (
                          displayEntry.clientCode
                        )}
                      </TableCell>

                      {/* Broker */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.broker}
                            onValueChange={(value) => updateField('broker', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.Broker?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.broker
                        )}
                      </TableCell>

                      {/* Team Name */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Select
                            value={displayEntry.teamName}
                            onValueChange={(value) => updateField('teamName', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {masters["Team Name"]?.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          displayEntry.teamName
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Input
                            value={displayEntry.status}
                            onChange={(e) => updateField('status', e.target.value)}
                            className="h-8 text-xs"
                          />
                        ) : (
                          displayEntry.status
                        )}
                      </TableCell>

                      {/* Remark */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Input
                            value={displayEntry.remark}
                            onChange={(e) => updateField('remark', e.target.value)}
                            className="h-8 text-xs"
                          />
                        ) : (
                          displayEntry.remark
                        )}
                      </TableCell>

                      {/* Tag */}
                      <TableCell className="border-r border-slate-200 px-3 py-2 text-sm">
                        {isEditing ? (
                          <Input
                            value={displayEntry.tag}
                            onChange={(e) => updateField('tag', e.target.value)}
                            className="h-8 text-xs"
                          />
                        ) : (
                          displayEntry.tag
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-3 py-2">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={handleSave}
                                className="h-7 px-2 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                className="h-7 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(entry)}
                                className="h-7 px-2 text-xs"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(entry.id)}
                                className="h-7 px-2 text-xs"
                              >
                                X
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
