from datetime import date
from models import TradeEntryCreate, TradeEntryUpdate, UserCreate, UserUpdate
from typing import List, Optional

def create_trade_entry(conn, entry: TradeEntryCreate, username: str) -> int:
    """
    Create a new trade entry in the database.
    Returns the ID of the created entry.
    """
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO trader_entries (
            username, trade_date, strategy, code, exchange, commodity, expiry,
            contract_type, strike_price, option_type,
            buy_qty, buy_avg, sell_qty, sell_avg,
            client_code, broker, team_name, status, remark, tag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        username,
        entry.trade_date,
        entry.strategy,
        entry.code,
        entry.exchange,
        entry.commodity,
        entry.expiry,
        entry.contract_type,
        entry.strike_price,
        entry.option_type,
        entry.buy_qty,
        entry.buy_avg,
        entry.sell_qty,
        entry.sell_avg,
        entry.client_code,
        entry.broker,
        entry.team_name,
        entry.status,
        entry.remark,
        entry.tag
    ))
    return cursor.lastrowid


def bulk_create_trade_entries(conn, entries: List[TradeEntryCreate], username: str) -> List[int]:
    """
    Create multiple trade entries in the database.
    Returns the list of IDs of the created entries.
    """
    cursor = conn.cursor()
    entry_ids = []

    for entry in entries:
        cursor.execute("""
            INSERT INTO trader_entries (
                username, trade_date, strategy, code, exchange, commodity, expiry,
                contract_type, strike_price, option_type,
                buy_qty, buy_avg, sell_qty, sell_avg,
                client_code, broker, team_name, status, remark, tag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            username,
            entry.trade_date,
            entry.strategy,
            entry.code,
            entry.exchange,
            entry.commodity,
            entry.expiry,
            entry.contract_type,
            entry.strike_price,
            entry.option_type,
            entry.buy_qty,
            entry.buy_avg,
            entry.sell_qty,
            entry.sell_avg,
            entry.client_code,
            entry.broker,
            entry.team_name,
            entry.status,
            entry.remark,
            entry.tag
        ))
        entry_ids.append(cursor.lastrowid)

    return entry_ids


def get_trade_entries_by_date(conn, trade_date: date) -> List[dict]:
    """
    Get all trade entries for a specific date.
    Returns a list of dictionaries.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM trader_entries
        WHERE trade_date = ?
        ORDER BY created_at DESC
    """, (trade_date,))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_trade_entries_by_date_and_username(conn, trade_date: date, username: str) -> List[dict]:
    """
    Get trade entries for a specific date and username.
    Returns a list of dictionaries.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM trader_entries
        WHERE trade_date = ? AND username = ?
        ORDER BY created_at DESC
    """, (trade_date, username))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_trade_entry_by_id(conn, entry_id: int) -> Optional[dict]:
    """
    Get a single trade entry by ID.
    Returns a dictionary or None if not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM trader_entries
        WHERE id = ?
    """, (entry_id,))

    row = cursor.fetchone()
    return dict(row) if row else None


def update_trade_entry(conn, entry_id: int, entry: TradeEntryUpdate, username: str) -> bool:
    """
    Update an existing trade entry.
    Returns True if successful, False if entry not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE trader_entries SET
            username = ?,
            trade_date = ?,
            strategy = ?,
            code = ?,
            exchange = ?,
            commodity = ?,
            expiry = ?,
            contract_type = ?,
            strike_price = ?,
            option_type = ?,
            buy_qty = ?,
            buy_avg = ?,
            sell_qty = ?,
            sell_avg = ?,
            client_code = ?,
            broker = ?,
            team_name = ?,
            status = ?,
            remark = ?,
            tag = ?
        WHERE id = ?
    """, (
        username,
        entry.trade_date,
        entry.strategy,
        entry.code,
        entry.exchange,
        entry.commodity,
        entry.expiry,
        entry.contract_type,
        entry.strike_price,
        entry.option_type,
        entry.buy_qty,
        entry.buy_avg,
        entry.sell_qty,
        entry.sell_avg,
        entry.client_code,
        entry.broker,
        entry.team_name,
        entry.status,
        entry.remark,
        entry.tag,
        entry_id
    ))
    return cursor.rowcount > 0


def delete_trade_entry(conn, entry_id: int) -> bool:
    """
    Delete a trade entry by ID.
    Returns True if successful, False if entry not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM trader_entries
        WHERE id = ?
    """, (entry_id,))
    return cursor.rowcount > 0


def get_all_trade_entries(conn) -> List[dict]:
    """
    Get all trade entries (useful for testing).
    Returns a list of dictionaries.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM trader_entries
        ORDER BY trade_date DESC, created_at DESC
    """)

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


# ============================================
# MASTER DATA CRUD OPERATIONS
# ============================================

# Mapping of master categories to their table names
MASTER_TABLE_MAP = {
    "Strategy": "strategy",
    "Exchange": "exchange",
    "Code": "code",
    "Commodity": "commodity",
    "Broker": "master_broker",
    "Status": "master_status",
}

def get_master_values(conn, category: str) -> List[dict]:
    """
    Get all values for a specific master category.
    Returns a list of dictionaries with id, name/code, and created_at.
    """
    table_name = MASTER_TABLE_MAP.get(category)
    if not table_name:
        raise ValueError(f"Invalid master category: {category}")

    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT id, name, created_at
        FROM {table_name}
        ORDER BY name ASC
    """)

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_all_masters(conn) -> dict:
    """
    Get all master data for all categories.
    Returns a dictionary with category names as keys and lists of values.
    """
    result = {}
    for category in MASTER_TABLE_MAP.keys():
        result[category] = get_master_values(conn, category)
    return result


def create_master_value(conn, category: str, name: str) -> int:
    """
    Create a new value in a master category.
    Returns the ID of the created value.
    """
    table_name = MASTER_TABLE_MAP.get(category)
    if not table_name:
        raise ValueError(f"Invalid master category: {category}")

    cursor = conn.cursor()
    cursor.execute(f"""
        INSERT INTO {table_name} (name)
        VALUES (?)
    """, (name,))

    return cursor.lastrowid


def delete_master_value(conn, category: str, value_id: int) -> bool:
    """
    Delete a value from a master category by ID.
    Returns True if successful, False if value not found.
    """
    table_name = MASTER_TABLE_MAP.get(category)
    if not table_name:
        raise ValueError(f"Invalid master category: {category}")

    cursor = conn.cursor()
    cursor.execute(f"""
        DELETE FROM {table_name}
        WHERE id = ?
    """, (value_id,))

    return cursor.rowcount > 0


# ============================================
# RELATIONAL QUERY FUNCTIONS
# ============================================

def get_codes_by_strategy(conn, strategy_id: int) -> List[dict]:
    """
    Get all codes associated with a specific strategy.
    Returns a list of dictionaries with id, name, and created_at.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.name, c.created_at
        FROM strategy_code sc
        JOIN code c ON c.id = sc.code_id
        WHERE sc.strategy_id = ?
        ORDER BY c.name
    """, (strategy_id,))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_exchanges_by_code(conn, code_id: int) -> List[dict]:
    """
    Get all exchanges associated with a specific code.
    Returns a list of dictionaries with id, name, and created_at.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, e.name, e.created_at
        FROM code_exchange ce
        JOIN exchange e ON e.id = ce.exchange_id
        WHERE ce.code_id = ?
        ORDER BY e.name
    """, (code_id,))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_commodities_by_exchange(conn, exchange_id: int) -> List[dict]:
    """
    Get all commodities associated with a specific exchange.
    Returns a list of dictionaries with id, name, and created_at.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT cm.id, cm.name, cm.created_at
        FROM exchange_commodity ec
        JOIN commodity cm ON cm.id = ec.commodity_id
        WHERE ec.exchange_id = ?
        ORDER BY cm.name
    """, (exchange_id,))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


# ============================================
# AUTHENTICATION CRUD OPERATIONS
# ============================================

def get_user_by_username(conn, username: str) -> Optional[dict]:
    """
    Get user by username.
    Returns user dict or None if not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, password, role, last_login, created_at, updated_at
        FROM users
        WHERE username = ?
    """, (username,))

    row = cursor.fetchone()
    if row:
        return {
            "id": row[0],
            "username": row[1],
            "password": row[2],
            "role": row[3],
            "last_login": row[4],
            "created_at": row[5],
            "updated_at": row[6]
        }
    return None


def get_user_by_id(conn, user_id: int) -> Optional[dict]:
    """
    Get user by ID.
    Returns user dict or None if not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, password, role, last_login, created_at, updated_at
        FROM users
        WHERE id = ?
    """, (user_id,))

    row = cursor.fetchone()
    if row:
        return {
            "id": row[0],
            "username": row[1],
            "password": row[2],
            "role": row[3],
            "last_login": row[4],
            "created_at": row[5],
            "updated_at": row[6]
        }
    return None


def get_all_users(conn) -> List[dict]:
    """
    Get all users (excluding passwords).
    Returns list of user dicts.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, role, last_login, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
    """)

    rows = cursor.fetchall()
    return [{
        "id": row[0],
        "username": row[1],
        "role": row[2],
        "last_login": row[3],
        "created_at": row[4],
        "updated_at": row[5]
    } for row in rows]


def create_user(conn, user: UserCreate) -> int:
    """
    Create a new user.
    Returns the ID of the created user.
    """
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
    """, (user.username, user.password, user.role))
    return cursor.lastrowid


def update_user_password(conn, user_id: int, password: str) -> bool:
    """
    Update user password.
    Returns True if successful, False otherwise.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET password = ?
        WHERE id = ?
    """, (password, user_id))
    return cursor.rowcount > 0


def update_last_login(conn, user_id: int) -> bool:
    """
    Update user's last login timestamp.
    Returns True if successful, False otherwise.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (user_id,))
    return cursor.rowcount > 0


def delete_user(conn, user_id: int) -> bool:
    """
    Delete a user by ID.
    Returns True if successful, False otherwise.
    """
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return cursor.rowcount > 0


# ============================================
# TRADER ENTRIES LOGS CRUD OPERATIONS
# ============================================

def create_log_entry(conn, entry_id: int, operation_type: str, log_tag: str,
                     entry_data: dict, changed_by: str) -> int:
    """
    Create a log entry for audit trail.

    Args:
        conn: Database connection
        entry_id: ID of the trader_entries record
        operation_type: 'UPDATE' or 'DELETE'
        log_tag: 'before', 'after', or 'deleted'
        entry_data: Dictionary containing the full entry snapshot
        changed_by: Username who made the change

    Returns:
        ID of the created log entry
    """
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO trader_entries_logs (
            entry_id, operation_type, log_tag,
            username, trade_date, strategy, code, exchange, commodity, expiry,
            contract_type, strike_price, option_type,
            buy_qty, buy_avg, sell_qty, sell_avg,
            client_code, broker, team_name, status, remark, tag,
            changed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry_id,
        operation_type,
        log_tag,
        entry_data.get('username'),
        entry_data.get('trade_date'),
        entry_data.get('strategy'),
        entry_data.get('code'),
        entry_data.get('exchange'),
        entry_data.get('commodity'),
        entry_data.get('expiry'),
        entry_data.get('contract_type'),
        entry_data.get('strike_price'),
        entry_data.get('option_type'),
        entry_data.get('buy_qty'),
        entry_data.get('buy_avg'),
        entry_data.get('sell_qty'),
        entry_data.get('sell_avg'),
        entry_data.get('client_code'),
        entry_data.get('broker'),
        entry_data.get('team_name'),
        entry_data.get('status'),
        entry_data.get('remark'),
        entry_data.get('tag'),
        changed_by
    ))
    return cursor.lastrowid


def get_logs_by_entry_id(conn, entry_id: int) -> List[dict]:
    """
    Get all log entries for a specific trader entry.
    Returns a list of dictionaries ordered by changed_at DESC.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM trader_entries_logs
        WHERE entry_id = ?
        ORDER BY changed_at DESC
    """, (entry_id,))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_all_logs(conn, limit: int = 100, offset: int = 0) -> List[dict]:
    """
    Get all log entries with pagination.
    Returns a list of dictionaries ordered by changed_at DESC.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM trader_entries_logs
        ORDER BY changed_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]
