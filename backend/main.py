from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from typing import List, Optional

from models import (
    TradeEntryCreate,
    TradeEntryUpdate,
    TradeEntryResponse,
    DeleteResponse,
    MasterValueCreate,
    MasterValueResponse,
    MasterCategoryResponse,
    ManualTradeEntryCreate,
    ManualTradeEntryUpdate,
    ManualTradeEntryResponse,
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
    SessionResponse
)
from database import get_db
import crud
import auth

# Create FastAPI app
app = FastAPI(
    title="Trader Entry API",
    description="API for managing trader entries",
    version="1.0.0"
)

# Configure CORS - Allow React frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Allow all headers
)


@app.get("/")
def read_root():
    """Root endpoint - API health check"""
    return {
        "message": "Trader Entry API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.post("/api/trade-entries", response_model=TradeEntryResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_trade_entry(entry: TradeEntryCreate, authorization: Optional[str] = Header(None)):
    """
    Create a new trade entry.

    - **entry**: Trade entry data from the form
    - Returns the created entry with ID and timestamps
    """
    try:
        # Verify authentication and get user session
        session = auth.verify_token(authorization)
        username = session["username"]

        with get_db() as conn:
            entry_id = crud.create_trade_entry(conn, entry, username)
            created_entry = crud.get_trade_entry_by_id(conn, entry_id)

            if not created_entry:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Entry created but could not be retrieved"
                )

            return created_entry

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating trade entry: {str(e)}"
        )


@app.get("/api/trade-entries/date/{trade_date}", response_model=List[TradeEntryResponse], response_model_by_alias=True)
def get_trade_entries_by_date(trade_date: date, authorization: Optional[str] = Header(None)):
    """
    Get trade entries for a specific date.
    - Admin users see all entries for the date
    - Regular users see only their own entries for the date

    - **trade_date**: Date in YYYY-MM-DD format
    - Returns list of trade entries for that date
    """
    try:
        # Verify authentication and get user session
        session = auth.verify_token(authorization)
        username = session["username"]
        role = session.get("role")

        with get_db() as conn:
            # Admin sees all entries, regular users see only their own
            if role == "admin":
                entries = crud.get_trade_entries_by_date(conn, trade_date)
            else:
                entries = crud.get_trade_entries_by_date_and_username(conn, trade_date, username)
            return entries

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trade entries: {str(e)}"
        )


@app.get("/api/trade-entries", response_model=List[TradeEntryResponse], response_model_by_alias=True)
def get_all_trade_entries(authorization: Optional[str] = Header(None)):
    """
    Get all trade entries (admin only - returns all entries sorted by date).

    - Returns list of all trade entries
    """
    try:
        # Verify authentication and check if user is admin
        session = auth.verify_token(authorization)
        if session.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view all trade entries"
            )

        with get_db() as conn:
            entries = crud.get_all_trade_entries(conn)
            return entries

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trade entries: {str(e)}"
        )


@app.get("/api/trade-entries/{entry_id}", response_model=TradeEntryResponse, response_model_by_alias=True)
def get_trade_entry(entry_id: int):
    """
    Get a specific trade entry by ID.

    - **entry_id**: Trade entry ID
    - Returns the trade entry data
    """
    try:
        with get_db() as conn:
            entry = crud.get_trade_entry_by_id(conn, entry_id)

            if not entry:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Trade entry with ID {entry_id} not found"
                )

            return entry

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trade entry: {str(e)}"
        )


@app.put("/api/trade-entries/{entry_id}", response_model=TradeEntryResponse, response_model_by_alias=True)
def update_trade_entry(entry_id: int, entry: TradeEntryUpdate, authorization: Optional[str] = Header(None)):
    """
    Update an existing trade entry.

    - **entry_id**: Trade entry ID to update
    - **entry**: Updated trade entry data
    - Returns the updated entry
    """
    try:
        # Verify authentication and get user session
        session = auth.verify_token(authorization)
        username = session["username"]

        with get_db() as conn:
            success = crud.update_trade_entry(conn, entry_id, entry, username)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Trade entry with ID {entry_id} not found"
                )

            updated_entry = crud.get_trade_entry_by_id(conn, entry_id)
            return updated_entry

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating trade entry: {str(e)}"
        )


@app.delete("/api/trade-entries/{entry_id}", response_model=DeleteResponse)
def delete_trade_entry(entry_id: int):
    """
    Delete a trade entry.

    - **entry_id**: Trade entry ID to delete
    - Returns success message
    """
    try:
        with get_db() as conn:
            success = crud.delete_trade_entry(conn, entry_id)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Trade entry with ID {entry_id} not found"
                )

            return {
                "message": "Trade entry deleted successfully",
                "id": entry_id
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting trade entry: {str(e)}"
        )


# ============================================
# MASTER DATA ENDPOINTS
# ============================================

@app.get("/api/masters")
def get_all_masters():
    """
    Get all master data for all categories.

    - Returns a dictionary with category names as keys and lists of master values
    """
    try:
        with get_db() as conn:
            masters = crud.get_all_masters(conn)
            # Transform snake_case to camelCase for consistency
            transformed = {}
            for category, values in masters.items():
                transformed[category] = [
                    {
                        "id": v["id"],
                        "name": v["name"],
                        "createdAt": v["created_at"]
                    }
                    for v in values
                ]

            # Add fixed masters (Contract Type, Option Type, Team Name) - not editable in Masters tab
            cursor = conn.cursor()

            # Fetch Contract Type
            cursor.execute("SELECT id, name, created_at FROM master_contract_type ORDER BY name ASC")
            transformed["Contract Type"] = [
                {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}
                for row in cursor.fetchall()
            ]

            # Fetch Option Type
            cursor.execute("SELECT id, name, created_at FROM master_option_type ORDER BY name ASC")
            transformed["Option Type"] = [
                {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}
                for row in cursor.fetchall()
            ]

            # Fetch Team Name
            cursor.execute("SELECT id, name, created_at FROM master_team_name ORDER BY name ASC")
            transformed["Team Name"] = [
                {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}
                for row in cursor.fetchall()
            ]

            return transformed
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching master data: {str(e)}"
        )


@app.get("/api/masters/{category}", response_model=List[MasterValueResponse], response_model_by_alias=True)
def get_master_category(category: str):
    """
    Get all values for a specific master category.

    - **category**: Master category name (e.g., "Strategy", "Exchange", etc.)
    - Returns list of master values for that category
    """
    try:
        with get_db() as conn:
            values = crud.get_master_values(conn, category)
            return values
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching master category: {str(e)}"
        )


@app.post("/api/masters/{category}", response_model=MasterValueResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_master_value(category: str, value: MasterValueCreate):
    """
    Create a new value in a master category.

    - **category**: Master category name
    - **value**: Master value data (name field)
    - Returns the created master value with ID
    """
    try:
        with get_db() as conn:
            value_id = crud.create_master_value(conn, category, value.name)

            # Fetch the created value
            cursor = conn.cursor()
            table_name = crud.MASTER_TABLE_MAP.get(category)

            cursor.execute(f"""
                SELECT id, name, created_at
                FROM {table_name}
                WHERE id = ?
            """, (value_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Value created but could not be retrieved"
                )

            return dict(row)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating master value: {str(e)}"
        )


@app.delete("/api/masters/{category}/{value_id}", response_model=DeleteResponse)
def delete_master_value(category: str, value_id: int):
    """
    Delete a value from a master category.

    - **category**: Master category name
    - **value_id**: ID of the value to delete
    - Returns success message
    """
    try:
        with get_db() as conn:
            success = crud.delete_master_value(conn, category, value_id)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Value with ID {value_id} not found in {category}"
                )

            return {
                "message": f"Master value deleted successfully from {category}",
                "id": value_id
            }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting master value: {str(e)}"
        )


# ============================================
# MAPPING ENDPOINTS
# ============================================

@app.get("/api/mappings/strategy-code")
def get_strategy_code_mappings():
    """
    Get all strategy-code mappings with names.

    Returns list of mappings with strategy and code names.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    s.id as strategy_id,
                    s.name as strategy_name,
                    c.id as code_id,
                    c.name as code_name
                FROM strategy_code sc
                JOIN strategy s ON sc.strategy_id = s.id
                JOIN code c ON sc.code_id = c.id
                ORDER BY s.name, c.name
            """)

            mappings = []
            for row in cursor.fetchall():
                mappings.append({
                    "strategyId": row["strategy_id"],
                    "strategy": row["strategy_name"],
                    "codeId": row["code_id"],
                    "code": row["code_name"]
                })

            return mappings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching strategy-code mappings: {str(e)}"
        )


@app.post("/api/mappings/strategy-code", status_code=status.HTTP_201_CREATED)
def create_strategy_code_mapping(mapping: dict):
    """
    Create a new strategy-code mapping.

    - **strategyName**: Name of the strategy
    - **codeName**: Name of the code to map
    """
    try:
        strategy_name = mapping.get("strategyName")
        code_name = mapping.get("codeName")

        if not strategy_name or not code_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both strategyName and codeName are required"
            )

        with get_db() as conn:
            cursor = conn.cursor()

            # Get strategy ID
            cursor.execute("SELECT id FROM strategy WHERE name = ?", (strategy_name,))
            strategy_row = cursor.fetchone()
            if not strategy_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Strategy '{strategy_name}' not found"
                )
            strategy_id = strategy_row["id"]

            # Get code ID
            cursor.execute("SELECT id FROM code WHERE name = ?", (code_name,))
            code_row = cursor.fetchone()
            if not code_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Code '{code_name}' not found"
                )
            code_id = code_row["id"]

            # Check if mapping already exists
            cursor.execute(
                "SELECT 1 FROM strategy_code WHERE strategy_id = ? AND code_id = ?",
                (strategy_id, code_id)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mapping between '{strategy_name}' and '{code_name}' already exists"
                )

            # Create mapping
            cursor.execute(
                "INSERT INTO strategy_code (strategy_id, code_id) VALUES (?, ?)",
                (strategy_id, code_id)
            )

            return {
                "message": "Mapping created successfully",
                "strategyId": strategy_id,
                "strategy": strategy_name,
                "codeId": code_id,
                "code": code_name
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating strategy-code mapping: {str(e)}"
        )


@app.delete("/api/mappings/strategy-code")
def delete_strategy_code_mapping(strategyName: str, codeName: str):
    """
    Delete a strategy-code mapping.

    - **strategyName**: Name of the strategy
    - **codeName**: Name of the code
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get strategy ID
            cursor.execute("SELECT id FROM strategy WHERE name = ?", (strategyName,))
            strategy_row = cursor.fetchone()
            if not strategy_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Strategy '{strategyName}' not found"
                )
            strategy_id = strategy_row["id"]

            # Get code ID
            cursor.execute("SELECT id FROM code WHERE name = ?", (codeName,))
            code_row = cursor.fetchone()
            if not code_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Code '{codeName}' not found"
                )
            code_id = code_row["id"]

            # Delete mapping
            cursor.execute(
                "DELETE FROM strategy_code WHERE strategy_id = ? AND code_id = ?",
                (strategy_id, code_id)
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Mapping between '{strategyName}' and '{codeName}' not found"
                )

            return {
                "message": "Mapping deleted successfully",
                "strategy": strategyName,
                "code": codeName
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting strategy-code mapping: {str(e)}"
        )


# ============================================
# CODE-EXCHANGE MAPPING ENDPOINTS
# ============================================

@app.get("/api/mappings/code-exchange")
def get_code_exchange_mappings():
    """
    Get all code-exchange mappings with names.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    c.id as code_id,
                    c.name as code_name,
                    e.id as exchange_id,
                    e.name as exchange_name
                FROM code_exchange ce
                JOIN code c ON ce.code_id = c.id
                JOIN exchange e ON ce.exchange_id = e.id
                ORDER BY c.name, e.name
            """)

            mappings = []
            for row in cursor.fetchall():
                mappings.append({
                    "codeId": row["code_id"],
                    "code": row["code_name"],
                    "exchangeId": row["exchange_id"],
                    "exchange": row["exchange_name"]
                })

            return mappings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching code-exchange mappings: {str(e)}"
        )


@app.post("/api/mappings/code-exchange", status_code=status.HTTP_201_CREATED)
def create_code_exchange_mapping(mapping: dict):
    """
    Create a new code-exchange mapping.
    """
    try:
        code_name = mapping.get("codeName")
        exchange_name = mapping.get("exchangeName")

        if not code_name or not exchange_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both codeName and exchangeName are required"
            )

        with get_db() as conn:
            cursor = conn.cursor()

            # Get code ID
            cursor.execute("SELECT id FROM code WHERE name = ?", (code_name,))
            code_row = cursor.fetchone()
            if not code_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Code '{code_name}' not found"
                )
            code_id = code_row["id"]

            # Get exchange ID
            cursor.execute("SELECT id FROM exchange WHERE name = ?", (exchange_name,))
            exchange_row = cursor.fetchone()
            if not exchange_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exchange '{exchange_name}' not found"
                )
            exchange_id = exchange_row["id"]

            # Check if mapping already exists
            cursor.execute(
                "SELECT 1 FROM code_exchange WHERE code_id = ? AND exchange_id = ?",
                (code_id, exchange_id)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mapping between '{code_name}' and '{exchange_name}' already exists"
                )

            # Create mapping
            cursor.execute(
                "INSERT INTO code_exchange (code_id, exchange_id) VALUES (?, ?)",
                (code_id, exchange_id)
            )

            return {
                "message": "Mapping created successfully",
                "codeId": code_id,
                "code": code_name,
                "exchangeId": exchange_id,
                "exchange": exchange_name
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating code-exchange mapping: {str(e)}"
        )


@app.delete("/api/mappings/code-exchange")
def delete_code_exchange_mapping(codeName: str, exchangeName: str):
    """
    Delete a code-exchange mapping.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get code ID
            cursor.execute("SELECT id FROM code WHERE name = ?", (codeName,))
            code_row = cursor.fetchone()
            if not code_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Code '{codeName}' not found"
                )
            code_id = code_row["id"]

            # Get exchange ID
            cursor.execute("SELECT id FROM exchange WHERE name = ?", (exchangeName,))
            exchange_row = cursor.fetchone()
            if not exchange_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exchange '{exchangeName}' not found"
                )
            exchange_id = exchange_row["id"]

            # Delete mapping
            cursor.execute(
                "DELETE FROM code_exchange WHERE code_id = ? AND exchange_id = ?",
                (code_id, exchange_id)
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Mapping between '{codeName}' and '{exchangeName}' not found"
                )

            return {
                "message": "Mapping deleted successfully",
                "code": codeName,
                "exchange": exchangeName
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting code-exchange mapping: {str(e)}"
        )


# ============================================
# EXCHANGE-COMMODITY MAPPING ENDPOINTS
# ============================================

@app.get("/api/mappings/exchange-commodity")
def get_exchange_commodity_mappings():
    """
    Get all exchange-commodity mappings with names.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    e.id as exchange_id,
                    e.name as exchange_name,
                    c.id as commodity_id,
                    c.name as commodity_name
                FROM exchange_commodity ec
                JOIN exchange e ON ec.exchange_id = e.id
                JOIN commodity c ON ec.commodity_id = c.id
                ORDER BY e.name, c.name
            """)

            mappings = []
            for row in cursor.fetchall():
                mappings.append({
                    "exchangeId": row["exchange_id"],
                    "exchange": row["exchange_name"],
                    "commodityId": row["commodity_id"],
                    "commodity": row["commodity_name"]
                })

            return mappings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching exchange-commodity mappings: {str(e)}"
        )


@app.post("/api/mappings/exchange-commodity", status_code=status.HTTP_201_CREATED)
def create_exchange_commodity_mapping(mapping: dict):
    """
    Create a new exchange-commodity mapping.
    """
    try:
        exchange_name = mapping.get("exchangeName")
        commodity_name = mapping.get("commodityName")

        if not exchange_name or not commodity_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both exchangeName and commodityName are required"
            )

        with get_db() as conn:
            cursor = conn.cursor()

            # Get exchange ID
            cursor.execute("SELECT id FROM exchange WHERE name = ?", (exchange_name,))
            exchange_row = cursor.fetchone()
            if not exchange_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exchange '{exchange_name}' not found"
                )
            exchange_id = exchange_row["id"]

            # Get commodity ID
            cursor.execute("SELECT id FROM commodity WHERE name = ?", (commodity_name,))
            commodity_row = cursor.fetchone()
            if not commodity_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Commodity '{commodity_name}' not found"
                )
            commodity_id = commodity_row["id"]

            # Check if mapping already exists
            cursor.execute(
                "SELECT 1 FROM exchange_commodity WHERE exchange_id = ? AND commodity_id = ?",
                (exchange_id, commodity_id)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mapping between '{exchange_name}' and '{commodity_name}' already exists"
                )

            # Create mapping
            cursor.execute(
                "INSERT INTO exchange_commodity (exchange_id, commodity_id) VALUES (?, ?)",
                (exchange_id, commodity_id)
            )

            return {
                "message": "Mapping created successfully",
                "exchangeId": exchange_id,
                "exchange": exchange_name,
                "commodityId": commodity_id,
                "commodity": commodity_name
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating exchange-commodity mapping: {str(e)}"
        )


@app.delete("/api/mappings/exchange-commodity")
def delete_exchange_commodity_mapping(exchangeName: str, commodityName: str):
    """
    Delete an exchange-commodity mapping.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get exchange ID
            cursor.execute("SELECT id FROM exchange WHERE name = ?", (exchangeName,))
            exchange_row = cursor.fetchone()
            if not exchange_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exchange '{exchangeName}' not found"
                )
            exchange_id = exchange_row["id"]

            # Get commodity ID
            cursor.execute("SELECT id FROM commodity WHERE name = ?", (commodityName,))
            commodity_row = cursor.fetchone()
            if not commodity_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Commodity '{commodityName}' not found"
                )
            commodity_id = commodity_row["id"]

            # Delete mapping
            cursor.execute(
                "DELETE FROM exchange_commodity WHERE exchange_id = ? AND commodity_id = ?",
                (exchange_id, commodity_id)
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Mapping between '{exchangeName}' and '{commodityName}' not found"
                )

            return {
                "message": "Mapping deleted successfully",
                "exchange": exchangeName,
                "commodity": commodityName
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting exchange-commodity mapping: {str(e)}"
        )


# ============================================
# CASCADING DROPDOWN ENDPOINTS
# ============================================

@app.get("/api/cascading/codes/{strategy_id}", response_model=List[MasterValueResponse], response_model_by_alias=True)
def get_codes_by_strategy(strategy_id: int):
    """
    Get all codes associated with a specific strategy.

    - **strategy_id**: Strategy ID
    - Returns list of codes for that strategy
    """
    try:
        with get_db() as conn:
            codes = crud.get_codes_by_strategy(conn, strategy_id)
            return codes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching codes for strategy: {str(e)}"
        )


@app.get("/api/cascading/exchanges/{code_id}", response_model=List[MasterValueResponse], response_model_by_alias=True)
def get_exchanges_by_code(code_id: int):
    """
    Get all exchanges associated with a specific code.

    - **code_id**: Code ID
    - Returns list of exchanges for that code
    """
    try:
        with get_db() as conn:
            exchanges = crud.get_exchanges_by_code(conn, code_id)
            return exchanges
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching exchanges for code: {str(e)}"
        )


@app.get("/api/cascading/commodities/{exchange_id}", response_model=List[MasterValueResponse], response_model_by_alias=True)
def get_commodities_by_exchange(exchange_id: int):
    """
    Get all commodities associated with a specific exchange.

    - **exchange_id**: Exchange ID
    - Returns list of commodities for that exchange
    """
    try:
        with get_db() as conn:
            commodities = crud.get_commodities_by_exchange(conn, exchange_id)
            return commodities
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching commodities for exchange: {str(e)}"
        )


# ============================================
# MANUAL TRADE ENTRIES ENDPOINTS
# ============================================

@app.post("/api/manual-trade-entries", response_model=ManualTradeEntryResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_manual_trade_entry(entry: ManualTradeEntryCreate, authorization: Optional[str] = Header(None)):
    """
    Create a new manual trade entry.

    - **entry**: Manual trade entry data from the Excel-like grid
    - Returns the created entry with ID and timestamps
    """
    try:
        # Verify authentication and get user session
        session = auth.verify_token(authorization)
        username = session["username"]

        with get_db() as conn:
            entry_id = crud.create_manual_trade_entry(conn, entry, username)
            created_entry = crud.get_manual_trade_entry_by_id(conn, entry_id)

            if not created_entry:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Entry created but could not be retrieved"
                )

            return created_entry

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating manual trade entry: {str(e)}"
        )


@app.post("/api/manual-trade-entries/bulk", response_model=List[ManualTradeEntryResponse], response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def bulk_create_manual_trade_entries(entries: List[ManualTradeEntryCreate], authorization: Optional[str] = Header(None)):
    """
    Create multiple manual trade entries at once.

    - **entries**: List of manual trade entry data from the Excel-like grid
    - Returns the list of created entries with IDs and timestamps
    """
    try:
        # Verify authentication and get user session
        session = auth.verify_token(authorization)
        username = session["username"]

        with get_db() as conn:
            entry_ids = crud.bulk_create_manual_trade_entries(conn, entries, username)
            created_entries = []

            for entry_id in entry_ids:
                entry = crud.get_manual_trade_entry_by_id(conn, entry_id)
                if entry:
                    created_entries.append(entry)

            return created_entries

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating manual trade entries: {str(e)}"
        )


@app.get("/api/manual-trade-entries/date/{trade_date}", response_model=List[ManualTradeEntryResponse], response_model_by_alias=True)
def get_manual_trade_entries_by_date(trade_date: date):
    """
    Get all manual trade entries for a specific date.

    - **trade_date**: Date in YYYY-MM-DD format
    - Returns list of manual trade entries for that date
    """
    try:
        with get_db() as conn:
            entries = crud.get_manual_trade_entries_by_date(conn, trade_date)
            return entries

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching manual trade entries: {str(e)}"
        )


@app.get("/api/manual-trade-entries", response_model=List[ManualTradeEntryResponse], response_model_by_alias=True)
def get_all_manual_trade_entries():
    """
    Get all manual trade entries (for testing/debugging).

    - Returns list of all manual trade entries
    """
    try:
        with get_db() as conn:
            entries = crud.get_all_manual_trade_entries(conn)
            return entries

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching manual trade entries: {str(e)}"
        )


@app.get("/api/manual-trade-entries/{entry_id}", response_model=ManualTradeEntryResponse, response_model_by_alias=True)
def get_manual_trade_entry(entry_id: int):
    """
    Get a specific manual trade entry by ID.

    - **entry_id**: Manual trade entry ID
    - Returns the manual trade entry data
    """
    try:
        with get_db() as conn:
            entry = crud.get_manual_trade_entry_by_id(conn, entry_id)

            if not entry:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Manual trade entry with ID {entry_id} not found"
                )

            return entry

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching manual trade entry: {str(e)}"
        )


@app.put("/api/manual-trade-entries/{entry_id}", response_model=ManualTradeEntryResponse, response_model_by_alias=True)
def update_manual_trade_entry(entry_id: int, entry: ManualTradeEntryUpdate, authorization: Optional[str] = Header(None)):
    """
    Update an existing manual trade entry.

    - **entry_id**: Manual trade entry ID to update
    - **entry**: Updated manual trade entry data
    - Returns the updated entry
    """
    try:
        # Verify authentication and get user session
        session = auth.verify_token(authorization)
        username = session["username"]

        with get_db() as conn:
            success = crud.update_manual_trade_entry(conn, entry_id, entry, username)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Manual trade entry with ID {entry_id} not found"
                )

            updated_entry = crud.get_manual_trade_entry_by_id(conn, entry_id)
            return updated_entry

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating manual trade entry: {str(e)}"
        )


@app.delete("/api/manual-trade-entries/{entry_id}", response_model=DeleteResponse)
def delete_manual_trade_entry(entry_id: int):
    """
    Delete a manual trade entry.

    - **entry_id**: Manual trade entry ID to delete
    - Returns success message
    """
    try:
        with get_db() as conn:
            success = crud.delete_manual_trade_entry(conn, entry_id)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Manual trade entry with ID {entry_id} not found"
                )

            return {
                "message": "Manual trade entry deleted successfully",
                "id": entry_id
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting manual trade entry: {str(e)}"
        )


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/api/auth/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """
    Authenticate user and create session.

    - **username**: User's username
    - **password**: User's password
    - Returns session token and user info
    """
    try:
        with get_db() as conn:
            user = crud.get_user_by_username(conn, credentials.username)

            if not user or user["password"] != credentials.password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password"
                )

            # Update last login
            crud.update_last_login(conn, user["id"])

            # Create session
            token = auth.create_session(user["id"], user["username"], user["role"])

            return {
                "token": token,
                "username": user["username"],
                "role": user["role"],
                "message": "Login successful"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {str(e)}"
        )


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    """
    Logout user and destroy session.

    - Requires valid authorization token
    - Returns success message
    """
    try:
        session = auth.verify_token(authorization)
        token = authorization.replace("Bearer ", "")
        auth.delete_session(token)

        return {"message": "Logout successful"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during logout: {str(e)}"
        )


@app.get("/api/auth/validate", response_model=SessionResponse)
def validate_session(authorization: Optional[str] = Header(None)):
    """
    Validate current session.

    - Requires valid authorization token
    - Returns session validity and user info
    """
    try:
        session = auth.verify_token(authorization)

        return {
            "valid": True,
            "username": session["username"],
            "role": session["role"]
        }

    except HTTPException:
        return {
            "valid": False,
            "username": None,
            "role": None
        }


# ============================================
# USER MANAGEMENT ENDPOINTS (Admin Only)
# ============================================

@app.get("/api/users", response_model=List[UserResponse], response_model_by_alias=True)
def get_all_users(authorization: Optional[str] = Header(None)):
    """
    Get all users (Admin only).

    - Requires admin authorization
    - Returns list of all users
    """
    try:
        auth.verify_admin(authorization)

        with get_db() as conn:
            users = crud.get_all_users(conn)
            return users

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )


@app.post("/api/users", response_model=UserResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, authorization: Optional[str] = Header(None)):
    """
    Create a new user (Admin only).

    - Requires admin authorization
    - **user**: User data (username, password, role)
    - Returns created user info
    """
    try:
        auth.verify_admin(authorization)

        with get_db() as conn:
            # Check if username already exists
            existing_user = crud.get_user_by_username(conn, user.username)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )

            user_id = crud.create_user(conn, user)
            created_user = crud.get_user_by_id(conn, user_id)

            return created_user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )


@app.put("/api/users/{user_id}/password", response_model=UserResponse, response_model_by_alias=True)
def reset_user_password(user_id: int, user_update: UserUpdate, authorization: Optional[str] = Header(None)):
    """
    Reset user password (Admin only).

    - Requires admin authorization
    - **user_id**: User ID
    - **user_update**: New password
    - Returns updated user info
    """
    try:
        auth.verify_admin(authorization)

        with get_db() as conn:
            # Check if user exists
            user = crud.get_user_by_id(conn, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            success = crud.update_user_password(conn, user_id, user_update.password)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update password"
                )

            updated_user = crud.get_user_by_id(conn, user_id)
            return updated_user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting password: {str(e)}"
        )


@app.delete("/api/users/{user_id}", response_model=DeleteResponse)
def delete_user(user_id: int, authorization: Optional[str] = Header(None)):
    """
    Delete a user (Admin only).

    - Requires admin authorization
    - **user_id**: User ID to delete
    - Logs out all sessions for the user
    - Returns success message
    """
    try:
        auth.verify_admin(authorization)

        with get_db() as conn:
            # Get user info before deletion
            user = crud.get_user_by_id(conn, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            # Prevent deleting the admin user
            if user["role"] == "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete admin user"
                )

            # Delete all sessions for this user (immediate logout)
            auth.delete_user_sessions(user["username"])

            # Delete user from database
            success = crud.delete_user(conn, user_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete user"
                )

            return {
                "message": "User deleted successfully",
                "id": user_id
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
