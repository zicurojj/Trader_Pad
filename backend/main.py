from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from typing import List

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
    ManualTradeEntryResponse
)
from database import get_db
import crud

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
def create_trade_entry(entry: TradeEntryCreate):
    """
    Create a new trade entry.

    - **entry**: Trade entry data from the form
    - Returns the created entry with ID and timestamps
    """
    try:
        with get_db() as conn:
            entry_id = crud.create_trade_entry(conn, entry)
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
def get_trade_entries_by_date(trade_date: date):
    """
    Get all trade entries for a specific date.

    - **trade_date**: Date in YYYY-MM-DD format
    - Returns list of trade entries for that date
    """
    try:
        with get_db() as conn:
            entries = crud.get_trade_entries_by_date(conn, trade_date)
            return entries

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trade entries: {str(e)}"
        )


@app.get("/api/trade-entries", response_model=List[TradeEntryResponse], response_model_by_alias=True)
def get_all_trade_entries():
    """
    Get all trade entries (for testing/debugging).

    - Returns list of all trade entries
    """
    try:
        with get_db() as conn:
            entries = crud.get_all_trade_entries(conn)
            return entries

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
def update_trade_entry(entry_id: int, entry: TradeEntryUpdate):
    """
    Update an existing trade entry.

    - **entry_id**: Trade entry ID to update
    - **entry**: Updated trade entry data
    - Returns the updated entry
    """
    try:
        with get_db() as conn:
            success = crud.update_trade_entry(conn, entry_id, entry)

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
            field_name = "code" if category == "Client Code" else "name"

            cursor.execute(f"""
                SELECT id, {field_name} as name, created_at
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
# MANUAL TRADE ENTRIES ENDPOINTS
# ============================================

@app.post("/api/manual-trade-entries", response_model=ManualTradeEntryResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_manual_trade_entry(entry: ManualTradeEntryCreate):
    """
    Create a new manual trade entry.

    - **entry**: Manual trade entry data from the Excel-like grid
    - Returns the created entry with ID and timestamps
    """
    try:
        with get_db() as conn:
            entry_id = crud.create_manual_trade_entry(conn, entry)
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
def bulk_create_manual_trade_entries(entries: List[ManualTradeEntryCreate]):
    """
    Create multiple manual trade entries at once.

    - **entries**: List of manual trade entry data from the Excel-like grid
    - Returns the list of created entries with IDs and timestamps
    """
    try:
        with get_db() as conn:
            entry_ids = crud.bulk_create_manual_trade_entries(conn, entries)
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
def update_manual_trade_entry(entry_id: int, entry: ManualTradeEntryUpdate):
    """
    Update an existing manual trade entry.

    - **entry_id**: Manual trade entry ID to update
    - **entry**: Updated manual trade entry data
    - Returns the updated entry
    """
    try:
        with get_db() as conn:
            success = crud.update_manual_trade_entry(conn, entry_id, entry)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
