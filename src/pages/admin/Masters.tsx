import { useState, useEffect } from "react"
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
import type { MasterValue, MasterData } from "@/types"
import { API_BASE_URL } from "@/constants"

export function Masters() {
  const [masters, setMasters] = useState<MasterData>({})
  const [selectedMaster, setSelectedMaster] = useState<string>("")
  const [newValue, setNewValue] = useState<string>("")
  const [loading, setLoading] = useState(false)

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
            <Select value={selectedMaster} onValueChange={setSelectedMaster}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Choose a master to manage" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(masters).sort().map((masterName) => (
                  <SelectItem key={masterName} value={masterName}>
                    {masterName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display selected master's values */}
          {selectedMaster && masters[selectedMaster] && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>{selectedMaster}</CardTitle>
                <CardDescription>
                  Manage {selectedMaster.toLowerCase()} options
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* List of existing values */}
                <div className="space-y-2 mb-4">
                  {masters[selectedMaster].length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No values added yet
                    </p>
                  ) : (
                    masters[selectedMaster].map((value) => (
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
                    ))
                  )}
                </div>

                {/* Add new value */}
                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder={`Add new ${selectedMaster.toLowerCase()}`}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
