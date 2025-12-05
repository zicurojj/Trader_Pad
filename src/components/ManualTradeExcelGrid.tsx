import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Save, Trash2, Download, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ManualTradeEntryCreate, MasterData } from '@/types'
import { API_BASE_URL } from '@/constants'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const DEFAULT_ENTRY: Partial<ManualTradeEntryCreate> = {
  id: undefined,
  tradeDate: new Date().toISOString().split('T')[0],
  strategy: '',
  code: '',
  exchange: '',
  commodity: '',
  expiry: new Date().toISOString().split('T')[0],
  contractType: '',
  strikePrice: 0,
  optionType: '',
  buyQty: 0,
  buyAvg: 0,
  sellQty: 0,
  sellAvg: 0,
  clientCode: '',
  broker: '',
  teamName: '',
  status: '',
  remark: '',
  tag: '',
}

// Custom Autocomplete Cell Editor for AG Grid
class AutocompleteCellEditor {
  private eGui!: HTMLDivElement
  private eInput!: HTMLInputElement
  private eDropdown!: HTMLDivElement
  private value: string = ''
  private values: string[] = []
  private filteredValues: string[] = []
  private highlightedIndex: number = 0
  private params: any

  init(params: any) {
    this.params = params
    this.value = params.value || ''
    this.values = params.values || []
    this.filteredValues = [...this.values]
    this.highlightedIndex = 0

    this.eGui = document.createElement('div')
    this.eGui.style.cssText = 'position: relative; width: 100%; height: 100%;'

    this.eInput = document.createElement('input')
    this.eInput.type = 'text'
    this.eInput.value = this.value
    this.eInput.style.cssText = 'width: 100%; height: 100%; border: none; outline: none; padding: 0 8px; font-size: 14px; box-sizing: border-box;'
    this.eGui.appendChild(this.eInput)

    this.eDropdown = document.createElement('div')
    this.eDropdown.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background-color: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000;'
    this.eGui.appendChild(this.eDropdown)

    // Prevent dropdown clicks from closing the editor
    this.eDropdown.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
    })

    this.renderDropdown()

    this.eInput.addEventListener('input', () => {
      this.filterValues()
    })

    this.eInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredValues.length - 1)
        this.renderDropdown()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0)
        this.renderDropdown()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (this.filteredValues[this.highlightedIndex] !== undefined) {
          this.value = this.filteredValues[this.highlightedIndex]
        } else {
          this.value = this.eInput.value.trim()
        }
        this.params.stopEditing()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        // Set value
        if (this.filteredValues[this.highlightedIndex] !== undefined) {
          this.value = this.filteredValues[this.highlightedIndex]
        } else {
          this.value = this.eInput.value.trim()
        }
        // Stop editing and navigate to next cell
        const shiftKey = e.shiftKey
        this.params.stopEditing()
        // Use setTimeout to let AG Grid finish closing the editor before navigating
        setTimeout(() => {
          if (shiftKey) {
            this.params.api.tabToPreviousCell()
          } else {
            this.params.api.tabToNextCell()
          }
        }, 0)
      } else if (e.key === 'Escape') {
        this.params.stopEditing(true)
      }
    })
  }

  filterValues() {
    const inputVal = this.eInput.value.toLowerCase()
    this.filteredValues = this.values.filter(v => v.toLowerCase().includes(inputVal))
    this.highlightedIndex = 0
    this.renderDropdown()
  }

  renderDropdown() {
    this.eDropdown.innerHTML = ''

    this.filteredValues.forEach((v, index) => {
      const item = document.createElement('div')
      item.textContent = v || '(empty)'
      item.style.cssText = `padding: 8px 12px; cursor: pointer; background-color: ${index === this.highlightedIndex ? '#e6f7ff' : 'white'}; border-bottom: ${index < this.filteredValues.length - 1 ? '1px solid #f0f0f0' : 'none'};`
      // Use mousedown instead of click to select before focus is lost
      item.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.value = v
        this.params.stopEditing()
      })
      item.addEventListener('mouseenter', () => {
        this.highlightedIndex = index
        this.renderDropdown()
      })
      this.eDropdown.appendChild(item)
    })
  }

  getGui() {
    return this.eGui
  }

  afterGuiAttached() {
    this.eInput.focus()
    this.eInput.select()
  }

  getValue() {
    return this.value
  }

  isPopup() {
    return true
  }
}

// Action buttons cell renderer - uses context for reactive data
function ActionCellRenderer(props: ICellRendererParams) {
  const rowIndex = props.node.rowIndex ?? 0
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const context = props.context as {
    onSave: (rowIndex: number) => void
    onDelete: (rowIndex: number) => void
    isReadOnly: boolean
    isLoading: boolean
  }

  // Focus the save button when the cell receives focus
  useEffect(() => {
    const cell = props.eGridCell
    if (!cell) return

    const handleCellFocus = () => {
      // Small delay to ensure the cell is fully focused
      setTimeout(() => {
        saveButtonRef.current?.focus()
      }, 0)
    }

    cell.addEventListener('focus', handleCellFocus)
    return () => cell.removeEventListener('focus', handleCellFocus)
  }, [props.eGridCell])

  return (
    <div className="flex items-center justify-center gap-1 h-full">
      <button
        ref={saveButtonRef}
        onClick={() => context.onSave(rowIndex)}
        disabled={context.isLoading || context.isReadOnly}
        className="h-7 w-7 p-0 hover:bg-green-100 rounded flex items-center justify-center disabled:opacity-50 focus:ring-2 focus:ring-green-500 focus:outline-none"
        title="Save this entry"
      >
        <Save className="h-3 w-3" />
      </button>
      <button
        onClick={() => context.onDelete(rowIndex)}
        disabled={context.isLoading}
        className="h-7 w-7 p-0 hover:bg-red-100 rounded flex items-center justify-center disabled:opacity-50 focus:ring-2 focus:ring-red-500 focus:outline-none"
        title="Delete this entry"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

export function ManualTradeExcelGrid() {
  const { token } = useAuth()
  const todayDate = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState<string>(todayDate)
  const [entries, setEntries] = useState<Partial<ManualTradeEntryCreate>[]>([{ ...DEFAULT_ENTRY, tradeDate: todayDate }])
  const [isLoading, setIsLoading] = useState(false)
  const [masters, setMasters] = useState<MasterData>({})
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false)
  const gridRef = useRef<AgGridReact>(null)

  // Track which entries have been modified
  const [modifiedEntryIds, setModifiedEntryIds] = useState<Set<number>>(new Set())

  // Cascading dropdown state
  const [filteredCodes, setFilteredCodes] = useState<{ [rowIndex: number]: any[] }>({})
  const [filteredExchanges, setFilteredExchanges] = useState<{ [rowIndex: number]: any[] }>({})
  const [filteredCommodities, setFilteredCommodities] = useState<{ [rowIndex: number]: any[] }>({})
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch master data from API
  const fetchMasters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/masters`)
      if (response.ok) {
        const data = await response.json()
        setMasters(data)
      }
    } catch (error) {
      console.error('Error fetching masters:', error)
    }
  }

  // Cascading dropdown API functions
  const fetchCodesByStrategy = async (strategyId: number, rowIndex: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cascading/codes/${strategyId}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredCodes(prev => ({ ...prev, [rowIndex]: data }))
      }
    } catch (error) {
      console.error('Error fetching codes:', error)
    }
  }

  const fetchExchangesByCode = async (codeId: number, rowIndex: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cascading/exchanges/${codeId}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredExchanges(prev => ({ ...prev, [rowIndex]: data }))
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error)
    }
  }

  const fetchCommoditiesByExchange = async (exchangeId: number, rowIndex: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cascading/commodities/${exchangeId}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredCommodities(prev => ({ ...prev, [rowIndex]: data }))
      }
    } catch (error) {
      console.error('Error fetching commodities:', error)
    }
  }

  const addNewRow = () => {
    const newEntry = { ...DEFAULT_ENTRY, tradeDate: selectedDate }
    setEntries([newEntry, ...entries])
    setIsReadOnlyMode(false)
  }

  // Download trades for selected date
  const downloadTradesForDate = async () => {
    if (!selectedDate) {
      alert('Please select a date first')
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch(`${API_BASE_URL}/trade-entries/date/${selectedDate}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        alert(`Failed to fetch entries: ${errorData.detail || response.statusText}`)
        throw new Error(errorData.detail || 'Failed to fetch entries')
      }

      const data = await response.json()

      if (data.length === 0) {
        alert(`No trades found for ${selectedDate}. Make sure you have trades saved for this date.`)
        return
      }

      // Create CSV content
      const headers = [
        "id",
        "username",
        "trade_date",
        "strategy",
        "code",
        "exchange",
        "commodity",
        "expiry",
        "contract_type",
        "strike_price",
        "option_type",
        "buy_qty",
        "buy_avg",
        "sell_qty",
        "sell_avg",
        "client_code",
        "broker",
        "team_name",
        "status",
        "remark",
        "tag"
      ]

      const rows = data.map((entry: any) => [
        entry.id,
        entry.username,
        entry.tradeDate || entry.trade_date,
        entry.strategy,
        entry.code,
        entry.exchange,
        entry.commodity,
        entry.expiry,
        entry.contractType || entry.contract_type,
        entry.strikePrice || entry.strike_price,
        entry.optionType || entry.option_type,
        entry.buyQty || entry.buy_qty || 0,
        entry.buyAvg || entry.buy_avg || 0,
        entry.sellQty || entry.sell_qty || 0,
        entry.sellAvg || entry.sell_avg || 0,
        entry.clientCode || entry.client_code,
        entry.broker,
        entry.teamName || entry.team_name,
        entry.status,
        entry.remark,
        entry.tag
      ])

      const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `trades_${selectedDate}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert(`Successfully downloaded ${data.length} trade(s) for ${selectedDate}`)
    } catch (error) {
      console.error('Error downloading trades:', error)
      alert(`Error downloading trades: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Download sample CSV format
  const downloadSampleCSV = () => {
    const headers = [
      "trade_date",
      "strategy",
      "code",
      "exchange",
      "commodity",
      "expiry",
      "contract_type",
      "strike_price",
      "option_type",
      "buy_qty",
      "buy_avg",
      "sell_qty",
      "sell_avg",
      "client_code",
      "broker",
      "team_name",
      "status",
      "remark",
      "tag"
    ]

    const csvContent = headers.join(",")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", "example-trade-entry-format.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle CSV upload
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/trade-entries/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully uploaded ${result.count} trade entries!`)
        await loadEntriesByDate(selectedDate)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Error uploading CSV file. Please try again.')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Define loadEntriesByDate FIRST so it can be used by other callbacks
  const loadEntriesByDate = useCallback(async (date?: string) => {
    setIsLoading(true)
    try {
      const targetDate = date || selectedDate
      const response = await fetch(`${API_BASE_URL}/trade-entries/date/${targetDate}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load entries')
      }

      const data = await response.json()

      if (data.length > 0) {
        const convertedEntries = data.map((entry: any) => ({
          id: entry.id,
          tradeDate: entry.tradeDate || entry.trade_date,
          strategy: entry.strategy,
          code: entry.code,
          exchange: entry.exchange,
          commodity: entry.commodity,
          expiry: entry.expiry,
          contractType: entry.contractType || entry.contract_type,
          strikePrice: entry.strikePrice || entry.strike_price,
          optionType: entry.optionType || entry.option_type,
          buyQty: entry.buyQty || entry.buy_qty,
          buyAvg: entry.buyAvg || entry.buy_avg,
          sellQty: entry.sellQty || entry.sell_qty,
          sellAvg: entry.sellAvg || entry.sell_avg,
          clientCode: entry.clientCode || entry.client_code,
          broker: entry.broker,
          teamName: entry.teamName || entry.team_name,
          status: entry.status,
          remark: entry.remark,
          tag: entry.tag,
        }))

        setEntries(convertedEntries)
        setIsReadOnlyMode(false) // Allow editing loaded entries
        setModifiedEntryIds(new Set()) // Clear modified entries when loading fresh data
      } else {
        setEntries([{ ...DEFAULT_ENTRY, tradeDate: selectedDate }])
        setIsReadOnlyMode(false)
        setModifiedEntryIds(new Set())
      }
    } catch (error) {
      console.error('Error loading entries:', error)
      setEntries([{ ...DEFAULT_ENTRY, tradeDate: selectedDate }])
      setModifiedEntryIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  const deleteRow = useCallback(async (index: number) => {
    const entry = entries[index]

    if (!entry) {
      console.error('Entry not found at index:', index)
      return
    }

    if (entry.id) {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_BASE_URL}/trade-entries/${entry.id}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        })

        if (!response.ok) {
          throw new Error('Failed to delete entry')
        }

        await loadEntriesByDate(selectedDate)
      } catch (error) {
        console.error('Error deleting entry:', error)
        alert('Error deleting entry. Please try again.')
      } finally {
        setIsLoading(false)
      }
    } else {
      if (entries.length > 1) {
        const newEntries = entries.filter((_, i) => i !== index)
        setEntries(newEntries)
      }
    }
  }, [entries, selectedDate, token, loadEntriesByDate])

  // Validate entry and return error messages
  const validateEntry = (entry: ManualTradeEntryCreate): string[] => {
    const errors: string[] = []

    if (!entry.tradeDate) errors.push('Trade Date is required')
    if (!entry.strategy) errors.push('Strategy is required')
    if (!entry.code) errors.push('Code is required')
    if (!entry.exchange) errors.push('Exchange is required')
    if (!entry.commodity) errors.push('Commodity is required')
    if (!entry.expiry) errors.push('Expiry is required')
    if (!entry.contractType) errors.push('Contract Type is required')
    if (!entry.broker) errors.push('Broker is required')
    if (!entry.teamName) errors.push('Team Name is required')
    if (!entry.status) errors.push('Status is required')

    // At least buy or sell must be provided
    const hasBuy = entry.buyQty !== null && entry.buyQty !== undefined && entry.buyQty !== 0
    const hasSell = entry.sellQty !== null && entry.sellQty !== undefined && entry.sellQty !== 0
    if (!hasBuy && !hasSell) {
      errors.push('At least Buy Qty or Sell Qty must be provided')
    }

    return errors
  }

  const saveIndividualEntry = useCallback(async (rowIndex: number) => {
    const entry = entries[rowIndex]

    if (!entry) {
      alert('Entry not found')
      return
    }

    // Validate entry
    const errors = validateEntry(entry)
    if (errors.length > 0) {
      alert(`Validation Error:\n${errors.join('\n')}`)
      return
    }

    setIsLoading(true)
    try {
      const backendEntry = {
        trade_date: entry.tradeDate,
        strategy: entry.strategy,
        code: entry.code,
        exchange: entry.exchange,
        commodity: entry.commodity,
        expiry: entry.expiry,
        contract_type: entry.contractType,
        strike_price: entry.strikePrice,
        option_type: entry.optionType,
        buy_qty: entry.buyQty,
        buy_avg: entry.buyAvg,
        sell_qty: entry.sellQty,
        sell_avg: entry.sellAvg,
        client_code: entry.clientCode,
        broker: entry.broker,
        team_name: entry.teamName,
        status: entry.status,
        remark: entry.remark,
        tag: entry.tag,
      }

      const response = await fetch(`${API_BASE_URL}/trade-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(backendEntry),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = 'Failed to save entry'
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
        }
        alert(`Error: ${errorMessage}`)
        return
      }

      await response.json()
      alert('Entry saved successfully!')
      loadEntriesByDate(selectedDate)
    } catch (error) {
      console.error('Error saving entry:', error)
      alert(`Error saving entry: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [entries, selectedDate, token, loadEntriesByDate])

  const saveAllEntries = async () => {
    // Get entries that need to be saved
    const newEntries = entries.filter(entry => !entry.id && entry.strategy)
    const modifiedExistingEntries = entries.filter(entry =>
      entry.id && modifiedEntryIds.has(entry.id)
    )

    if (newEntries.length === 0 && modifiedExistingEntries.length === 0) {
      alert('No entries to save.')
      return
    }

    // Validate all entries before saving
    const allEntriesToSave = [...newEntries, ...modifiedExistingEntries]
    const validationErrors: string[] = []

    allEntriesToSave.forEach((entry, index) => {
      const errors = validateEntry(entry)
      if (errors.length > 0) {
        const rowNum = entries.findIndex(e => e === entry) + 1
        validationErrors.push(`Row ${rowNum}: ${errors.join(', ')}`)
      }
    })

    if (validationErrors.length > 0) {
      alert(`Validation Errors:\n\n${validationErrors.join('\n\n')}`)
      return
    }

    setIsLoading(true)
    try {

      let savedCount = 0
      let updatedCount = 0

      // Save new entries using bulk endpoint
      if (newEntries.length > 0) {
        const backendEntries = newEntries.map(entry => ({
          trade_date: entry.tradeDate,
          strategy: entry.strategy,
          code: entry.code,
          exchange: entry.exchange,
          commodity: entry.commodity,
          expiry: entry.expiry,
          contract_type: entry.contractType,
          strike_price: entry.strikePrice,
          option_type: entry.optionType,
          buy_qty: entry.buyQty,
          buy_avg: entry.buyAvg,
          sell_qty: entry.sellQty,
          sell_avg: entry.sellAvg,
          client_code: entry.clientCode,
          broker: entry.broker,
          team_name: entry.teamName,
          status: entry.status,
          remark: entry.remark,
          tag: entry.tag,
        }))

        const response = await fetch(`${API_BASE_URL}/trade-entries/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(backendEntries),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          let errorMessage = 'Failed to save new entries'
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
          }
          throw new Error(errorMessage)
        }

        savedCount = newEntries.length
      }

      // Update only modified existing entries
      if (modifiedExistingEntries.length > 0) {
        for (const entry of modifiedExistingEntries) {
          const backendEntry = {
            trade_date: entry.tradeDate,
            strategy: entry.strategy,
            code: entry.code,
            exchange: entry.exchange,
            commodity: entry.commodity,
            expiry: entry.expiry,
            contract_type: entry.contractType,
            strike_price: entry.strikePrice,
            option_type: entry.optionType,
            buy_qty: entry.buyQty,
            buy_avg: entry.buyAvg,
            sell_qty: entry.sellQty,
            sell_avg: entry.sellAvg,
            client_code: entry.clientCode,
            broker: entry.broker,
            team_name: entry.teamName,
            status: entry.status,
            remark: entry.remark,
            tag: entry.tag,
          }

          const response = await fetch(`${API_BASE_URL}/trade-entries/${entry.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(backendEntry),
          })

          if (response.ok) {
            updatedCount++
          } else {
            const errorData = await response.json().catch(() => ({}))
            let errorMessage = 'Failed to update entry'
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail
            } else if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
            }
            throw new Error(`Entry ${entry.id}: ${errorMessage}`)
          }
        }
      }

      // Show success message
      const messages = []
      if (savedCount > 0) messages.push(`${savedCount} new entr${savedCount === 1 ? 'y' : 'ies'} created`)
      if (updatedCount > 0) messages.push(`${updatedCount} entr${updatedCount === 1 ? 'y' : 'ies'} updated`)
      alert(`Success! ${messages.join(' and ')}.`)

      // Clear modified entries set after successful save
      setModifiedEntryIds(new Set())

      // Reload entries from database
      await loadEntriesByDate(selectedDate)
    } catch (error) {
      console.error('Error saving entries:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save entries. Please try again.'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle cell value changes
  const onCellValueChanged = useCallback((event: any) => {
    const rowIndex = event.rowIndex
    const field = event.colDef.field
    const newValue = event.newValue
    const oldValue = event.oldValue

    // Validation function for dropdown fields
    const validateDropdownValue = (field: string, value: any): boolean => {
      if (!value) return true // Allow empty values

      const dropdownFields: { [key: string]: string[] } = {
        strategy: masters.Strategy?.map(s => s.name) || [],
        code: (filteredCodes[rowIndex] || masters.Code || []).map((c: any) => c.name),
        exchange: (filteredExchanges[rowIndex] || masters.Exchange || []).map((e: any) => e.name),
        commodity: (filteredCommodities[rowIndex] || masters.Commodity || []).map((c: any) => c.name),
        contractType: masters['Contract Type']?.map(c => c.name) || [],
        optionType: masters['Option Type']?.map(o => o.name) || [],
        broker: masters.Broker?.map(b => b.name) || [],
        teamName: masters['Team Name']?.map(t => t.name) || [],
        status: masters.Status?.map(s => s.name) || []
      }

      if (dropdownFields[field]) {
        return dropdownFields[field].includes(value)
      }
      return true
    }

    // Validate the new value
    if (!validateDropdownValue(field, newValue)) {
      alert(`Validation Failed: "${newValue}" is not a valid option for ${field}. Please select a value from the dropdown.`)

      // Revert to old value
      const node = event.node
      node.setDataValue(field, oldValue)
      return
    }

    const newEntries = [...entries]
    newEntries[rowIndex] = { ...newEntries[rowIndex], [field]: newValue }

    // Track modification if this entry has an ID (existing entry)
    if (newEntries[rowIndex].id) {
      setModifiedEntryIds(prev => new Set(prev).add(newEntries[rowIndex].id!))
    }

    // Handle cascading dropdowns
    if (field === 'strategy') {
      const strategyItem = masters.Strategy?.find(s => s.name === newValue)
      if (strategyItem) {
        fetchCodesByStrategy(strategyItem.id, rowIndex)
      }
      newEntries[rowIndex].code = ''
      newEntries[rowIndex].exchange = ''
      newEntries[rowIndex].commodity = ''
      setFilteredCodes(prev => ({ ...prev, [rowIndex]: [] }))
      setFilteredExchanges(prev => ({ ...prev, [rowIndex]: [] }))
      setFilteredCommodities(prev => ({ ...prev, [rowIndex]: [] }))
    } else if (field === 'code') {
      const codeItem = (filteredCodes[rowIndex] || masters.Code)?.find((c: any) => c.name === newValue)
      if (codeItem) {
        fetchExchangesByCode(codeItem.id, rowIndex)
      }
      newEntries[rowIndex].exchange = ''
      newEntries[rowIndex].commodity = ''
      setFilteredExchanges(prev => ({ ...prev, [rowIndex]: [] }))
      setFilteredCommodities(prev => ({ ...prev, [rowIndex]: [] }))
    } else if (field === 'exchange') {
      const exchangeItem = (filteredExchanges[rowIndex] || masters.Exchange)?.find((e: any) => e.name === newValue)
      if (exchangeItem) {
        fetchCommoditiesByExchange(exchangeItem.id, rowIndex)
      }
      newEntries[rowIndex].commodity = ''
      setFilteredCommodities(prev => ({ ...prev, [rowIndex]: [] }))
    }

    setEntries(newEntries)
  }, [entries, masters, filteredCodes, filteredExchanges, filteredCommodities])

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: '#',
      valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
      width: 60,
      pinned: 'left',
      editable: false,
      cellStyle: { backgroundColor: '#f8f9fa', fontWeight: 500, textAlign: 'center' }
    },
    {
      field: 'tradeDate',
      headerName: 'Trade Date',
      width: 130,
      editable: !isReadOnlyMode,
      cellEditor: 'agDateStringCellEditor'
    },
    {
      field: 'strategy',
      headerName: 'Strategy',
      width: 130,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: { values: masters.Strategy?.map(s => s.name) || [] },
      cellEditorPopup: true
    },
    {
      field: 'code',
      headerName: 'Code',
      width: 110,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: (params: any) => ({
        values: (filteredCodes[params.rowIndex] || masters.Code || []).map((c: any) => c.name)
      }),
      cellEditorPopup: true
    },
    {
      field: 'exchange',
      headerName: 'Exchange',
      width: 110,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: (params: any) => ({
        values: (filteredExchanges[params.rowIndex] || masters.Exchange || []).map((e: any) => e.name)
      }),
      cellEditorPopup: true
    },
    {
      field: 'commodity',
      headerName: 'Commodity',
      width: 120,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: (params: any) => ({
        values: (filteredCommodities[params.rowIndex] || masters.Commodity || []).map((c: any) => c.name)
      }),
      cellEditorPopup: true
    },
    {
      field: 'expiry',
      headerName: 'Expiry',
      width: 130,
      editable: !isReadOnlyMode,
      cellEditor: 'agDateStringCellEditor'
    },
    {
      field: 'contractType',
      headerName: 'Contract Type',
      width: 130,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: { values: masters['Contract Type']?.map(c => c.name) || [] },
      cellEditorPopup: true
    },
    {
      field: 'strikePrice',
      headerName: 'Strike Price',
      width: 110,
      editable: !isReadOnlyMode,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'optionType',
      headerName: 'Option Type',
      width: 120,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: { values: masters['Option Type']?.map(o => o.name) || [] },
      cellEditorPopup: true
    },
    {
      field: 'buyQty',
      headerName: 'Buy Qty',
      width: 100,
      editable: !isReadOnlyMode,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'buyAvg',
      headerName: 'Buy Avg',
      width: 100,
      editable: !isReadOnlyMode,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'sellQty',
      headerName: 'Sell Qty',
      width: 100,
      editable: !isReadOnlyMode,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'sellAvg',
      headerName: 'Sell Avg',
      width: 100,
      editable: !isReadOnlyMode,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'clientCode',
      headerName: 'Client Code',
      width: 120,
      editable: !isReadOnlyMode
    },
    {
      field: 'broker',
      headerName: 'Broker',
      width: 120,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: { values: masters.Broker?.map(b => b.name) || [] },
      cellEditorPopup: true
    },
    {
      field: 'teamName',
      headerName: 'Team Name',
      width: 120,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: { values: masters['Team Name']?.map(t => t.name) || [] },
      cellEditorPopup: true
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      editable: !isReadOnlyMode,
      cellEditor: AutocompleteCellEditor,
      cellEditorParams: { values: masters.Status?.map(s => s.name) || [] },
      cellEditorPopup: true
    },
    {
      field: 'remark',
      headerName: 'Remark',
      width: 150,
      editable: !isReadOnlyMode
    },
    {
      field: 'tag',
      headerName: 'Tag',
      width: 100,
      editable: !isReadOnlyMode
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      editable: false,
      cellRenderer: ActionCellRenderer,
      cellStyle: { backgroundColor: '#f8f9fa' },
      suppressNavigable: false
    }
  ], [masters, filteredCodes, filteredExchanges, filteredCommodities, isReadOnlyMode])

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), [])

  useEffect(() => {
    fetchMasters()
    loadEntriesByDate(selectedDate)
  }, [])

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Shift+Enter: Add new row
      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        addNewRow()
      }

      // Shift+Spacebar: Select the current row
      else if (event.shiftKey && event.key === ' ') {
        event.preventDefault()
        const focusedCell = gridRef.current?.api?.getFocusedCell()
        if (focusedCell) {
          const rowNode = gridRef.current?.api?.getDisplayedRowAtIndex(focusedCell.rowIndex)
          if (rowNode) {
            rowNode.setSelected(true, true) // true = selected, true = clear other selections
          }
        }
      }

      // Delete: Delete the selected row (single row only)
      else if (event.key === 'Delete') {
        const selectedNodes = gridRef.current?.api?.getSelectedNodes()
        if (selectedNodes && selectedNodes.length === 1) {
          event.preventDefault()

          const selectedIndex = selectedNodes[0].rowIndex
          if (selectedIndex !== null && selectedIndex !== undefined) {
            // Delete the row
            deleteRow(selectedIndex)

            // Clear selection
            gridRef.current?.api?.deselectAll()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedDate, entries, deleteRow])

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Manual Trade Entry</h2>
          {isReadOnlyMode && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
              Viewing Mode - Records are read-only
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
            onClick={() => loadEntriesByDate(selectedDate)}
            size="sm"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Load Trades
          </Button>
          <Button
            onClick={downloadTradesForDate}
            size="sm"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Download Trades
          </Button>
          <Button
            onClick={downloadSampleCSV}
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Sample CSV
          </Button>
          <Button
            onClick={handleUploadClick}
            size="sm"
            className="flex items-center gap-2"
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* AG Grid */}
      <Card>
        <CardContent className="p-0">
          <style>{`
            .ag-theme-alpine .ag-cell {
              border-right: 1px solid #e2e8f0 !important;
            }
            .ag-theme-alpine .ag-header-cell {
              border-right: 1px solid #e2e8f0 !important;
              background-color: #f1f5f9;
              font-weight: 600;
            }
            .ag-theme-alpine .ag-row-even {
              background-color: #ffffff;
            }
            .ag-theme-alpine .ag-row-odd {
              background-color: #dbeafe;
            }
            .ag-theme-alpine .ag-row-hover {
              background-color: #bfdbfe !important;
            }
            .ag-theme-alpine .ag-cell-focus {
              border: 2px solid #2563eb !important;
              outline: none !important;
            }
            .ag-theme-alpine .ag-cell-range-selected:not(.ag-cell-focus) {
              background-color: #bfdbfe !important;
            }

            /* Make filter dropdown more prominent */
            .ag-theme-alpine .ag-filter {
              background-color: #ffffff !important;
              border: 2px solid #3b82f6 !important;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2) !important;
            }
            .ag-theme-alpine .ag-filter-body {
              background-color: #ffffff !important;
              opacity: 1 !important;
            }
            .ag-theme-alpine .ag-filter-wrapper {
              background-color: #ffffff !important;
              opacity: 1 !important;
            }
            .ag-theme-alpine .ag-input-field-input {
              background-color: #ffffff !important;
              border: 1px solid #d1d5db !important;
              opacity: 1 !important;
            }
            .ag-theme-alpine .ag-picker-field-wrapper {
              background-color: #ffffff !important;
              border: 1px solid #d1d5db !important;
              opacity: 1 !important;
            }

            /* Hide magnifying glass icon in filter popup - for both text and number filters */
            .ag-theme-alpine .ag-filter .ag-icon-filter,
            .ag-theme-alpine .ag-filter-condition .ag-icon-filter,
            .ag-theme-alpine .ag-text-field-input-wrapper .ag-icon,
            .ag-theme-alpine .ag-number-field-input-wrapper .ag-icon,
            .ag-theme-alpine .ag-input-field .ag-icon,
            .ag-theme-alpine .ag-filter-filter .ag-icon-filter,
            .ag-theme-alpine .ag-number-filter .ag-icon,
            .ag-theme-alpine .ag-filter .ag-icon {
              display: none !important;
              visibility: hidden !important;
            }
            .ag-theme-alpine .ag-text-field-input-wrapper::before,
            .ag-theme-alpine .ag-number-field-input-wrapper::before {
              display: none !important;
            }

            /* Numeric filter styling to match text filters */
            .ag-theme-alpine .ag-number-filter {
              background-color: #ffffff !important;
            }
            .ag-theme-alpine .ag-filter-body-wrapper {
              background-color: #ffffff !important;
              padding: 8px !important;
            }
            .ag-theme-alpine .ag-filter-condition {
              background-color: #ffffff !important;
            }
            .ag-theme-alpine .ag-filter-select .ag-picker-field-wrapper {
              background-color: #ffffff !important;
              border: 1px solid #d1d5db !important;
            }
            .ag-theme-alpine .ag-number-field-input {
              background-color: #ffffff !important;
              border: 1px solid #d1d5db !important;
              opacity: 1 !important;
            }
            .ag-theme-alpine .ag-filter-from,
            .ag-theme-alpine .ag-filter-to {
              background-color: #ffffff !important;
            }
            .ag-theme-alpine .ag-filter-apply-panel {
              background-color: #ffffff !important;
              border-top: 1px solid #e2e8f0 !important;
              padding: 8px !important;
            }
          `}</style>
          <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
            <AgGridReact
              ref={gridRef}
              rowData={entries}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              context={{
                onSave: saveIndividualEntry,
                onDelete: deleteRow,
                isReadOnly: isReadOnlyMode,
                isLoading: isLoading
              }}
              onCellValueChanged={onCellValueChanged}
              singleClickEdit={true}
              stopEditingWhenCellsLoseFocus={true}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              animateRows={true}
              enterNavigatesVertically={false}
              enterNavigatesVerticallyAfterEdit={false}
              tabToNextCell={(params) => {
                // Custom tab navigation - move to next editable cell
                return params.nextCellPosition || false
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManualTradeExcelGrid
