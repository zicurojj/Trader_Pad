-- SQLite Schema for Trader Entry Application
-- Database: trader_entries.db

-- ============================================
-- AUTHENTICATION TABLES
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for users updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, password, role) VALUES
    ('admin', 'admin123', 'admin');

-- ============================================
-- MASTER TABLES
-- ============================================

-- Strategy Master
CREATE TABLE IF NOT EXISTS master_strategy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Master
CREATE TABLE IF NOT EXISTS master_exchange (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contract Type Master
CREATE TABLE IF NOT EXISTS master_contract_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trade Type Master
CREATE TABLE IF NOT EXISTS master_trade_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Option Type Master
CREATE TABLE IF NOT EXISTS master_option_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Code Master
CREATE TABLE IF NOT EXISTS master_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Commodity Master
CREATE TABLE IF NOT EXISTS master_commodity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Client Code Master
CREATE TABLE IF NOT EXISTS master_client_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Broker Master
CREATE TABLE IF NOT EXISTS master_broker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team Name Master
CREATE TABLE IF NOT EXISTS master_team_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MAIN TRADER ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trader_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trade_date DATE NOT NULL,
    strategy TEXT NOT NULL,
    code TEXT NOT NULL,
    exchange TEXT NOT NULL,
    commodity TEXT NOT NULL,
    expiry DATE NOT NULL,
    contract_type TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    option_type TEXT NOT NULL,
    client_code TEXT NOT NULL,
    broker TEXT NOT NULL,
    team_name TEXT NOT NULL,
    status TEXT NOT NULL,
    remark TEXT,
    tag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_id ON trader_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_date ON trader_entries(trade_date);
CREATE INDEX IF NOT EXISTS idx_strategy ON trader_entries(strategy);
CREATE INDEX IF NOT EXISTS idx_exchange ON trader_entries(exchange);
CREATE INDEX IF NOT EXISTS idx_broker ON trader_entries(broker);
CREATE INDEX IF NOT EXISTS idx_team_name ON trader_entries(team_name);
CREATE INDEX IF NOT EXISTS idx_status ON trader_entries(status);

-- ============================================
-- MANUAL TRADE ENTRIES TABLE (Excel-like format)
-- ============================================

CREATE TABLE IF NOT EXISTS manual_trade_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trade_date DATE NOT NULL,
    strategy TEXT NOT NULL,
    code TEXT NOT NULL,
    exchange TEXT NOT NULL,
    commodity TEXT NOT NULL,
    expiry DATE NOT NULL,
    contract_type TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    option_type TEXT NOT NULL,
    client_code TEXT NOT NULL,
    broker TEXT NOT NULL,
    team_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    entry_price DECIMAL(10, 2),
    exit_price DECIMAL(10, 2),
    pnl DECIMAL(12, 2),
    status TEXT NOT NULL DEFAULT 'Open',
    remark TEXT,
    tag TEXT,
    entry_time TIME,
    exit_time TIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for manual trade entries
CREATE INDEX IF NOT EXISTS idx_manual_user_id ON manual_trade_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_trade_date ON manual_trade_entries(trade_date);
CREATE INDEX IF NOT EXISTS idx_manual_strategy ON manual_trade_entries(strategy);
CREATE INDEX IF NOT EXISTS idx_manual_exchange ON manual_trade_entries(exchange);
CREATE INDEX IF NOT EXISTS idx_manual_status ON manual_trade_entries(status);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_trader_entries_timestamp
AFTER UPDATE ON trader_entries
BEGIN
    UPDATE trader_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_manual_trade_entries_timestamp
AFTER UPDATE ON manual_trade_entries
BEGIN
    UPDATE manual_trade_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- INSERT INITIAL MASTER DATA
-- ============================================

-- Strategy Master Data
INSERT OR IGNORE INTO master_strategy (name) VALUES
    ('Scalping'),
    ('Day Trading'),
    ('Swing Trading'),
    ('Position Trading'),
    ('Arbitrage');

-- Exchange Master Data
INSERT OR IGNORE INTO master_exchange (name) VALUES
    ('NSE'),
    ('BSE'),
    ('MCX'),
    ('NCDEX');

-- Contract Type Master Data
INSERT OR IGNORE INTO master_contract_type (name) VALUES
    ('Futures'),
    ('Options'),
    ('Spot');

-- Trade Type Master Data
INSERT OR IGNORE INTO master_trade_type (name) VALUES
    ('Buy'),
    ('Sell');

-- Option Type Master Data
INSERT OR IGNORE INTO master_option_type (name) VALUES
    ('Call'),
    ('Put'),
    ('N/A');

-- Code Master Data
INSERT OR IGNORE INTO master_code (name) VALUES
    ('NIFTY'),
    ('BANKNIFTY'),
    ('FINNIFTY'),
    ('RELIANCE'),
    ('TATASTEEL'),
    ('GOLD'),
    ('SILVER'),
    ('CRUDE');

-- Commodity Master Data
INSERT OR IGNORE INTO master_commodity (name) VALUES
    ('Index'),
    ('Equity'),
    ('Precious Metal'),
    ('Energy'),
    ('Agriculture');

-- Client Code Master Data
INSERT OR IGNORE INTO master_client_code (code) VALUES
    ('CLI001'),
    ('CLI002'),
    ('CLI003'),
    ('CLI004'),
    ('CLI005'),
    ('CLI006'),
    ('CLI007');

-- Broker Master Data
INSERT OR IGNORE INTO master_broker (name) VALUES
    ('Zerodha'),
    ('Upstox'),
    ('Angel One'),
    ('ICICI Direct'),
    ('Kotak Securities'),
    ('HDFC Securities');

-- Team Name Master Data
INSERT OR IGNORE INTO master_team_name (name) VALUES
    ('Morning Team'),
    ('Evening Team');

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

INSERT INTO trader_entries (
    user_id, trade_date, strategy, code, exchange, commodity, expiry, contract_type,
    trade_type, strike_price, option_type, client_code, broker, team_name,
    status, remark, tag
) VALUES
    (1, '2025-01-20', 'Scalping', 'NIFTY', 'NSE', 'Index', '2025-01-30', 'Futures',
     'Buy', 23500.00, 'N/A', 'CLI001', 'Zerodha', 'Morning Team', 'Active', 'Morning trade', 'Intraday'),

    (1, '2025-01-20', 'Day Trading', 'BANKNIFTY', 'NSE', 'Index', '2025-01-30', 'Options',
     'Sell', 48000.00, 'Call', 'CLI002', 'Upstox', 'Evening Team', 'Closed', 'Profit booking', 'Positional'),

    (1, '2025-01-20', 'Swing Trading', 'RELIANCE', 'BSE', 'Equity', '2025-02-27', 'Futures',
     'Buy', 2850.00, 'N/A', 'CLI003', 'Angel One', 'Morning Team', 'Active', 'Long position', 'Swing'),

    (1, '2025-01-20', 'Arbitrage', 'GOLD', 'MCX', 'Precious Metal', '2025-02-05', 'Spot',
     'Buy', 62000.00, 'N/A', 'CLI004', 'ICICI Direct', 'Evening Team', 'Pending', 'Arbitrage opportunity', 'Commodity'),

    (1, '2025-01-20', 'Position Trading', 'CRUDE', 'MCX', 'Energy', '2025-01-19', 'Futures',
     'Sell', 6500.00, 'N/A', 'CLI005', 'Kotak Securities', 'Morning Team', 'Active', 'Bearish outlook', 'Commodity'),

    (1, '2025-01-20', 'Day Trading', 'FINNIFTY', 'NSE', 'Index', '2025-01-28', 'Options',
     'Buy', 22000.00, 'Put', 'CLI001', 'Zerodha', 'Evening Team', 'Active', 'Hedging position', 'Intraday'),

    (1, '2025-01-20', 'Scalping', 'SILVER', 'MCX', 'Precious Metal', '2025-03-05', 'Futures',
     'Buy', 72000.00, 'N/A', 'CLI006', 'HDFC Securities', 'Morning Team', 'Closed', 'Quick profit', 'Commodity'),

    (1, '2025-01-20', 'Swing Trading', 'TATASTEEL', 'NSE', 'Equity', '2025-01-30', 'Options',
     'Sell', 150.00, 'Call', 'CLI007', 'Upstox', 'Evening Team', 'Active', 'Covered call strategy', 'Positional');
