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

export interface ManualTradeEntry {
  id?: number
  tradeDate: string
  strategy: string
  code: string
  exchange: string
  commodity: string
  expiry: string
  contractType: string
  tradeType: string
  strikePrice: number
  optionType: string
  clientCode: string
  broker: string
  teamName: string
  quantity: number
  entryPrice?: number
  exitPrice?: number
  pnl?: number
  status: string
  remark?: string
  tag?: string
  entryTime?: string
  exitTime?: string
  createdAt?: string
  updatedAt?: string
}

export interface ManualTradeEntryCreate {
  id?: number
  tradeDate: string
  strategy: string
  code: string
  exchange: string
  commodity: string
  expiry: string
  contractType: string
  tradeType: string
  strikePrice: number
  optionType: string
  clientCode: string
  broker: string
  teamName: string
  quantity: number
  entryPrice?: number
  exitPrice?: number
  pnl?: number
  status?: string
  remark?: string
  tag?: string
  entryTime?: string
  exitTime?: string
}
