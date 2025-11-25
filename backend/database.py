import sqlite3
from contextlib import contextmanager
import os

# Get the absolute path to the project root (one level up from backend/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(BASE_DIR, "trader_entries.db")

@contextmanager
def get_db():
    """
    Context manager for database connections.
    Automatically handles opening and closing connections.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_db():
    """
    Initialize the database by running the schema.
    Only run this once to set up the database.
    """
    schema_path = os.path.join(BASE_DIR, "schema.sql")
    with open(schema_path, "r") as f:
        schema = f.read()

    with get_db() as conn:
        conn.executescript(schema)

    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db()
