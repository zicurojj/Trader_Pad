import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TraderDataGrid } from '@/components/TraderDataGrid';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MasterData } from '@/types';
import { API_BASE_URL } from '@/constants';

export function AllTradeEntries() {
  const { token } = useAuth();
  const todayDate = new Date().toISOString().split('T')[0];
  const [currentDate, setCurrentDate] = useState(todayDate);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [masters, setMasters] = useState<MasterData>({});

  // Fetch master data from API
  const fetchMasters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/masters`);
      if (response.ok) {
        const data = await response.json();
        setMasters(data);
      } else {
        console.error('Failed to fetch masters');
      }
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  // Fetch entries from API
  const fetchEntries = async (date: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/trade-entries/date/${date}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        setError('Failed to fetch trade entries');
        console.error('Failed to fetch entries');
      }
    } catch (error) {
      setError('Error fetching trade entries');
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
    fetchEntries(currentDate);
  }, []);

  const handleDateChange = (date: string) => {
    setCurrentDate(date);
    fetchEntries(date);
  };

  // Update entry via API
  const handleUpdateEntry = async (id: number, updatedEntry: any) => {
    try {
      setLoading(true);
      const strikeVal = updatedEntry.strikePrice ?? updatedEntry.strike_price;
      const response = await fetch(`${API_BASE_URL}/trade-entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trade_date: updatedEntry.trade_date || updatedEntry.date,
          strategy: updatedEntry.strategy,
          code: updatedEntry.code,
          exchange: updatedEntry.exchange,
          commodity: updatedEntry.commodity,
          expiry: updatedEntry.expiry,
          contractType: updatedEntry.contractType || updatedEntry.contract_type,
          strikePrice: strikeVal ? parseFloat(strikeVal) : null,
          optionType: updatedEntry.optionType ?? updatedEntry.option_type ?? null,
          buyQty: updatedEntry.buyQty ?? updatedEntry.buy_qty ?? null,
          buyAvg: updatedEntry.buyAvg ?? updatedEntry.buy_avg ?? null,
          sellQty: updatedEntry.sellQty ?? updatedEntry.sell_qty ?? null,
          sellAvg: updatedEntry.sellAvg ?? updatedEntry.sell_avg ?? null,
          clientCode: updatedEntry.clientCode ?? updatedEntry.client_code ?? null,
          broker: updatedEntry.broker,
          teamName: updatedEntry.teamName || updatedEntry.team_name,
          status: updatedEntry.status,
          remark: updatedEntry.remark || null,
          tag: updatedEntry.tag || null,
        }),
      });

      if (response.ok) {
        alert('Entry updated successfully!');
        fetchEntries(currentDate);
      } else {
        const errorData = await response.json();
        let errorMessage = 'Unknown error';
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        }
        alert(`Failed to update entry: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Error updating entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete entry via API
  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/trade-entries/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        alert('Entry deleted successfully!');
        fetchEntries(currentDate);
      } else {
        const errorData = await response.json();
        let errorMessage = 'Unknown error';
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        }
        alert(`Failed to delete entry: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full py-6">
      <div className="w-full px-4">
        <Card>
          <CardHeader>
            <CardTitle>All Trade Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8">Loading entries...</div>
            ) : (
              <TraderDataGrid
                date={currentDate}
                entries={entries}
                masters={masters}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onDateChange={handleDateChange}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
