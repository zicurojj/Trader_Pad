from datetime import date, datetime
from models import TradeEntryCreate, TradeEntryUpdate, ManualTradeEntryCreate, ManualTradeEntryUpdate, UserCreate, UserUpdate
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
            contract_type, trade_type, strike_price, option_type,
            client_code, broker, team_name, status, remark, tag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        username,
        entry.trade_date,
        entry.strategy,
        entry.code,
        entry.exchange,
        entry.commodity,
        entry.expiry,
        entry.contract_type,
        entry.trade_type,
        entry.strike_price,
        entry.option_type,
        entry.client_code,
        entry.broker,
        entry.team_name,
        entry.status,
        entry.remark,
        entry.tag
    ))
    return cursor.lastrowid


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
            trade_type = ?,
            strike_price = ?,
            option_type = ?,
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
        entry.trade_type,
        entry.strike_price,
        entry.option_type,
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
    "Strategy": "master_strategy",
    "Exchange": "master_exchange",
    "Contract Type": "master_contract_type",
    "Trade Type": "master_trade_type",
    "Option Type": "master_option_type",
    "Code": "master_code",
    "Commodity": "master_commodity",
    "Client Code": "master_client_code",
    "Broker": "master_broker",
    "Team Name": "master_team_name",
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
    # Client Code uses 'code' field, others use 'name'
    field_name = "code" if category == "Client Code" else "name"

    cursor.execute(f"""
        SELECT id, {field_name} as name, created_at
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
    # Client Code uses 'code' field, others use 'name'
    field_name = "code" if category == "Client Code" else "name"

    cursor.execute(f"""
        INSERT INTO {table_name} ({field_name})
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
# MANUAL TRADE ENTRIES CRUD OPERATIONS
# ============================================

def create_manual_trade_entry(conn, entry: ManualTradeEntryCreate, username: str) -> int:
    """
    Create a new manual trade entry in the database.
    Returns the ID of the created entry.
    """
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO manual_trade_entries (
            username, trade_date, strategy, code, exchange, commodity, expiry,
            contract_type, trade_type, strike_price, option_type,
            client_code, broker, team_name, quantity, entry_price,
            exit_price, pnl, status, remark, tag, entry_time, exit_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        username,
        entry.trade_date,
        entry.strategy,
        entry.code,
        entry.exchange,
        entry.commodity,
        entry.expiry,
        entry.contract_type,
        entry.trade_type,
        entry.strike_price,
        entry.option_type,
        entry.client_code,
        entry.broker,
        entry.team_name,
        entry.quantity,
        entry.entry_price,
        entry.exit_price,
        entry.pnl,
        entry.status,
        entry.remark,
        entry.tag,
        entry.entry_time,
        entry.exit_time
    ))
    return cursor.lastrowid


def get_manual_trade_entries_by_date(conn, trade_date: date) -> List[dict]:
    """
    Get all manual trade entries for a specific date.
    Returns a list of dictionaries.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM manual_trade_entries
        WHERE trade_date = ?
        ORDER BY created_at DESC
    """, (trade_date,))

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_manual_trade_entry_by_id(conn, entry_id: int) -> Optional[dict]:
    """
    Get a single manual trade entry by ID.
    Returns a dictionary or None if not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM manual_trade_entries
        WHERE id = ?
    """, (entry_id,))

    row = cursor.fetchone()
    return dict(row) if row else None


def update_manual_trade_entry(conn, entry_id: int, entry: ManualTradeEntryUpdate, username: str) -> bool:
    """
    Update an existing manual trade entry.
    Returns True if successful, False if entry not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE manual_trade_entries SET
            username = ?,
            trade_date = ?,
            strategy = ?,
            code = ?,
            exchange = ?,
            commodity = ?,
            expiry = ?,
            contract_type = ?,
            trade_type = ?,
            strike_price = ?,
            option_type = ?,
            client_code = ?,
            broker = ?,
            team_name = ?,
            quantity = ?,
            entry_price = ?,
            exit_price = ?,
            pnl = ?,
            status = ?,
            remark = ?,
            tag = ?,
            entry_time = ?,
            exit_time = ?
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
        entry.trade_type,
        entry.strike_price,
        entry.option_type,
        entry.client_code,
        entry.broker,
        entry.team_name,
        entry.quantity,
        entry.entry_price,
        entry.exit_price,
        entry.pnl,
        entry.status,
        entry.remark,
        entry.tag,
        entry.entry_time,
        entry.exit_time,
        entry_id
    ))
    return cursor.rowcount > 0


def delete_manual_trade_entry(conn, entry_id: int) -> bool:
    """
    Delete a manual trade entry by ID.
    Returns True if successful, False if entry not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM manual_trade_entries
        WHERE id = ?
    """, (entry_id,))
    return cursor.rowcount > 0


def get_all_manual_trade_entries(conn) -> List[dict]:
    """
    Get all manual trade entries (useful for testing).
    Returns a list of dictionaries.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM manual_trade_entries
        ORDER BY trade_date DESC, created_at DESC
    """)

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def bulk_create_manual_trade_entries(conn, entries: List[ManualTradeEntryCreate], username: str) -> List[int]:
    """
    Create multiple manual trade entries in a single transaction.
    Returns a list of IDs of the created entries.
    """
    cursor = conn.cursor()
    created_ids = []

    for entry in entries:
        cursor.execute("""
            INSERT INTO manual_trade_entries (
                username, trade_date, strategy, code, exchange, commodity, expiry,
                contract_type, trade_type, strike_price, option_type,
                client_code, broker, team_name, quantity, entry_price,
                exit_price, pnl, status, remark, tag, entry_time, exit_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            username,
            entry.trade_date,
            entry.strategy,
            entry.code,
            entry.exchange,
            entry.commodity,
            entry.expiry,
            entry.contract_type,
            entry.trade_type,
            entry.strike_price,
            entry.option_type,
            entry.client_code,
            entry.broker,
            entry.team_name,
            entry.quantity,
            entry.entry_price,
            entry.exit_price,
            entry.pnl,
            entry.status,
            entry.remark,
            entry.tag,
            entry.entry_time,
            entry.exit_time
        ))
        created_ids.append(cursor.lastrowid)

    return created_ids


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
