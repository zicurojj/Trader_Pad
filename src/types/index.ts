// Shared types for the application

export interface MasterValue {
  id: number
  name: string
  createdAt: string
}

export interface MasterData {
  [key: string]: MasterValue[]
}

export interface TraderEntry {
  id: number
  strategy: string
  code: string
  exchange: string
  commodity: string
  expiry: string
  contractType: string
  tradeType: string
  strikePrice: string
  optionType: string
  clientCode: string
  broker: string
  teamName: string
  status: string
  remark: string
  tag: string
}
