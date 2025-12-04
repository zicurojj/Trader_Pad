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

-- User Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    page_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, page_key)
);

-- Available pages: 'trade-entry', 'manual-trade-entry', 'masters', 'all-entries', 'user-management'

-- ============================================
-- MASTER TABLES
-- ============================================

-- Strategy Master
CREATE TABLE IF NOT EXISTS strategy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Master
CREATE TABLE IF NOT EXISTS exchange (
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
CREATE TABLE IF NOT EXISTS code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Commodity Master
CREATE TABLE IF NOT EXISTS commodity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
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

-- Status Master
CREATE TABLE IF NOT EXISTS master_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RELATIONSHIP TABLES
-- ============================================

-- Strategy-Code Relationship
CREATE TABLE IF NOT EXISTS strategy_code (
    strategy_id INTEGER NOT NULL REFERENCES strategy(id),
    code_id INTEGER NOT NULL REFERENCES code(id),
    PRIMARY KEY (strategy_id, code_id)
);

-- Code-Exchange Relationship
CREATE TABLE IF NOT EXISTS code_exchange (
    code_id INTEGER NOT NULL REFERENCES code(id),
    exchange_id INTEGER NOT NULL REFERENCES exchange(id),
    PRIMARY KEY (code_id, exchange_id)
);

-- Exchange-Commodity Relationship
CREATE TABLE IF NOT EXISTS exchange_commodity (
    exchange_id INTEGER NOT NULL REFERENCES exchange(id),
    commodity_id INTEGER NOT NULL REFERENCES commodity(id),
    PRIMARY KEY (exchange_id, commodity_id)
);

-- ============================================
-- MAIN TRADER ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trader_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    trade_date DATE NOT NULL,
    strategy TEXT NOT NULL,
    code TEXT NOT NULL,
    exchange TEXT NOT NULL,
    commodity TEXT NOT NULL,
    expiry DATE NOT NULL,
    contract_type TEXT NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    option_type TEXT NOT NULL,
    client_code TEXT NOT NULL,
    broker TEXT NOT NULL,
    team_name TEXT NOT NULL,
    buy_qty INTEGER,
    buy_avg DECIMAL(10, 2),
    sell_qty INTEGER,
    sell_avg DECIMAL(10, 2),
    status TEXT NOT NULL,
    remark TEXT,
    tag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_username ON trader_entries(username);
CREATE INDEX IF NOT EXISTS idx_trade_date ON trader_entries(trade_date);
CREATE INDEX IF NOT EXISTS idx_strategy ON trader_entries(strategy);
CREATE INDEX IF NOT EXISTS idx_exchange ON trader_entries(exchange);
CREATE INDEX IF NOT EXISTS idx_broker ON trader_entries(broker);
CREATE INDEX IF NOT EXISTS idx_team_name ON trader_entries(team_name);
CREATE INDEX IF NOT EXISTS idx_status ON trader_entries(status);

-- ============================================
-- TRADER ENTRIES LOGS TABLE (Audit Trail)
-- ============================================

-- Logs table to track UPDATE and DELETE operations on trader_entries
CREATE TABLE IF NOT EXISTS trader_entries_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,  -- Reference to the original trader_entries.id
    operation_type TEXT NOT NULL CHECK(operation_type IN ('UPDATE', 'DELETE')),
    log_tag TEXT NOT NULL CHECK(log_tag IN ('before', 'after', 'deleted')),

    -- Full entry snapshot (same structure as trader_entries)
    username TEXT NOT NULL,
    trade_date DATE NOT NULL,
    strategy TEXT NOT NULL,
    code TEXT NOT NULL,
    exchange TEXT NOT NULL,
    commodity TEXT NOT NULL,
    expiry DATE NOT NULL,
    contract_type TEXT NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    option_type TEXT NOT NULL,
    client_code TEXT NOT NULL,
    broker TEXT NOT NULL,
    team_name TEXT NOT NULL,
    buy_qty INTEGER,
    buy_avg DECIMAL(10, 2),
    sell_qty INTEGER,
    sell_avg DECIMAL(10, 2),
    status TEXT NOT NULL,
    remark TEXT,
    tag TEXT,

    -- Audit fields
    changed_by TEXT NOT NULL,  -- Username who made the change
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for logs table
CREATE INDEX IF NOT EXISTS idx_logs_entry_id ON trader_entries_logs(entry_id);
CREATE INDEX IF NOT EXISTS idx_logs_operation_type ON trader_entries_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_logs_changed_by ON trader_entries_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_logs_changed_at ON trader_entries_logs(changed_at);

-- ============================================
-- MANUAL TRADE ENTRIES TABLE (Excel-like format)
-- ============================================

-- Manual trade entries table removed - now using trader_entries table for all entries

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_trader_entries_timestamp
AFTER UPDATE ON trader_entries
BEGIN
    UPDATE trader_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- INSERT INITIAL MASTER DATA
-- ============================================

-- Strategy Master Data
INSERT OR IGNORE INTO strategy (id, name) VALUES
(1,  '3LEG'),
(2,  '2LEG'),
(3,  '1LEG'),
(4,  '4LEG'),
(5,  'DGINR'),
(6,  'PAIR'),
(7,  'CMELME'),
(8,  'REMITTANCE'),
(9,  'DISC'),
(10, 'SF'),
(11, 'GAMA'),
(12, 'Calendar Spread'),
(13, 'NOTIONALBK'),
(14, '2LEG H');

-- Exchange Master Data
INSERT OR IGNORE INTO exchange (id, name) VALUES
(1,  'CME'),
(2,  'LME'),
(3,  'DGCX'),
(4,  'MCX'),
(5,  'NIFTY'),
(6,  'EURUSD'),
(7,  'Calendar Spread 1'),
(8,  'USDINR CE'),
(9,  'TOCOM'),
(10, 'SILVER'),
(11, 'CM'),
(12, 'SHFE'),
(13, 'HKEX'),
(14, 'BANK NIFTY'),
(15, 'GBPUSD'),
(16, 'USDINR PE'),
(17, 'TFEX'),
(18, 'GOLD'),
(19, 'SGX'),
(20, 'NYMEX'),
(21, 'FIN NIFTY'),
(22, 'USDJPY'),
(23, 'NDF'),
(24, 'Platinium'),
(25, 'NSE'),
(26, 'GBPJPY'),
(27, 'ETHER'),
(28, 'DCE'),
(29, 'INE'),
(30, 'NSEFO'),
(31, 'ITC'),
(32, 'EURJPY'),
(33, 'BITCOIN'),
(34, 'ICE'),
(35, 'SGE'),
(36, 'RELIANCE'),
(37, 'EURGBP'),
(38, 'USDINR'),
(39, 'NSE COMM'),
(40, 'SENSEX'),
(41, 'USD/KRW'),
(42, 'SPOT'),
(43, 'USDTHB'),
(44, 'INX'),
(45, 'NDO'),
(46, 'USDCNY'),
(47, 'USDHKD'),
(48, 'GIFT'),
(49, 'LEND'),
(50, 'BORROW'),
(51, 'BSE'),
(52, 'TSE');

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
    ('CE'),
    ('PE'),
    ('N/A');

-- Code Master Data
INSERT OR IGNORE INTO code (id, name) VALUES
(1, 'BORROW'),
(2, 'BSE'),
(3, 'BSECM'),
(4, 'CMD'),
(5, 'CMDBASE'),
(6, 'CMDGC'),
(7, 'CMDO'),
(8, 'CMDSI'),
(9, 'CME'),
(10, 'CMELME'),
(11, 'CSS'),
(12, 'CSSBASE'),
(13, 'CTF'),
(14, 'CTS'),
(15, 'Calendar Spread'),
(16, 'DGCX'),
(17, 'DGINR'),
(18, 'DH'),
(19, 'DISC'),
(20, 'DS'),
(21, 'EQUITY'),
(22, 'FAO'),
(23, 'FX'),
(24, 'GIFT'),
(25, 'HKEX'),
(26, 'HS'),
(27, 'ICE'),
(28, 'INX'),
(29, 'LEND'),
(30, 'LME'),
(31, 'MCX'),
(32, 'NASDAQ'),
(33, 'NDF'),
(34, 'NOTIONALBK'),
(35, 'NSE'),
(36, 'NSE COMM'),
(37, 'NSEFO'),
(38, 'NYMEX'),
(39, 'OPEN'),
(40, 'PAIR'),
(41, 'RATIO'),
(42, 'REMITTANCE1'),
(43, 'SF'),
(44, 'SGX'),
(45, 'SHFE'),
(46, 'SPOT'),
(47, 'SPREAD'),
(48, 'TSE');

-- Commodity Master Data
INSERT OR IGNORE INTO commodity (id, name) VALUES
(1, 'ALUMINIUM'),
(2, 'GOLD'),
(3, 'NATURAL GAS'),
(4, 'COPPER'),
(5, 'USDINR'),
(6, 'NIFTY'),
(7, 'INRUSD'),
(8, 'GOLD Mini'),
(9, 'BRENT CRUDE'),
(10, 'SILVER'),
(11, 'SOYA OIL'),
(12, 'NDF'),
(13, 'USDTHB'),
(14, 'USDCNH'),
(15, 'SENSEX'),
(16, 'SUMITOMO CORP'),
(17, 'ZINC'),
(18, 'CRUDE OIL'),
(19, 'EURINR'),
(20, 'SENSEX50'),
(21, 'COTTON'),
(22, 'DG GOLD'),
(23, 'SOYA MEAL'),
(24, 'NSE'),
(25, 'Gold Online'),
(26, 'SUMITOMO CORP CFD'),
(27, 'NICKEL'),
(28, 'GBPINR'),
(29, 'EUR'),
(30, 'iAU99.99'),
(31, 'SOYA BEAN'),
(32, 'BSECD'),
(33, 'GC Thai 10'),
(34, 'TENCENT'),
(35, 'LEAD'),
(36, 'CRUDE OIL MINI'),
(37, 'JPYINR'),
(38, 'INRUSD Mini'),
(39, 'GOLD T+D'),
(40, 'IRON ORE'),
(41, 'ACE'),
(42, 'GC Thai 50'),
(43, 'ALIBABA'),
(44, 'KRW/USD Mini'),
(45, 'GOLD MICRO'),
(46, 'HEATING OIL'),
(47, 'GOLD GUNIA'),
(48, 'Gold Bees'),
(49, 'PALM OIL'),
(50, 'NDO'),
(51, 'JD.COM'),
(52, 'GOLD OP'),
(53, 'GASOLINE'),
(54, 'GOLD PETAL'),
(55, 'SBI Gold ETF'),
(56, 'RUBBER'),
(57, 'INX'),
(58, 'BAIDU'),
(59, 'ETHER'),
(60, 'SILVER Mini'),
(61, 'HDFC Gold ETF'),
(62, 'COKING COAL'),
(63, 'DGCX'),
(64, 'CHINA A50'),
(65, 'BITCOIN'),
(66, 'SILVER Micro'),
(67, 'HOTROLLED COIL'),
(68, 'TATA GOLD ETF'),
(69, 'STAINLESS STEEL'),
(70, 'SGX'),
(71, 'GOLD SPOT'),
(72, 'REBAR'),
(73, 'AXIS Gold ETF'),
(74, 'HOT COIL'),
(75, 'HKEX'),
(76, 'PLATINUM'),
(77, 'BSLGOLDETF'),
(78, 'GOLDSHARE'),
(79, 'DSP GOLD'),
(80, 'ZINC Mini'),
(81, 'ICICI BANK'),
(82, 'ALUMINI'),
(83, 'SBIN'),
(84, 'LEADMINI'),
(85, 'ADANIPO'),
(86, 'INFY'),
(87, 'TCS'),
(88, 'MCXBULLDEX'),
(89, 'Nippon SILVER ETF'),
(90, 'DSP SILVER ETF'),
(91, 'AXIS. SILVER ETF'),
(92, 'HDFC SILVER ETF'),
(93, 'TATA SILVER ETF'),
(94, 'SBI SILVER ETF'),
(95, 'UTI SILVER ETF'),
(96, 'BIRLA SILVER ETF'),
(97, 'BAJFINANCE'),
(98, 'HDFCBANK'),
(99, 'HINDUNILVR'),
(100, 'BANKBEES'),
(101, 'TITAN'),
(102, 'RELIANCE'),
(103, 'AXIS BANK'),
(104, 'DSP Gold ETF'),
(105, 'BANKNIFTY'),
(106, 'BIRLA GOLD ETF');

-- Broker Master Data
INSERT OR IGNORE INTO master_broker (name) VALUES
    ('AGL'),
    ('BRTN'),
    ('EdgeWater'),
    ('EOS'),
    ('FC Stone'),
    ('IB'),
    ('KGI-A'),
    ('KGI-FX'),
    ('KGI AB'),
    ('KGI-C'),
    ('Nanhua AGL'),
    ('Nanhua UK'),
    ('Sucden'),
    ('Velocity'),
    ('Orient'),
    ('SGEI'),
    ('Neat'),
    ('CMC'),
    ('Doo'),
    ('Greek DMA10021'),
    ('FINALTO'),
    ('Strait Financial'),
    ('Marex'),
    ('GF'),
    ('LMAX'),
    ('Huatai');

-- Team Name Master Data
INSERT OR IGNORE INTO master_team_name (name) VALUES
    ('Morning Team'),
    ('Evening Team');

-- Status Master Data
INSERT OR IGNORE INTO master_status (name) VALUES
    ('TRADE BY SIR'),
    ('5% Extra'),
    ('Against 2 Leg Extra'),
    ('Against 2 Leg Hedge'),
    ('AGAINST INTL AGRI'),
    ('AGAINST GBPUSD'),
    ('AGAINST Brokerage Commision'),
    ('AGAINST CMD EXPOSURE'),
    ('AGAINST CSS EXPOSURE'),
    ('Against Cut on Fixing'),
    ('AGAINST EQUITY'),
    ('Against AGL Monthly Commission'),
    ('Against Global Expense'),
    ('Against Export Book'),
    ('Against Creation Book'),
    ('Against FX Hedge'),
    ('Against AIL Hedge'),
    ('Against Bill Discounting'),
    ('Against GOLD ETF'),
    ('Against Silver ETF'),
    ('Against Physical Book'),
    ('Against Non Refine Book'),
    ('Against Auction Physical Book'),
    ('Against Retail Book'),
    ('Against Scrap Book'),
    ('Against Hatti Book'),
    ('AGAINST SHFE EXPOSURE'),
    ('Against 3 Leg FX Hedge'),
    ('Against Weekly Hedge'),
    ('Against Weekly P&L Hedge'),
    ('Against Wealth Book Trade'),
    ('Against Credit Book (Abbas Book)'),
    ('Against Gold Options'),
    ('Against USDINR Options'),
    ('Against NIFTY Options'),
    ('Against BANKNIFTY Options'),
    ('Against Crude Options'),
    ('Against Natural Gas Options'),
    ('Against  S&P Options'),
    ('Against GAMA Hedge'),
    ('Bullion Base Metals'),
    ('Bullion Options Book'),
    ('BULLION TEAM CLIENT TRADE'),
    ('Against Non-Refine Book'),
    ('Against  Refine Book'),
    ('By Telephonic Conversation'),
    ('CMELME ADJUSTMENT'),
    ('Conversion'),
    ('Crosses P&L Conversion'),
    ('CURRENCY ADJUST IN MORNING TRADE'),
    ('Currency Adjust on Nickel'),
    ('KGI Weekly P&L'),
    ('MATHURA ADJUSTMENT'),
    ('Mayank Trade'),
    ('Morning Extra Convert to Normal'),
    ('Not Trade'),
    ('NO TRADE AGAINST CMD'),
    ('NO TRADE AGAINST CSSBASE'),
    ('NORMAL'),
    ('NOT TRADE AGAINST  Lead Copper Silver'),
    ('NOT TRADE AGAINST Aluminium'),
    ('Not Trade Against BULLION TEAM Gold'),
    ('NOT TRADE AGAINST COOPER'),
    ('NOT TRADE AGAINST GOLD'),
    ('Not Trade Against Karan Heda'),
    ('NOT TRADE AGAINST Lead'),
    ('NOT TRADE AGAINST MCX Aluminium'),
    ('NOT TRADE AGAINST MCX GOLD'),
    ('Not Trade Against MCX Natural Gas'),
    ('Not Trade Against MCX Nickel'),
    ('NOT TRADE AGAINST MCX SILVER'),
    ('NOT TRADE AGAINST MCX ZINC'),
    ('NOT TRADE AGAINST Natural Gas'),
    ('NOT TRADE AGAINST Nickel'),
    ('NOT TRADE AGAINST NICKEL'),
    ('NOT TRADE AGAINST SHFE ALUMINIUM'),
    ('NOT TRADE AGAINST SHFE COPPER'),
    ('NOT TRADE AGAINST INE COPPER'),
    ('NOT TRADE AGAINST SHFE GOLD'),
    ('NOT TRADE AGAINST SHFE NICKEL'),
    ('NOT TRADE AGAINST SHFE SILVER'),
    ('NOT TRADE AGAINST SHFE ZINC'),
    ('NOT TRADE AGAINST ZINC'),
    ('Notion Entry Against Aluminium'),
    ('Notion Entry Against Natural Gas'),
    ('Notion Entry Against CMDGC'),
    ('Notion Entry Against Copper'),
    ('Notion Entry Against Gold'),
    ('Notion Entry Against Silver'),
    ('NOTIONAL ENTRY AGAINST CHINTAN TRADE'),
    ('Notional Entry Against Sir Trade'),
    ('NOTIONAL ENTRY BULLION BASE METAL'),
    ('Notional Entry for 2 Leg'),
    ('Notional Entry for 3 Leg'),
    ('Notional entry for ABBAS'),
    ('NOTIONAL ENTRY FOR BULLION TEAM'),
    ('Notional Entry for Export Book'),
    ('Notional Entry for International Agri'),
    ('NOTIONAL ENTRY FOR MATHURA TEAM'),
    ('NOTIONAL ENTRY FOR GOLD ETF'),
    ('Notional Entry for SHFE Silver'),
    ('Notional entry for Mayank Trade'),
    ('Notional Entry for FX Headge'),
    ('NOTIONAL ENTRY FOR NON REFINE'),
    ('NOTIONAL ENTRY FOR REFINE'),
    ('NOTIONAL ENTRY FOR PHYSICAL Book'),
    ('NOTIONAL ENTRY FOR Hatti Book'),
    ('Notional Entry for Remittance'),
    ('Notional Entry for Retail Business'),
    ('Notional Entry for SHFE Expossure'),
    ('Notional Entry for Wealth Book'),
    ('Notional for Bill-Disc'),
    ('Notional for CMD'),
    ('Notional for CMDSI'),
    ('Notional for CMD WARE HOUSE'),
    ('Notional for CMDBASE'),
    ('Notional for CMELME'),
    ('Notional For 3LEG FX'),
    ('Notional for CSSBASE'),
    ('Notional for CSS'),
    ('Notional for Ratio'),
    ('Notional for CMDO'),
    ('Notional for Disc'),
    ('Notion Entry Against Gold Option'),
    ('Notion Entry Against Crude Option'),
    ('Notion Entry Against DISC Crude Option'),
    ('Notion Entry Against Natural Gas Option'),
    ('Notion Entry Against DISC Natural Gas Option'),
    ('Notional Sir Trade Against  3 Leg Strategy'),
    ('Notional for GC/SI RATIO'),
    ('Notional for Silver Spot Pair'),
    ('SHFE'),
    ('This Trade Against Open From SHFE to LME'),
    ('Trade Against Retail Business'),
    ('Trade By Chintan'),
    ('Trade By Karan Heda'),
    ('Trade By Tanmay'),
    ('Traded by Suraj Bhanushali'),
    ('V.M DISCOUNTING'),
    ('WRONG TRADE'),
    ('YESTERDAY ADJUSTMENT'),
    ('YESTERDAY Extra Convert to Normal'),
    ('Trade By Nayan Patel'),
    ('Notional for Creation Book'),
    ('Notional for 3LEG CMD'),
    ('Trade By Swapnil Mishra'),
    ('GC/SI Ratio'),
    ('GC/CA Ratio'),
    ('ZN/AH Ratio'),
    ('SI/CA Ratio'),
    ('CA/ZN Ratio'),
    ('G-SEC Spread Stratgy'),
    ('Bullion Option Trade'),
    ('GC/HG Ratio');

-- ============================================
-- RELATIONSHIP TABLE DATA
-- ============================================

-- Strategy-Code Relationship Data
INSERT OR IGNORE INTO strategy_code (strategy_id, code_id) VALUES
-- Strategy 1 (3LEG)
(1, 4), (1, 11), (1, 5), (1, 12), (1, 47), (1, 29), (1, 1), (1, 39), (1, 23), (1, 14), (1, 13),
-- Strategy 2 (2LEG)
(2, 47), (2, 17), (2, 40), (2, 23), (2, 44), (2, 8), (2, 6), (2, 11), (2, 26), (2, 18), (2, 20),
-- Strategy 3 (1LEG)
(3, 37),
-- Strategy 4 (4LEG)
(4, 7),
-- Strategy 5 (DGINR)
(5, 35), (5, 16), (5, 44), (5, 2), (5, 28), (5, 25),
-- Strategy 6 (PAIR)
(6, 45), (6, 46), (6, 9), (6, 44), (6, 36), (6, 31), (6, 38), (6, 30), (6, 35), (6, 24), (6, 28), (6, 2),
-- Strategy 7 (CMELME)
(7, 10), (7, 29), (7, 9), (7, 30), (7, 1),
-- Strategy 8 (REMITTANCE)
(8, 42),
-- Strategy 9 (DISC)
(9, 19), (9, 41), (9, 9), (9, 30), (9, 35), (9, 31), (9, 45), (9, 44), (9, 16), (9, 38), (9, 21), (9, 37), (9, 7), (9, 32), (9, 25), (9, 24), (9, 27), (9, 33), (9, 46), (9, 3), (9, 48),
-- Strategy 10 (SF)
(10, 43), (10, 21), (10, 37),
-- Strategy 11 (GAMA)
(11, 22),
-- Strategy 12 (Calendar Spread)
(12, 15),
-- Strategy 13 (NOTIONALBK)
(13, 34), (13, 35), (13, 16), (13, 44),
-- Strategy 14 (2LEG H)
(14, 47), (14, 17), (14, 40), (14, 23), (14, 44), (14, 8), (14, 6), (14, 11), (14, 26), (14, 18), (14, 20);

-- Code-Exchange Relationship Data
INSERT OR IGNORE INTO code_exchange (code_id, exchange_id) VALUES
-- Code 4 (CMD)
(4, 1), (4, 4), (4, 3), (4, 2), (4, 25), (4, 34), (4, 19), (4, 20), (4, 42), (4, 44), (4, 39), (4, 17), (4, 13), (4, 30), (4, 48),
-- Code 11 (CSS)
(11, 1), (11, 12), (11, 19), (11, 20), (11, 28), (11, 35), (11, 29), (11, 34), (11, 13), (11, 42),
-- Code 5 (CMDBASE)
(5, 2), (5, 4), (5, 3), (5, 25), (5, 19), (5, 1),
-- Code 12 (CSSBASE)
(12, 2), (12, 12), (12, 19), (12, 1), (12, 29), (12, 13),
-- Code 47 (SPREAD)
(47, 2), (47, 1), (47, 12), (47, 17), (47, 4),
-- Code 17 (DGINR)
(17, 3), (17, 13),
-- Code 10 (CMELME)
(10, 1), (10, 2),
-- Code 22 (FAO)
(22, 4), (22, 1), (22, 20), (22, 25), (22, 30), (22, 3), (22, 19), (22, 39), (22, 23), (22, 45),
-- Code 37 (NSEFO)
(37, 5), (37, 14), (37, 21), (37, 11), (37, 31), (37, 36), (37, 25), (37, 40),
-- Code 1 (BORROW)
(1, 2),
-- Code 33 (NDF)
(33, 6), (33, 15), (33, 22), (33, 26), (33, 32), (33, 37), (33, 38), (33, 41), (33, 43), (33, 46), (33, 47),
-- Code 15 (Calendar Spread)
(15, 7),
-- Code 7 (CMDO)
(7, 1), (7, 4), (7, 3), (7, 25), (7, 20), (7, 19), (7, 13),
-- Code 45 (NDO)
(45, 8), (45, 16),
-- Code 14 (CTS)
(14, 9), (14, 1), (14, 23), (14, 4),
-- Code 13 (CTF)
(13, 1), (13, 17), (13, 23),
-- Code 46 (SPOT)
(46, 10), (46, 18), (46, 24), (46, 27), (46, 33),
-- Code 6 (CMDGC)
(6, 1), (6, 3), (6, 25),
-- Code 41 (RATIO)
(41, 1), (41, 2), (41, 20), (41, 19), (41, 13), (41, 4), (41, 12),
-- Code 8 (CMDSI)
(8, 1), (8, 3), (8, 25),
-- Code 21 (EQUITY)
(21, 11),
-- Code 42 (REMITTANCE1)
(42, 12), (42, 3), (42, 25), (42, 19), (42, 17), (42, 23), (42, 13);

-- Exchange-Commodity Relationship Data
INSERT OR IGNORE INTO exchange_commodity (exchange_id, commodity_id) VALUES
-- Exchange 2 (LME)
(2, 1), (2, 17), (2, 27), (2, 35), (2, 4),
-- Exchange 1 (CME)
(1, 2), (1, 10), (1, 4), (1, 8), (1, 45), (1, 52), (1, 59), (1, 65), (1, 71), (1, 76),
-- Exchange 20 (NYMEX)
(20, 3), (20, 18), (20, 9), (20, 36), (20, 46), (20, 53),
-- Exchange 4 (MCX)
(4, 2), (4, 10), (4, 4), (4, 8), (4, 47), (4, 54), (4, 60), (4, 66), (4, 1), (4, 27), (4, 17), (4, 35), (4, 80), (4, 82), (4, 84), (4, 18), (4, 3), (4, 36), (4, 88), (4, 21),
-- Exchange 12 (SHFE)
(12, 4), (12, 1), (12, 27), (12, 10), (12, 2), (12, 17), (12, 35), (12, 67), (12, 72), (12, 40), (12, 11), (12, 23), (12, 18), (12, 69),
-- Exchange 25 (NSE)
(25, 5), (25, 19), (25, 28), (25, 37), (25, 48), (25, 55), (25, 61), (25, 68), (25, 73), (25, 77), (25, 78), (25, 79), (25, 81), (25, 83), (25, 85), (25, 6), (25, 86), (25, 87), (25, 89), (25, 90), (25, 91), (25, 92), (25, 93), (25, 94), (25, 95), (25, 96), (25, 97), (25, 98), (25, 99), (25, 100), (25, 101), (25, 102), (25, 103), (25, 104), (25, 105), (25, 106),
-- Exchange 48 (GIFT)
(48, 6),
-- Exchange 44 (INX)
(44, 7), (44, 20), (44, 15),
-- Exchange 39 (NSE COMM)
(39, 8), (39, 18), (39, 3),
-- Exchange 29 (INE)
(29, 4), (29, 9), (29, 21),
-- Exchange 34 (ICE)
(34, 9), (34, 21),
-- Exchange 3 (DGCX)
(3, 7), (3, 22), (3, 29), (3, 38),
-- Exchange 49 (LEND)
(49, 1), (49, 17), (49, 27), (49, 35), (49, 4),
-- Exchange 50 (BORROW)
(50, 1), (50, 17), (50, 27), (50, 35), (50, 4),
-- Exchange 35 (SGE)
(35, 10), (35, 2), (35, 30), (35, 39),
-- Exchange 28 (DCE)
(28, 11), (28, 23), (28, 31), (28, 40), (28, 49), (28, 56), (28, 62), (28, 69), (28, 74),
-- Exchange 17 (TFEX)
(17, 13), (17, 25), (17, 33), (17, 42),
-- Exchange 9 (TOCOM)
(9, 2), (9, 10),
-- Exchange 13 (HKEX)
(13, 14), (13, 7), (13, 34), (13, 43), (13, 51), (13, 58),
-- Exchange 51 (BSE)
(51, 15),
-- Exchange 52 (TSE)
(52, 16), (52, 26),
-- Exchange 19 (SGX)
(19, 14), (19, 7), (19, 6), (19, 44), (19, 40), (19, 56), (19, 64);

