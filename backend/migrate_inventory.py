import sqlite3
import os

def migrate_inventory():
    db_path = os.path.join(os.path.dirname(__file__), 'farm.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(inventory)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'quantity_used' not in columns:
            print("Adding quantity_used column...")
            cursor.execute("ALTER TABLE inventory ADD COLUMN quantity_used REAL DEFAULT 0")
        
        if 'updated_at' not in columns:
            print("Adding updated_at column...")
            cursor.execute("ALTER TABLE inventory ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        
        conn.commit()
        print("Inventory migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_inventory()
