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
  tradeType: z.string().min(1, "Trade type is required"),
  strikePrice: z.string().min(1, "Strike price is required"),
  optionType: z.string().min(1, "Option type is required"),
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
      tradeType: "",
      strikePrice: "",
      optionType: "",
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
          tradeType: values.tradeType,
          strikePrice: parseFloat(values.strikePrice),
          optionType: values.optionType,
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
          tradeType: "",
          strikePrice: "",
          optionType: "",
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
          tradeType: updatedEntry.tradeType || updatedEntry.trade_type,
          strikePrice: parseFloat(updatedEntry.strikePrice || updatedEntry.strike_price),
          optionType: updatedEntry.optionType || updatedEntry.option_type,
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
              {/* Strategy - Dropdown */}
              <FormField
                control={form.control}
                name="strategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters.Strategy?.map((item) => (
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

              {/* Code - Dropdown */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters.Code?.map((item) => (
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

              {/* Exchange - Dropdown */}
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters.Exchange?.map((item) => (
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

              {/* Commodity - Dropdown */}
              <FormField
                control={form.control}
                name="commodity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commodity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select commodity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters.Commodity?.map((item) => (
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

              {/* Trade Type - Dropdown */}
              <FormField
                control={form.control}
                name="tradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trade type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters["Trade Type"]?.map((item) => (
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

              {/* Client Code - Dropdown */}
              <FormField
                control={form.control}
                name="clientCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Code</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters["Client Code"]?.map((item) => (
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

              {/* Broker - Dropdown */}
              <FormField
                control={form.control}
                name="broker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broker</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select broker" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {masters.Broker?.map((item) => (
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

              {/* Status - Text Input */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter status" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
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
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      </div>
    </div>
  )
}
