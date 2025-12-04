# TraderForm - Trade Entry Management System

A full-stack application for managing trade entries with Excel-like grid interface, built with React, TypeScript, Vite, and FastAPI.

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **AG Grid** for Excel-like data entry
- **shadcn/ui** for UI components
- **TailwindCSS** for styling
- **React Router** for navigation

### Backend
- **FastAPI** (Python)
- **SQLite** database
- **Uvicorn** ASGI server

## Project Structure

```
TraderForm/
├── src/                    # Frontend source code
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts (Auth, etc.)
│   └── constants.ts      # API base URL and constants
├── backend/              # Backend source code
│   ├── main.py          # FastAPI application
│   ├── database.py      # Database initialization
│   ├── crud.py          # Database operations
│   ├── models.py        # Pydantic models
│   ├── auth.py          # Authentication logic
│   └── requirements.txt # Python dependencies
├── trader_entries.db     # SQLite database (generated)
└── schema.sql           # Database schema
```

## Setup Instructions

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Initialize the Database

```bash
# Make sure you're in the TraderForm directory (not backend)
cd ..
python backend/database.py
```

This will create `trader_entries.db` with all tables and sample data in the root directory.

### 4. Run the Development Servers

**Terminal 1 - Backend (FastAPI):**
```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The API will be running at: **http://localhost:8000**

**Terminal 2 - Frontend (Vite):**
```bash
npm run dev
```

The frontend will be running at: **http://localhost:5175**

## Features

### Trade Entry Management
- Excel-like grid interface using AG Grid
- Manual trade entry with cascading dropdowns
- Date-based filtering
- Bulk save functionality
- CSV import/export
- Keyboard shortcuts:
  - `Shift + Enter`: Add new row
  - `Shift + Space`: Select entire row
  - `Delete`: Delete selected row

### Masters Management
- Manage dropdown values (Strategy, Code, Exchange, Commodity, Broker, Status, etc.)
- Searchable delete dropdowns
- Mapping management:
  - Strategy-Code mappings
  - Code-Exchange mappings
  - Exchange-Commodity mappings
- Auto-creation of values through mappings

### User Management (Admin Only)
- Create and manage users
- Role-based access control (Admin/User)
- View all trade entries

### Audit Trail
- Automatic logging of UPDATE and DELETE operations
- Before/after snapshots stored in logs table
- Username and timestamp tracking

### Real-time Backend Status
- Visual indicator showing backend connection status
- Heartbeat monitoring every 10 seconds

## API Documentation

Once the backend server is running, visit:
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/session` | Get current session |

### Trade Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trade-entries` | Create a new trade entry |
| GET | `/api/trade-entries/date/{date}` | Get all entries for a specific date |
| GET | `/api/trade-entries/{id}` | Get a specific entry by ID |
| PUT | `/api/trade-entries/{id}` | Update an entry |
| DELETE | `/api/trade-entries/{id}` | Delete an entry |
| GET | `/api/trade-entries` | Get all entries (admin only) |
| POST | `/api/trade-entries/bulk-upsert` | Bulk create/update entries |
| POST | `/api/trade-entries/upload-csv` | Import entries from CSV |

### Masters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/masters` | Get all master data |
| GET | `/api/masters/{category}` | Get specific master category |
| POST | `/api/masters/{category}` | Add new master value |
| DELETE | `/api/masters/{category}/{id}` | Delete master value |

### Mappings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mappings/strategy-code` | Get all strategy-code mappings |
| POST | `/api/mappings/strategy-code` | Create strategy-code mapping |
| DELETE | `/api/mappings/strategy-code` | Delete strategy-code mapping |
| GET | `/api/mappings/code-exchange` | Get all code-exchange mappings |
| POST | `/api/mappings/code-exchange` | Create code-exchange mapping |
| DELETE | `/api/mappings/code-exchange` | Delete code-exchange mapping |
| GET | `/api/mappings/exchange-commodity` | Get all exchange-commodity mappings |
| POST | `/api/mappings/exchange-commodity` | Create exchange-commodity mapping |
| DELETE | `/api/mappings/exchange-commodity` | Delete exchange-commodity mapping |

### Users (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |

## Example Requests

### Login
```bash
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Create Trade Entry
```bash
curl -X POST "http://localhost:8000/api/trade-entries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "trade_date": "2025-01-20",
    "strategy": "Scalping",
    "code": "NIFTY",
    "exchange": "NSE",
    "commodity": "Index",
    "expiry": "2025-01-30",
    "contract_type": "Futures",
    "strike_price": 23500.00,
    "option_type": "N/A",
    "buy_qty": 50,
    "buy_avg": 23505.50,
    "sell_qty": 50,
    "sell_avg": 23520.75,
    "client_code": "CLI001",
    "broker": "Zerodha",
    "team_name": "Morning Team",
    "status": "Active",
    "remark": "Test entry",
    "tag": "Intraday"
  }'
```

### Get Entries by Date
```bash
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:8000/api/trade-entries/date/2025-01-20"
```

## CORS Configuration

The API is configured to accept requests from:
- http://localhost:5173
- http://localhost:5174
- http://localhost:5175
- http://localhost:5176
- http://localhost:5177
- http://localhost:5178

(Vite dev server ports)

## Database

### Location
The SQLite database `trader_entries.db` is created in the root `TraderForm` directory.

### Tables
- `trader_entries` - Main trade entry data
- `trader_entries_logs` - Audit trail for UPDATE/DELETE operations
- `users` - User accounts
- `sessions` - Active user sessions
- Master tables: `strategy`, `code`, `exchange`, `commodity`, `broker`, `status`, etc.
- Mapping tables: `strategy_code_mapping`, `code_exchange_mapping`, `exchange_commodity_mapping`

## Default Credentials

- **Admin User**: `admin` / `admin123`
- **Regular User**: `user1` / `password123`

## Development

### Frontend
- Hot Module Replacement (HMR) enabled
- ESLint configured for TypeScript
- Changes auto-reload in the browser

### Backend
- Auto-reload enabled with `--reload` flag
- Changes to Python files automatically restart the server
- Check the console for errors or logs

## Building for Production

### Frontend
```bash
npm run build
```

This creates a `dist` folder with optimized static files.

### Backend
For production deployment, use a production ASGI server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## ESLint Configuration (Optional)

For production applications, you can enable type-aware lint rules. See the original Vite template documentation in the comments below for details on configuring:
- `tseslint.configs.recommendedTypeChecked`
- `eslint-plugin-react-x`
- `eslint-plugin-react-dom`

## Troubleshooting

### Backend won't start
- Ensure Python dependencies are installed: `pip install -r requirements.txt`
- Check that port 8000 is not already in use
- Verify database was initialized: `python backend/database.py`

### Frontend won't start
- Ensure Node dependencies are installed: `npm install`
- Check that the backend is running at http://localhost:8000
- Verify the API_BASE_URL in `src/constants.ts`

### Database errors
- Delete `trader_entries.db` and run `python backend/database.py` again
- Ensure you're in the correct directory when initializing

## License

This project is proprietary software.
