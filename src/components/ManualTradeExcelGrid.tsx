import { useState, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus, Save, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ManualTradeEntryCreate, MasterData } from '@/types'
import { API_BASE_URL } from '@/constants'

interface ExcelGridProps {}

type CellPosition = {
  row: number
  col: number
}

const DEFAULT_ENTRY: Partial<ManualTradeEntryCreate> = {
  id: undefined,
  tradeDate: new Date().toISOString().split('T')[0],
  strategy: '',
  code: '',
  exchange: '',
  commodity: '',
  expiry: new Date().toISOString().split('T')[0],
  contractType: '',
  tradeType: '',
  strikePrice: 0,
  optionType: '',
  quantity: 1,
  clientCode: '',
  broker: '',
  teamName: '',
  status: '',
  remark: '',
  tag: '',
}

const COLUMNS = [
  { key: 'tradeDate', label: 'Trade Date', type: 'date', width: 120 },
  { key: 'strategy', label: 'Strategy', type: 'text', width: 120 },
  { key: 'code', label: 'Code', type: 'text', width: 100 },
  { key: 'exchange', label: 'Exchange', type: 'text', width: 100 },
  { key: 'commodity', label: 'Commodity', type: 'text', width: 110 },
  { key: 'expiry', label: 'Expiry', type: 'date', width: 120 },
  { key: 'contractType', label: 'Contract Type', type: 'text', width: 120 },
  { key: 'tradeType', label: 'Trade Type', type: 'text', width: 100 },
  { key: 'strikePrice', label: 'Strike Price', type: 'number', width: 110 },
  { key: 'optionType', label: 'Option Type', type: 'text', width: 110 },
  { key: 'quantity', label: 'Quantity', type: 'number', width: 80 },
  { key: 'clientCode', label: 'Client Code', type: 'text', width: 110 },
  { key: 'broker', label: 'Broker', type: 'text', width: 110 },
  { key: 'teamName', label: 'Team Name', type: 'text', width: 110 },
  { key: 'status', label: 'Status', type: 'text', width: 100 },
  { key: 'remark', label: 'Remark', type: 'text', width: 150 },
  { key: 'tag', label: 'Tag', type: 'text', width: 100 },
] as const

export function ManualTradeExcelGrid({}: ExcelGridProps) {
  const [entries, setEntries] = useState<Partial<ManualTradeEntryCreate>[]>([{ ...DEFAULT_ENTRY }])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedCell, setSelectedCell] = useState<CellPosition>({ row: 0, col: 0 })
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null)
  const [copiedCell, setCopiedCell] = useState<{ row: number; col: string; value: any } | null>(null)
  const [masters, setMasters] = useState<MasterData>({})
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false)
  
  const gridRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement }>({})

  // Helper function to check if a field should be a dropdown
  const isDropdownField = (fieldKey: string) => {
    const dropdownFieldKeys = [
      'strategy', 'code', 'exchange', 'commodity', 'contractType', 
      'tradeType', 'optionType', 'clientCode', 'broker', 'teamName'
    ]
    return dropdownFieldKeys.includes(fieldKey)
  }

  // Fetch master data from API
  const fetchMasters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/masters`)
      if (response.ok) {
        const data = await response.json()
        setMasters(data)
      } else {
        console.error('Failed to fetch masters, status:', response.status)
      }
    } catch (error) {
      console.error('Error fetching masters:', error)
    }
  }

  // No P&L calculation needed for basic trade entry form

  const addNewRow = () => {
    const newEntry = { ...DEFAULT_ENTRY, tradeDate: selectedDate }
    setEntries([...entries, newEntry])
    setIsReadOnlyMode(false)
  }

  const deleteRow = async (index: number) => {
    const entry = entries[index]
    
    // If entry has an ID, delete from database immediately
    if (entry.id) {
      try {
        setIsLoading(true)
        const response = await fetch(`http://localhost:8000/api/manual-trade-entries/${entry.id}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete entry')
        }
        
        // Reload entries from database to reflect the deletion
        await loadEntriesByDate(selectedDate)
      } catch (error) {
        console.error('Error deleting entry:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      // For new entries without ID, just remove from local state
      if (entries.length > 1) {
        const newEntries = entries.filter((_, i) => i !== index)
        setEntries(newEntries)
        // Adjust selected cell if needed
        if (selectedCell.row >= newEntries.length) {
          setSelectedCell({ ...selectedCell, row: newEntries.length - 1 })
        }
      }
    }
  }

  const updateEntry = (index: number, field: string, value: any) => {
    const newEntries = [...entries]
    const entry = { ...newEntries[index] }
    
    if (field === 'strikePrice') {
      (entry as any)[field] = value ? parseFloat(value) : 0
    } else {
      (entry as any)[field] = value
    }

    newEntries[index] = entry
    setEntries(newEntries)
  }

  const handleKeyDown = (e: KeyboardEvent, rowIndex: number, colIndex: number) => {
    const column = COLUMNS[colIndex]
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (rowIndex > 0) {
          const newRow = rowIndex - 1
          setSelectedCell({ row: newRow, col: colIndex })
          // Auto-show dropdown for dropdown fields if not in read-only mode
          if (!isReadOnlyMode && isDropdownField(column.key)) {
            setEditingCell({ row: newRow, col: colIndex })
          } else {
            setEditingCell(null)
          }
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (rowIndex < entries.length - 1) {
          const newRow = rowIndex + 1
          setSelectedCell({ row: newRow, col: colIndex })
          // Auto-show dropdown for dropdown fields if not in read-only mode
          if (!isReadOnlyMode && isDropdownField(column.key)) {
            setEditingCell({ row: newRow, col: colIndex })
          } else {
            setEditingCell(null)
          }
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (colIndex > 0) {
          const newCol = colIndex - 1
          setSelectedCell({ row: rowIndex, col: newCol })
          // Auto-show dropdown for dropdown fields if not in read-only mode
          const newFieldKey = COLUMNS[newCol].key
          if (!isReadOnlyMode && isDropdownField(newFieldKey)) {
            setEditingCell({ row: rowIndex, col: newCol })
          } else {
            setEditingCell(null)
          }
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (colIndex < COLUMNS.length - 1) {
          const newCol = colIndex + 1
          setSelectedCell({ row: rowIndex, col: newCol })
          // Auto-show dropdown for dropdown fields if not in read-only mode
          const newFieldKey = COLUMNS[newCol].key
          if (!isReadOnlyMode && isDropdownField(newFieldKey)) {
            setEditingCell({ row: rowIndex, col: newCol })
          } else {
            setEditingCell(null)
          }
        }
        break
      case 'Enter':
        e.preventDefault()
        if (editingCell) {
          setEditingCell(null)
          if (rowIndex < entries.length - 1) {
            setSelectedCell({ row: rowIndex + 1, col: colIndex })
          }
        } else {
          setEditingCell({ row: rowIndex, col: colIndex })
        }
        break
      case 'Escape':
        e.preventDefault()
        setEditingCell(null)
        break
      case 'Delete':
        e.preventDefault()
        updateEntry(rowIndex, column.key, '')
        break
      case 'Tab':
        e.preventDefault()
        let newRow = rowIndex
        let newCol = colIndex
        
        if (e.shiftKey) {
          // Previous cell
          if (colIndex > 0) {
            newCol = colIndex - 1
          } else if (rowIndex > 0) {
            newRow = rowIndex - 1
            newCol = COLUMNS.length - 1
          }
        } else {
          // Next cell
          if (colIndex < COLUMNS.length - 1) {
            newCol = colIndex + 1
          } else if (rowIndex < entries.length - 1) {
            newRow = rowIndex + 1
            newCol = 0
          }
        }
        
        setSelectedCell({ row: newRow, col: newCol })
        
        // Auto-show dropdown for dropdown fields if not in read-only mode
        const newFieldKey = COLUMNS[newCol].key
        if (!isReadOnlyMode && isDropdownField(newFieldKey)) {
          setEditingCell({ row: newRow, col: newCol })
        } else {
          setEditingCell(null)
        }
        break
      case 'c':
        if (e.ctrlKey) {
          e.preventDefault()
          const value = (entries[rowIndex] as any)[column.key]
          setCopiedCell({ row: rowIndex, col: column.key, value })
        }
        break
      case 'v':
        if (e.ctrlKey && copiedCell && !isReadOnlyMode) {
          e.preventDefault()
          updateEntry(rowIndex, column.key, copiedCell.value)
        }
        break
      default:
        if (!editingCell && e.key.length === 1 && !isReadOnlyMode) {
          setEditingCell({ row: rowIndex, col: colIndex })
        }
        break
    }
  }

  const renderCell = (entry: Partial<ManualTradeEntryCreate>, rowIndex: number, colIndex: number) => {
    const column = COLUMNS[colIndex]
    const value = (entry as any)[column.key]
    const isSelected = selectedCell.row === rowIndex && selectedCell.col === colIndex
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
    const cellKey = `${rowIndex}-${colIndex}`

    const cellClasses = `
      w-full h-10 flex items-center
      ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : isReadOnlyMode ? 'hover:bg-gray-100' : 'hover:bg-gray-50'}
      ${copiedCell?.row === rowIndex && copiedCell?.col === column.key ? 'bg-green-50' : ''}
      ${isReadOnlyMode ? 'cursor-default bg-gray-25' : 'cursor-cell'}
    `.trim()

    if (isEditing && !isReadOnlyMode) {
      // Check if this field should be a dropdown
      const dropdownFields = {
        strategy: masters.Strategy || [],
        code: masters.Code || [],
        exchange: masters.Exchange || [],
        commodity: masters.Commodity || [],
        contractType: masters['Contract Type'] || [],
        tradeType: masters['Trade Type'] || [],
        optionType: masters['Option Type'] || [],
        clientCode: masters['Client Code'] || [],
        broker: masters.Broker || [],
        teamName: masters['Team Name'] || [],
      }

      if (dropdownFields[column.key as keyof typeof dropdownFields]) {
        const options = dropdownFields[column.key as keyof typeof dropdownFields]
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => {
              updateEntry(rowIndex, column.key, newValue)
              setEditingCell(null)
            }}
          >
            <SelectTrigger className="w-full h-full border-0 outline-none bg-transparent text-sm">
              <SelectValue placeholder={`Select ${column.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options && options.length > 0 ? (
                options.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>
                  No options available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )
      }

      // Regular input for non-dropdown fields
      return (
        <input
          ref={(el) => { if (el) inputRefs.current[cellKey] = el }}
          type={column.type}
          value={value || ''}
          onChange={(e) => updateEntry(rowIndex, column.key, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
          className="w-full h-full px-3 text-sm border-0 outline-none bg-transparent"
          placeholder={column.type === 'number' ? '0' : ''}
          autoFocus
        />
      )
    }

    return (
      <div
        className={cellClasses}
        onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
        onDoubleClick={() => !isReadOnlyMode && setEditingCell({ row: rowIndex, col: colIndex })}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
        tabIndex={0}
      >
        <div className="px-3 text-sm truncate">
          {column.type === 'number' && value !== undefined && value !== null && value !== '' ? 
            parseFloat(value).toFixed(2) : 
            (value || '')
          }
        </div>
      </div>
    )
  }

  const saveIndividualEntry = async (rowIndex: number) => {
    setIsLoading(true)
    try {
      const entry = entries[rowIndex]
      
      // Validate required fields
      if (!entry.strategy || !entry.code || !entry.exchange) {
        console.warn('Strategy, Code, and Exchange are required fields')
        return
      }

      // Convert camelCase to snake_case for backend
      const backendEntry = {
        trade_date: entry.tradeDate,
        strategy: entry.strategy,
        code: entry.code,
        exchange: entry.exchange,
        commodity: entry.commodity,
        expiry: entry.expiry,
        contract_type: entry.contractType,
        trade_type: entry.tradeType,
        strike_price: entry.strikePrice,
        option_type: entry.optionType,
        quantity: entry.quantity,
        client_code: entry.clientCode,
        remark: entry.remark,
        tag: entry.tag,
      }

      const response = await fetch('http://localhost:8000/api/manual-trade-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendEntry),
      })

      if (!response.ok) {
        throw new Error('Failed to save entry')
      }

      await response.json()
      
      // Reload entries to get the latest data
      loadEntriesByDate(selectedDate)
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveAllEntries = async () => {
    setIsLoading(true)
    try {
      // Save valid entries
      const validEntries = entries.filter(entry => 
        entry.strategy && entry.code && entry.exchange
      )

      if (validEntries.length > 0) {
        // Convert camelCase to snake_case for backend
        const backendEntries = validEntries.map(entry => ({
          trade_date: entry.tradeDate,
          strategy: entry.strategy,
          code: entry.code,
          exchange: entry.exchange,
          commodity: entry.commodity,
          expiry: entry.expiry,
          contract_type: entry.contractType,
          trade_type: entry.tradeType,
          strike_price: entry.strikePrice,
          option_type: entry.optionType,
          quantity: entry.quantity,
          entry_price: entry.entryPrice,
          exit_price: entry.exitPrice,
          pnl: entry.pnl,
          client_code: entry.clientCode,
          broker: entry.broker,
          team_name: entry.teamName,
          status: entry.status,
          remark: entry.remark,
          tag: entry.tag,
        }))

        const response = await fetch('http://localhost:8000/api/manual-trade-entries/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backendEntries),
        })

        if (!response.ok) {
          throw new Error('Failed to save entries')
        }

        await response.json()
      }
      
      // Reset the grid with a fresh entry
      setEntries([{ ...DEFAULT_ENTRY, tradeDate: selectedDate }])
      setSelectedCell({ row: 0, col: 0 })
    } catch (error) {
      console.error('Error saving entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEntriesByDate = async (date?: string) => {
    setIsLoading(true)
    try {
      const targetDate = date || selectedDate
      const response = await fetch(`http://localhost:8000/api/manual-trade-entries/date/${targetDate}`)
      
      if (!response.ok) {
        throw new Error('Failed to load entries')
      }

      const data = await response.json()
      
      if (data.length > 0) {
        // Backend already returns camelCase format, just use the data directly
        const convertedEntries = data.map((entry: any) => ({
          id: entry.id,
          tradeDate: entry.tradeDate,
          strategy: entry.strategy,
          code: entry.code,
          exchange: entry.exchange,
          commodity: entry.commodity,
          expiry: entry.expiry,
          contractType: entry.contractType,
          tradeType: entry.tradeType,
          strikePrice: entry.strikePrice,
          optionType: entry.optionType,
          quantity: entry.quantity,
          clientCode: entry.clientCode,
          broker: entry.broker,
          teamName: entry.teamName,
          status: entry.status,
          remark: entry.remark,
          tag: entry.tag,
        }))
        
        setEntries(convertedEntries)
        setIsReadOnlyMode(true)
      } else {
        setEntries([{ ...DEFAULT_ENTRY, tradeDate: selectedDate }])
        setIsReadOnlyMode(false)
      }
    } catch (error) {
      console.error('Error loading entries:', error)
      setEntries([{ ...DEFAULT_ENTRY, tradeDate: selectedDate }])
    } finally {
      setIsLoading(false)
    }
  }

  const loadSelectedDateEntries = () => {
    loadEntriesByDate(selectedDate)
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    // No auto-loading - entries load only when Load button is clicked
  }



  // Fetch masters on component mount and load initial data
  useEffect(() => {
    fetchMasters()
    // Start with today's entries, or empty grid if none
    loadEntriesByDate(selectedDate)
  }, [])



  // Focus management
  useEffect(() => {
    const cellKey = `${selectedCell.row}-${selectedCell.col}`
    const input = inputRefs.current[cellKey]
    if (input && editingCell) {
      input.focus()
    }
  }, [editingCell, selectedCell])

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Manual Trade Entry - Excel Spreadsheet</h2>
          {isReadOnlyMode && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
              📖 Viewing Mode - Records are read-only
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <Button onClick={addNewRow} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {isReadOnlyMode ? 'New Entry' : 'Add Row'}
          </Button>
          <Button 
            onClick={saveAllEntries} 
            size="sm" 
            className="flex items-center gap-2"
            disabled={isLoading || isReadOnlyMode}
          >
            <Save className="h-4 w-4" />
            Save All
          </Button>
          <Button 
            onClick={loadSelectedDateEntries} 
            size="sm" 
            variant="outline"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Load Trades
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <strong>Keyboard shortcuts:</strong> Arrow keys to navigate • Enter to edit • Tab/Shift+Tab to move • Escape to cancel • 
        Ctrl+C to copy • Ctrl+V to paste • Delete to clear • Double-click to edit
      </div>

      {/* Spreadsheet Grid */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={gridRef}
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: '750px', minWidth: '100%' }}
          >
            <Table className="w-auto min-w-max">
              <TableHeader className="sticky top-0 z-10 bg-gray-100">
                <TableRow>
                  <TableHead className="w-16 text-center font-semibold bg-gray-200">
                    #
                  </TableHead>
                  {COLUMNS.map((column) => (
                    <TableHead 
                      key={column.key}
                      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                      className="text-center font-semibold bg-gray-100 px-2 whitespace-nowrap"
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-24 min-w-[96px] text-center font-semibold bg-gray-200 whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-blue-50">
                    {/* Row Number */}
                    <TableCell className="w-16 text-center text-sm bg-gray-50 font-medium">
                      {rowIndex + 1}
                    </TableCell>
                    
                    {/* Data Cells */}
                    {COLUMNS.map((_, colIndex) => (
                      <TableCell 
                        key={colIndex}
                        className="p-0 relative whitespace-nowrap"
                        style={{ width: COLUMNS[colIndex].width, minWidth: COLUMNS[colIndex].width, maxWidth: COLUMNS[colIndex].width }}
                      >
                        {renderCell(entry, rowIndex, colIndex)}
                      </TableCell>
                    ))}
                    
                    {/* Actions */}
                    <TableCell className="w-24 min-w-[96px] text-center bg-gray-50 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveIndividualEntry(rowIndex)}
                          disabled={isLoading || isReadOnlyMode}
                          className="h-7 w-7 p-0 hover:bg-green-100"
                          title="Save this entry"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRow(rowIndex)}
                          disabled={isLoading}
                          className="h-7 w-7 p-0 hover:bg-red-100"
                          title="Delete this entry"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManualTradeExcelGrid