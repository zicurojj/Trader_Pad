from datetime import date
from models import TradeEntryCreate, TradeEntryUpdate
from typing import List, Optional

def create_trade_entry(conn, entry: TradeEntryCreate) -> int:
    """
    Create a new trade entry in the database.
    Returns the ID of the created entry.
    """
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO trader_entries (
            trade_date, strategy, code, exchange, commodity, expiry,
            contract_type, trade_type, strike_price, option_type,
            client_code, broker, team_name, status, remark, tag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
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


def update_trade_entry(conn, entry_id: int, entry: TradeEntryUpdate) -> bool:
    """
    Update an existing trade entry.
    Returns True if successful, False if entry not found.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE trader_entries SET
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
