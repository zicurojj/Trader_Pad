import sqlite3
import pyodbc
import json
import os
from contextlib import contextmanager
from typing import Any, Dict

# Get the absolute path to the project root (one level up from backend/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

# Load database configuration
def load_config() -> Dict[str, Any]:
    """Load database configuration from config.json"""
    if not os.path.exists(CONFIG_PATH):
        # Create default config if it doesn't exist
        default_config = {
            "database": {
                "type": "sqlite",
                "sqlite": {
                    "path": os.path.join(BASE_DIR, "trader_entries.db")
                },
                "mssql": {
                    "server": "",
                    "database": "",
                    "username": "",
                    "password": "",
                    "connection_string": ""
                }
            }
        }
        with open(CONFIG_PATH, 'w') as f:
            json.dump(default_config, f, indent=2)
        return default_config

    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def save_config(config: Dict[str, Any]):
    """Save database configuration to config.json"""
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)

def get_db_config():
    """Get current database configuration"""
    config = load_config()
    return config["database"]

class DatabaseConnection:
    """Unified database connection class supporting both SQLite and MS SQL"""

    def __init__(self):
        self.config = get_db_config()
        self.db_type = self.config["type"]
        self.conn = None

    def connect(self):
        """Establish database connection"""
        if self.db_type == "sqlite":
            db_path = self.config["sqlite"]["path"]
            if not os.path.isabs(db_path):
                db_path = os.path.join(BASE_DIR, db_path)
            self.conn = sqlite3.connect(db_path)
            self.conn.row_factory = sqlite3.Row

        elif self.db_type == "mssql":
            mssql_config = self.config["mssql"]

            # Use connection string if provided
            if mssql_config.get("connection_string"):
                conn_str = mssql_config["connection_string"]
            else:
                # Build connection string from individual parameters
                server = mssql_config["server"]
                database = mssql_config["database"]
                username = mssql_config["username"]
                password = mssql_config["password"]

                conn_str = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={server};"
                    f"DATABASE={database};"
                    f"UID={username};"
                    f"PWD={password}"
                )

            self.conn = pyodbc.connect(conn_str)
            # Make pyodbc rows behave like sqlite3.Row
            self.conn.row_factory = lambda cursor, row: dict(zip([column[0] for column in cursor.description], row))

        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")

        return self.conn

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            self.conn = None

    def commit(self):
        """Commit transaction"""
        if self.conn:
            self.conn.commit()

    def rollback(self):
        """Rollback transaction"""
        if self.conn:
            self.conn.rollback()

    def cursor(self):
        """Get database cursor"""
        if not self.conn:
            self.connect()
        return self.conn.cursor()

    def execute(self, query: str, params=None):
        """Execute a query"""
        cursor = self.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor

    def executescript(self, script: str):
        """Execute multiple SQL statements (SQLite only)"""
        if self.db_type == "sqlite":
            self.conn.executescript(script)
        else:
            # For MS SQL, execute statements one by one
            statements = script.split(';')
            cursor = self.cursor()
            for statement in statements:
                statement = statement.strip()
                if statement:
                    cursor.execute(statement)

@contextmanager
def get_db():
    """
    Context manager for database connections.
    Automatically handles opening and closing connections.
    """
    db = DatabaseConnection()
    conn = db.connect()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        db.close()

def init_db():
    """
    Initialize the database by running the schema.
    Only run this once to set up the database.
    """
    schema_path = os.path.join(BASE_DIR, "schema.sql")
    with open(schema_path, "r") as f:
        schema = f.read()

    db = DatabaseConnection()
    conn = db.connect()
    try:
        db.executescript(schema)
        db.commit()
        print(f"Database initialized successfully using {db.db_type}!")
    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {str(e)}")
        raise
    finally:
        db.close()

def test_connection() -> Dict[str, Any]:
    """Test database connection and return status"""
    try:
        db = DatabaseConnection()
        conn = db.connect()
        cursor = conn.cursor()

        # Test query
        if db.db_type == "sqlite":
            cursor.execute("SELECT 1")
        else:  # mssql
            cursor.execute("SELECT 1 AS test")

        result = cursor.fetchone()
        db.close()

        return {
            "success": True,
            "message": f"Successfully connected to {db.db_type} database",
            "database_type": db.db_type
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "database_type": get_db_config()["type"]
        }

if __name__ == "__main__":
    init_db()
