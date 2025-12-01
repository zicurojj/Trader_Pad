# Trader Entry FastAPI Backend

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize the Database

```bash
# Make sure you're in the TraderForm directory (not backend)
cd ..
python backend/database.py
```

This will create `trader_entries.db` with all tables and sample data.

### 3. Run the FastAPI Server

```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The API will be running at: **http://localhost:8000**

## API Documentation

Once the server is running, visit:
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc

## API Endpoints

### Trade Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trade-entries` | Create a new trade entry |
| GET | `/api/trade-entries/date/{date}` | Get all entries for a specific date |
| GET | `/api/trade-entries/{id}` | Get a specific entry by ID |
| PUT | `/api/trade-entries/{id}` | Update an entry |
| DELETE | `/api/trade-entries/{id}` | Delete an entry |
| GET | `/api/trade-entries` | Get all entries (for testing) |

## Example Requests

### Create Trade Entry (POST)

```bash
curl -X POST "http://localhost:8000/api/trade-entries" \
  -H "Content-Type: application/json" \
  -d '{
    "trade_date": "2025-01-20",
    "strategy": "Scalping",
    "code": "NIFTY",
    "exchange": "NSE",
    "commodity": "Index",
    "expiry": "2025-01-30",
    "contractType": "Futures",
    "tradeType": "Buy",
    "strikePrice": 23500.00,
    "optionType": "N/A",
    "clientCode": "CLI001",
    "broker": "Zerodha",
    "teamName": "Morning Team",
    "status": "Active",
    "remark": "Test entry",
    "tag": "Intraday"
  }'
```

### Get Entries by Date (GET)

```bash
curl "http://localhost:8000/api/trade-entries/date/2025-01-20"
```

### Update Entry (PUT)

```bash
curl -X PUT "http://localhost:8000/api/trade-entries/1" \
  -H "Content-Type: application/json" \
  -d '{
    "trade_date": "2025-01-20",
    "strategy": "Day Trading",
    ...
  }'
```

### Delete Entry (DELETE)

```bash
curl -X DELETE "http://localhost:8000/api/trade-entries/1"
```

## CORS Configuration

The API is configured to accept requests from:
- http://localhost:5173
- http://localhost:5174
- http://localhost:5175

(Vite dev server ports)

## Database Location

The SQLite database `trader_entries.db` will be created in the root `TraderForm` directory.

## Development

- The server runs with auto-reload enabled
- Changes to Python files will automatically restart the server
- Check the console for any errors or logs
