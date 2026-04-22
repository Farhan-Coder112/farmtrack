import sqlite3
import os

DATABASE = os.path.join(os.path.dirname(__file__), "farm.db")

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # ── Users ────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT    NOT NULL,
            email     TEXT    NOT NULL UNIQUE,
            password  TEXT    NOT NULL,
            role      TEXT    NOT NULL DEFAULT 'manager',
            phone     TEXT,
            farm_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Crops ────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS crops (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            name            TEXT    NOT NULL,
            variety         TEXT,
            field_location  TEXT,
            area_acres      REAL,
            field_quantity  REAL DEFAULT 0,
            field_unit      TEXT DEFAULT 'kg',
            status          TEXT    DEFAULT 'growing',
            plant_date      TEXT,
            expected_harvest TEXT,
            actual_harvest  TEXT,
            harvest_quantity REAL DEFAULT 0,
            harvest_unit    TEXT DEFAULT 'kg',
            notes           TEXT,
            image_path      TEXT,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Workers ──────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS workers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            phone       TEXT,
            role        TEXT,
            daily_wage   REAL    DEFAULT 0,
            weekly_wages REAL    DEFAULT 0,
            join_date    TEXT,
            address     TEXT,
            status      TEXT    DEFAULT 'active',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Attendance ───────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id   INTEGER NOT NULL,
            user_id     INTEGER NOT NULL,
            date        TEXT    NOT NULL,
            status      TEXT    DEFAULT 'present',
            hours_worked REAL   DEFAULT 8,
            notes       TEXT,
            FOREIGN KEY (worker_id) REFERENCES workers(id),
            FOREIGN KEY (user_id)   REFERENCES users(id)
        )
    """)

    # ── Expenses ─────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            title       TEXT    NOT NULL,
            category    TEXT    NOT NULL,
            amount      REAL    NOT NULL,
            date        TEXT    NOT NULL,
            description TEXT,
            payment_method TEXT DEFAULT 'cash',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Inventory ────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            name          TEXT    NOT NULL,
            category      TEXT    NOT NULL,
            quantity      REAL    NOT NULL DEFAULT 0,
            unit          TEXT    NOT NULL DEFAULT 'kg',
            min_quantity  REAL    DEFAULT 0,
            unit_price    REAL    DEFAULT 0,
            supplier      TEXT,
            location      TEXT,
            expiry_date   TEXT,
            quantity_used REAL DEFAULT 0,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Tasks ────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            worker_id    INTEGER,
            title        TEXT    NOT NULL,
            description  TEXT,
            category     TEXT    DEFAULT 'general',
            priority     TEXT    DEFAULT 'medium',
            status       TEXT    DEFAULT 'pending',
            due_date     TEXT,
            due_time     TEXT,
            completed_at TEXT,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)   REFERENCES users(id),
            FOREIGN KEY (worker_id) REFERENCES workers(id)
        )
    """)

    # ── Customers ────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            phone       TEXT,
            email       TEXT,
            address     TEXT,
            business_name TEXT,
            notes       TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Sales ────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            crop_id     INTEGER,
            crop_name   TEXT    NOT NULL,
            quantity    REAL    NOT NULL,
            unit        TEXT    DEFAULT 'kg',
            price_per_unit REAL NOT NULL,
            total_price REAL    NOT NULL,
            paid_amount REAL    DEFAULT 0,
            remaining_amount REAL DEFAULT 0,
            sale_date   TEXT    NOT NULL,
            payment_status TEXT DEFAULT 'pending',
            payment_method TEXT DEFAULT 'cash',
            notes       TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)     REFERENCES users(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (crop_id)     REFERENCES crops(id)
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] Database initialized successfully")
