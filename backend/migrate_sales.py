import sqlite3
import os

def migrate_sales():
    db_path = os.path.join(os.path.dirname(__file__), 'farm.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if paid_amount column exists
        cursor.execute("PRAGMA table_info(sales)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'paid_amount' not in columns:
            print("Adding paid_amount column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN paid_amount REAL DEFAULT 0")
        
        if 'remaining_amount' not in columns:
            print("Adding remaining_amount column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN remaining_amount REAL DEFAULT 0")
        
        conn.commit()
        print("✅ Sales migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_sales()
