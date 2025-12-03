from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional

class TradeEntryBase(BaseModel):
    """Base model for Trade Entry with all required fields"""
    trade_date: date
    strategy: str
    code: str
    exchange: str
    commodity: str
    expiry: date
    contract_type: str = Field(..., alias="contractType")
    strike_price: float = Field(..., alias="strikePrice")
    option_type: str = Field(..., alias="optionType")
    buy_qty: Optional[int] = Field(None, alias="buyQty")
    buy_avg: Optional[float] = Field(None, alias="buyAvg")
    sell_qty: Optional[int] = Field(None, alias="sellQty")
    sell_avg: Optional[float] = Field(None, alias="sellAvg")
    client_code: str = Field(..., alias="clientCode")
    broker: str
    team_name: str = Field(..., alias="teamName")
    status: str
    remark: str
    tag: str

    class Config:
        populate_by_name = True  # Allow using both snake_case and camelCase


class TradeEntryCreate(TradeEntryBase):
    """Model for creating a new trade entry (no ID)"""
    pass


class TradeEntryUpdate(TradeEntryBase):
    """Model for updating an existing trade entry"""
    pass


class TradeEntryResponse(TradeEntryBase):
    """Model for returning trade entry data (includes ID and timestamps)"""
    id: int
    username: str
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class DeleteResponse(BaseModel):
    """Response model for delete operations"""
    message: str
    id: int


# ============================================
# MASTER DATA MODELS
# ============================================

class MasterValueBase(BaseModel):
    """Base model for master values"""
    name: str

class MasterValueCreate(MasterValueBase):
    """Model for creating a new master value"""
    pass

class MasterValueResponse(MasterValueBase):
    """Model for returning master value data"""
    id: int
    created_at: str = Field(..., alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True

class MasterCategoryResponse(BaseModel):
    """Model for returning all values in a master category"""
    category: str
    values: list[MasterValueResponse]


# ============================================
# AUTHENTICATION MODELS
# ============================================

class LoginRequest(BaseModel):
    """Model for login request"""
    username: str
    password: str

class LoginResponse(BaseModel):
    """Model for login response"""
    token: str
    username: str
    role: str
    message: str

class UserBase(BaseModel):
    """Base model for User"""
    username: str

class UserCreate(UserBase):
    """Model for creating a new user"""
    password: str
    role: str = "user"

class UserUpdate(BaseModel):
    """Model for updating user password"""
    password: str

class UserResponse(UserBase):
    """Model for returning user data"""
    id: int
    role: str
    last_login: Optional[str] = Field(None, alias="lastLogin")
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True

class SessionResponse(BaseModel):
    """Model for session validation response"""
    valid: bool
    username: Optional[str] = None
    role: Optional[str] = None
