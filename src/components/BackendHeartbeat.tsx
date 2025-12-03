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
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className={`h-1 ${isConnected ? 'bg-green-500' : 'bg-red-600 animate-pulse'}`}></div>
      <div className={`px-4 py-1 text-center ${isConnected ? 'bg-green-50' : 'bg-red-50'}`}>
        <span className={`text-xs font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}
