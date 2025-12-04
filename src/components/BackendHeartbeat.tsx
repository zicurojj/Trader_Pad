import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/constants'
import { Activity } from 'lucide-react'

export function BackendHeartbeat() {
  const [isConnected, setIsConnected] = useState<boolean>(true)

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        setIsConnected(response.ok)
      } catch (error) {
        setIsConnected(false)
      }
    }

    // Check immediately on mount
    checkBackendHealth()

    // Then check every 10 seconds
    const interval = setInterval(checkBackendHealth, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 h-1 z-50 ${
          isConnected
            ? 'bg-green-500'
            : 'bg-red-600 animate-pulse'
        }`}
      />
      <div className="fixed top-2 right-4 z-50">
        <div
          className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ${
            isConnected
              ? 'bg-green-500 text-white'
              : 'bg-red-600 text-white animate-pulse'
          }`}
        >
          <Activity className="h-3 w-3" strokeWidth={3.5} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </>
  )
}
