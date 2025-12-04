import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { MasterValue, MasterData } from "@/types"
import { API_BASE_URL } from "@/constants"
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef, type CellValueChangedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { SearchableDeleteDropdown } from "@/components/SearchableDeleteDropdown"

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

// Custom Autocomplete Cell Editor Component
class AutocompleteCellEditorClass {
  private eGui: HTMLDivElement;
  private eInput: HTMLInputElement;
  private eDropdown: HTMLDivElement;
  private value: string;
  private values: string[];
  private filteredValues: string[];
  private highlightedIndex: number;
  private params: any;

  init(params: any) {
    this.params = params;
    this.value = params.value || '';
    this.values = params.values || [];
    this.filteredValues = [...this.values];
    this.highlightedIndex = 0;

    // Create container
    this.eGui = document.createElement('div');
    this.eGui.style.cssText = 'position: relative; width: 100%; height: 100%;';

    // Create input
    this.eInput = document.createElement('input');
    this.eInput.type = 'text';
    this.eInput.value = this.value;
    this.eInput.style.cssText = 'width: 100%; height: 100%; border: none; outline: none; padding: 0 8px; font-size: 14px; box-sizing: border-box;';
    this.eGui.appendChild(this.eInput);

    // Create dropdown
    this.eDropdown = document.createElement('div');
    this.eDropdown.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background-color: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000;';
    this.eGui.appendChild(this.eDropdown);

    this.renderDropdown();

    // Event listeners
    this.eInput.addEventListener('input', () => {
      this.filterValues();
    });

    this.eInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredValues.length - 1);
        this.renderDropdown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.renderDropdown();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // If there's a highlighted item in dropdown, use it
        // Otherwise, use the typed input value (allows creating new entries)
        if (this.filteredValues[this.highlightedIndex] !== undefined) {
          this.value = this.filteredValues[this.highlightedIndex];
        } else {
          // Use the typed value to create a new entry
          this.value = this.eInput.value.trim();
        }
        this.params.stopEditing();
      } else if (e.key === 'Escape') {
        this.params.stopEditing(true);
      }
    });
  }

  filterValues() {
    const inputVal = this.eInput.value.toLowerCase();
    this.filteredValues = this.values.filter(v => v.toLowerCase().includes(inputVal));
    this.highlightedIndex = 0;
    this.renderDropdown();
  }

  renderDropdown() {
    this.eDropdown.innerHTML = '';
    const inputVal = this.eInput.value.trim();

    // Show "Create new" option if user typed something not in the list
    const exactMatch = this.values.some(v => v.toLowerCase() === inputVal.toLowerCase());
    if (inputVal && !exactMatch) {
      const createItem = document.createElement('div');
      createItem.textContent = `+ Create "${inputVal}"`;
      createItem.style.cssText = `padding: 8px 12px; cursor: pointer; background-color: ${this.filteredValues.length === 0 && this.highlightedIndex === 0 ? '#e6f7ff' : '#f0fff0'}; border-bottom: 1px solid #f0f0f0; color: #52c41a; font-weight: 500;`;
      createItem.addEventListener('click', () => {
        this.value = inputVal;
        this.params.stopEditing();
      });
      this.eDropdown.appendChild(createItem);
    }

    this.filteredValues.forEach((v, index) => {
      const item = document.createElement('div');
      item.textContent = v || '(empty)';
      item.style.cssText = `padding: 8px 12px; cursor: pointer; background-color: ${index === this.highlightedIndex ? '#e6f7ff' : 'white'}; border-bottom: ${index < this.filteredValues.length - 1 ? '1px solid #f0f0f0' : 'none'};`;
      item.addEventListener('click', () => {
        this.value = v;
        this.params.stopEditing();
      });
      item.addEventListener('mouseenter', () => {
        this.highlightedIndex = index;
        this.renderDropdown();
      });
      this.eDropdown.appendChild(item);
    });
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    this.eInput.focus();
    this.eInput.select();
  }

  getValue() {
    return this.value;
  }

  isPopup() {
    return true;
  }
}

interface StrategyCodeMapping {
  strategyId: number
  strategy: string
  codeId: number
  code: string
}

interface CodeExchangeMapping {
  codeId: number
  code: string
  exchangeId: number
  exchange: string
}

interface ExchangeCommodityMapping {
  exchangeId: number
  exchange: string
  commodityId: number
  commodity: string
}

export function Masters() {
  const [masters, setMasters] = useState<MasterData>({})
  const [selectedMaster, setSelectedMaster] = useState<string>("")
  const [newValue, setNewValue] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [selectedMappingView, setSelectedMappingView] = useState<string>("")
  const [strategyCodeMappings, setStrategyCodeMappings] = useState<StrategyCodeMapping[]>([])
  const [codeExchangeMappings, setCodeExchangeMappings] = useState<CodeExchangeMapping[]>([])
  const [exchangeCommodityMappings, setExchangeCommodityMappings] = useState<ExchangeCommodityMapping[]>([])
  const [availableCodes, setAvailableCodes] = useState<string[]>([])
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([])
  const [availableCommodities, setAvailableCommodities] = useState<string[]>([])
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [addingType, setAddingType] = useState<'Strategy' | 'Code' | 'Exchange'>('Strategy')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingItem, setDeletingItem] = useState<{ name: string; type: 'Strategy' | 'Code' | 'Exchange' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  // Fetch available dropdown values
  const fetchDropdownValues = async () => {
    try {
      const [strategiesRes, codesRes, exchangesRes, commoditiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/masters/Strategy`),
        fetch(`${API_BASE_URL}/masters/Code`),
        fetch(`${API_BASE_URL}/masters/Exchange`),
        fetch(`${API_BASE_URL}/masters/Commodity`)
      ])

      if (strategiesRes.ok) {
        const data = await strategiesRes.json()
        setAvailableStrategies(data.map((s: MasterValue) => s.name).sort())
      }
      if (codesRes.ok) {
        const data = await codesRes.json()
        setAvailableCodes(data.map((c: MasterValue) => c.name).sort())
      }
      if (exchangesRes.ok) {
        const data = await exchangesRes.json()
        setAvailableExchanges(data.map((e: MasterValue) => e.name).sort())
      }
      if (commoditiesRes.ok) {
        const data = await commoditiesRes.json()
        setAvailableCommodities(data.map((c: MasterValue) => c.name).sort())
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
    }
  }

  useEffect(() => {
    fetchDropdownValues()
  }, [])

  // Handle cell value change - create or delete mapping
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const strategy = event.colDef.field as string
    const oldValue = event.oldValue as string
    const newValue = event.newValue as string

    // If clearing a value, delete the mapping
    if (oldValue && !newValue) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/mappings/strategy-code?strategyName=${encodeURIComponent(strategy)}&codeName=${encodeURIComponent(oldValue)}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          // Refresh mappings
          fetchStrategyCodeMappings()
        } else {
          const error = await response.json()
          alert(`Failed to delete mapping: ${error.detail}`)
          // Revert the change
          event.node.setDataValue(strategy, oldValue)
        }
      } catch (error) {
        console.error("Error deleting mapping:", error)
        event.node.setDataValue(strategy, oldValue)
      }
      return
    }

    // If adding a new value, create the mapping
    if (newValue && newValue !== oldValue) {
      try {
        const response = await fetch(`${API_BASE_URL}/mappings/strategy-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strategyName: strategy, codeName: newValue })
        })
        if (response.ok) {
          // If replacing an old value, also delete the old mapping
          if (oldValue) {
            await fetch(
              `${API_BASE_URL}/mappings/strategy-code?strategyName=${encodeURIComponent(strategy)}&codeName=${encodeURIComponent(oldValue)}`,
              { method: 'DELETE' }
            )
          }
          // Refresh dropdown values (in case a new code was auto-created)
          fetchDropdownValues()
          // Refresh mappings
          fetchStrategyCodeMappings()
          // Refresh all masters to update the Masters Management list
          fetchAllMasters()
        } else {
          const error = await response.json()
          alert(`Failed to create mapping: ${error.detail}`)
          // Revert the change
          event.node.setDataValue(strategy, oldValue)
        }
      } catch (error) {
        console.error("Error creating mapping:", error)
        event.node.setDataValue(strategy, oldValue)
      }
    }
  }, [])

  // Handle cell value change for Code-Exchange mapping
  const onCodeExchangeCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const code = event.colDef.field as string
    const oldValue = event.oldValue as string
    const newValue = event.newValue as string

    if (oldValue && !newValue) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/mappings/code-exchange?codeName=${encodeURIComponent(code)}&exchangeName=${encodeURIComponent(oldValue)}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          fetchCodeExchangeMappings()
        } else {
          const error = await response.json()
          alert(`Failed to delete mapping: ${error.detail}`)
          event.node.setDataValue(code, oldValue)
        }
      } catch (error) {
        console.error("Error deleting mapping:", error)
        event.node.setDataValue(code, oldValue)
      }
      return
    }

    if (newValue && newValue !== oldValue) {
      try {
        const response = await fetch(`${API_BASE_URL}/mappings/code-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeName: code, exchangeName: newValue })
        })
        if (response.ok) {
          if (oldValue) {
            await fetch(
              `${API_BASE_URL}/mappings/code-exchange?codeName=${encodeURIComponent(code)}&exchangeName=${encodeURIComponent(oldValue)}`,
              { method: 'DELETE' }
            )
          }
          // Refresh dropdown values (in case a new exchange was auto-created)
          fetchDropdownValues()
          fetchCodeExchangeMappings()
          // Refresh all masters to update the Masters Management list
          fetchAllMasters()
        } else {
          const error = await response.json()
          alert(`Failed to create mapping: ${error.detail}`)
          event.node.setDataValue(code, oldValue)
        }
      } catch (error) {
        console.error("Error creating mapping:", error)
        event.node.setDataValue(code, oldValue)
      }
    }
  }, [])

  // Handle cell value change for Exchange-Commodity mapping
  const onExchangeCommodityCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const exchange = event.colDef.field as string
    const oldValue = event.oldValue as string
    const newValue = event.newValue as string

    if (oldValue && !newValue) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/mappings/exchange-commodity?exchangeName=${encodeURIComponent(exchange)}&commodityName=${encodeURIComponent(oldValue)}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          fetchExchangeCommodityMappings()
        } else {
          const error = await response.json()
          alert(`Failed to delete mapping: ${error.detail}`)
          event.node.setDataValue(exchange, oldValue)
        }
      } catch (error) {
        console.error("Error deleting mapping:", error)
        event.node.setDataValue(exchange, oldValue)
      }
      return
    }

    if (newValue && newValue !== oldValue) {
      try {
        const response = await fetch(`${API_BASE_URL}/mappings/exchange-commodity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchangeName: exchange, commodityName: newValue })
        })
        if (response.ok) {
          if (oldValue) {
            await fetch(
              `${API_BASE_URL}/mappings/exchange-commodity?exchangeName=${encodeURIComponent(exchange)}&commodityName=${encodeURIComponent(oldValue)}`,
              { method: 'DELETE' }
            )
          }
          // Refresh dropdown values (in case a new commodity was auto-created)
          fetchDropdownValues()
          fetchExchangeCommodityMappings()
          // Refresh all masters to update the Masters Management list
          fetchAllMasters()
        } else {
          const error = await response.json()
          alert(`Failed to create mapping: ${error.detail}`)
          event.node.setDataValue(exchange, oldValue)
        }
      } catch (error) {
        console.error("Error creating mapping:", error)
        event.node.setDataValue(exchange, oldValue)
      }
    }
  }, [])

  // Transform mappings into grid format: strategies as columns, codes as rows
  const { gridRowData, gridColDefs } = useMemo(() => {
    // Group codes by strategy
    const strategyCodesMap: Record<string, string[]> = {};

    // Initialize all available strategies (even those with no mappings)
    availableStrategies.forEach(strategy => {
      strategyCodesMap[strategy] = [];
    });

    // Add mappings
    strategyCodeMappings.forEach(mapping => {
      if (!strategyCodesMap[mapping.strategy]) {
        strategyCodesMap[mapping.strategy] = [];
      }
      strategyCodesMap[mapping.strategy].push(mapping.code);
    });

    // Sort strategies and their codes
    const strategies = Object.keys(strategyCodesMap).sort();
    strategies.forEach(strategy => {
      strategyCodesMap[strategy].sort();
    });

    // Find max number of codes across all strategies + 1 for adding new
    const maxCodes = Math.max(...Object.values(strategyCodesMap).map(codes => codes.length), 0) + 1;

    // Create row data: each row index maps to codes at that position for each strategy
    const rowData: Record<string, string>[] = [];
    for (let i = 0; i < maxCodes; i++) {
      const row: Record<string, string> = {};
      strategies.forEach(strategy => {
        row[strategy] = strategyCodesMap[strategy][i] || '';
      });
      rowData.push(row);
    }

    // Create column definitions: one column per strategy with autocomplete editor
    const colDefs: ColDef[] = strategies.map(strategy => ({
      field: strategy,
      headerName: strategy,
      sortable: true,
      filter: true,
      minWidth: 120,
      flex: 1,
      editable: true,
      cellEditor: AutocompleteCellEditorClass,
      cellEditorParams: {
        values: ['', ...availableCodes]
      },
      cellEditorPopup: true
    }));

    return { gridRowData: rowData, gridColDefs: colDefs };
  }, [strategyCodeMappings, availableCodes, availableStrategies])

  // Transform Code-Exchange mappings into grid format: codes as columns, exchanges as rows
  const { codeExchangeGridRowData, codeExchangeGridColDefs } = useMemo(() => {
    const codeExchangesMap: Record<string, string[]> = {};

    // Initialize all available codes (even those with no mappings)
    availableCodes.forEach(code => {
      codeExchangesMap[code] = [];
    });

    codeExchangeMappings.forEach(mapping => {
      if (!codeExchangesMap[mapping.code]) {
        codeExchangesMap[mapping.code] = [];
      }
      codeExchangesMap[mapping.code].push(mapping.exchange);
    });

    const codes = Object.keys(codeExchangesMap).sort();
    codes.forEach(code => {
      codeExchangesMap[code].sort();
    });

    const maxExchanges = Math.max(...Object.values(codeExchangesMap).map(exchanges => exchanges.length), 0) + 1;

    const rowData: Record<string, string>[] = [];
    for (let i = 0; i < maxExchanges; i++) {
      const row: Record<string, string> = {};
      codes.forEach(code => {
        row[code] = codeExchangesMap[code][i] || '';
      });
      rowData.push(row);
    }

    const colDefs: ColDef[] = codes.map(code => ({
      field: code,
      headerName: code,
      sortable: true,
      filter: true,
      minWidth: 120,
      flex: 1,
      editable: true,
      cellEditor: AutocompleteCellEditorClass,
      cellEditorParams: {
        values: ['', ...availableExchanges]
      },
      cellEditorPopup: true
    }));

    return { codeExchangeGridRowData: rowData, codeExchangeGridColDefs: colDefs };
  }, [codeExchangeMappings, availableExchanges, availableCodes])

  // Transform Exchange-Commodity mappings into grid format: exchanges as columns, commodities as rows
  const { exchangeCommodityGridRowData, exchangeCommodityGridColDefs } = useMemo(() => {
    const exchangeCommoditiesMap: Record<string, string[]> = {};

    // Initialize all available exchanges (even those with no mappings)
    availableExchanges.forEach(exchange => {
      exchangeCommoditiesMap[exchange] = [];
    });

    exchangeCommodityMappings.forEach(mapping => {
      if (!exchangeCommoditiesMap[mapping.exchange]) {
        exchangeCommoditiesMap[mapping.exchange] = [];
      }
      exchangeCommoditiesMap[mapping.exchange].push(mapping.commodity);
    });

    const exchanges = Object.keys(exchangeCommoditiesMap).sort();
    exchanges.forEach(exchange => {
      exchangeCommoditiesMap[exchange].sort();
    });

    const maxCommodities = Math.max(...Object.values(exchangeCommoditiesMap).map(commodities => commodities.length), 0) + 1;

    const rowData: Record<string, string>[] = [];
    for (let i = 0; i < maxCommodities; i++) {
      const row: Record<string, string> = {};
      exchanges.forEach(exchange => {
        row[exchange] = exchangeCommoditiesMap[exchange][i] || '';
      });
      rowData.push(row);
    }

    const colDefs: ColDef[] = exchanges.map(exchange => ({
      field: exchange,
      headerName: exchange,
      sortable: true,
      filter: true,
      minWidth: 120,
      flex: 1,
      editable: true,
      cellEditor: AutocompleteCellEditorClass,
      cellEditorParams: {
        values: ['', ...availableCommodities]
      },
      cellEditorPopup: true
    }));

    return { exchangeCommodityGridRowData: rowData, exchangeCommodityGridColDefs: colDefs };
  }, [exchangeCommodityMappings, availableCommodities, availableExchanges])

  // Fetch all master data on component mount
  useEffect(() => {
    fetchAllMasters()
  }, [])

  const fetchAllMasters = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/masters`)
      if (response.ok) {
        const data = await response.json()
        setMasters(data)
      } else {
        console.error("Failed to fetch masters")
      }
    } catch (error) {
      console.error("Error fetching masters:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStrategyCodeMappings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/mappings/strategy-code`)
      if (response.ok) {
        const data = await response.json()
        console.log("Strategy-Code Mappings:", data)
        setStrategyCodeMappings(data)
        setSelectedMappingView("Strategy")
      } else {
        console.error("Failed to fetch strategy-code mappings", response.status)
      }
    } catch (error) {
      console.error("Error fetching strategy-code mappings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCodeExchangeMappings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/mappings/code-exchange`)
      if (response.ok) {
        const data = await response.json()
        console.log("Code-Exchange Mappings:", data)
        setCodeExchangeMappings(data)
        setSelectedMappingView("Code")
      } else {
        console.error("Failed to fetch code-exchange mappings", response.status)
      }
    } catch (error) {
      console.error("Error fetching code-exchange mappings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExchangeCommodityMappings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/mappings/exchange-commodity`)
      if (response.ok) {
        const data = await response.json()
        console.log("Exchange-Commodity Mappings:", data)
        setExchangeCommodityMappings(data)
        setSelectedMappingView("Exchange")
      } else {
        console.error("Failed to fetch exchange-commodity mappings", response.status)
      }
    } catch (error) {
      console.error("Error fetching exchange-commodity mappings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddValue = async () => {
    const trimmedValue = newValue.trim()
    if (!selectedMaster || !trimmedValue) {
      return
    }

    // Check if value already exists
    const existingValues = masters[selectedMaster] || []
    if (existingValues.some(v => v.name === trimmedValue)) {
      alert(`"${trimmedValue}" already exists in ${selectedMaster}`)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/masters/${selectedMaster}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedValue }),
      })

      if (response.ok) {
        const newMasterValue = await response.json()
        setMasters({
          ...masters,
          [selectedMaster]: [...(masters[selectedMaster] || []), newMasterValue]
        })
        setNewValue("")
        alert(`"${trimmedValue}" added successfully to ${selectedMaster}`)
      } else {
        const error = await response.json()
        alert(`Failed to add value: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error adding value:", error)
      alert("Error adding value. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddNewColumn = async () => {
    const trimmedName = newItemName.trim()
    if (!trimmedName) {
      alert('Please enter a name')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/masters/${addingType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (response.ok) {
        setShowAddDialog(false)
        setNewItemName('')
        // Refresh dropdown values to include new item as column
        await fetchDropdownValues()
        // Also refresh masters
        fetchAllMasters()
      } else {
        const error = await response.json()
        alert(`Failed to add ${addingType}: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error adding:", error)
      alert("Error adding. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = (type: 'Strategy' | 'Code' | 'Exchange') => {
    setAddingType(type)
    setNewItemName('')
    setShowAddDialog(true)
  }

  const openDeleteDialog = (name: string, type: 'Strategy' | 'Code' | 'Exchange') => {
    setDeletingItem({ name, type })
    setShowDeleteDialog(true)
  }

  const handleDeleteColumn = async () => {
    if (!deletingItem) return

    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/masters/${deletingItem.type}/by-name/${encodeURIComponent(deletingItem.name)}`,
        { method: "DELETE" }
      )

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        setShowDeleteDialog(false)
        setDeletingItem(null)
        // Refresh dropdown values and mappings
        await fetchDropdownValues()
        fetchAllMasters()
        // Refresh the current mapping view
        if (selectedMappingView === "Strategy") {
          fetchStrategyCodeMappings()
        } else if (selectedMappingView === "Code") {
          fetchCodeExchangeMappings()
        } else if (selectedMappingView === "Exchange") {
          fetchExchangeCommodityMappings()
        }
      } else {
        const error = await response.json()
        alert(`Failed to delete ${deletingItem.type}: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error deleting:", error)
      alert("Error deleting. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteValue = async (value: MasterValue) => {
    if (!selectedMaster || !confirm(`Are you sure you want to delete "${value.name}" from ${selectedMaster}?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/masters/${selectedMaster}/${value.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMasters({
          ...masters,
          [selectedMaster]: masters[selectedMaster].filter(v => v.id !== value.id)
        })
        alert(`"${value.name}" deleted successfully from ${selectedMaster}`)
      } else {
        const error = await response.json()
        alert(`Failed to delete value: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error deleting value:", error)
      alert("Error deleting value. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Masters Management</h1>
        <p className="text-muted-foreground mt-2">Manage dropdown values for form fields</p>
      </div>

      {loading && Object.keys(masters).length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Loading master data...</p>
      ) : (
        <>
          {/* Master Selection Dropdown */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Select Master</label>
            <Select value={selectedMaster} onValueChange={(value) => {
              setSelectedMaster(value)
              setCurrentPage(1) // Reset to first page when changing master
            }}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Choose a master to manage" />
              </SelectTrigger>
              <SelectContent>
                {/* Mapping option - special handling */}
                <SelectItem value="Mapping">Mapping</SelectItem>

                {/* Regular masters - only Broker and Status */}
                {Object.keys(masters)
                  .filter((masterName) =>
                    masterName !== "Contract Type" &&
                    masterName !== "Option Type" &&
                    masterName !== "Team Name" &&
                    masterName !== "Strategy" &&
                    masterName !== "Code" &&
                    masterName !== "Exchange" &&
                    masterName !== "Commodity"
                  )
                  .sort()
                  .map((masterName) => (
                    <SelectItem key={masterName} value={masterName}>
                      {masterName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display Mapping buttons or selected master's values */}
          {selectedMaster === "Mapping" ? (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Mapping Management</CardTitle>
                <CardDescription>
                  Manage relationships between masters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    variant={selectedMappingView === "Strategy" ? "default" : "outline"}
                    className="flex-1 h-20 text-lg font-medium"
                    onClick={fetchStrategyCodeMappings}
                  >
                    Strategy
                  </Button>
                  <Button
                    variant={selectedMappingView === "Code" ? "default" : "outline"}
                    className="flex-1 h-20 text-lg font-medium"
                    onClick={fetchCodeExchangeMappings}
                  >
                    Code
                  </Button>
                  <Button
                    variant={selectedMappingView === "Exchange" ? "default" : "outline"}
                    className="flex-1 h-20 text-lg font-medium"
                    onClick={fetchExchangeCommodityMappings}
                  >
                    Exchange
                  </Button>
                </div>

                <style>{`
                  .ag-theme-alpine .ag-cell {
                    border-right: 1px solid #babfc7 !important;
                    border-bottom: 1px solid #babfc7 !important;
                  }
                  .ag-theme-alpine .ag-header-cell {
                    border-right: 1px solid #babfc7 !important;
                  }
                  .ag-theme-alpine .ag-row {
                    border-bottom: none !important;
                  }
                `}</style>

                {/* Display Strategy-Code mappings in AG Grid: strategies as columns */}
                {selectedMappingView === "Strategy" && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">
                        Strategy-Code Master
                      </h3>
                      <div className="flex gap-2 items-center">
                        <SearchableDeleteDropdown
                          label="Search & Delete Strategy"
                          items={availableStrategies}
                          onSelect={(strategy) => openDeleteDialog(strategy, 'Strategy')}
                          placeholder="Search strategy..."
                        />
                        <Button onClick={() => openAddDialog('Strategy')}>
                          + Add New Strategy
                        </Button>
                      </div>
                    </div>
                    <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
                      <AgGridReact
                        rowData={gridRowData}
                        columnDefs={gridColDefs}
                        defaultColDef={{
                          resizable: true,
                          sortable: true,
                          filter: true,
                        }}
                        domLayout='normal'
                        onCellValueChanged={onCellValueChanged}
                        singleClickEdit={true}
                        stopEditingWhenCellsLoseFocus={true}
                      />
                    </div>
                  </div>
                )}

                {/* Display Code-Exchange mappings in AG Grid: codes as columns */}
                {selectedMappingView === "Code" && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">
                        Code-Exchange Master
                      </h3>
                      <div className="flex gap-2 items-center">
                        <SearchableDeleteDropdown
                          label="Search & Delete Code"
                          items={availableCodes}
                          onSelect={(code) => openDeleteDialog(code, 'Code')}
                          placeholder="Search code..."
                        />
                        <Button onClick={() => openAddDialog('Code')}>
                          + Add New Code
                        </Button>
                      </div>
                    </div>
                    <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
                      <AgGridReact
                        rowData={codeExchangeGridRowData}
                        columnDefs={codeExchangeGridColDefs}
                        defaultColDef={{
                          resizable: true,
                          sortable: true,
                          filter: true,
                        }}
                        domLayout='normal'
                        onCellValueChanged={onCodeExchangeCellValueChanged}
                        singleClickEdit={true}
                        stopEditingWhenCellsLoseFocus={true}
                      />
                    </div>
                  </div>
                )}

                {/* Display Exchange-Commodity mappings in AG Grid: exchanges as columns */}
                {selectedMappingView === "Exchange" && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">
                        Exchange-Commodity Master
                      </h3>
                      <div className="flex gap-2 items-center">
                        <SearchableDeleteDropdown
                          label="Search & Delete Exchange"
                          items={availableExchanges}
                          onSelect={(exchange) => openDeleteDialog(exchange, 'Exchange')}
                          placeholder="Search exchange..."
                        />
                        <Button onClick={() => openAddDialog('Exchange')}>
                          + Add New Exchange
                        </Button>
                      </div>
                    </div>
                    <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
                      <AgGridReact
                        rowData={exchangeCommodityGridRowData}
                        columnDefs={exchangeCommodityGridColDefs}
                        defaultColDef={{
                          resizable: true,
                          sortable: true,
                          filter: true,
                        }}
                        domLayout='normal'
                        onCellValueChanged={onExchangeCommodityCellValueChanged}
                        singleClickEdit={true}
                        stopEditingWhenCellsLoseFocus={true}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedMaster && masters[selectedMaster] ? (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>{selectedMaster}</CardTitle>
                <CardDescription>
                  Manage {selectedMaster.toLowerCase()} options
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add new value / Search filter */}
                <div className="flex gap-2 mb-4 pb-4 border-b">
                  <Input
                    placeholder={`Search or add new ${selectedMaster.toLowerCase()}`}
                    value={newValue}
                    onChange={(e) => {
                      setNewValue(e.target.value)
                      setCurrentPage(1) // Reset to first page when typing
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddValue()
                      }
                    }}
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleAddValue}
                    variant="default"
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add"}
                  </Button>
                </div>

                {/* List of existing values with pagination */}
                <div className="space-y-2">
                  {masters[selectedMaster].length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No values added yet
                    </p>
                  ) : (
                    <>
                      {masters[selectedMaster]
                        .filter((value) =>
                          value.name.toLowerCase().includes(newValue.toLowerCase())
                        )
                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                        .map((value) => (
                          <div
                            key={value.id}
                            className="flex items-center justify-between p-3 rounded border bg-slate-50 hover:bg-slate-100"
                          >
                            <span className="text-sm font-medium">{value.name}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteValue(value)}
                              className="h-7 px-3 text-xs"
                              disabled={loading}
                            >
                              Delete
                            </Button>
                          </div>
                        ))}

                      {/* Pagination controls */}
                      {(() => {
                        const filteredItems = masters[selectedMaster].filter((value) =>
                          value.name.toLowerCase().includes(newValue.toLowerCase())
                        )
                        return filteredItems.length > ITEMS_PER_PAGE && (
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                              {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of{' '}
                              {filteredItems.length} items
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredItems.length / ITEMS_PER_PAGE), prev + 1))}
                                disabled={currentPage >= Math.ceil(filteredItems.length / ITEMS_PER_PAGE)}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Add New Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {addingType}</DialogTitle>
            <DialogDescription>
              Enter the name for the new {addingType.toLowerCase()}. It will be added as a new column.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-item-name">{addingType} Name</Label>
            <Input
              id="new-item-name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Enter ${addingType.toLowerCase()} name`}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddNewColumn()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewColumn} disabled={loading}>
              {loading ? 'Adding...' : `Add ${addingType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deletingItem?.type}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This will also delete all associated mappings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false)
              setDeletingItem(null)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteColumn} disabled={loading}>
              {loading ? 'Deleting...' : `Delete ${deletingItem?.type}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
