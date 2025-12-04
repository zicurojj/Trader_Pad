import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/constants'

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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`px-20 py-1.5 rounded-lg border-4 shadow-lg ${
        isConnected
          ? 'bg-green-50 border-green-500'
          : 'bg-red-50 border-red-600 animate-pulse'
      }`}>
        <span className={`text-sm font-semibold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}
