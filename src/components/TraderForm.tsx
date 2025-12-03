import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AutocompleteField } from "@/components/ui/autocomplete-field"
import { DatePicker } from "@/components/ui/date-picker"
import { TraderDataGrid } from "@/components/TraderDataGrid"
import type { MasterData } from "@/types"
import { API_BASE_URL } from "@/constants"

const formSchema = z.object({
  date: z.string(),
  strategy: z.string().min(1, "Strategy is required"),
  code: z.string().min(1, "Code is required"),
  exchange: z.string().min(1, "Exchange is required"),
  commodity: z.string().min(1, "Commodity is required"),
  expiry: z.string().min(1, "Expiry is required"),
  contractType: z.string().min(1, "Contract type is required"),
  strikePrice: z.string().min(1, "Strike price is required"),
  optionType: z.string().min(1, "Option type is required"),
  buyQty: z.string().optional(),
  buyAvg: z.string().optional(),
  sellQty: z.string().optional(),
  sellAvg: z.string().optional(),
  clientCode: z.string().min(1, "Client code is required"),
  broker: z.string().min(1, "Broker is required"),
  teamName: z.string().min(1, "Team name is required"),
  status: z.string().min(1, "Status is required"),
  remark: z.string().min(1, "Remark is required"),
  tag: z.string().min(1, "Tag is required"),
})

type FormValues = z.infer<typeof formSchema>

export function TraderForm() {
  const { token } = useAuth()
  const todayDate = new Date().toISOString().split('T')[0]
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [masters, setMasters] = useState<MasterData>({})
  const [currentDate, setCurrentDate] = useState(todayDate)

  // Cascading dropdown states
  const [filteredCodes, setFilteredCodes] = useState<any[]>([])
  const [filteredExchanges, setFilteredExchanges] = useState<any[]>([])
  const [filteredCommodities, setFilteredCommodities] = useState<any[]>([])
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null)
  const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null)
  const [selectedExchangeId, setSelectedExchangeId] = useState<number | null>(null)

  // Helper to focus next field
  const focusNextField = (currentInput: HTMLInputElement) => {
    const form = currentInput.closest('form')
    if (!form) return
    const focusables = Array.from(form.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), button:not([disabled]):not([type="button"]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )).filter(el => el.offsetParent !== null) // visible elements only
    const currentIndex = focusables.indexOf(currentInput)
    if (currentIndex !== -1 && currentIndex < focusables.length - 1) {
      focusables[currentIndex + 1]?.focus()
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: todayDate,
      strategy: "",
      code: "",
      exchange: "",
      commodity: "",
      expiry: "",
      contractType: "",
      strikePrice: "",
      optionType: "",
      buyQty: "",
      buyAvg: "",
      sellQty: "",
      sellAvg: "",
      clientCode: "",
      broker: "",
      teamName: "",
      status: "",
      remark: "",
      tag: "",
    },
  })

  // Fetch master data from API
  const fetchMasters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/masters`)
      if (response.ok) {
        const data = await response.json()
        setMasters(data)
      } else {
        console.error("Failed to fetch masters")
      }
    } catch (error) {
      console.error("Error fetching masters:", error)
    }
  }

  // Fetch codes based on selected strategy
  const fetchCodesByStrategy = async (strategyId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cascading/codes/${strategyId}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredCodes(data)
      } else {
        console.error("Failed to fetch codes for strategy")
        setFilteredCodes([])
      }
    } catch (error) {
      console.error("Error fetching codes:", error)
      setFilteredCodes([])
    }
  }

  // Fetch exchanges based on selected code
  const fetchExchangesByCode = async (codeId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cascading/exchanges/${codeId}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredExchanges(data)
      } else {
        console.error("Failed to fetch exchanges for code")
        setFilteredExchanges([])
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error)
      setFilteredExchanges([])
    }
  }

  // Fetch commodities based on selected exchange
  const fetchCommoditiesByExchange = async (exchangeId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cascading/commodities/${exchangeId}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredCommodities(data)
      } else {
        console.error("Failed to fetch commodities for exchange")
        setFilteredCommodities([])
      }
    } catch (error) {
      console.error("Error fetching commodities:", error)
      setFilteredCommodities([])
    }
  }

  // Fetch entries from API
  const fetchEntries = async (date: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/trade-entries/date/${date}`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      })
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error("Error fetching entries:", error)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch masters on component mount
  useEffect(() => {
    fetchMasters()
  }, [])

  // Fetch entries for initial date on mount
  useEffect(() => {
    const initialDate = form.getValues("date")
    if (initialDate) {
      setCurrentDate(initialDate)
      fetchEntries(initialDate)
    }
  }, [])

  // Submit new entry to API
  async function onSubmit(values: FormValues) {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/trade-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trade_date: values.date,
          strategy: values.strategy,
          code: values.code,
          exchange: values.exchange,
          commodity: values.commodity,
          expiry: values.expiry,
          contractType: values.contractType,
          strikePrice: parseFloat(values.strikePrice),
          optionType: values.optionType,
          buyQty: values.buyQty ? parseInt(values.buyQty) : null,
          buyAvg: values.buyAvg ? parseFloat(values.buyAvg) : null,
          sellQty: values.sellQty ? parseInt(values.sellQty) : null,
          sellAvg: values.sellAvg ? parseFloat(values.sellAvg) : null,
          clientCode: values.clientCode,
          broker: values.broker,
          teamName: values.teamName,
          status: values.status,
          remark: values.remark,
          tag: values.tag,
        }),
      })

      if (response.ok) {
        alert("Entry saved successfully!")
        form.reset({
          date: values.date,
          strategy: "",
          code: "",
          exchange: "",
          commodity: "",
          expiry: "",
          contractType: "",
          strikePrice: "",
          optionType: "",
          buyQty: "",
          buyAvg: "",
          sellQty: "",
          sellAvg: "",
          clientCode: "",
          broker: "",
          teamName: "",
          status: "",
          remark: "",
          tag: "",
        })
        // Reload entries
        fetchEntries(values.date)
      } else {
        const error = await response.json()
        alert(`Failed to save entry: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error submitting entry:", error)
      alert("Error submitting entry. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Update entry via API
  const handleUpdateEntry = async (id: number, updatedEntry: any) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/trade-entries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trade_date: updatedEntry.trade_date || updatedEntry.date,
          strategy: updatedEntry.strategy,
          code: updatedEntry.code,
          exchange: updatedEntry.exchange,
          commodity: updatedEntry.commodity,
          expiry: updatedEntry.expiry,
          contractType: updatedEntry.contractType || updatedEntry.contract_type,
          strikePrice: parseFloat(updatedEntry.strikePrice || updatedEntry.strike_price),
          optionType: updatedEntry.optionType || updatedEntry.option_type,
          buyQty: updatedEntry.buyQty || updatedEntry.buy_qty,
          buyAvg: updatedEntry.buyAvg || updatedEntry.buy_avg,
          sellQty: updatedEntry.sellQty || updatedEntry.sell_qty,
          sellAvg: updatedEntry.sellAvg || updatedEntry.sell_avg,
          clientCode: updatedEntry.clientCode || updatedEntry.client_code,
          broker: updatedEntry.broker,
          teamName: updatedEntry.teamName || updatedEntry.team_name,
          status: updatedEntry.status,
          remark: updatedEntry.remark,
          tag: updatedEntry.tag,
        }),
      })

      if (response.ok) {
        alert("Entry updated successfully!")
        fetchEntries(form.watch("date"))
      } else {
        const error = await response.json()
        alert(`Failed to update entry: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error updating entry:", error)
      alert("Error updating entry. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Delete entry via API
  const handleDeleteEntry = async (id: number) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/trade-entries/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Entry deleted successfully!")
        fetchEntries(form.watch("date"))
      } else {
        const error = await response.json()
        alert(`Failed to delete entry: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error deleting entry:", error)
      alert("Error deleting entry. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full py-6">
      <div className="w-full px-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header */}
            <h1 className="text-3xl font-bold mb-8">Trade Entry Form</h1>

            {/* Trade Date - First row */}
            <div className="mb-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="w-80">
                    <FormLabel>Trade Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(date) => {
                          field.onChange(date)
                          if (date) {
                            setCurrentDate(date)
                            fetchEntries(date)
                          }
                        }}
                        placeholder="Select trade date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Remaining 15 fields in responsive grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Strategy - Autocomplete */}
              <FormField
                control={form.control}
                name="strategy"
                render={({ field }) => (
                  <AutocompleteField
                    label="Strategy"
                    placeholder="Type to search strategy..."
                    value={field.value}
                    options={masters.Strategy || []}
                    onSelect={(item) => {
                      field.onChange(item.name)
                      setSelectedStrategyId(item.id)
                      fetchCodesByStrategy(item.id)
                      form.setValue("code", "")
                      form.setValue("exchange", "")
                      form.setValue("commodity", "")
                      setFilteredExchanges([])
                      setFilteredCommodities([])
                    }}
                    onClear={() => {
                      field.onChange("")
                      setSelectedStrategyId(null)
                      setFilteredCodes([])
                      setFilteredExchanges([])
                      setFilteredCommodities([])
                      form.setValue("code", "")
                      form.setValue("exchange", "")
                      form.setValue("commodity", "")
                    }}
                    focusNextField={focusNextField}
                  />
                )}
              />

              {/* Code - Autocomplete */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <AutocompleteField
                    label="Code"
                    placeholder="Type to search code..."
                    disabledPlaceholder="Select strategy first"
                    value={field.value}
                    options={filteredCodes}
                    disabled={!selectedStrategyId}
                    onSelect={(item) => {
                      field.onChange(item.name)
                      setSelectedCodeId(item.id)
                      fetchExchangesByCode(item.id)
                      form.setValue("exchange", "")
                      form.setValue("commodity", "")
                      setFilteredCommodities([])
                    }}
                    onClear={() => {
                      field.onChange("")
                      setSelectedCodeId(null)
                      setFilteredExchanges([])
                      setFilteredCommodities([])
                      form.setValue("exchange", "")
                      form.setValue("commodity", "")
                    }}
                    focusNextField={focusNextField}
                  />
                )}
              />

              {/* Exchange - Autocomplete */}
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <AutocompleteField
                    label="Exchange"
                    placeholder="Type to search exchange..."
                    disabledPlaceholder="Select code first"
                    value={field.value}
                    options={filteredExchanges}
                    disabled={!selectedCodeId}
                    onSelect={(item) => {
                      field.onChange(item.name)
                      setSelectedExchangeId(item.id)
                      fetchCommoditiesByExchange(item.id)
                      form.setValue("commodity", "")
                    }}
                    onClear={() => {
                      field.onChange("")
                      setSelectedExchangeId(null)
                      setFilteredCommodities([])
                      form.setValue("commodity", "")
                    }}
                    focusNextField={focusNextField}
                  />
                )}
              />

              {/* Commodity - Autocomplete */}
              <FormField
                control={form.control}
                name="commodity"
                render={({ field }) => (
                  <AutocompleteField
                    label="Commodity"
                    placeholder="Type to search commodity..."
                    disabledPlaceholder="Select exchange first"
                    value={field.value}
                    options={filteredCommodities}
                    disabled={!selectedExchangeId}
                    onSelect={(item) => {
                      field.onChange(item.name)
                    }}
                    onClear={() => {
                      field.onChange("")
                    }}
                    focusNextField={focusNextField}
                  />
                )}
              />

              {/* Expiry - Date Picker */}
              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select expiry date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contract Type - Dropdown */}
              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contract type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters["Contract Type"]?.map((item) => (
                          <SelectItem key={item.id} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Strike Price - Text Input */}
              <FormField
                control={form.control}
                name="strikePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strike Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter strike price" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Option Type - Dropdown */}
              <FormField
                control={form.control}
                name="optionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters["Option Type"]?.map((item) => (
                          <SelectItem key={item.id} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buy Qty - Number Input */}
              <FormField
                control={form.control}
                name="buyQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy Qty</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter buy quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buy Avg - Number Input */}
              <FormField
                control={form.control}
                name="buyAvg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy Avg</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Enter buy average" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sell Qty - Number Input */}
              <FormField
                control={form.control}
                name="sellQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sell Qty</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter sell quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sell Avg - Number Input */}
              <FormField
                control={form.control}
                name="sellAvg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sell Avg</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Enter sell average" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Code - Text Input */}
              <FormField
                control={form.control}
                name="clientCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Broker - Autocomplete */}
              <FormField
                control={form.control}
                name="broker"
                render={({ field }) => (
                  <AutocompleteField
                    label="Broker"
                    placeholder="Type to search broker..."
                    value={field.value}
                    options={masters.Broker || []}
                    onSelect={(item) => field.onChange(item.name)}
                    onClear={() => field.onChange("")}
                    focusNextField={focusNextField}
                  />
                )}
              />

              {/* Team Name - Dropdown */}
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters["Team Name"]?.map((item) => (
                          <SelectItem key={item.id} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status - Autocomplete */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <AutocompleteField
                    label="Status"
                    placeholder="Type to search status..."
                    value={field.value}
                    options={masters["Status"] || []}
                    onSelect={(item) => field.onChange(item.name)}
                    onClear={() => field.onChange("")}
                    focusNextField={focusNextField}
                  />
                )}
              />

              {/* Remark - Text Input */}
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter remark" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tag - Text Input */}
              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tag" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-center mt-8">
              <Button type="submit" size="lg">
                Submit Entry
              </Button>
            </div>
          </form>
        </Form>

        {/* Data Grid displaying entries for the selected date */}
        <TraderDataGrid
          date={currentDate}
          entries={entries}
          masters={masters}
          token={token}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onUploadSuccess={() => fetchEntries(currentDate)}
          onDateChange={(newDate) => {
            setCurrentDate(newDate)
            fetchEntries(newDate)
          }}
        />
      </div>
    </div>
  )
}
