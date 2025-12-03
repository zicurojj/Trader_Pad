import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Save, Trash2, Download } from 'lucide-react'
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
      item.addEventListener('click', () => {
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
  const context = props.context as {
    onSave: (rowIndex: number) => void
    onDelete: (rowIndex: number) => void
    isReadOnly: boolean
    isLoading: boolean
  }

  return (
    <div className="flex items-center justify-center gap-1 h-full">
      <button
        onClick={() => context.onSave(rowIndex)}
        disabled={context.isLoading || context.isReadOnly}
        className="h-7 w-7 p-0 hover:bg-green-100 rounded flex items-center justify-center disabled:opacity-50"
        title="Save this entry"
      >
        <Save className="h-3 w-3" />
      </button>
      <button
        onClick={() => context.onDelete(rowIndex)}
        disabled={context.isLoading}
        className="h-7 w-7 p-0 hover:bg-red-100 rounded flex items-center justify-center disabled:opacity-50"
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

  // Cascading dropdown state
  const [filteredCodes, setFilteredCodes] = useState<{ [rowIndex: number]: any[] }>({})
  const [filteredExchanges, setFilteredExchanges] = useState<{ [rowIndex: number]: any[] }>({})
  const [filteredCommodities, setFilteredCommodities] = useState<{ [rowIndex: number]: any[] }>({})

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
    setEntries([...entries, newEntry])
    setIsReadOnlyMode(false)
  }

  // Define loadEntriesByDate FIRST so it can be used by other callbacks
  const loadEntriesByDate = useCallback(async (date?: string) => {
    setIsLoading(true)
    try {
      const targetDate = date || selectedDate
      const response = await fetch(`${API_BASE_URL}/manual-trade-entries/date/${targetDate}`)

      if (!response.ok) {
        throw new Error('Failed to load entries')
      }

      const data = await response.json()

      if (data.length > 0) {
        const convertedEntries = data.map((entry: any) => ({
          id: entry.id,
          tradeDate: entry.tradeDate,
          strategy: entry.strategy,
          code: entry.code,
          exchange: entry.exchange,
          commodity: entry.commodity,
          expiry: entry.expiry,
          contractType: entry.contractType,
          strikePrice: entry.strikePrice,
          optionType: entry.optionType,
          buyQty: entry.buyQty,
          buyAvg: entry.buyAvg,
          sellQty: entry.sellQty,
          sellAvg: entry.sellAvg,
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
        const response = await fetch(`${API_BASE_URL}/manual-trade-entries/${entry.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete entry')
        }

        await loadEntriesByDate(selectedDate)
      } catch (error) {
        console.error('Error deleting entry:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      if (entries.length > 1) {
        const newEntries = entries.filter((_, i) => i !== index)
        setEntries(newEntries)
      }
    }
  }, [entries, selectedDate, loadEntriesByDate])

  const saveIndividualEntry = useCallback(async (rowIndex: number) => {
    const entry = entries[rowIndex]

    if (!entry) {
      console.error('Entry not found at index:', rowIndex)
      return
    }

    if (!entry.strategy || !entry.code || !entry.exchange) {
      alert('Strategy, Code, and Exchange are required fields')
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

      const response = await fetch(`${API_BASE_URL}/manual-trade-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(backendEntry),
      })

      if (!response.ok) {
        throw new Error('Failed to save entry')
      }

      await response.json()
      loadEntriesByDate(selectedDate)
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setIsLoading(false)
    }
  }, [entries, selectedDate, token, loadEntriesByDate])

  const saveAllEntries = async () => {
    setIsLoading(true)
    try {
      const validEntries = entries.filter(entry =>
        entry.strategy && entry.code && entry.exchange && !entry.id
      )

      if (validEntries.length > 0) {
        const backendEntries = validEntries.map(entry => ({
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

        const response = await fetch(`${API_BASE_URL}/manual-trade-entries/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(backendEntries),
        })

        if (!response.ok) {
          throw new Error('Failed to save entries')
        }

        await response.json()
      }

      setEntries([{ ...DEFAULT_ENTRY, tradeDate: selectedDate }])
      loadEntriesByDate(selectedDate)
    } catch (error) {
      console.error('Error saving entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle cell value changes
  const onCellValueChanged = useCallback((event: any) => {
    const rowIndex = event.rowIndex
    const field = event.colDef.field
    const newValue = event.newValue

    const newEntries = [...entries]
    newEntries[rowIndex] = { ...newEntries[rowIndex], [field]: newValue }

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
  }, [entries, masters, filteredCodes, filteredExchanges])

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
      cellStyle: { backgroundColor: '#f8f9fa' }
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
        <strong>Keyboard shortcuts:</strong> Tab/Shift+Tab to navigate cells | Enter to edit | Arrow keys to browse options | Escape to cancel
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
            .ag-theme-alpine .ag-row-hover {
              background-color: #eff6ff !important;
            }
            .ag-theme-alpine .ag-cell-focus {
              border: 2px solid #2563eb !important;
              outline: none !important;
            }
            .ag-theme-alpine .ag-cell-range-selected:not(.ag-cell-focus) {
              background-color: #dbeafe !important;
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
